<div align="center">

# 🎬 Movie Portal

**Movie catalogue with search, genres, favorites and member-added movies.**

[**Live demo**](https://movie-portal-frontend-tau.vercel.app/) · [Frontend](https://github.com/rudraprotapchakraborty/movie-portal-frontend) · [API status](https://movie-portal-backend-chi.vercel.app/) · [Portfolio](https://rudraprotapchakraborty.com/projects)

![Node.js](https://img.shields.io/badge/Node.js-3c873a?style=for-the-badge&logo=nodedotjs&logoColor=ffffff) ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=ffffff) ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff) ![MongoDB](https://img.shields.io/badge/MongoDB-47a248?style=for-the-badge&logo=mongodb&logoColor=ffffff) ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=ffffff) ![Google Sign--In](https://img.shields.io/badge/Google_Sign--In-4285f4?style=for-the-badge&logo=google&logoColor=ffffff)

<a href="https://movie-portal-frontend-tau.vercel.app/"><img src="https://i.ibb.co/fhbYrFV/movie-portal.webp" alt="Movie Portal: home page" width="880"></a>

</div>

> The REST API of **Movie Portal**.
>
> - 88 titles with posters, runtimes and synopses from Wikipedia
> - Search, genre filters, sorting and paging without an account
> - Members save favourites and add their own movies
> - Owners and admins can edit or delete what they added

REST API for the [Movie Portal](https://movie-portal-frontend-tau.vercel.app/) ([frontend repository](https://github.com/rudraprotapchakraborty/movie-portal-frontend)). Deployed at [movie-portal-backend-chi.vercel.app](https://movie-portal-backend-chi.vercel.app/). Express 5, TypeScript, MongoDB (Mongoose) and Zod.

## Features

- Public catalogue with search, genre filter, sorting and pagination
- Movies belong to the person who added them: only the owner (or an admin) can edit or delete. Fields are validated, unknown fields are ignored, so nobody can fake an owner
- Favorites: one per person per movie (enforced by a unique index), deleted automatically with the movie or the account
- Auth: email and password with a six digit email code (HMAC-hashed, 10 minute expiry, 5 attempts, 60 second resend), Google ID-token sign-in, forgot and reset password
- Account: change name and photo, password, email (code sent to the new address), delete account with confirmation
- Roles `USER` and `ADMIN`, with member management and statistics for admins
- Newsletter sign-up with its own rate limit
- Shared demo accounts that are locked down: no sign-in or profile changes, no deletion, cannot touch the sample catalogue, and a demo admin only sees demo data
- Helmet, CORS allow list, rate limits, and the JWT is checked against the database on each request so blocks and role changes apply immediately

## Run it locally

```bash
npm install
cp .env.example .env     # fill in the values
npm run dev              # http://localhost:5000
npm run seed             # sample catalogue and demo accounts
```

`npm run seed:clear` removes the demo data again. Only accounts flagged as demo, and the movies and favorites that belong to them, are ever touched.

The sample catalogue lives in `scripts/movies.seed.json`: 88 movies with titles, runtimes, release years, posters and synopses taken from Wikipedia and Wikidata. Genres and the 0 to 10 ratings are curated (approximate, IMDb-style scores).

## Environment

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI`, `MONGODB_DB` | Database connection. The app uses its own database (default `movie_portal`). |
| `JWT_ACCESS_SECRET` | Secret for signing tokens and hashing codes. |
| `CLIENT_URL` | Comma separated list of allowed browser origins. Defaults to localhost and the live frontend. |
| `GOOGLE_CLIENT_ID` | Google OAuth client id used to verify ID tokens. |
| `SMTP_*`, `MAIL_FROM`, `RESEND_API_KEY` | Email delivery (SMTP first, Resend as fallback). Without either, codes are printed to the console in development. |
| `IMGBB_API_KEY` | Hosts profile photos. |

## API overview

All routes live under `/api`. Responses look like `{ "success": true, "data": ... }`.

| Area | Routes |
| --- | --- |
| Movies | `GET /movies` (`q`, `genre`, `sort`, `page`, `limit`), `/movies/top`, `/movies/latest`, `/movies/genres`, `/movies/mine`, `/movies/:id`, `POST /movies`, `PATCH /movies/:id`, `DELETE /movies/:id` |
| Favorites | `GET /favorites`, `GET /favorites/ids`, `PUT /favorites/:movieId`, `DELETE /favorites/:movieId` |
| Auth | `POST /auth/register`, `/auth/verify-email`, `/auth/resend-otp`, `/auth/login`, `/auth/google`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/demo-accounts` |
| Account | `GET/PATCH /users/me/self`, `GET /users/me/methods`, `POST /users/me/password`, `POST` and `PUT /users/me/email`, `DELETE /users/me` |
| Admin | `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/:userId`, `DELETE /admin/users/:userId` |
| Other | `POST /newsletter`, `POST /uploads/image`, `GET /public/stats`, `GET /health` |

## Deploying

Vercel is supported out of the box: `api/index.ts` is the serverless entry and `vercel.json` rewrites every request to it (the MongoDB connection is cached between invocations). Set the environment variables above in the project settings, including `CLIENT_URL`.

---

<div align="center">

Made by **[Rudra Protap Chakraborty](https://rudraprotapchakraborty.com)** · [Portfolio](https://rudraprotapchakraborty.com) · [GitHub](https://github.com/rudraprotapchakraborty)

</div>
