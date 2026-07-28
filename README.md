# NestJS Auth API

A complete, production-style **authentication & authorization backend** built with **NestJS**, **Drizzle ORM**, and **PostgreSQL (Neon)**. It implements email/password registration with email verification, JWT access/refresh token authentication, role-based access control (RBAC), password reset flows, rate limiting, and a small task-management module used to demonstrate protected, user-scoped resources.

Interactive API documentation is auto-generated with **Swagger (OpenAPI)**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup with Drizzle](#database-setup-with-drizzle)
  - [Running the App](#running-the-app)
- [Testing the API with Swagger](#testing-the-api-with-swagger)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Authorization & Guards](#authorization--guards)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Available Scripts](#available-scripts)
- [Roadmap / Ideas for Improvement](#roadmap--ideas-for-improvement)

---

## Features

- 🔐 **Email/password registration** with secure password hashing (bcrypt)
- 📧 **Email verification** on signup, powered by Resend
- 🔑 **JWT authentication** using short-lived access tokens + long-lived refresh tokens
- 🍪 **Refresh tokens stored in secure, HTTP-only cookies** (not accessible to client-side JS)
- 🔄 **Silent token refresh** endpoint to rotate access tokens without forcing re-login
- 🚪 **Logout** that invalidates the stored refresh token server-side
- 🧑‍🤝‍🧑 **Role-Based Access Control (RBAC)** with a custom `@Roles()` decorator and guard (`user` / `admin`)
- 🛡️ **Global authentication guard** — every route is protected by default; only routes explicitly marked `@Public()` are open
- ✉️ **Forgot / reset password** flow with time-limited, single-use tokens sent by email
- 🚦 **Rate limiting (throttling)** on sensitive endpoints (login, forgot-password) to slow down brute-force attempts
- 📋 **Task management module** — a simple CRUD resource scoped to the authenticated user, used to demonstrate protected endpoints in practice
- 🧰 **Global validation** via `class-validator` / `class-transformer` (whitelist + strict DTOs)
- 📖 **Swagger/OpenAPI docs** generated automatically from decorators
- 🗄️ **Drizzle ORM** with a fully typed schema, running on **Neon Postgres** (serverless HTTP driver)

---

## Tech Stack

| Layer               | Technology                                               |
| ------------------- | -------------------------------------------------------- |
| Framework           | [NestJS 11](https://nestjs.com/)                         |
| Language            | TypeScript                                               |
| Database            | PostgreSQL ([Neon](https://neon.tech) serverless)        |
| ORM                 | [Drizzle ORM](https://orm.drizzle.team/) + `drizzle-kit` |
| Authentication      | `@nestjs/jwt` (access + refresh tokens)                  |
| Password hashing    | `bcryptjs`                                               |
| Validation          | `class-validator`, `class-transformer`                   |
| API docs            | `@nestjs/swagger` + `swagger-ui-express`                 |
| Rate limiting       | `@nestjs/throttler`                                      |
| Transactional email | [Resend](https://resend.com)                             |
| Cookies             | `cookie-parser`                                          |
| Testing             | Jest, Supertest                                          |
| Linting/formatting  | ESLint, Prettier                                         |

---

## Project Structure

```
src/
├── admin/                  # Admin-only endpoints (list/delete users)
│   ├── admin.controller.ts
│   └── admin.module.ts
│
├── auth/                    # Registration, login, tokens, password reset
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── email.service.ts     # Sends verification & reset emails via Resend
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       ├── forgot-password.dto.ts
│       └── reset-password.dto.ts
│
├── users/                   # User persistence layer (Drizzle queries)
│   ├── users.service.ts
│   └── users.module.ts
│
├── tasks/                   # Example protected, user-scoped CRUD resource
│   ├── tasks.controller.ts
│   ├── tasks.service.ts
│   ├── tasks.module.ts
│   └── dto/
│       └── create-task.dto.ts
│
├── common/
│   ├── decorators/
│   │   ├── public.decorator.ts       # @Public() — bypasses the global auth guard
│   │   ├── roles.decorator.ts        # @Roles('admin') — sets required roles metadata
│   │   └── current-user.decorator.ts # @CurrentUser() — injects the authenticated user
│   ├── guards/
│   │   ├── jwt-auth.guard.ts         # Global guard: validates the Bearer access token
│   │   └── roles.guard.ts            # Global guard: enforces @Roles() metadata
│   └── filters/
│       └── http-exception.filter.ts  # Normalizes error responses
│
├── db/
│   ├── schema.ts             # Drizzle table + enum definitions
│   └── index.ts              # Drizzle client bound to the Neon connection
│
├── app.module.ts             # Root module — wires up Config, Throttler, JWT, guards
└── main.ts                   # Bootstrap: validation, cookies, Swagger, global prefix
```

---

## Database Schema

Defined with Drizzle ORM in `src/db/schema.ts`, using PostgreSQL enums and UUID primary keys.

**`users`**

| Column                                             | Type                    | Notes                                                  |
| -------------------------------------------------- | ----------------------- | ------------------------------------------------------ |
| `id`                                               | `uuid`                  | Primary key, auto-generated                            |
| `email`                                            | `text`                  | Unique, required                                       |
| `passwordHash`                                     | `text`                  | bcrypt hash, never returned to the client              |
| `name`                                             | `text`                  | Required                                               |
| `role`                                             | `enum('user', 'admin')` | Defaults to `user`                                     |
| `isVerified`                                       | `boolean`               | Set to `true` once the email is verified               |
| `verificationToken` / `verificationTokenExpiresAt` | `text` / `timestamp`    | Used by the email-verification flow                    |
| `resetToken` / `resetTokenExpiresAt`               | `text` / `timestamp`    | Used by the forgot/reset-password flow                 |
| `refreshTokenHash`                                 | `text`                  | Hashed refresh token, used to validate `/auth/refresh` |
| `createdAt` / `updatedAt`                          | `timestamp`             | Auto-managed                                           |

**`tasks`**

| Column                    | Type                                  | Notes                                        |
| ------------------------- | ------------------------------------- | -------------------------------------------- |
| `id`                      | `uuid`                                | Primary key                                  |
| `title`                   | `text`                                | Required                                     |
| `description`             | `text`                                | Optional                                     |
| `status`                  | `enum('todo', 'in_progress', 'done')` | Defaults to `todo`                           |
| `userId`                  | `uuid`                                | Foreign key → `users.id`, cascades on delete |
| `createdAt` / `updatedAt` | `timestamp`                           | Auto-managed                                 |

Drizzle automatically derives TypeScript types from this schema (`User`, `NewUser`, `Task`, `NewTask`), so query results are fully typed with no manual interfaces to maintain.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm**
- A **PostgreSQL** database — this project is built against [Neon](https://neon.tech) (free serverless Postgres), but any Postgres connection string will work with the `drizzle-orm/neon-http` driver as long as it's Neon-compatible. To use a plain/local Postgres instance instead, swap the driver in `src/db/index.ts` for `drizzle-orm/node-postgres`.
- A **Resend** account (free tier is enough) to send verification/reset emails

### Installation

```bash
git clone https://github.com/Badr-Eddine-Bourghel/NESTJS-AUTH.git
cd NESTJS-AUTH
npm install
```

### Environment Variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

| Variable                 | Description                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Your Postgres/Neon connection string                                                                                            |
| `JWT_ACCESS_SECRET`      | Secret used to sign access tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET`     | Secret used to sign refresh tokens (must differ from the access secret)                                                         |
| `JWT_ACCESS_EXPIRES_IN`  | Access token lifetime, e.g. `15m`                                                                                               |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime, e.g. `7d`                                                                                               |
| `RESEND_API_KEY`         | API key from [resend.com](https://resend.com), used to send verification/reset emails                                           |
| `APP_URL`                | Base URL of the app, used to build links inside emails (e.g. `http://localhost:3000`)                                           |
| `PORT`                   | Port the server listens on (defaults to `3000`)                                                                                 |

### Database Setup with Drizzle

This project uses **Drizzle Kit** to manage schema migrations against the database defined in `drizzle.config.ts` (schema source: `src/db/schema.ts`, output folder: `./drizzle`).

```bash
# Generate SQL migration files from the current schema
npm run db:generate

# Apply the pending migrations to your database
npm run db:migrate

# OR: push the schema directly without generating migration files (fast, good for prototyping)
npm run db:push

# Open Drizzle Studio — a visual browser for your database
npm run db:studio
```

> During early development, `db:push` is usually the fastest way to sync your schema. Once the schema stabilizes, prefer `db:generate` + `db:migrate` so you have a versioned migration history.

### Running the App

```bash
# development (single run)
npm run start

# watch mode (recommended for local dev — restarts on file changes)
npm run start:dev

# production build
npm run build
npm run start:prod
```

Once running, the console will print:

```
Application running on http://localhost:3000/api
Swagger docs at http://localhost:3000/api/docs
```

Note the global prefix: **every route is under `/api`** (configured in `main.ts` via `app.setGlobalPrefix('api')`).

---

## Testing the API with Swagger

This project ships with a fully interactive Swagger UI, generated from the `@Api...` decorators on each controller.

1. Start the server (`npm run start:dev`).
2. Open **`http://localhost:3000/api/docs`** in your browser.
3. You'll see every endpoint grouped by tag: **Auth**, **Tasks**, **Admin**.

**Typical test flow inside Swagger:**

1. **`POST /auth/register`** — create an account with `email`, `password`, `name`.
2. Check the inbox tied to your `RESEND_API_KEY` test setup (or the Resend dashboard logs) for the verification email, and open the verification link, or call **`GET /auth/verify-email?token=...`** directly from Swagger.
3. **`POST /auth/login`** — returns an `accessToken` in the response body and silently sets a `refresh_token` HTTP-only cookie.
4. Click the **Authorize 🔒** button at the top of the Swagger page and paste the `accessToken` (Swagger sends it as `Authorization: Bearer <token>` on every subsequent request, since the API uses `.addBearerAuth()` in `main.ts`).
5. Call protected routes such as **`GET /auth/me`** or **`GET /tasks`** — Swagger will now include your token automatically.
6. **`POST /auth/refresh`** — relies on the `refresh_token` cookie (not the bearer token) to mint a new access token; this works out of the box in a real browser, but Swagger UI's "try it out" runs cross-origin, so cookie-based refresh is best tested with a REST client (Postman/Insomnia/Thunder Client) or `curl -i` where you can inspect the `Set-Cookie` header directly.
7. **`POST /auth/logout`** — invalidates the stored refresh token server-side and clears the cookie.

> Because the global `JwtAuthGuard` protects everything by default, any endpoint **not** marked `@Public()` in the controller will return `401 Unauthorized` in Swagger until you authorize with a valid access token.

---

## Authentication Flow

```
┌────────────┐   register    ┌────────────┐   verification email   ┌───────────┐
│   Client   │ ───────────▶  │   Server   │ ─────────────────────▶ │  Resend   │
└────────────┘               └────────────┘                        └───────────┘
      │                                                                   │
      │  clicks verification link (GET /auth/verify-email?token=...)     │
      │◀──────────────────────────────────────────────────────────────────┘
      │
      │  login (email + password)
      ▼
┌────────────┐  accessToken (body) + refresh_token (httpOnly cookie)
│   Server   │ ─────────────────────────────────────────────────────▶ Client
└────────────┘
      │
      │  subsequent requests: Authorization: Bearer <accessToken>
      │  when access token expires → POST /auth/refresh (uses cookie)
      ▼
  new accessToken issued, refresh token rotated
```

- **Access tokens** are short-lived (`JWT_ACCESS_EXPIRES_IN`, default `15m`) and sent as a Bearer token in the `Authorization` header.
- **Refresh tokens** are long-lived (`JWT_REFRESH_EXPIRES_IN`, default `7d`), stored **hashed** in the database, and delivered to the client only via an **HTTP-only, `sameSite=lax` cookie** — this means client-side JavaScript can never read it, which mitigates XSS-based token theft.
- On every refresh, a **new refresh token is issued and the old hash is replaced**, so a leaked/stale refresh token stops working after the next legitimate refresh.
- Logging out clears the cookie and wipes the stored refresh token hash, so a stolen token can't be replayed after logout.

---

## API Endpoints

All routes are prefixed with `/api`.

### Auth (`/api/auth`)

| Method | Endpoint                       | Auth required   | Description                                                 |
| ------ | ------------------------------ | --------------- | ----------------------------------------------------------- |
| `POST` | `/auth/register`               | Public          | Create a new account and send a verification email          |
| `GET`  | `/auth/verify-email?token=...` | Public          | Verify the account and auto-login (sets refresh cookie)     |
| `POST` | `/auth/login`                  | Public          | Authenticate with email/password (rate-limited: 5 req / 6s) |
| `POST` | `/auth/refresh`                | Public (cookie) | Issue a new access token from the refresh cookie            |
| `POST` | `/auth/logout`                 | Bearer token    | Invalidate the refresh token and clear the cookie           |
| `GET`  | `/auth/me`                     | Bearer token    | Return the current authenticated user's profile             |
| `POST` | `/auth/forgot-password`        | Public          | Send a password-reset email (rate-limited: 3 req / 6s)      |
| `POST` | `/auth/reset-password`         | Public          | Reset the password using the emailed token                  |

### Tasks (`/api/tasks`) — example protected resource

| Method   | Endpoint     | Auth required | Description                                  |
| -------- | ------------ | ------------- | -------------------------------------------- |
| `GET`    | `/tasks`     | Bearer token  | List all tasks belonging to the current user |
| `POST`   | `/tasks`     | Bearer token  | Create a task for the current user           |
| `PATCH`  | `/tasks/:id` | Bearer token  | Update one of the current user's tasks       |
| `DELETE` | `/tasks/:id` | Bearer token  | Delete one of the current user's tasks       |

### Admin (`/api/admin`) — requires `role: admin`

| Method   | Endpoint           | Auth required               | Description                   |
| -------- | ------------------ | --------------------------- | ----------------------------- |
| `GET`    | `/admin/users`     | Bearer token + `admin` role | List every user in the system |
| `DELETE` | `/admin/users/:id` | Bearer token + `admin` role | Delete a user by id           |

---

## Authorization & Guards

Three guards are registered **globally** in `app.module.ts` (order matters — they run in this sequence for every request):

1. **`ThrottlerGuard`** — enforces the default rate limit (20 requests / 6s), overridden per-route with `@Throttle()`.
2. **`JwtAuthGuard`** — reads the `Authorization: Bearer <token>` header, verifies it against `JWT_ACCESS_SECRET`, loads the user from the database, and attaches it to `request.user`. Routes decorated with **`@Public()`** skip this check entirely (used for register/login/refresh/etc.).
3. **`RolesGuard`** — reads role metadata set by **`@Roles('admin')`** on a controller/handler and compares it against `request.user.role`. If no `@Roles()` metadata is present, the route is allowed through (already protected by `JwtAuthGuard`).

Two custom decorators make this ergonomic:

- **`@CurrentUser()`** — a param decorator that pulls the authenticated user straight out of `request.user`, so controllers never touch the raw `Request` object.
- **`@Public()`** — marks a route as exempt from the global JWT guard.
- **`@Roles(...roles)`** — restricts a route to one or more roles (used on the entire `AdminController` in this project).

---

## Rate Limiting

Implemented with `@nestjs/throttler`:

- **Global default:** 20 requests per 6-second window per client (`ThrottlerModule.forRoot`).
- **`POST /auth/login`:** tightened to 5 requests / 6s to slow down credential-stuffing attempts.
- **`POST /auth/forgot-password`:** tightened to 3 requests / 6s to prevent email-bombing a target address.

---

## Error Handling

A global `HttpExceptionFilter` (registered in `main.ts` via `app.useGlobalFilters`) normalizes every thrown `HttpException` into a consistent JSON error shape, so API consumers can rely on a predictable error format regardless of which part of the app threw it.

Combined with the global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`), any request body that doesn't match its DTO — missing fields, wrong types, or unexpected extra properties — is rejected with a `400 Bad Request` before it ever reaches a controller.

---

## Available Scripts

| Script                | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `npm run start`       | Start the app once                                            |
| `npm run start:dev`   | Start in watch mode                                           |
| `npm run start:prod`  | Run the compiled `dist/main.js`                               |
| `npm run build`       | Compile TypeScript to `dist/`                                 |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema               |
| `npm run db:migrate`  | Apply pending migrations                                      |
| `npm run db:push`     | Push the schema directly to the database (no migration files) |
| `npm run db:studio`   | Launch Drizzle Studio (visual DB browser)                     |
| `npm run lint`        | Run ESLint with autofix                                       |
| `npm run format`      | Run Prettier on `src` and `test`                              |
| `npm run test`        | Run unit tests                                                |
| `npm run test:e2e`    | Run end-to-end tests                                          |
| `npm run test:cov`    | Run tests with coverage report                                |

---

## Roadmap / Ideas for Improvement

- [ ] Add refresh-token rotation reuse detection (invalidate all sessions if a used/old refresh token is replayed)
- [ ] Add OAuth providers (Google/GitHub) alongside password auth
- [ ] Add pagination/filtering to `GET /admin/users` and `GET /tasks`
- [ ] Add e2e test coverage for the full auth flow (register → verify → login → refresh → logout)
- [ ] Containerize with Docker Compose for local Postgres + app

---

## License

This project is `UNLICENSED` / private, intended as a learning and portfolio project.
