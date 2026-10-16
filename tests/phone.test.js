import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone, isValidPhone, telHref, toE164 } from '../src/core/phone.js';

test('Türkiye numaraları uluslararası biçime çevrilir', () => {
  assert.equal(toE164('0532 123 45 67'), '+905321234567');
  assert.equal(toE164('5321234567'), '+905321234567');
  assert.equal(toE164('0090 212 444 00 00'), '+902124440000');
  assert.equal(toE164('+44 20 7946 0958'), '+442079460958');
});

test('görüntüleme biçimi ve arama bağlantısı', () => {
  assert.equal(formatPhone('02124440000'), '+90 212 444 00 00');
  assert.equal(telHref('0212 444 00 00', '1234'), 'tel:+902124440000,1234');
});

test('geçersiz numaralar reddedilir', () => {
  assert.equal(isValidPhone('0532 123 45 67'), true);
  assert.equal(isValidPhone('12'), false);
  assert.equal(isValidPhone('0532-abc'), false);
});
