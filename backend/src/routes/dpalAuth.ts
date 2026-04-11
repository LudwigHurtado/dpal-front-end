import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/passwordService';
import { createRefreshToken, hashRefreshToken, signAccessToken, verifyAccessToken } from '../lib/tokenService';
import { toPublicUser } from '../lib/dpalUserMapper';
import { starterDefaults, defaultProfileMetadata } from '../config/starterDefaults';
import { attachDpalJwtUser, requireDpalAuth } from '../middleware/dpalJwt';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(1).max(120),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username: letters, numbers, underscore only'),
  email: z.string().email().max(320),
  phone: z.string().max(40).optional(),
  password: z.string().min(10).max(128),
  location: z.string().max(200).optional(),
  profileImageUrl: z.string().max(2000).optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1).max(320),
  password: z.string().min(1).max(128),
});

const presenceSchema = z.object({
  onlineStatus: z.enum(['online', 'away', 'offline']),
});

const patchProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  profileImageUrl: z.string().max(2000).optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts', message: 'Try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registrations', message: 'Try again later.' },
});

async function issueSession(userId: string) {
  const accessToken = signAccessToken(userId);
  const { raw, hash, expiresAt } = createRefreshToken();
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt },
  });
  return { accessToken, refreshToken: raw, expiresAt };
}

router.post('/register', registerLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', message: parsed.error.flatten().fieldErrors });
    return;
  }
  const b = parsed.data;
  const emailNorm = b.email.trim().toLowerCase();
  const usernameNorm = b.username.trim().toLowerCase();

  const dup = await prisma.dpalUser.findFirst({
    where: {
      OR: [{ email: emailNorm }, { username: usernameNorm }],
    },
    select: { email: true, username: true },
  });
  if (dup) {
    const field = dup.email === emailNorm ? 'email' : 'username';
    res.status(409).json({
      error: 'Conflict',
      message:
        field === 'email'
          ? 'An account with this email already exists.'
          : 'This username is already taken.',
    });
    return;
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(b.password);
  } catch {
    res.status(500).json({ error: 'Server error' });
    return;
  }

  const meta = defaultProfileMetadata();
  let user;
  try {
    user = await prisma.dpalUser.create({
      data: {
        email: emailNorm,
        username: usernameNorm,
        displayName: b.fullName.trim(),
        passwordHash,
        phone: b.phone?.trim() || null,
        location: b.location?.trim() || null,
        profileImageUrl: b.profileImageUrl?.trim() || null,
        profileMetadata: meta as object,
        starterCredits: starterDefaults.starterCredits,
        starterCoins: starterDefaults.starterCoins,
        heroCredits: starterDefaults.heroCredits,
        dpalCoins: starterDefaults.dpalCoins,
        reputationScore: starterDefaults.reputationScore,
        trustScore: starterDefaults.trustScore,
        profileCompleted: false,
        emailVerified: false,
        accountStatus: 'active',
        isOnline: false,
        onlineStatus: 'offline',
      },
    });
  } catch (e: unknown) {
    console.error('[register]', e);
    res.status(500).json({ error: 'Registration failed' });
    return;
  }

  const { accessToken, refreshToken } = await issueSession(user.id);
  await prisma.dpalUser.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastSeenAt: new Date(),
      isOnline: true,
      onlineStatus: 'online',
      presenceUpdatedAt: new Date(),
    },
  });
  const fresh = await prisma.dpalUser.findUniqueOrThrow({ where: { id: user.id } });
  res.status(201).json({
    ok: true,
    user: toPublicUser(fresh),
    accessToken,
    refreshToken,
  });
});

router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', message: 'Invalid credentials.' });
    return;
  }
  const { identifier, password } = parsed.data;
  const idTrim = identifier.trim();
  const idLower = idTrim.toLowerCase();

  const user = await prisma.dpalUser.findFirst({
    where: {
      OR: [{ email: idLower }, { username: idLower }],
    },
  });

  const fail = () => {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
  };

  if (!user) {
    fail();
    return;
  }
  if (user.accountStatus === 'banned' || user.accountStatus === 'suspended') {
    res.status(403).json({ error: 'Forbidden', message: 'Account is not active.' });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    fail();
    return;
  }

  const { accessToken, refreshToken } = await issueSession(user.id);
  const now = new Date();
  const updated = await prisma.dpalUser.update({
    where: { id: user.id },
    data: {
      lastLoginAt: now,
      lastSeenAt: now,
      isOnline: true,
      onlineStatus: 'online',
      presenceUpdatedAt: now,
    },
  });

  res.json({
    ok: true,
    user: toPublicUser(updated),
    accessToken,
    refreshToken,
  });
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  const raw = typeof body.refreshToken === 'string' ? body.refreshToken : '';
  if (raw) {
    const h = hashRefreshToken(raw);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: h, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const { sub } = verifyAccessToken(auth.slice(7));
      await prisma.dpalUser.updateMany({
        where: { id: sub },
        data: { isOnline: false, onlineStatus: 'offline', presenceUpdatedAt: new Date() },
      });
    } catch {
      /* ignore */
    }
  }
  res.json({ ok: true });
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const raw = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
  if (!raw) {
    res.status(400).json({ error: 'Bad request', message: 'refreshToken required.' });
    return;
  }
  const h = hashRefreshToken(raw);
  const row = await prisma.refreshToken.findFirst({
    where: { tokenHash: h, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) {
    res.status(401).json({ error: 'Unauthorized', message: 'Session expired.' });
    return;
  }
  const accessToken = signAccessToken(row.userId);
  const rotated = createRefreshToken();
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: { userId: row.userId, tokenHash: rotated.hash, expiresAt: rotated.expiresAt },
    }),
  ]);
  res.json({
    ok: true,
    accessToken,
    refreshToken: rotated.raw,
  });
});

router.get('/me', attachDpalJwtUser, requireDpalAuth, async (req: Request, res: Response): Promise<void> => {
  const u = req.dpalUser!;
  res.json({ ok: true, user: toPublicUser(u) });
});

router.post('/presence', attachDpalJwtUser, requireDpalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = presenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' });
    return;
  }
  const { onlineStatus } = parsed.data;
  const now = new Date();
  const isOnline = onlineStatus !== 'offline';
  const u = await prisma.dpalUser.update({
    where: { id: req.dpalUser!.id },
    data: {
      onlineStatus,
      isOnline,
      presenceUpdatedAt: now,
      lastSeenAt: now,
    },
  });
  res.json({ ok: true, user: toPublicUser(u) });
});

router.patch('/me', attachDpalJwtUser, requireDpalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = patchProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', message: parsed.error.flatten() });
    return;
  }
  const p = parsed.data;
  const u = await prisma.dpalUser.update({
    where: { id: req.dpalUser!.id },
    data: {
      ...(p.displayName !== undefined ? { displayName: p.displayName.trim() } : {}),
      ...(p.phone !== undefined ? { phone: p.phone?.trim() || null } : {}),
      ...(p.location !== undefined ? { location: p.location?.trim() || null } : {}),
      ...(p.profileImageUrl !== undefined ? { profileImageUrl: p.profileImageUrl?.trim() || null } : {}),
      profileCompleted: true,
    },
  });
  res.json({ ok: true, user: toPublicUser(u) });
});

router.post('/change-password', attachDpalJwtUser, requireDpalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.dpalUser.findUniqueOrThrow({ where: { id: req.dpalUser!.id } });
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Unauthorized', message: 'Current password is incorrect.' });
    return;
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.dpalUser.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  res.json({ ok: true, message: 'Password changed. Sign in again.' });
});

export default router;
