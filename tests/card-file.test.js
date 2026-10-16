import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cardFilePath, cardFragment, createCardIdentity, decryptCardFile, encryptCardFile, hasIdentity, parseFragment,
} from '../src/core/card-file.js';

const CARD = {
  ...createCardIdentity(),
  full_name: 'Ayşe Yılmaz', title_tr: 'Satın Alma Şefi', title_en: 'Purchasing Supervisor', mobile: '0532 123 45 67',
  company_phone: '', extension: '', email: 'ayse@canlar.com.tr', department: 'Satın Alma', consent_at: 'x',
};

test('kimlik ve anahtar üretilir, bağlantı parçası çözülür', () => {
  assert.ok(hasIdentity(CARD));
  assert.notEqual(createCardIdentity().qr_key, createCardIdentity().qr_key);
  assert.deepEqual(parseFragment(`#${cardFragment(CARD)}`), { id: CARD.qr_id, key: CARD.qr_key });
  assert.equal(cardFilePath(CARD.qr_id), `kartvizit/k/${CARD.qr_id}.json`);
  for (const bad of ['', '#abc', '#a.b', `#${CARD.qr_id}.${CARD.qr_key}.x`, '#../../etc.passwd']) assert.equal(parseFragment(bad), null);
});

test('dosya şifrelidir, yalnızca doğru anahtarla açılır ve gereksiz alan içermez', async () => {
  const file = await encryptCardFile(CARD);
  assert.ok(!file.includes('Ayşe') && !file.includes('canlar.com.tr'), 'dosyada düz metin olmamalı');
  const card = await decryptCardFile(file, CARD.qr_key);
  assert.equal(card.full_name, 'Ayşe Yılmaz');
  assert.equal(card.consent_at, undefined, 'onay tarihi gibi iç alanlar yayınlanmamalı');
  await assert.rejects(() => decryptCardFile(file, createCardIdentity().qr_key));
});

test('güncellemede aynı kimlik ve anahtarla yeni içerik açılır (QR değişmez)', async () => {
  const updated = { ...CARD, title_tr: 'Satın Alma Müdürü' };
  const card = await decryptCardFile(await encryptCardFile(updated), CARD.qr_key);
  assert.equal(card.title_tr, 'Satın Alma Müdürü');
  assert.equal(cardFragment(updated), cardFragment(CARD));
});
