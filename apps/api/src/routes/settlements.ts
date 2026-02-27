import { Router } from 'express';
import { z } from 'zod';

import { SETTLEMENT_CALCULATION_METHODS, type FreightRepository } from '@antigravity/db';

import { requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { PDFGeneratorService } from '../services/settlement/PDFGeneratorService.js';
import { SettlementCalculationService } from '../services/settlement/SettlementCalculationService.js';

const flexibleBoolean = z.preprocess((val) => {
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return val;
}, z.boolean());

const updateDirectExceptionsSchema = z.object({
  customerIds: z.array(z.string().uuid()).default([]),
});

const updateTierSchema = z.object({
  brokerLoadPay: z.number().finite().nonnegative(),
  tier1MaxLoad: z.number().int().nonnegative(),
  tier1Rate: z.number().finite().nonnegative(),
  tier2MaxLoad: z.number().int().positive(),
  tier2Rate: z.number().finite().nonnegative(),
  tier3Rate: z.number().finite().nonnegative(),
});

const updateDefaultFlatPaySchema = z.object({
  defaultFlatPay: z.number().finite().nonnegative().nullable(),
  excludeFromPayroll: flexibleBoolean.optional(),
});

const generateSettlementSchema = z.object({
  userId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  calculationMethod: z.enum(SETTLEMENT_CALCULATION_METHODS),
  override: flexibleBoolean.default(false),
});

const listSettlementsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const settlementPdfQuerySchema = z.object({
  mode: z.enum(['summary', 'detailed']).default('summary'),
});

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

function sanitizeFilenamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function settlementsRouter(repository: FreightRepository): Router {
  const router = Router();
  const settlementService = new SettlementCalculationService(repository);
  const pdfGeneratorService = new PDFGeneratorService();

  router.use(requireRoles(['ADMIN', 'MANAGER']));

  router.get(
    '/settlements/config',
    asyncHandler(async (_req, res) => {
      const config = await settlementService.getConfig();
      res.json({ success: true, data: config });
    }),
  );

  router.put(
    '/settlements/config/direct-exceptions',
    asyncHandler(async (req, res) => {
      const payload = updateDirectExceptionsSchema.parse(req.body);
      const customerIds = await settlementService.replaceDirectCustomerExceptions(payload.customerIds, req.user!.sub);
      res.json({ success: true, data: { customerIds } });
    }),
  );

  router.patch(
    '/settlements/config/tier',
    asyncHandler(async (req, res) => {
      const payload = updateTierSchema.parse(req.body);
      const tierConfig = await settlementService.updateTierConfig({
        ...payload,
        createdByUserId: req.user!.sub,
      });
      res.json({ success: true, data: tierConfig });
    }),
  );

  router.patch(
    '/settlements/users/:userId/default-flat-pay',
    asyncHandler(async (req, res) => {
      const payload = updateDefaultFlatPaySchema.parse(req.body);
      const updated = await settlementService.updateUserDefaultFlatPay(
        req.params.userId,
        payload.defaultFlatPay,
        payload.excludeFromPayroll,
      );
      res.json({
        success: true,
        data: {
          userId: req.params.userId,
          defaultFlatPay: updated.defaultFlatPay,
          excludeFromPayroll: updated.excludeFromPayroll,
        },
      });
    }),
  );

  router.post(
    '/settlements/generate',
    asyncHandler(async (req, res) => {
      const payload = generateSettlementSchema.parse(req.body);
      const settlement = await settlementService.generateSettlement({
        ...payload,
        generatedByUserId: req.user!.sub,
        generatedByName: req.user!.name,
      });
      res.status(201).json({ success: true, data: settlement });
    }),
  );

  router.get(
    '/settlements',
    asyncHandler(async (req, res) => {
      const query = listSettlementsQuerySchema.parse(req.query);
      const settlements = await settlementService.listSettlementHistory(query.limit);
      res.json({ success: true, data: settlements });
    }),
  );

  router.get(
    '/settlements/:id',
    asyncHandler(async (req, res) => {
      const detail = await settlementService.getSettlementDetail(req.params.id);
      res.json({ success: true, data: detail });
    }),
  );

  router.delete(
    '/settlements/:id',
    asyncHandler(async (req, res) => {
      await settlementService.deleteSettlement(req.params.id);
      res.status(204).send();
    }),
  );

  router.get(
    '/settlements/:id/pdf',
    asyncHandler(async (req, res) => {
      const query = settlementPdfQuerySchema.parse(req.query);
      const detail = await settlementService.getSettlementDetail(req.params.id);
      const pdfBuffer = await pdfGeneratorService.generateSettlementPdf(detail, query.mode);
      const monthYear = `${monthLabel(detail.summary.month, detail.summary.year)} ${detail.summary.year}`;
      const userName = detail.summary.userName || 'Unknown User';
      const baseName = `Statement ${monthYear} - ${userName}`;
      const safeFilename = `${sanitizeFilenamePart(baseName)}.pdf`;

      res.setHeader('content-type', 'application/pdf');
      res.setHeader('content-disposition', `attachment; filename="${safeFilename}"`);
      res.status(200).send(pdfBuffer);
    }),
  );

  return router;
}
