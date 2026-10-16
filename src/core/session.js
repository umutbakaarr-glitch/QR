/**
 * Oturum açma: girilen değerden anahtar türetir ve doğrulama bloğunu çözerek kontrol eder.
 * Anahtar yalnızca bellekte tutulur; sayfa kapanınca veya yenilenince oturum sona erer.
 */
import { ACCESS } from '../config.js?v=11';
import { deriveKey, open } from './crypto.js?v=11';

const CHECK_TEXT = 'canlar-qr-ok';

let failures = 0;

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * @param {string} secret
 * @returns {Promise<CryptoKey>} Doğruysa veri anahtarı
 * @throws {Error} Yanlışsa
 */
export async function unlock(secret) {
  // Art arda hatalı denemelerde bekleme süresi katlanarak artar (en fazla 30 sn).
  if (failures >= 3) await wait(Math.min(30000, 1000 * 2 ** (failures - 3)));
  const key = await deriveKey(secret, ACCESS);
  try {
    if (await open(key, ACCESS.check) !== CHECK_TEXT) throw new Error();
  } catch {
    failures += 1;
    throw new Error('Giriş bilgisi hatalı.');
  }
  failures = 0;
  return key;
}
