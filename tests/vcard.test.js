import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVCard, slugify } from '../src/core/vcard.js';

test('vCard alanları doğru üretilir', () => {
  const vcard = buildVCard({
    full_name: 'Ayşe Nur Yılmaz', title_tr: 'Uzman', title_en: 'Specialist', mobile: '0532 123 45 67',
    company_phone: '0212 444 00 00', extension: '12', email: 'a@canlar.com.tr', department: 'Satış; Pazarlama',
  });
  assert.match(vcard, /^BEGIN:VCARD\r\nVERSION:3\.0/);
  assert.match(vcard, /N;CHARSET=UTF-8:Yılmaz;Ayşe Nur;;;/);
  assert.match(vcard, /ORG;CHARSET=UTF-8:Canlar Group;Satış\\; Pazarlama/);
  assert.match(vcard, /TEL;TYPE=CELL:\+905321234567/);
  assert.match(vcard, /TEL;TYPE=WORK,VOICE:\+902124440000,12/);
  assert.match(vcard, /END:VCARD$/);
});

test('dosya adı sadeleştirilir', () => {
  assert.equal(slugify('Çağrı Şükrü Öğüt'), 'cagri-sukru-ogut');
  assert.equal(slugify('***'), 'kartvizit');
});
