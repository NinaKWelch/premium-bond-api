# premium-bond-api

A REST API for calculating the actual effective interest rate earned from UK NS&I Premium Bonds, based on your real investment history and prize winnings. Built to power the [NinaKWelch/premium-bond](https://github.com/NinaKWelch/premium-bond) frontend.

**Deployed on Heroku.** Swagger UI available at `/api-docs` on the live API.

## How it works

1. Create an account and log in to receive a JWT
2. Add your deposits, withdrawals, and prizes
3. Call `/api/bonds/calculate` to see your effective interest rate by year
4. All data is scoped to your account — no other user can see or modify it

## Getting started

### Prerequisites

- Node.js 22+
- A PostgreSQL database (the project uses [Neon](https://neon.tech) — free tier available)

### Local development

Copy `.env.example` to `.env` and fill in your values:

```
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET=your-secret-here
```

Generate a strong `JWT_SECRET` with:

```bash
openssl rand -base64 32
```

Then install dependencies and run the dev server:

```bash
npm install
npm run dev
```

The API runs on `http://localhost:3000` by default.

### Database setup

The project uses [Prisma](https://www.prisma.io/) with PostgreSQL. To create the tables in a fresh database:

```bash
npx prisma migrate deploy
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Generate the Prisma client |
| `npm start` | Run the server with tsx |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |

## Deployment

The API is deployed to [Heroku](https://heroku.com) using the Node.js buildpack. The `Procfile` runs database migrations on each release and starts the server:

```
release: npx prisma migrate deploy
web: tsx src/index.ts
```

### Heroku environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Set automatically by the Heroku Postgres add-on |
| `JWT_SECRET` | Long random string for signing JWTs |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |

## API

Swagger UI is available at `/api-docs` once the server is running. Use it to explore and test all endpoints — log in via `POST /api/users/login` and click **Authorize** to set your token.

### Authentication

All `/api/bonds/*` endpoints and the user listing endpoints require a `Bearer` token in the `Authorization` header.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/users/register` | Create an account | No |
| `POST` | `/api/users/login` | Log in and receive a JWT | No |
| `DELETE` | `/api/users/me` | Delete your account and all data | Yes |
| `GET` | `/api/users` | List all users with their activity | Yes |
| `GET` | `/api/users/:id` | Get a single user with their activity | Yes |

### Transactions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bonds/transactions` | List your transactions |
| `POST` | `/api/bonds/transactions` | Add a deposit, withdrawal, or reinvestment |
| `PUT` | `/api/bonds/transactions/:id` | Update a transaction |
| `DELETE` | `/api/bonds/transactions/:id` | Remove a transaction |

### Prizes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bonds/prizes` | List your prizes |
| `POST` | `/api/bonds/prizes` | Add a prize |
| `PUT` | `/api/bonds/prizes/:id` | Update a prize |
| `DELETE` | `/api/bonds/prizes/:id` | Remove a prize |

### Calculate

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bonds/calculate` | Calculate effective interest from your stored data |

Dates use `YYYY-MM` format throughout.

## Usage examples

**Register**
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword"}'
```

**Log in**
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword"}'
```

Copy the `token` from the response and pass it as a `Bearer` token in subsequent requests.

**Add a deposit**
```bash
curl -X POST http://localhost:3000/api/bonds/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"date": "2022-01", "amount": 1000, "type": "deposit"}'
```

**Add a prize**
```bash
curl -X POST http://localhost:3000/api/bonds/prizes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"date": "2022-09", "amount": 25}'
```

**Calculate your effective interest rate**
```bash
curl http://localhost:3000/api/bonds/calculate \
  -H "Authorization: Bearer <token>"
```

**Example response**
```json
{
  "byYear": [
    {
      "year": 2022,
      "amountInvested": 1000,
      "averageBalance": 504.79,
      "prizesWon": 25,
      "effectiveRatePct": 4.95
    }
  ],
  "overall": {
    "totalInvested": 1000,
    "totalPrizesWon": 25,
    "cashDeposited": 1000,
    "averageAnnualRatePct": 4.95
  }
}
```

**Delete your account**
```bash
curl -X DELETE http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <token>"
```

## Running tests

```bash
npm test
```
