/**
 * Yönetim paneli giriş noktası: modülleri bağlar, oturumu ve kilitlemeyi yönetir.
 */
import { CARD_PAGE_PATH, IDLE_LOCK_MINUTES } from './config.js?v=10';
import { CardStore } from './core/store.js?v=10';
import { initBackup } from './ui/backup.js?v=10';
import { initDetail, openDetail } from './ui/detail.js?v=10';
import { $, $$, bindOverlayClosing, closeOverlay, toast } from './ui/dom.js?v=10';
import { initEditor, openEditor } from './ui/editor.js?v=10';
import { renderList } from './ui/list.js?v=10';
import { showLogin } from './ui/login.js?v=10';
import { initTheme } from './ui/theme.js?v=10';
import { initPublishing, isConnected, loadPublisher, publishCard, unpublishCard } from './ui/publish.js?v=10';

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
  loadPublisher(store);
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

  /** Kaydı yayınlar; bağlantı yoksa veya hata olursa kayıt yerelde kalır ve "yayınlanmadı" görünür. */
  const tryPublish = async (card, successMessage) => {
    if (!isConnected()) {
      toast(`${successMessage}. Yayınlamak için yayın bağlantısını kurun.`);
      return card;
    }
    try {
      const published = await publishCard(card);
      toast(`${successMessage} ve yayınlandı`);
      return published;
    } catch (err) {
      toast(`${successMessage}, ancak yayınlanamadı: ${err.message}`);
      return card;
    }
  };

  initEditor({
    save: async (id, data) => {
      const saved = id ? await store.update(id, data) : await store.create(data);
      const result = await tryPublish(saved, id ? 'Değişiklikler kaydedildi' : 'Kartvizit oluşturuldu');
      refresh();
      openDetail(store.get(result.id));
      return result;
    },
    suggestCompanyPhone: () => store.list().find((card) => card.company_phone)?.company_phone ?? '',
  });

  initDetail({
    cardPageUrl,
    onEdit: (card) => { closeOverlay('detail'); openEditor(card); },
    onPublish: async (card) => {
      await tryPublish(card, 'Kartvizit');
      refresh();
      openDetail(store.get(card.id));
    },
    onDelete: async (card) => {
      if (card.published_at && !isConnected()) {
        if (!window.confirm('Yayın bağlantısı kurulu olmadığı için bu kartvizit internetten kaldırılamayacak; QR okutulmaya devam edecek. Yine de yalnızca bu cihazdan silinsin mi?')) return;
      } else if (!window.confirm(`"${card.full_name}" kartviziti silinsin mi? QR okutulduğunda artık "bulunamadı" görünecek. Bu işlem geri alınamaz.`)) {
        return;
      }
      if (card.published_at && isConnected()) {
        try {
          await unpublishCard(card);
        } catch (err) {
          toast(`Silinemedi: ${err.message}`);
          return;
        }
      }
      await store.remove(card.id);
      closeOverlay('detail');
      refresh();
      toast('Kartvizit silindi');
    },
  });

  initBackup({ getStore: () => store, onImported: refresh });
  initPublishing({ getStore: () => store, isPending: CardStore.isPending, onChanged: refresh });

  $('#search').addEventListener('input', refresh);
  $$('[data-action="new"]').forEach((button) => button.addEventListener('click', () => openEditor()));
  $$('[data-action="logout"]').forEach((button) => button.addEventListener('click', lock));

  showLogin(startSession);
}

init();
