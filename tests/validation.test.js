import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCard } from '../src/core/validation.js';

const VALID = {
  full_name: '  Ali   Kaya ', title_tr: 'Uzman', title_en: 'Specialist', email: 'Ali.Kaya@Canlar.com.tr',
  department: 'Bilgi İşlem', consent_at: '2026-10-16T10:00:00.000Z',
};

test('geçerli girdi temizlenir', () => {
  const { data, errors } = validateCard(VALID);
  assert.deepEqual(errors, []);
  assert.equal(data.full_name, 'Ali Kaya');
  assert.equal(data.email, 'ali.kaya@canlar.com.tr');
  assert.equal(data.fg_color, '#1d1d1b');
});

test('zorunlu alanlar ve KVKK onayı denetlenir', () => {
  const { errors } = validateCard({});
  assert.equal(errors.length, 6);
  assert.ok(errors.some((e) => e.includes('onay')));
  assert.equal(validateCard({ ...VALID, consent_at: '' }, { requireConsent: false }).errors.length, 0);
});

test('hatalı biçimler reddedilir', () => {
  assert.equal(validateCard({ ...VALID, email: 'a@b' }).errors.length, 1);
  assert.equal(validateCard({ ...VALID, extension: '12a' }).errors.length, 1);
  assert.equal(validateCard({ ...VALID, mobile: '123' }).errors.length, 1);
  assert.equal(validateCard({ ...VALID, fg_color: 'red;}' }).data.fg_color, '#1d1d1b');
});
