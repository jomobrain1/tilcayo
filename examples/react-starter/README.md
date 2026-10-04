# Tilcayo React starter

React, TypeScript, Vite, React Router, and Tilcayo styles. Includes Home, Elements, About, and responsive navigation.

Use Node.js 22.12+ (or 24+).

```sh
npm install
npm run dev
```

Run `npm run build` for production, `npm run preview` to preview the build, and `npm run lint` to check source files. Deploy `dist/` with all application URLs falling back to `index.html` for client-side routing.

Edit `src/pages/`, `src/App.tsx`, and `src/App.css`. This is a frontend starter; connect your own API. Local checkout generation links the checkout styles package, so keep the checkout available.

## API client

`src/lib/api.ts` exports the `@tilcayo/react` client. It uses public `VITE_API_URL` or `/api` and makes no requests on startup. Only public configuration belongs in VITE_* variables. Local generation links both Tilcayo packages; build them before using the client. See [API client guide](../../packages/react/README.md) in the checkout for requests and errors.
