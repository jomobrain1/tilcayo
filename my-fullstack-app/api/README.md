# my-fullstack-app-api

Tilcayo MongoDB CRUD API with JWT authentication.

Tilcayo dependencies link to your local framework checkout. Keep that checkout available and rebuild its packages after framework changes. Replace these links with published versions before moving or sharing this application.


Use Node.js 22.9+ and npm. A local .env has been created with distinct random auth secrets. Keep it private; .env.example contains shareable settings.

Start MongoDB locally or set MONGODB_URI in .env to your connection string.

Install dependencies if you skipped setup:

```sh
npm install
```

With the Tilcayo CLI on PATH:

```sh
tilcayo dev
tilcayo build
tilcayo start
tilcayo routes:list
```

If the CLI is only installed locally, use npx tilcayo with the same commands. Package scripts also expose dev, build, start, and routes.

GET /health returns the application status. The default port is 9149.

The /notes resource includes GET, POST, GET /:id, PUT /:id, and DELETE /:id. Create a note with JSON {"title":"First note","content":"Hello"}. These sample routes are public.

Auth routes: POST /api/auth/register, /login, /refresh, /logout; GET /api/auth/me. Register with name, email, and password. Send the access token as Authorization: Bearer <token>. Protect other routes with auth.middleware.

Register generated routes in src/app.ts. Database connection and server startup live in src/index.ts. Rebuild after changing routes before using routes:list. 
