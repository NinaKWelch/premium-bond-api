# premium-bond-api

A REST API for calculating the actual interest rate earned from UK NS&I Premium Bonds based on your real investment history and prize winnings.

## How it works

1. Add your deposits and withdrawals as they happen
2. Record prizes when you win them
3. Call `/api/bonds/calculate` to see your effective interest rate by year

## Getting started

### Local development

```bash
npm install
npm run dev
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

The API runs on `http://localhost:3000` by default. Configure the port and allowed origins in `.env` (copy from `.env.example`).

Swagger UI is available at `http://localhost:3000/api-docs` once the server is running.

## Endpoints

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

## Usage examples

**List all transactions**
```bash
curl http://localhost:3000/api/bonds/transactions
```

**Add a deposit**
```bash
curl -X POST http://localhost:3000/api/bonds/transactions \
  -H "Content-Type: application/json" \
  -d '{"date": "2022-01-15", "amount": 1000, "type": "deposit"}'
```

**Add a withdrawal**
```bash
curl -X POST http://localhost:3000/api/bonds/transactions \
  -H "Content-Type: application/json" \
  -d '{"date": "2023-06-01", "amount": 500, "type": "withdrawal"}'
```

**Update a transaction**
```bash
curl -X PUT http://localhost:3000/api/bonds/transactions/<id> \
  -H "Content-Type: application/json" \
  -d '{"date": "2022-01-15", "amount": 1500, "type": "deposit"}'
```

**Delete a transaction**
```bash
curl -X DELETE http://localhost:3000/api/bonds/transactions/<id>
```

**List all prizes**
```bash
curl http://localhost:3000/api/bonds/prizes
```

**Add a prize**
```bash
curl -X POST http://localhost:3000/api/bonds/prizes \
  -H "Content-Type: application/json" \
  -d '{"date": "2022-09-10", "amount": 25}'
```

**Update a prize**
```bash
curl -X PUT http://localhost:3000/api/bonds/prizes/<id> \
  -H "Content-Type: application/json" \
  -d '{"date": "2022-09-10", "amount": 50}'
```

**Delete a prize**
```bash
curl -X DELETE http://localhost:3000/api/bonds/prizes/<id>
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
      "averageBalance": 1254.79,
      "prizesWon": 25,
      "effectiveRatePct": 1.99
    },
    {
      "year": 2023,
      "averageBalance": 1500,
      "prizesWon": 50,
      "effectiveRatePct": 3.33
    }
  ],
  "overall": {
    "totalInvested": 1500,
    "totalPrizesWon": 75,
    "averageAnnualRatePct": 2.72
  }
}
```

## Data storage

Data is persisted in `data/store.json` on disk. This file is gitignored so your personal data is never committed. When you are ready to move to a database, only the store layer needs to change — all calculation logic stays the same.

## Running tests

```bash
npm test
```
