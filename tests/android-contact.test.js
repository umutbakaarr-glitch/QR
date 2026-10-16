import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContactIntent } from '../src/core/android-contact.js';

const CARD = {
  full_name: 'Ayşe Yılmaz', title_tr: 'Satın Alma Müdürü', title_en: 'Purchasing Manager', mobile: '0532 111 22 33',
  company_phone: '0212 444 00 00', extension: '12', email: 'ayse@canlar.com.tr', department: 'Satın Alma; İthalat',
};

const extras = (intent) => Object.fromEntries(intent.replace(/^intent:#Intent;/, '').replace(/;end$/, '').split(';')
  .map((part) => part.split('=')).map(([k, v]) => [k, decodeURIComponent(v)]));

test('rehber uygulamasının "Yeni kişi" ekranını açan intent üretilir', () => {
  const intent = buildContactIntent(CARD, 'https://ornek/kartvizit/?rehber&dokun=1#a.b');
  assert.match(intent, /^intent:#Intent;action=android\.intent\.action\.INSERT;type=vnd\.android\.cursor\.dir\/raw_contact;/);
  assert.match(intent, /;end$/);
  const e = extras(intent);
  assert.equal(e['S.name'], 'Ayşe Yılmaz');
  assert.equal(e['S.phone'], '+905321112233');
  assert.equal(e['i.phone_type'], '2');
  assert.equal(e['S.secondary_phone'], '+902124440000,12');
  assert.equal(e['S.email'], 'ayse@canlar.com.tr');
  assert.equal(e['S.company'], 'Canlar Group');
  assert.equal(e['S.job_title'], 'Satın Alma Müdürü');
  assert.match(e['S.notes'], /Satın Alma; İthalat/);
  assert.equal(e['S.browser_fallback_url'], 'https://ornek/kartvizit/?rehber&dokun=1#a.b');
});

test('ayırıcı karakterler değerleri bozamaz; cep yoksa şirket telefonu birincil olur', () => {
  const intent = buildContactIntent({ ...CARD, mobile: '', full_name: 'A;B=C' }, 'x');
  const e = extras(intent);
  assert.equal(e['S.name'], 'A;B=C');
  assert.equal(e['S.phone'], '+902124440000,12');
  assert.equal(e['i.phone_type'], '3');
  assert.equal(e['S.secondary_phone'], undefined);
});
