import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceBucket, peekRateLimit, type BucketState, type RateLimitRule } from '../lib/rate-limit-core';

const rule: RateLimitRule = { windowSeconds: 60, maxAttempts: 3, blockSeconds: 120 };
const start = new Date('2026-01-01T00:00:00.000Z');
const at = (ms: number) => new Date(start.getTime() + ms);

test('permite tentativas dentro do limite', () => {
  const first = advanceBucket(null, rule, start);
  assert.equal(first.status.allowed, true);
  assert.equal(first.status.remaining, 2);

  const second = advanceBucket(first.next, rule, at(1000));
  assert.equal(second.status.allowed, true);
  assert.equal(second.status.remaining, 1);

  const third = advanceBucket(second.next, rule, at(2000));
  assert.equal(third.status.allowed, true);
  assert.equal(third.status.remaining, 0);
});

test('bloqueia ao exceder o limite e informa retryAfter', () => {
  const state: BucketState = { count: 3, violations: 0, windowStartedAt: start, blockedUntil: null };
  const result = advanceBucket(state, rule, at(3000));
  assert.equal(result.status.allowed, false);
  assert.notEqual(result.next.blockedUntil, null);
  assert.equal(result.status.retryAfterSeconds, 120);
  assert.equal(result.next.violations, 1);

  const peeked = peekRateLimit(result.next, rule, at(4000));
  assert.equal(peeked.allowed, false);
  assert.ok(peeked.retryAfterSeconds > 0);
});

test('mantém bloqueado enquanto o bloqueio está ativo', () => {
  const blockedUntil = at(120_000);
  const state: BucketState = { count: 4, violations: 1, windowStartedAt: start, blockedUntil };
  const result = advanceBucket(state, rule, at(30_000));
  assert.equal(result.status.allowed, false);
  assert.equal(result.next.blockedUntil, blockedUntil);
  assert.equal(result.next.violations, 1);
});

test('libera e reinicia a contagem após o bloqueio expirar', () => {
  const blockedUntil = at(120_000);
  const state: BucketState = { count: 4, violations: 1, windowStartedAt: start, blockedUntil };
  const result = advanceBucket(state, rule, at(121_000));
  assert.equal(result.status.allowed, true);
  assert.equal(result.next.count, 1);
  assert.equal(result.next.blockedUntil, null);
  // O histórico de violações é preservado para a espera progressiva.
  assert.equal(result.next.violations, 1);
});

test('reinicia a janela quando ela expira', () => {
  const state: BucketState = { count: 3, violations: 0, windowStartedAt: start, blockedUntil: null };
  const later = at(61_000);
  const status = peekRateLimit(state, rule, later);
  assert.equal(status.allowed, true);
  assert.equal(status.remaining, 3);

  const result = advanceBucket(state, rule, later);
  assert.equal(result.next.count, 1);
  assert.equal(result.next.blockedUntil, null);
});

test('segundo bloqueio dura o dobro do primeiro', () => {
  const state: BucketState = { count: 3, violations: 1, windowStartedAt: start, blockedUntil: null };
  const result = advanceBucket(state, rule, at(3000));
  assert.equal(result.status.allowed, false);
  assert.equal(result.status.retryAfterSeconds, 240);
  assert.equal(result.next.violations, 2);
});

test('bloqueio fica progressivo até o teto de 4x', () => {
  const state: BucketState = { count: 3, violations: 5, windowStartedAt: start, blockedUntil: null };
  const result = advanceBucket(state, rule, at(3000));
  assert.equal(result.status.allowed, false);
  assert.equal(result.status.retryAfterSeconds, 120 * 4);
});

test('peek não inventa bloqueio para chave inexistente', () => {
  const status = peekRateLimit(null, rule, start);
  assert.equal(status.allowed, true);
  assert.equal(status.remaining, rule.maxAttempts);
});
