# premium-bond-api

A REST API for calculating the actual effective interest rate earned from UK NS&I Premium Bonds, based on your real investment history and prize winnings. Built to power the [NinaKWelch/premium-bond](https://github.com/NinaKWelch/premium-bond) frontend.

## How it works

1. Add your deposits and withdrawals as they happen
2. Record prizes when you win them
3. Call `/api/bonds/calculate` to see your effective interest rate by year

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (the project uses [Neon](https://neon.tech) — free tier available)

### Local development

Copy `.env.example` to `.env` and fill in your values:

```
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
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

### Docker

```bash
docker compose up --build
```

Rebuilding is only needed when dependencies or the `Dockerfile` change. For subsequent starts:

```bash
docker compose up
```

To stop:

```bash
docker compose down
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled build |
| `npm test` | Run tests |

## API

Swagger UI is available at `http://localhost:3000/api-docs` once the server is running.

### Transactions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bonds/transactions` | List all transactions |
| `POST` | `/api/bonds/transactions` | Add a deposit or withdrawal |
| `PUT` | `/api/bonds/transactions/:id` | Update a transaction |
| `DELETE` | `/api/bonds/transactions/:id` | Remove a transaction |

### Prizes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bonds/prizes` | List all prizes |
| `POST` | `/api/bonds/prizes` | Add a prize |
| `PUT` | `/api/bonds/prizes/:id` | Update a prize |
| `DELETE` | `/api/bonds/prizes/:id` | Remove a prize |

### Calculate

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bonds/calculate` | Calculate effective interest from stored data |

Dates use `YYYY-MM` format throughout.

## Usage examples

**Add a deposit**
```bash
curl -X POST http://localhost:3000/api/bonds/transactions \
  -H "Content-Type: application/json" \
  -d '{"date": "2022-01", "amount": 1000, "type": "deposit"}'
```

**Add a withdrawal**
```bash
curl -X POST http://localhost:3000/api/bonds/transactions \
  -H "Content-Type: application/json" \
  -d '{"date": "2023-06", "amount": 500, "type": "withdrawal"}'
```

**Add a prize**
```bash
curl -X POST http://localhost:3000/api/bonds/prizes \
  -H "Content-Type: application/json" \
  -d '{"date": "2022-09", "amount": 25}'
```

**Calculate your effective interest rate**
```bash
curl http://localhost:3000/api/bonds/calculate
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
    },
    {
      "year": 2023,
      "amountInvested": -500,
      "averageBalance": 723.29,
      "prizesWon": 50,
      "effectiveRatePct": 6.91
    }
  ],
  "overall": {
    "totalInvested": 500,
    "totalPrizesWon": 75,
    "averageAnnualRatePct": 6.12
  }
}
```

## Running tests

```bash
npm test
```
