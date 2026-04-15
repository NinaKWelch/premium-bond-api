import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import bondsRouter from './routes/bonds';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Premium Bonds API',
      version: '1.0.0',
      description:
        'Calculate the actual interest rate earned from UK NS&I Premium Bonds based on your real investment history and prize winnings.',
    },
    components: {
      schemas: {
        Transaction: {
          type: 'object',
          required: ['id', 'date', 'amount', 'type'],
          properties: {
            id: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            date: { type: 'string', format: 'date', example: '2022-01-15' },
            amount: { type: 'number', example: 1000 },
            type: { type: 'string', enum: ['deposit', 'withdrawal'] },
          },
        },
        TransactionBody: {
          type: 'object',
          required: ['date', 'amount', 'type'],
          properties: {
            date: { type: 'string', format: 'date', example: '2022-01-15' },
            amount: { type: 'number', example: 1000 },
            type: { type: 'string', enum: ['deposit', 'withdrawal'] },
          },
        },
        Prize: {
          type: 'object',
          required: ['id', 'date', 'amount'],
          properties: {
            id: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            date: { type: 'string', format: 'date', example: '2022-09-10' },
            amount: { type: 'number', example: 25 },
          },
        },
        PrizeBody: {
          type: 'object',
          required: ['date', 'amount'],
          properties: {
            date: { type: 'string', format: 'date', example: '2022-09-10' },
            amount: { type: 'number', example: 25 },
          },
        },
        CalculationResult: {
          type: 'object',
          properties: {
            byYear: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: { type: 'integer', example: 2022 },
                  averageBalance: { type: 'number', example: 1254.79 },
                  prizesWon: { type: 'number', example: 25 },
                  effectiveRatePct: { type: 'number', example: 1.99 },
                },
              },
            },
            overall: {
              type: 'object',
              properties: {
                totalInvested: { type: 'number', example: 1500 },
                totalPrizesWon: { type: 'number', example: 75 },
                averageAnnualRatePct: { type: 'number', example: 2.72 },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Transaction not found' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Invalid request body' },
            details: {
              type: 'object',
              properties: {
                fieldErrors: { type: 'object' },
                formErrors: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  },
  // swagger-jsdoc scans these files for @openapi JSDoc comments
  apis: ['./src/routes/*.ts'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/bonds', bondsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Express identifies error-handling middleware by its 4-parameter signature.
// All four arguments must be declared even if unused, or Express won't treat
// this as an error handler.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
