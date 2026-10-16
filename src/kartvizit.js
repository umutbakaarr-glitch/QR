/**
 * Kartvizit sayfası.
 *  - Kalıcı QR (#<id>.<key>): şifreli kartvizit dosyasını aynı siteden indirir, anahtarla çözer.
 *    "?rehber" ile açılırsa (Rehber QR) önce "Rehbere kaydet" ekranı gösterilir.
 *    Anahtar bağlantının # sonrasındadır ve sunucuya hiç gönderilmez.
 *  - Eski QR'lar ve panel önizlemesi (#<veri>): bilgiler doğrudan bağlantıdan çözülür.
 * Sayfa çerez kullanmaz; içerik yalnızca DOM API'leriyle (innerHTML kullanılmadan) oluşturulur.
 */
import { ORG } from './config.js?v=10';
import { decodeCard } from './core/card-codec.js?v=10';
import { decryptCardFile, parseFragment } from './core/card-file.js?v=10';
import { formatPhone, telHref } from './core/phone.js?v=10';
import { buildVCard, slugify } from './core/vcard.js?v=10';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  mobile: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 3-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7',
  unit: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1',
  save: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM19 8v6M22 11h-6',
  globe: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
};

/** Küçük eleman oluşturucu: el('p', { className: 'x' }, 'metin', child) */
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((child) => child !== null && child !== undefined && child !== ''));
  return node;
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

const initials = (name) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toLocaleUpperCase('tr') : '?';
};

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Kişiyi telefon rehberine kaydettirir.
 * iPhone/iPad: vCard'a yönlenmek Safari'de doğrudan "Yeni Kişi" ekranını açar.
 * Android ve diğerleri: .vcf dosyası indirilir; telefon rehber uygulamasıyla açar.
 */
