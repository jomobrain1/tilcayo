# Tilcayo

## Development

Install dependencies with `npm install`, then run from the repository root:

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
