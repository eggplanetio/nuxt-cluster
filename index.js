const cluster = require('cluster');
const path = require('path');

const watchdog = {}

module.exports = {
  start ({ dev, workers, workerMaxRequests, workerMaxLifetime, address, port, rootDir }) {
    if (cluster.isMaster) {
      console.log(`master ${process.pid} is running`);

      // Fork workers
      const numWorkers = workers || require('os').cpus().length
      for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
      }

      if (workerMaxRequests || workerMaxLifetime) {
        cluster.on('message', (worker, msg) => {
          if (msg.cmd) {
            if (msg.cmd === 'notifyRequest') {
              let killWorker = false;

              if (workerMaxRequests) {
                watchdog[worker.process.pid].req_count++;

                killWorker = watchdog[worker.process.pid].req_count >= workerMaxRequests;
                if (killWorker) {
                  console.log(`worker ${worker.process.pid} processed ${watchdog[worker.process.pid].req_count} requests, sending 'SIGHUP'`)
                }
              }

              if (!killWorker && workerMaxLifetime) {
                const lifetimeSeconds = process.hrtime(watchdog[worker.process.pid].start)[0];

                killWorker = lifetimeSeconds > workerMaxLifetime;
                if (killWorker) {
                  console.log(`worker ${worker.process.pid} has been up for ${lifetimeSeconds}s, sending 'SIGHUP'`)
                }
              }

              if (killWorker) {
                // fake SIGHUP message to gracefully shutdown the worker
                worker.send('SIGHUP');
              }
            }
          }
        });
      }

      cluster.on('fork', (worker) => {
        watchdog[worker.process.pid] = { start: process.hrtime(), req_count: 0 };
      });

      cluster.on('listening', (worker, address) => {
        console.log(`worker ${worker.process.pid} started listening on ${address.address}:${address.port}`);
      });

      cluster.on('exit', (worker, code, signal) => {
        const workerLifetime = process.hrtime(watchdog[worker.process.pid].start)
        const msWorkerLifetime = Math.round((workerLifetime[0] * 1E9 + workerLifetime[1]) / 1E6)

        let message = `worker ${worker.process.pid} died after ${msWorkerLifetime}ms`;
        if (signal) {
          message += ` by signal: ${signal}`;
        } else if (code !== 0) {
          message += ` with error code: ${code}`;
        }

        if (signal && signal !== 'SIGHUP') {
          console.log(message);
        } else if (msWorkerLifetime < 1000) {
          console.log(message + ` but spawning too quickly (<1s), not restarting`);
        } else {
          console.log(message + `, restarting`);
          cluster.fork();
        }

        // cleanup watchdog
        delete watchdog[worker.process.pid]
      });
    } else {
      const ROOT_DIR = rootDir || process.env.ROOT_DIR || process.cwd();
      const config = require(path.join(ROOT_DIR, 'nuxt.config.js'));
      config.port = port || process.env.PORT || 3000;
      config.dev = dev || false;
      config.rootDir = ROOT_DIR;

      const { Nuxt } = require('nuxt');
      const morgan = require('morgan');
      const app = require('express')();
      const nuxt = new Nuxt(config);

      morgan.token('pid', function (req, res) { return process.pid });
      app.use(morgan('[worker: :pid] :status :method :url - :response-time'));

      if (workerMaxRequests || workerMaxLifetime) {
        app.use((req, res, next) => {
          if (cluster.worker.isConnected()) {
            process.send({ cmd: 'notifyRequest' });
          }
          next();
        });
      }

      app.use(nuxt.render);
      const server = app.listen(config.port, address || '0.0.0.0');

      // shutdown worker gracefully
      let isClosing = false;
      let forceTimeout;
      process.on('message', (msg) => {
        if (msg === 'SIGHUP') {
          if (!isClosing) {
            isClosing = true

            server.close(() => {
              process.exit(3);
            });
          }

          // force shutdown after 3s
          clearTimeout(forceTimeout);
          forceTimeout = setTimeout(() => {
            process.exit(3);
          }, 3000);
        }
      });
    }
  }
}

