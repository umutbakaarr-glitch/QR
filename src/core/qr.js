/**
 * QR kod üretimi. assets/vendor/qrcode-generator.js betiğinin sağladığı global
 * `qrcode` fonksiyonunu kullanır (MIT lisanslı, harici bağlantı gerektirmez).
 */
import { cardFragment } from './card-file.js';
import { buildVCard } from './vcard.js';

const QUIET_ZONE = 2; // modül cinsinden kenar boşluğu

export const QR_TYPES = Object.freeze({
  card: 'card', // kartvizit sayfasını açan kalıcı bağlantı (bilgiler güncellenebilir)
  vcard: 'vcard', // doğrudan rehbere kaydedilen kişi bilgisi
});

/** QR'a yazılacak metni üretir. */
export function qrContent(card, type, cardPageUrl) {
  return type === QR_TYPES.vcard ? buildVCard(card) : `${cardPageUrl}#${cardFragment(card)}`;
}

function buildMatrix(text) {
  const generator = globalThis.qrcode;
  generator.stringToBytes = generator.stringToBytesFuncs['UTF-8'];
  // Kısa içerikte (kalıcı kartvizit bağlantısı) daha yüksek hata düzeltme: hasarlı baskıda da okunur.
  const model = generator(0, text.length <= 300 ? 'M' : 'L');
  model.addData(text, 'Byte');
  model.make();
  const count = model.getModuleCount();
  return { count, isDark: (row, col) => model.isDark(row, col) };
}

/** SVG metni (baskı için vektörel). */
export function toSvg(text, { fg, bg }) {
  const { count, isDark } = buildMatrix(text);
  const size = count + QUIET_ZONE * 2;
  let path = '';
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="1024" height="1024" shape-rendering="crispEdges">`
    + `<rect width="${size}" height="${size}" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`;
}

/** <img> etiketinde gösterilebilecek data: adresi. */
export const toDataUrl = (text, colors) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(toSvg(text, colors))}`;

/** Yüksek çözünürlüklü PNG (yaklaşık 2048 px). */
export function toPngBlob(text, { fg, bg }, targetSize = 2048) {
  const { count, isDark } = buildMatrix(text);
  const size = count + QUIET_ZONE * 2;
  const cell = Math.max(4, Math.floor(targetSize / size));
  const canvas = document.createElement('canvas');
  canvas.width = size * cell;
  canvas.height = size * cell;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (isDark(row, col)) ctx.fillRect((col + QUIET_ZONE) * cell, (row + QUIET_ZONE) * cell, cell, cell);
    }
  }
  return new Promise((resolve) => { canvas.toBlob(resolve, 'image/png'); });
}
