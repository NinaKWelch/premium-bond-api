import { Router } from 'express';
import { calculate } from '../controllers/bonds.controller';
import {
  list as listTransactions,
  add as addTransaction,
  update as updateTransaction,
  remove as removeTransaction,
} from '../controllers/transactions.controller';
import {
  list as listPrizes,
  add as addPrize,
  update as updatePrize,
  remove as removePrize,
} from '../controllers/prizes.controller';

const router = Router();

// --- Transactions ---

/**
 * @openapi
 * /api/bonds/transactions:
 *   get:
 *     summary: List all transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Array of stored transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */
router.get('/transactions', listTransactions);

/**
 * @openapi
 * /api/bonds/transactions:
 *   post:
 *     summary: Add a deposit or withdrawal
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionBody'
 *     responses:
 *       201:
 *         description: Transaction created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Validation error or withdrawal exceeds balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/transactions', addTransaction);

/**
 * @openapi
 * /api/bonds/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionBody'
 *     responses:
 *       200:
 *         description: Updated transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Validation error or would cause negative balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/transactions/:id', updateTransaction);

/**
 * @openapi
 * /api/bonds/transactions/{id}:
 *   delete:
 *     summary: Remove a transaction
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Transaction deleted
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/transactions/:id', removeTransaction);

// --- Prizes ---

/**
 * @openapi
 * /api/bonds/prizes:
 *   get:
 *     summary: List all prizes
 *     tags: [Prizes]
 *     responses:
 *       200:
 *         description: Array of stored prizes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prize'
 */
router.get('/prizes', listPrizes);

/**
 * @openapi
 * /api/bonds/prizes:
 *   post:
 *     summary: Add a prize
 *     tags: [Prizes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrizeBody'
 *     responses:
 *       201:
 *         description: Prize created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prize'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/prizes', addPrize);

/**
 * @openapi
 * /api/bonds/prizes/{id}:
 *   put:
 *     summary: Update a prize
 *     tags: [Prizes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrizeBody'
 *     responses:
 *       200:
 *         description: Updated prize
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prize'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Prize not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/prizes/:id', updatePrize);

/**
 * @openapi
 * /api/bonds/prizes/{id}:
 *   delete:
 *     summary: Remove a prize
 *     tags: [Prizes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Prize deleted
 *       404:
 *         description: Prize not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/prizes/:id', removePrize);

// --- Calculate ---

/**
 * @openapi
 * /api/bonds/calculate:
 *   get:
 *     summary: Calculate effective interest rate from stored data
 *     description: Returns the time-weighted effective annual interest rate for each calendar year, plus an overall average. Requires at least one deposit to be stored.
 *     tags: [Calculate]
 *     responses:
 *       200:
 *         description: Calculation result broken down by year with an overall summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalculationResult'
 *       400:
 *         description: No deposits found in store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/calculate', calculate);

export default router;
