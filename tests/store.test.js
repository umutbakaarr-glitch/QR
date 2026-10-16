import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEYS } from '../src/config.js';
import { deriveKey, randomBytes, toBase64 } from '../src/core/crypto.js';
import { CardStore } from '../src/core/store.js';

class MemoryStorage {
  #items = new Map();
  getItem(key) { return this.#items.has(key) ? this.#items.get(key) : null; }
  setItem(key, value) { this.#items.set(key, String(value)); }
  removeItem(key) { this.#items.delete(key); }
  dump() { return [...this.#items.values()].join('\n'); }
}

const params = { salt: toBase64(randomBytes(16)), iterations: 1000 };
const CARD = {
  full_name: 'Ayşe Yılmaz', title_tr: 'Uzman', title_en: 'Specialist', email: 'ayse@canlar.com.tr',
  department: 'Satış', consent_at: '2026-10-16T10:00:00.000Z',
};

test('kayıtlar şifreli saklanır, aynı anahtarla geri okunur', async () => {
  const storage = new MemoryStorage();
  const key = await deriveKey('dogru-bilgi', params);
  const store = new CardStore(key, storage);
  await store.load();
  const card = await store.create(CARD);
  await store.update(card.id, { title_tr: 'Kıdemli Uzman' });
  assert.ok(!storage.dump().includes('Ayşe'), 'düz metin depoya yazılmamalı');

  const reopened = new CardStore(key, storage);
  const list = await reopened.load();
  assert.equal(list.length, 1);
  assert.equal(list[0].title_tr, 'Kıdemli Uzman');

  const other = new CardStore(await deriveKey('baska', params), storage);
  assert.deepEqual(await other.load(), []);
  assert.equal(other.archived, true);
  assert.ok(storage.getItem(STORAGE_KEYS.archived), 'açılamayan blok silinmemeli, arşive alınmalı');
});

test('onaysız kayıt oluşturulamaz, silme kalıcıdır', async () => {
  const store = new CardStore(await deriveKey('x', params), new MemoryStorage());
  await store.load();
  await assert.rejects(() => store.create({ ...CARD, consent_at: '' }), /onay/);
  const card = await store.create(CARD);
  await store.remove(card.id);
  assert.equal(store.list().length, 0);
});

test('eski sürümün şifresiz kayıtları şifreli alana taşınır', async () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEYS.legacy, JSON.stringify([{ id: 1, ...CARD, consent_at: undefined, created_at: '2026-01-01', updated_at: '2026-01-01' }]));
  const store = new CardStore(await deriveKey('x', params), storage);
  const list = await store.load();
  assert.equal(list.length, 1);
  assert.equal(storage.getItem(STORAGE_KEYS.legacy), null);
  assert.ok(!storage.dump().includes('Ayşe'));
});

test('yedek kendi tuzuyla şifrelenir ve başka cihazda açılır', async () => {
  const source = new CardStore(await deriveKey('a', params), new MemoryStorage());
  await source.load();
  await source.create(CARD);
  const backup = await source.exportBackup('yedek-bilgisi');
  assert.ok(!backup.includes('Ayşe'));

  const target = new CardStore(await deriveKey('b', params), new MemoryStorage());
  await target.load();
  await assert.rejects(() => target.importBackup(backup, 'yanlis'), /açılamadı/);
  assert.equal(await target.importBackup(backup, 'yedek-bilgisi'), 1);
  assert.equal(await target.importBackup(backup, 'yedek-bilgisi'), 0, 'aynı kayıt tekrar eklenmemeli');
});
