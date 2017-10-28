# nuxt-cluster
[![npm](https://img.shields.io/npm/dt/nuxt-cluster.svg?style=flat-square)](https://www.npmjs.com/package/nuxt-cluster)
[![npm (scoped with tag)](https://img.shields.io/npm/v/nuxt-cluster/latest.svg?style=flat-square)](https://www.npmjs.com/package/nuxt-cluster)

> A production-grade nuxt server.

## Installation

```sh
npm install nuxt-cluster --save
```

## Usage

```js
import server from 'nuxt-cluster'

server.start({
  dev: false,
  workers: 2,
  workerMaxRequests: 1000, // gracefully restart worker after 1000 requests
  workerMaxLifetime: 3600, // gracefully restart worker after 1 hour
  rootDir: '/app/',
  address: '0.0.0.0',
  port: 3000,
})
```

## Options

### `dev`
- Default: `false`

Set to true to run nuxt in development mode

### `workers`
- Default: `# cpu's`

How many workers should be started. Defaults to the number of cpus in the system

### `workerMaxRequest`
- Default: ` `

If set to a value greater then 0, each worker will be gracefully restarted after it has handled this many requests. As the worker is restarted gracefully, it will be handle all open connections before closing.

### `workerMaxLifetime`
- Default: ` `

If set to a value greater then 0, each worker will be gracefully restarted after it has been alive this many seconds.

### `rootDir`
- Default: ` `

Set this to the rootDir of your nuxt project. See the Nuxt.js [docs](https://nuxtjs.org/api/configuration-rootdir/#the-rootdir-property) for more info.

### `address`
- Default: `0.0.0.0`

The address the server will listen to

### `port`
- Default: `3000`

The port the server will listen to

## License

MIT
