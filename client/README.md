# Tilcayo React starter

A React + Vite starter using the local @tilcayo/styles package and React Router.

From the repository root:

```sh
npm run build -w @tilcayo/styles
npm run build -w @tilcayo/react
npm --prefix client install
npm --prefix client run dev
```

Open the URL printed by Vite. Routes:

- `/`: welcome page and basic style samples
- `/elements`: buttons, a local demo form, alerts, badges and a table
- `/about`: starter overview
- Any other path: not-found page with a link home

Routes are explicit in `src/App.tsx`; page components live in `src/pages/`.
`src/main.tsx` imports the styles package, `src/index.css` overrides theme tokens,
and `src/App.css` handles starter-specific layout.

The dependency uses `file:../packages/styles` while developing in this checkout.
Build that package before starting or building the client. Replace the local link
with a published version when the styles package is released and this starter is
used outside the repository.

```sh
npm --prefix client run build
npm --prefix client run lint
```

Production hosting must serve `index.html` for client routes such as `/about`.
The form demonstrates native validation and local feedback only; it does not
send requests or persist data. No authentication or protected routes are included.
The local creator supports this starter with `--type react`.

## API client

`src/lib/api.ts` exports the `@tilcayo/react` client. It uses public `VITE_API_URL` or `/api` and makes no requests on startup. Only public configuration belongs in VITE_* variables. Local generation links both Tilcayo packages; build them before using the client. See [API client guide](../packages/react/README.md) in the checkout for requests and errors.
