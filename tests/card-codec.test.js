import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeCard, encodeCard } from '../src/core/card-codec.js';

const CARD = {
  full_name: 'Ayşe Yılmaz', title_tr: 'Satın Alma Şefi', title_en: 'Purchasing Supervisor',
  mobile: '0532 123 45 67', company_phone: '0212 444 00 00', extension: '1234',
  email: 'ayse.yilmaz@canlar.com.tr', department: 'Satın Alma / Yurt Dışı',
};

test('kodlanan kartvizit aynen geri çözülür (Türkçe karakterler dahil)', () => {
  const encoded = encodeCard(CARD);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeCard(`#${encoded}`), CARD);
});

test('boş alanlar sondan kırpılır', () => {
  const decoded = decodeCard(encodeCard({ full_name: 'Ali Kaya' }));
  assert.equal(decoded.full_name, 'Ali Kaya');
  assert.equal(decoded.email, '');
});

test('bozuk, yabancı veya çok uzun girdiler reddedilir', () => {
  for (const bad of ['', '#', '%%%', 'bozuk', btoa('[2,"x"]'), 'A'.repeat(5000), btoa('{"a":1}')]) {
    assert.equal(decodeCard(bad), null, bad.slice(0, 20));
  }
});
