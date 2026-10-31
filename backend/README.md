# Backend setup

Install dependencies from this directory:

```sh
npm install
```

Configure `MONGODB_URL` (or `MONGO_URI`), `AUTH_TOKEN_SECRET` (at least 32
bytes), and `ADMIN_DASHBOARD_PASSWORD` (at least 16 characters). Set
`CORS_ORIGINS` to a comma-separated list of allowed frontend origins. Keep
`.env` private and never commit it.

The backend exposes:

- `POST /api/users/register` — create a user and start an authenticated
  session immediately.
- `GET /api/registrations/selections/me` and
  `POST /api/registrations/selections` — read and save the authenticated
  user's programme selections.
