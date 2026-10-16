/**
 * Kartvizit deposu.
 * Kayıtlar ve ayarlar tarayıcının yerel deposunda (localStorage) tek bir şifreli blok olarak saklanır.
 * Düz metin hiçbir zaman diske yazılmaz.
 */
import { STORAGE_KEYS } from '../config.js';
import { createCardIdentity, hasIdentity } from './card-file.js';
import { deriveKey, open, randomBytes, seal, toBase64 } from './crypto.js';
import { validateCard } from './validation.js';

const VAULT_VERSION = 2;
const BACKUP_APP = 'canlar-qr';
const BACKUP_VERSION = 4;
const BACKUP_ITERATIONS = 600000;

/** Kasa içeriğini çözer: eski sürümlerde yalnızca kartvizit dizisi saklanıyordu. */
const parseVault = (json) => {
  const value = JSON.parse(json);
  return Array.isArray(value) ? { cards: value, settings: {} } : { cards: value.cards ?? [], settings: value.settings ?? {} };
};

/** Kayda ait kalıcı QR kimliği ve yayın bilgisi (doğrulama dışında tutulan alanlar). */
const identityOf = (item) => (hasIdentity(item)
  ? { qr_id: item.qr_id, qr_key: item.qr_key, published_at: typeof item.published_at === 'string' ? item.published_at : '' }
  : { ...createCardIdentity(), published_at: '' });

export class CardStore {
  /**
   * @param {CryptoKey} key Oturum anahtarı
   * @param {Storage} storage Varsayılan: window.localStorage
   */
  constructor(key, storage = globalThis.localStorage) {
    this.key = key;
    this.storage = storage;
    this.cards = [];
    this.settings = {};
    /** load() sonrası: açılamayan eski blok arşive alındıysa true. */
    this.archived = false;
  }

  /**
   * Şifreli bloğu çözer; eski sürümden kalan şifresiz kayıtları şifreli alana taşır,
   * QR kimliği olmayan kayıtlara kimlik verir.
   * Blok bu anahtarla açılamıyorsa (giriş bilgisi değiştirilmişse) silinmez, arşive alınır;
   * kayıtlar daha önce alınmış yedekten geri yüklenebilir.
   */
  async load() {
    const sealed = this.storage.getItem(STORAGE_KEYS.vault);
    try {
      ({ cards: this.cards, settings: this.settings } = sealed ? parseVault(await open(this.key, sealed)) : { cards: [], settings: {} });
    } catch {
      this.storage.setItem(STORAGE_KEYS.archived, sealed);
      this.storage.removeItem(STORAGE_KEYS.vault);
      this.cards = [];
      this.settings = {};
      this.archived = true;
    }

    let changed = false;
    this.cards = this.cards.map((card) => {
      if (hasIdentity(card)) return card;
      changed = true;
      return { ...card, ...identityOf(card) };
    });

    const legacy = this.storage.getItem(STORAGE_KEYS.legacy);
    if (legacy) {
      try {
        const items = JSON.parse(legacy);
        if (Array.isArray(items)) items.forEach((item) => this.#append(item));
      } catch { /* bozuk eski veri yok sayılır */ }
      this.storage.removeItem(STORAGE_KEYS.legacy);
      changed = true;
    }
    if (changed) await this.#persist();
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

  /** Son değişiklik yayınlanmadıysa true. */
  static isPending(card) {
    return !card.published_at || card.published_at < card.updated_at;
  }

  async create(input) {
    const { data, errors } = validateCard(input);
    if (errors.length) throw new Error(errors.join(' '));
    const now = new Date().toISOString();
    const card = { id: this.#nextId(), ...data, ...identityOf(null), created_at: now, updated_at: now };
    this.cards.push(card);
    await this.#persist();
    return { ...card };
  }

  /** Bilgileri günceller; QR kimliği ve anahtarı değişmez. */
  async update(id, input) {
    const index = this.cards.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Kartvizit bulunamadı.');
    const { data, errors } = validateCard({ ...this.cards[index], ...input });
    if (errors.length) throw new Error(errors.join(' '));
    this.cards[index] = { ...this.cards[index], ...data, updated_at: new Date().toISOString() };
    await this.#persist();
    return { ...this.cards[index] };
  }

  async markPublished(id) {
    const card = this.cards.find((item) => item.id === id);
    if (!card) return null;
    card.published_at = new Date().toISOString();
    await this.#persist();
    return { ...card };
  }

  async remove(id) {
    this.cards = this.cards.filter((item) => item.id !== id);
    await this.#persist();
  }

  getSetting(name) {
    return this.settings[name] ?? '';
  }

  async setSetting(name, value) {
    if (value) this.settings[name] = value;
    else delete this.settings[name];
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
      data: await seal(key, JSON.stringify({ cards: this.cards, settings: this.settings })),
    });
  }

  /**
   * Yedek dosyasını içe aktarır; aynı ad ve e-postaya sahip kayıtlar atlanır.
   * Kayıtların QR kimlikleri korunur, böylece basılmış QR'lar çalışmaya devam eder.
   * @returns {Promise<number>} Eklenen kayıt sayısı
   */
  async importBackup(fileText, secret) {
    let backup;
    try { backup = JSON.parse(fileText); } catch { throw new Error('Yedek dosyası okunamadı.'); }
    if (backup?.app !== BACKUP_APP) throw new Error('Bu dosya bir kartvizit yedeği değil.');

    let content;
    try {
      const key = backup.salt
        ? await deriveKey(secret, { salt: backup.salt, iterations: backup.iterations || BACKUP_ITERATIONS })
        : this.key; // önceki sürümün yedekleri oturum anahtarıyla şifreliydi
      content = parseVault(await open(key, backup.data ?? backup.enc));
    } catch {
      throw new Error('Yedek açılamadı. Yedeği alırken kullanılan giriş bilgisini girin.');
    }

    let added = 0;
    for (const item of content.cards) {
      if (this.#append(item)) added += 1;
    }
    for (const [name, value] of Object.entries(content.settings)) {
      if (!this.settings[name] && typeof value === 'string') this.settings[name] = value;
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
      ...identityOf(item),
      created_at: typeof item.created_at === 'string' ? item.created_at : now,
      updated_at: typeof item.updated_at === 'string' ? item.updated_at : now,
    });
    return true;
  }

  #nextId() {
    return this.cards.reduce((max, card) => Math.max(max, card.id), 0) + 1;
  }

  async #persist() {
    const vault = { v: VAULT_VERSION, cards: this.cards, settings: this.settings };
    this.storage.setItem(STORAGE_KEYS.vault, await seal(this.key, JSON.stringify(vault)));
  }
}
