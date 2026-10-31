# Backend setup

Install dependencies from this directory:

```sh
npm install
```

Copy `.env.example` to `.env` and set `MONGO_URI`, `EMAIL_USER`,
`EMAIL_PASS`, and `CLIENT_URL`. The default SMTP settings use Gmail on port
587 with STARTTLS. For Gmail, enable 2-Step Verification and create a Google
App Password for `EMAIL_PASS`; enter the App Password with or without spaces.
Do not use your regular Gmail password. For another SMTP provider, set
`SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE` to that provider's settings. Keep
`.env` private and never commit it.

The backend exposes:

- `POST /api/users/register` — create an unverified user and email an
  8-digit verification code that expires after 15 minutes.
- `POST /api/auth/verify-email` — verify using `{ "code": "12345678" }`.
- `POST /api/auth/resend-verification` — accept `{ "email": "..." }` and
  return a generic response; requests are limited to five per IP per 15 minutes.

Verification attempts are limited to ten per IP per 15 minutes. The current
project contains no React/Vite frontend and no login endpoint or
password/authentication implementation, so the email verification page must
collect the 8-digit code and send it as the `code` field.
