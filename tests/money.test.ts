import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBRL, parseBRL } from '../lib/money';

test('parseBRL aceita formato brasileiro completo', () => {
  assert.equal(parseBRL('R$ 1.234,56'), 123456);
  assert.equal(parseBRL('1.234,56'), 123456);
  assert.equal(parseBRL('R$ 45,90'), 4590);
});

test('parseBRL aceita vírgula sem separador de milhar', () => {
  assert.equal(parseBRL('1234,56'), 123456);
  assert.equal(parseBRL('1234,5'), 123450);
  assert.equal(parseBRL('0,05'), 5);
});

test('parseBRL trata inteiros como reais (nunca centavos)', () => {
  assert.equal(parseBRL('1234'), 123400);
  assert.equal(parseBRL('0'), 0);
  assert.equal(parseBRL('100'), 10000);
});

test('parseBRL distingue milhar de decimal no ponto', () => {
  assert.equal(parseBRL('1.234'), 123400);
  assert.equal(parseBRL('1234.56'), 123456);
  assert.equal(parseBRL('1.234.567'), 123456700);
});

test('parseBRL rejeita entradas inválidas em vez de retornar zero', () => {
  assert.equal(parseBRL(''), null);
  assert.equal(parseBRL('   '), null);
  assert.equal(parseBRL('abc'), null);
  assert.equal(parseBRL('R$'), null);
  assert.equal(parseBRL('-10'), null);
  assert.equal(parseBRL('12,345'), null);
  assert.equal(parseBRL('1.2.3'), null);
  assert.equal(parseBRL('10,,5'), null);
  assert.equal(parseBRL(null), null);
  assert.equal(parseBRL(undefined), null);
  assert.equal(parseBRL(1234 as unknown as string), null);
});

test('parseBRL não perde centavos por arredondamento de ponto flutuante', () => {
  assert.equal(parseBRL('1,01'), 101);
  assert.equal(parseBRL('19,99'), 1999);
  assert.equal(parseBRL('0,10'), 10);
  assert.equal(parseBRL('999999,99'), 99999999);
});

test('formatBRL usa Real brasileiro', () => {
  assert.ok(formatBRL(123456).includes('1.234,56'));
  assert.ok(formatBRL(0).includes('0,00'));
});
