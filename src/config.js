/**
 * Uygulama genelindeki sabit ayarlar.
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

/** Oturum doğrulama parametreleri (PBKDF2-SHA256 tuzu, tur sayısı ve doğrulama bloğu). */
export const ACCESS = Object.freeze({
  salt: 'iXM3C5hq4izQFvq/4sXXLA==',
  iterations: 600000,
  check: 'BMyLl+mFkzjLj9JLXcZcQso8MZ5Z9j1W9SAo/gKJiMfjZU088mW8pQ==',
});
