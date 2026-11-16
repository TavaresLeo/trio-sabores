/**
 * Lógica pura de janela/limite, separada do armazenamento para poder ser testada
 * sem banco de dados.
 */
export type RateLimitRule = {
  /** Tamanho da janela de contagem, em segundos. */
  windowSeconds: number;
  /** Tentativas permitidas por janela. */
  maxAttempts: number;
  /** Bloqueio base, em segundos, ao exceder o limite. */
  blockSeconds: number;
};

export const RATE_LIMITS = {
  adminLogin: { windowSeconds: 15 * 60, maxAttempts: 5, blockSeconds: 15 * 60 },
  userLogin: { windowSeconds: 15 * 60, maxAttempts: 10, blockSeconds: 15 * 60 },
  register: { windowSeconds: 60 * 60, maxAttempts: 5, blockSeconds: 60 * 60 },
  passwordChange: { windowSeconds: 15 * 60, maxAttempts: 10, blockSeconds: 15 * 60 },
  order: { windowSeconds: 10 * 60, maxAttempts: 10, blockSeconds: 10 * 60 },
  cep: { windowSeconds: 60, maxAttempts: 30, blockSeconds: 60 },
  upload: { windowSeconds: 10 * 60, maxAttempts: 40, blockSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>;

export type BucketState = {
  count: number;
  /** Bloqueios já aplicados; define a progressão da espera. */
  violations: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
};

export type RateLimitStatus = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

function windowExpired(state: BucketState, rule: RateLimitRule, now: Date) {
  return now.getTime() - state.windowStartedAt.getTime() >= rule.windowSeconds * 1000;
}

function activeBlock(state: BucketState, now: Date) {
  return state.blockedUntil !== null && state.blockedUntil.getTime() > now.getTime();
}

/** Consulta sem consumir tentativa. */
export function peekRateLimit(state: BucketState | null, rule: RateLimitRule, now: Date): RateLimitStatus {
  if (!state) return { allowed: true, retryAfterSeconds: 0, remaining: rule.maxAttempts };
  if (activeBlock(state, now)) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.blockedUntil!.getTime() - now.getTime()) / 1000),
      remaining: 0,
    };
  }
  if (windowExpired(state, rule, now)) {
    return { allowed: true, retryAfterSeconds: 0, remaining: rule.maxAttempts };
  }
  return { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, rule.maxAttempts - state.count) };
}

/**
 * Consome uma tentativa e devolve o novo estado.
 * O bloqueio é progressivo: a cada janela excedida, a duração cresce até 4x.
 */
export function advanceBucket(
  state: BucketState | null,
  rule: RateLimitRule,
  now: Date,
): { next: BucketState; status: RateLimitStatus } {
  if (!state) {
    return {
      next: { count: 1, violations: 0, windowStartedAt: now, blockedUntil: null },
      status: { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, rule.maxAttempts - 1) },
    };
  }

  if (activeBlock(state, now)) {
    return {
      next: state,
      status: {
        allowed: false,
        retryAfterSeconds: Math.ceil((state.blockedUntil!.getTime() - now.getTime()) / 1000),
        remaining: 0,
      },
    };
  }

  const resetWindow =
    (state.blockedUntil !== null && state.blockedUntil.getTime() <= now.getTime()) || windowExpired(state, rule, now);

  const count = resetWindow ? 1 : state.count + 1;
  const windowStartedAt = resetWindow ? now : state.windowStartedAt;
  const exceeded = count > rule.maxAttempts;
  // Espera progressiva: o 1º bloqueio vale 1x, o 2º 2x, até o teto de 4x.
  const violations = exceeded ? state.violations + 1 : state.violations;
  const multiplier = Math.min(4, Math.max(1, violations));
  const blockedUntil = exceeded ? new Date(now.getTime() + rule.blockSeconds * multiplier * 1000) : null;

  return {
    next: { count, violations, windowStartedAt, blockedUntil },
    status: exceeded
      ? { allowed: false, retryAfterSeconds: rule.blockSeconds * multiplier, remaining: 0 }
      : { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, rule.maxAttempts - count) },
  };
}
