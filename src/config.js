/**
 * Uygulama genelindeki sabit ayarlar.
 *
 * Önbellek notu: GitHub Pages dosyaları tarayıcıda ~10 dakika önbelleğe alınır. Tarayıcının eski
 * kodu kullanmaması için tüm import yolları ve HTML'deki dosya bağlantıları "?v=<sürüm>" taşır.
 * Kod değiştiğinde bu sürüm numarası TÜM dosyalarda birlikte artırılmalıdır (aynı modül farklı
 * sürüm numarasıyla iki kez yüklenmemelidir).
 * Kurum bilgisi, alan listesi ve depolama anahtarları yalnızca burada tanımlanır.
 */

export const ORG = Object.freeze({
  name: 'Canlar Group',
  site: 'https://canlar.com.tr',
  siteLabel: 'canlar.com.tr',
});

/**
 * Kartvizit alanları. Sıra, QR bağlantısının biçiminin bir parçasıdır:
 * mevcut alanların sırası DEĞİŞTİRİLMEMELİ, yeni alanlar yalnızca sona eklenmelidir.
 */
export const CARD_FIELDS = Object.freeze([
  'full_name',
  'title_tr',
  'title_en',
  'mobile',
  'company_phone',
  'extension',
  'email',
  'department',
]);

/**
 * Kartvizit dosyalarının yayınlandığı GitHub deposu.
 * Her kartvizit `dir/<kimlik>.json` olarak, kişiye özel anahtarla şifreli yazılır.
 */
export const PUBLISH = Object.freeze({
  owner: 'umutbakaarr-glitch',
  repo: 'QR',
  branch: 'main',
  dir: 'kartvizit/k',
  api: 'https://api.github.com',
});

/** QR bağlantısındaki veri biçiminin sürümü. */
export const CODEC_VERSION = 1;

/** Kartvizit sayfasının, panele göre göreli yolu. */
export const CARD_PAGE_PATH = 'kartvizit/';

/** İşlem yapılmadığında oturumun kilitleneceği süre (dakika). */
export const IDLE_LOCK_MINUTES = 15;

/** Tarayıcı depolama anahtarları. */
export const STORAGE_KEYS = Object.freeze({
  vault: 'canlarqr.vault.v1',
  legacy: 'canlarqr.cards.v1',
  archived: 'canlarqr.vault.archived',
});

/** Tema tercihinin saklandığı anahtar (src/theme-init.js ile aynı olmalı). */
export const THEME_STORAGE_KEY = 'canlarqr.theme';

/** Oturum doğrulama parametreleri (PBKDF2-SHA256 tuzu, tur sayısı ve doğrulama bloğu). */
export const ACCESS = Object.freeze({
  salt: 'iXM3C5hq4izQFvq/4sXXLA==',
  iterations: 600000,
  check: 'BMyLl+mFkzjLj9JLXcZcQso8MZ5Z9j1W9SAo/gKJiMfjZU088mW8pQ==',
});
