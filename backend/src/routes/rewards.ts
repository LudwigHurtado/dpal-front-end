import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.post('/issue', async (req: Request, res: Response): Promise<void> => {
  const walletAddress = String(req.body?.walletAddress ?? '').trim();
  const amountCoins = Number(req.body?.amountCoins ?? 0);
  const reason = String(req.body?.reason ?? 'Resolution action');
  const caseId = req.body?.caseId ? String(req.body.caseId) : null;
  const source = req.body?.source ? String(req.body.source) : 'resolution-layer';

  if (!walletAddress) {
    res.status(400).json({ ok: false, error: 'walletAddress is required' });
    return;
  }
  if (!Number.isFinite(amountCoins) || amountCoins <= 0) {
    res.status(400).json({ ok: false, error: 'amountCoins must be > 0' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.rewardWallet.upsert({
        where: { walletAddress },
        update: { balanceCoins: { increment: Math.floor(amountCoins) } },
        create: { walletAddress, balanceCoins: Math.floor(amountCoins) },
      });

      const entry = await tx.rewardLedgerEntry.create({
        data: {
          walletId: wallet.id,
          caseId,
          amountCoins: Math.floor(amountCoins),
          reason,
          source,
          metadata: req.body?.metadata ?? null,
        },
      });

      return { wallet, entry };
    });

    res.status(201).json({
      ok: true,
      walletAddress,
      newBalance: result.wallet.balanceCoins,
      ledgerEntryId: result.entry.id,
      amountCoins: result.entry.amountCoins,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message ?? 'Failed to issue rewards' });
  }
});

router.get('/ledger', async (req: Request, res: Response): Promise<void> => {
  const walletAddress = String(req.query.walletAddress ?? '').trim();
  if (!walletAddress) {
    res.status(400).json({ ok: false, error: 'walletAddress is required' });
    return;
  }

  try {
    const wallet = await prisma.rewardWallet.findUnique({
      where: { walletAddress },
      include: { entries: { orderBy: { createdAt: 'desc' }, take: 100 } },
    });
    if (!wallet) {
      res.json({ ok: true, walletAddress, balanceCoins: 0, entries: [] });
      return;
    }
    res.json({
      ok: true,
      walletAddress,
      balanceCoins: wallet.balanceCoins,
      entries: wallet.entries,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message ?? 'Failed to load reward ledger' });
  }
});

export default router;
