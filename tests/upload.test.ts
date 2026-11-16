import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeclaredTypeCompatible, sniffImageType } from '../lib/upload';

function bytes(head: number[], filler = 20): Uint8Array {
  const result = new Uint8Array(head.length + filler);
  result.set(head);
  return result;
}

function asciiBytes(value: string, total = 32): Uint8Array {
  const result = new Uint8Array(total);
  result.set([...value].map((char) => char.charCodeAt(0)), 0);
  return result;
}

const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0]);
const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = (() => {
  const buffer = new Uint8Array(32);
  buffer.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  buffer.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8);
  return buffer;
})();
const avif = (() => {
  const buffer = new Uint8Array(32);
  buffer.set([...'ftyp'].map((c) => c.charCodeAt(0)), 4);
  buffer.set([...'avif'].map((c) => c.charCodeAt(0)), 8);
  return buffer;
})();

test('detecta JPEG válido', () => {
  assert.deepEqual(sniffImageType(jpeg), { mime: 'image/jpeg', ext: 'jpg' });
});

test('detecta PNG válido', () => {
  assert.deepEqual(sniffImageType(png), { mime: 'image/png', ext: 'png' });
});

test('detecta WebP válido', () => {
  assert.deepEqual(sniffImageType(webp), { mime: 'image/webp', ext: 'webp' });
});

test('detecta AVIF válido', () => {
  assert.deepEqual(sniffImageType(avif), { mime: 'image/avif', ext: 'avif' });
});

test('rejeita SVG', () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(sniffImageType(svg), null);
});

test('rejeita XML/HTML disfarçado de imagem', () => {
  assert.equal(sniffImageType(new TextEncoder().encode('<?xml version="1.0"?><svg onload="alert(1)"/>')), null);
  assert.equal(sniffImageType(new TextEncoder().encode('<html><body><script>alert(1)</script></body></html>')), null);
});

test('rejeita executável renomeado para .jpg', () => {
  const elf = bytes([0x7f, 0x45, 0x4c, 0x46]);
  assert.equal(sniffImageType(elf), null);
  const mz = bytes([0x4d, 0x5a]);
  assert.equal(sniffImageType(mz), null);
});

test('rejeita arquivo curto demais', () => {
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff])), null);
});

test('aceita MIME coerente com o conteúdo', () => {
  assert.equal(isDeclaredTypeCompatible('image/jpeg', 'foto.jpg', { mime: 'image/jpeg', ext: 'jpg' }).ok, true);
  assert.equal(isDeclaredTypeCompatible('image/jpg', 'foto.jpeg', { mime: 'image/jpeg', ext: 'jpg' }).ok, true);
  assert.equal(isDeclaredTypeCompatible('image/png', 'foto.png', { mime: 'image/png', ext: 'png' }).ok, true);
  assert.equal(isDeclaredTypeCompatible('image/webp', 'foto.webp', { mime: 'image/webp', ext: 'webp' }).ok, true);
});

test('rejeita MIME falso', () => {
  const result = isDeclaredTypeCompatible('image/svg+xml', 'foto.jpg', { mime: 'image/jpeg', ext: 'jpg' });
  assert.equal(result.ok, false);
});

test('rejeita extensão incompatível com o conteúdo', () => {
  const result = isDeclaredTypeCompatible('image/png', 'foto.jpg', { mime: 'image/png', ext: 'png' });
  assert.equal(result.ok, false);
});

test('rejeita arquivo sem extensão', () => {
  const result = isDeclaredTypeCompatible('image/png', 'foto', { mime: 'image/png', ext: 'png' });
  assert.equal(result.ok, false);
});

test('rejeita SVG declarado como imagem raster', () => {
  const result = isDeclaredTypeCompatible('image/png', 'foto.png', { mime: 'image/svg+xml', ext: 'svg' });
  assert.equal(result.ok, false);
});
