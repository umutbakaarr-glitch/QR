/**
 * Yönetim paneli giriş noktası: modülleri bağlar, oturumu ve kilitlemeyi yönetir.
 */
import { CARD_PAGE_PATH, IDLE_LOCK_MINUTES } from './config.js';
import { CardStore } from './core/store.js';
import { initBackup } from './ui/backup.js';
import { initDetail, openDetail } from './ui/detail.js';
import { $, $$, bindOverlayClosing, closeOverlay, toast } from './ui/dom.js';
import { initEditor, openEditor } from './ui/editor.js';
import { renderList } from './ui/list.js';
import { showLogin } from './ui/login.js';
import { initTheme } from './ui/theme.js';

const cardPageUrl = new URL(CARD_PAGE_PATH, document.baseURI).href;

let store = null;
let idleTimer = null;

/** Oturumu kapatır: sayfayı yeniden yüklemek bellekteki anahtarı ve verileri temizler. */
const lock = () => window.location.reload();

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(lock, IDLE_LOCK_MINUTES * 60 * 1000);
}

function refresh() {
  renderList(store.list(), { query: $('#search').value, cardPageUrl, onOpen: (id) => openDetail(store.get(id)) });
}

async function startSession(key) {
  store = new CardStore(key);
  await store.load();
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  refresh();
  if (store.archived) toast('Bu cihazdaki eski kayıtlar açılamadı ve arşive alındı. Yedekten yükleyebilirsiniz.');
  resetIdleTimer();
  ['click', 'keydown', 'pointermove', 'touchstart'].forEach((name) => {
    document.addEventListener(name, resetIdleTimer, { passive: true });
  });
}

function init() {
  // Başka bir sitenin çerçevesi içinde açılmayı engelle (tıklama sahteciliğine karşı).
  if (window.top !== window.self) {
    document.body.replaceChildren();
    return;
  }

  bindOverlayClosing();
  initTheme();

  initEditor({
    save: async (id, data) => {
      const saved = id ? await store.update(id, data) : await store.create(data);
      refresh();
      toast(id ? 'Değişiklikler kaydedildi' : 'Kartvizit oluşturuldu');
      openDetail(saved);
      return saved;
    },
    suggestCompanyPhone: () => store.list().find((card) => card.company_phone)?.company_phone ?? '',
  });

  initDetail({
    cardPageUrl,
    onEdit: (card) => { closeOverlay('detail'); openEditor(card); },
    onDelete: async (card) => {
      if (!window.confirm(`"${card.full_name}" kartviziti silinsin mi? Bu işlem geri alınamaz.`)) return;
      await store.remove(card.id);
      closeOverlay('detail');
      refresh();
      toast('Kartvizit silindi');
    },
  });

  initBackup({ getStore: () => store, onImported: refresh });

  $('#search').addEventListener('input', refresh);
  $$('[data-action="new"]').forEach((button) => button.addEventListener('click', () => openEditor()));
  $$('[data-action="logout"]').forEach((button) => button.addEventListener('click', lock));

  showLogin(startSession);
}

init();
