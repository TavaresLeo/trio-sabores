import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';
import {
  advanceBucket,
  peekRateLimit,
  type BucketState,
  type RateLimitRule,
  type RateLimitStatus,
} from './rate-limit-core';

export { RATE_LIMITS } from './rate-limit-core';
export type { RateLimitRule, RateLimitStatus };

export class RateLimitStoreError extends Error {
  constructor(cause: unknown) {
    super('Rate limit store unavailable');
    this.name = 'RateLimitStoreError';
    this.cause = cause;
  }
}

/**
 * Chave opaca: evita guardar IPs/e-mails em texto puro na tabela de contadores.
 */
export function rateLimitKey(scope: string, identifier: string) {
  const digest = createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex').slice(0, 32);
  return `${scope}:${digest}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

type BucketRow = {
  count: number;
  violations: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

function toState(row: BucketRow): BucketState {
  return {
    count: row.count,
    violations: row.violations ?? 0,
    windowStartedAt: new Date(row.windowStartedAt),
    blockedUntil: row.blockedUntil ? new Date(row.blockedUntil) : null,
  };
}

async function loadState(key: string): Promise<BucketState | null> {
  const rows = await db.$queryRaw<BucketRow[]>`
    SELECT "count", "violations", "windowStartedAt", "blockedUntil"
    FROM "RateLimitBucket" WHERE "key" = ${key}
  `;
  const row = rows[0];
  return row ? toState(row) : null;
}

/**
 * Consome uma tentativa de forma atômica: lê o estado com `FOR UPDATE`,
 * aplica a regra uma única vez e grava. Assim o limite vale entre todas as
 * instâncias serverless (nenhum contador em memória do processo).
 */
async function advanceAtomically(
  key: string,
  rule: RateLimitRule,
  now: Date,
): Promise<RateLimitStatus> {
  const status = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<BucketRow[]>`
      SELECT "count", "violations", "windowStartedAt", "blockedUntil"
      FROM "RateLimitBucket" WHERE "key" = ${key} FOR UPDATE
    `;
    const current = rows[0] ? toState(rows[0]) : null;
    const advanced = advanceBucket(current, rule, now);

    await tx.rateLimitBucket.upsert({
      where: { key },
      create: {
        key,
        count: advanced.next.count,
        violations: advanced.next.violations,
        windowStartedAt: advanced.next.windowStartedAt,
        blockedUntil: advanced.next.blockedUntil,
      },
      update: {
        count: advanced.next.count,
        violations: advanced.next.violations,
        windowStartedAt: advanced.next.windowStartedAt,
        blockedUntil: advanced.next.blockedUntil,
      },
    });

    return advanced.status;
  });
  return status;
}

export class RateLimitUnavailableError extends RateLimitStoreError {}

async function withStore<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof RateLimitStoreError) throw new RateLimitUnavailableError(error.cause);
    throw new RateLimitUnavailableError(error);
  }
}

/** Consulta (sem consumir) se a chave está bloqueada no momento. */
export async function getRateLimitStatus(
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<RateLimitStatus> {
  return withStore(async () => {
    const state = await loadState(key);
    return peekRateLimit(state, rule, now);
  });
}

/** Consome uma tentativa e devolve o estado resultante. */
export async function registerRateLimitAttempt(
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<RateLimitStatus> {
  return withStore(async () => {
    try {
      return await advanceAtomically(key, rule, now);
    } catch (error) {
      // Corrida na criação do registro: tenta uma vez mais.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return advanceAtomically(key, rule, now);
      }
      throw error;
    }
  });
}

/** Limpa o contador de uma chave (ex.: login bem-sucedido). */
export async function resetRateLimit(key: string) {
  try {
    await db.rateLimitBucket.deleteMany({ where: { key } });
  } catch {
    // Reset é best-effort: não deve derrubar a requisição.
  }
}

/** Remoção oportunista de registros antigos, evitando crescimento indefinido. */
export async function cleanupRateLimitBuckets(now: Date = new Date()) {
  if (Math.random() > 0.02) return;
  try {
    await db.rateLimitBucket.deleteMany({
      where: { updatedAt: { lt: new Date(now.getTime() - DAY_MS) } },
    });
  } catch {
    // Limpeza é best-effort.
  }
}
