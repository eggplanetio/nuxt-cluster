const cluster = require('cluster');
const path = require('path');
const numCPUs = require('os').cpus().length;

module.exports = {
  start ({ srcDir, port }) {
    if (cluster.isMaster) {
      console.log(`master ${process.pid} is running`);

      // Fork workers.
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
      });
    } else {
      const config = require(path.join(process.cwd(), 'nuxt.config.js'));
      config.port = port || process.env.PORT || 3000;
      config.dev = false;
      config.srcDir = srcDir || process.env.SRC_DIR || process.cwd();

      const Nuxt = require('nuxt');
      const morgan = require('morgan');
      const app = require('express')();
      const nuxt = new Nuxt(config);

      morgan.token('pid', function (req, res) { return process.pid });
      app.use(morgan('[worker: :pid] :method :url :response-time'));

      app.use(nuxt.render);
      app.listen(port, '0.0.0.0')
      console.log(`worker ${process.pid} started listening on port ${port}`);
    }
  }
}
