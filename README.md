# Tilcayo

## Development

Install dependencies with `npm install`, then run from the repository root:

Set `MONGODB_URI` in your shell first. The example connects before listening on
port 9149. For a local MongoDB development database, PowerShell users can run
`$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/tilcayo'`.
Environment files are ignored and are not automatically loaded.

```sh
npm start
```

`npm run dev` does the same thing. Both commands build core and the basic API,
then start the example at http://localhost:9149. Nodemon watches both source
directories and their TypeScript configuration. Saving a change rebuilds core
first, rebuilds the example, and restarts the server. Compilation errors stop
the launch; correct the error and save to retry. Press Ctrl+C to stop.

You can also use `npm start` from `examples/basic-api`.
In PowerShell environments that block `npm.ps1`, use `npm.cmd` instead of `npm`.

## Build and run without watching

```sh
npm run build
npm run start:prod -w @tilcayo/basic-api
```

## MongoDB

Core exports `connectMongo(uri, options)`, `disconnectMongo()`, and
`getMongoState()`. The connection layer configures DNS servers `8.8.8.8` and
`1.1.1.1` before connecting. `MongoConnectOptions` aliases Mongoose's connection
options; states are `disconnected`, `connected`, `connecting`, `disconnecting`,
or `unknown`.

Books demonstrate database CRUD through `/api/books`. Creation requires `title`
and `author`, with optional integer `publishedYear`. Item routes require a
24-character hexadecimal ObjectId. Products remain a simple array-backed read
example with placeholder write responses.

After building, run `node --test tests/*.test.mjs`. The live MongoDB test runs
only when `MONGODB_URI` is set, uses a unique temporary database, and drops only
that database on completion. Without a URI it is explicitly skipped.
