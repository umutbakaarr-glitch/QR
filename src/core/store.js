/**
 * Kartvizit deposu.
 * Kayıtlar tarayıcının yerel deposunda (localStorage) tek bir şifreli blok olarak saklanır.
 * Düz metin hiçbir zaman diske yazılmaz.
 */
import { STORAGE_KEYS } from '../config.js';
import { deriveKey, open, randomBytes, seal, toBase64 } from './crypto.js';
import { validateCard } from './validation.js';

const BACKUP_APP = 'canlar-qr';
const BACKUP_VERSION = 3;
const BACKUP_ITERATIONS = 600000;

export class CardStore {
  /**
   * @param {CryptoKey} key Oturum anahtarı
   * @param {Storage} storage Varsayılan: window.localStorage
   */
  constructor(key, storage = globalThis.localStorage) {
    this.key = key;
    this.storage = storage;
    this.cards = [];
    /** load() sonrası: açılamayan eski blok arşive alındıysa true. */
    this.archived = false;
  }

  /**
   * Şifreli bloğu çözer; eski sürümden kalan şifresiz kayıtları şifreli alana taşır.
   * Blok bu anahtarla açılamıyorsa (giriş bilgisi değiştirilmişse) silinmez, arşive alınır;
   * kayıtlar daha önce alınmış yedekten geri yüklenebilir.
   */
  async load() {
    const sealed = this.storage.getItem(STORAGE_KEYS.vault);
    try {
      this.cards = sealed ? JSON.parse(await open(this.key, sealed)) : [];
    } catch {
      this.storage.setItem(STORAGE_KEYS.archived, sealed);
      this.storage.removeItem(STORAGE_KEYS.vault);
      this.cards = [];
      this.archived = true;
    }

    const legacy = this.storage.getItem(STORAGE_KEYS.legacy);
    if (legacy) {
      try {
        const items = JSON.parse(legacy);
        if (Array.isArray(items)) items.forEach((item) => this.#append(item));
      } catch { /* bozuk eski veri yok sayılır */ }
      await this.#persist();
      this.storage.removeItem(STORAGE_KEYS.legacy);
    }
    return this.list();
  }

  /** En yeni kayıt başta olacak şekilde kopyalarını döndürür. */
  list() {
    return this.cards
      .map((card) => ({ ...card }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  get(id) {
    const card = this.cards.find((item) => item.id === id);
    return card ? { ...card } : null;
  }

  async create(input) {
    const { data, errors } = validateCard(input);
    if (errors.length) throw new Error(errors.join(' '));
    const now = new Date().toISOString();
    const card = { id: this.#nextId(), ...data, created_at: now, updated_at: now };
    this.cards.push(card);
    await this.#persist();
    return { ...card };
  }

  async update(id, input) {
    const index = this.cards.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Kartvizit bulunamadı.');
    const { data, errors } = validateCard({ ...this.cards[index], ...input });
    if (errors.length) throw new Error(errors.join(' '));
    this.cards[index] = { ...this.cards[index], ...data, updated_at: new Date().toISOString() };
    await this.#persist();
    return { ...this.cards[index] };
  }

  async remove(id) {
    this.cards = this.cards.filter((item) => item.id !== id);
    await this.#persist();
  }

  /**
   * Yedek dosyası içeriği üretir. Yedek, kendi tuzuyla ve verilen değerle şifrelenir;
   * böylece giriş bilgisi sonradan değişse de eski bilgiyle açılabilir.
   */
  async exportBackup(secret) {
    const salt = toBase64(randomBytes(16));
    const key = await deriveKey(secret, { salt, iterations: BACKUP_ITERATIONS });
    return JSON.stringify({
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      salt,
      iterations: BACKUP_ITERATIONS,
      data: await seal(key, JSON.stringify(this.cards)),
    });
  }

  /**
   * Yedek dosyasını içe aktarır; aynı ad ve e-postaya sahip kayıtlar atlanır.
   * @returns {Promise<number>} Eklenen kayıt sayısı
   */
  async importBackup(fileText, secret) {
    let backup;
    try { backup = JSON.parse(fileText); } catch { throw new Error('Yedek dosyası okunamadı.'); }
    if (backup?.app !== BACKUP_APP) throw new Error('Bu dosya bir kartvizit yedeği değil.');

    let items;
    try {
      const key = backup.salt
        ? await deriveKey(secret, { salt: backup.salt, iterations: backup.iterations || BACKUP_ITERATIONS })
        : this.key; // önceki sürümün yedekleri oturum anahtarıyla şifreliydi
      items = JSON.parse(await open(key, backup.data ?? backup.enc));
    } catch {
      throw new Error('Yedek açılamadı. Yedeği alırken kullanılan giriş bilgisini girin.');
    }

    let added = 0;
    for (const item of Array.isArray(items) ? items : []) {
      if (this.#append(item)) added += 1;
    }
    await this.#persist();
    return added;
  }

  #append(item) {
    const { data, errors } = validateCard(item, { requireConsent: false });
    if (errors.length) return false;
    const duplicate = this.cards.some((card) => card.email === data.email && card.full_name === data.full_name);
    if (duplicate) return false;
    const now = new Date().toISOString();
    this.cards.push({
      id: this.#nextId(),
      ...data,
      created_at: typeof item.created_at === 'string' ? item.created_at : now,
      updated_at: typeof item.updated_at === 'string' ? item.updated_at : now,
    });
    return true;
  }

  #nextId() {
    return this.cards.reduce((max, card) => Math.max(max, card.id), 0) + 1;
  }

  async #persist() {
    this.storage.setItem(STORAGE_KEYS.vault, await seal(this.key, JSON.stringify(this.cards)));
  }
}