function saveContact(card) {
  const blob = new Blob([buildVCard(card)], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  if (isIOS()) {
    window.location.href = url;
  } else {
    const link = el('a', { href: url, download: `${slugify(card.full_name)}.vcf` });
    document.body.append(link);
    link.click();
    link.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function contactRow(iconName, label, value, href, extra) {
  const text = el('span', { className: 'contact-text' },
    el('span', { className: 'contact-label', textContent: label }),
    el('span', { className: 'contact-value' }, value, extra ? el('span', { className: 'contact-extra', textContent: ` · ${extra}` }) : null));
  const children = [el('span', { className: 'contact-icon' }, icon(iconName)), text];
  if (!href) return el('div', { className: 'contact' }, ...children);
  const external = href.startsWith('http');
  return el('a', {
    className: 'contact', href, ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
  }, ...children, el('span', { className: 'chevron', textContent: '›' }));
}

function renderCard(card, root) {
  const name = card.full_name || 'Adı Soyadı';
  document.title = `${name}${card.title_tr ? ` · ${card.title_tr}` : ''} · ${ORG.name}`;

  const companyHref = card.company_phone ? telHref(card.company_phone, card.extension) : '';
  const callHref = card.mobile ? telHref(card.mobile) : companyHref;

  const actions = el('div', { className: 'actions' });
  if (callHref) actions.append(el('a', { className: 'action', href: callHref }, icon('phone'), el('span', { textContent: 'Ara' })));
  if (card.email) actions.append(el('a', { className: 'action', href: `mailto:${card.email}` }, icon('mail'), el('span', { textContent: 'E-posta' })));
  const save = el('button', { className: 'action primary', type: 'button' }, icon('save'), el('span', { textContent: 'Rehbere ekle' }));
  save.addEventListener('click', () => saveContact(card));
  actions.append(save);

  const contacts = el('section', { className: 'contacts' });
  if (card.mobile) contacts.append(contactRow('mobile', 'Cep telefonu', formatPhone(card.mobile), telHref(card.mobile)));
  if (card.company_phone) {
    contacts.append(contactRow('phone', 'Şirket telefonu', formatPhone(card.company_phone), companyHref, card.extension ? `Dahili ${card.extension}` : ''));
  } else if (card.extension) {
    contacts.append(contactRow('phone', 'Dahili telefon', card.extension));
  }
  if (card.email) contacts.append(contactRow('mail', 'E-posta', card.email, `mailto:${card.email}`));
  if (card.department) contacts.append(contactRow('unit', 'Birimi / Bölümü / Kısım Şefi', card.department));
  contacts.append(contactRow('globe', 'Web sitesi', ORG.siteLabel, ORG.site));

  root.replaceChildren(
    el('section', { className: 'profile' },
      el('div', { className: 'profile-avatar', textContent: initials(name) }),
      el('h1', { textContent: name }),
      card.title_tr ? el('p', { className: 'title-tr', textContent: card.title_tr }) : null,
      card.title_en ? el('p', { className: 'title-en', lang: 'en', textContent: card.title_en }) : null,
      card.department ? el('div', { className: 'dept', textContent: card.department }) : null,
      actions),
    contacts,
    el('footer', { className: 'foot' },
      `© ${ORG.name} · `,
      el('a', { href: ORG.site, target: '_blank', rel: 'noopener noreferrer', textContent: ORG.siteLabel }),
      el('div', { className: 'privacy', textContent: 'Bu sayfa çerez kullanmaz; bilgiler hiçbir sunucuya gönderilmez.' })),
  );
}

let autoSaved = false;

/**
 * Rehber QR: güncel bilgiler gelir gelmez telefonun "Kişiyi kaydet" ekranı kendiliğinden açılır.
 * Telefon otomatik açmayı engellerse ekranda tek bir "Rehbere kaydet" düğmesi kalır.
 */
function renderSaveContact(card, root) {
  const name = card.full_name || 'Adı Soyadı';
  document.title = `${name} · Rehbere kaydet · ${ORG.name}`;
  const save = el('button', { className: 'save-big', type: 'button' }, icon('save'), el('span', { textContent: 'Rehbere kaydet' }));
  save.addEventListener('click', () => saveContact(card));
  root.replaceChildren(
    el('section', { className: 'profile compact' },
      el('h1', { textContent: name }),
      el('p', { className: 'save-hint', textContent: 'Kişi kaydı açılıyor… Açılmazsa aşağıdaki düğmeye dokunun.' }),
      save),
    el('footer', { className: 'foot' },
      `© ${ORG.name} · `,
      el('a', { href: ORG.site, target: '_blank', rel: 'noopener noreferrer', textContent: ORG.siteLabel }),
      el('div', { className: 'privacy', textContent: 'Bu sayfa çerez kullanmaz; bilgiler hiçbir sunucuya gönderilmez.' })),
  );
  if (!autoSaved) {
    autoSaved = true;
    setTimeout(() => saveContact(card), 150);
  }
}

function renderMessage(root, title = 'Kartvizit bulunamadı', text = 'Bu QR koda ait kartvizit bilgisi okunamadı.') {
  document.title = `${ORG.name} · ${title}`;
  root.replaceChildren(el('section', { className: 'message' },
    el('h1', { textContent: title }),
    el('p', { textContent: text })));
}

/** Kalıcı QR: güncel şifreli dosyayı indirir (önbelleği atlayarak) ve çözer. */
async function loadPublishedCard({ id, key }, root, contactMode) {
  renderMessage(root, 'Yükleniyor…', 'Kartvizit bilgileri getiriliyor.');
  let response;
  try {
    response = await fetch(`k/${id}.json?t=${Date.now()}`, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  } catch {
    renderMessage(root, 'Bağlantı kurulamadı', 'İnternet bağlantınızı kontrol edip sayfayı yenileyin.');
    return;
  }
  if (!response.ok) {
    renderMessage(root, 'Kartvizit bulunamadı', 'Bu kartvizit yayında değil veya kaldırılmış.');
    return;
  }
  try {
    const card = await decryptCardFile(await response.text(), key);
    if (contactMode) renderSaveContact(card, root);
    else renderCard(card, root);
  } catch {
    renderMessage(root);
  }
}

function sameOriginParent() {
  try { return window.top === window.self || window.top.location.origin === window.location.origin; } catch { return false; }
}

function render() {
  const root = document.getElementById('root');
  const preview = new URLSearchParams(window.location.search).has('preview');
  document.body.classList.toggle('preview', preview);
  const published = parseFragment(window.location.hash);
  if (published) {
    loadPublishedCard(published, root, new URLSearchParams(window.location.search).has('rehber'));
    return;
  }
  const card = decodeCard(window.location.hash);
  if (card && (card.full_name || preview)) renderCard(card, root);
  else renderMessage(root);
}

// Başka bir sitenin çerçevesinde gösterilmeyi engelle; yalnızca panelin önizlemesine izin ver.
if (sameOriginParent()) {
  window.addEventListener('hashchange', render);
  render();
} else {
  document.body.replaceChildren();
}
