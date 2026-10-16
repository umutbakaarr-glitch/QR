# Canlar Group QR Kod Sistemi

Personel için dijital kartvizit ve QR kod yönetimi. Panelde oluşturulan her kartvizit için iki tür QR üretilir:

| QR türü | Okutulunca | İnternet |
|---|---|---|
| **Kartvizit QR** | Kurumsal kartvizit sayfası açılır (Ara, E-posta, Rehbere ekle) | Gerekir |
| **Rehber QR** | Telefon doğrudan "Kişiyi kaydet" ekranını açar (vCard) | Gerekmez |

Uygulama tamamen statiktir: sunucu, veritabanı, derleme adımı veya harici kütüphane bağlantısı yoktur.
GitHub Pages üzerinde olduğu gibi çalışır.

## Mimari

```
index.html                 Yönetim paneli (yalnızca işaretleme)
kartvizit/index.html       QR okutulunca açılan herkese açık kartvizit sayfası
assets/
  css/base.css             Ortak tasarım değişkenleri ve bileşenler
  css/panel.css            Panel düzeni
  css/kartvizit.css        Kartvizit sayfası düzeni
  img/                     Logo ve simge
  vendor/qrcode-generator.js  QR matris üreticisi (MIT, Kazuhiko Arase)
src/
  config.js                Kurum bilgisi, alan listesi, depolama anahtarları, sabitler
  core/                    Arayüzden bağımsız iş mantığı (testlerle doğrulanır)
    card-codec.js          Kartvizit <-> bağlantı kodlaması
    crypto.js              PBKDF2 + AES-GCM yardımcıları (Web Crypto API)
    phone.js               Telefon biçimlendirme / doğrulama
    qr.js                  QR içeriği, SVG ve PNG üretimi
    session.js             Oturum açma
    store.js               Şifreli kartvizit deposu, yedekleme
    validation.js          Girdi temizleme ve doğrulama
    vcard.js               vCard 3.0 üretimi
  ui/                      Panel ekranları (her ekran ayrı modül)
    dom.js  login.js  list.js  editor.js  detail.js  backup.js
  panel.js                 Panel giriş noktası (modülleri bağlar)
  kartvizit.js             Kartvizit sayfası giriş noktası
tests/                     node:test birim testleri (src/core)
```

Bağımlılık yönü tek yönlüdür: `ui/` → `core/` → `config.js`. `core/` modülleri DOM'a erişmez
(`qr.js` içindeki PNG üretimi hariç), bu yüzden Node.js'te doğrudan test edilebilir.

### Veri akışı
1. Panelde girilen bilgiler `validation.js` ile temizlenir, `store.js` ile **şifrelenerek** tarayıcının
   yerel deposuna yazılır.
2. Kartvizit QR'ı, bilgileri `card-codec.js` ile kodlayıp `kartvizit/#<veri>` bağlantısına gömer.
3. Kartvizit sayfası bağlantının `#` sonrasını çözer ve sayfayı DOM API'leriyle oluşturur.

## Güvenlik ve KVKK

- **Kişisel veri sunucuya gitmez.** Kartvizit bilgileri bağlantının `#` sonrasında taşınır; tarayıcılar bu
  kısmı sunucuya göndermez. Barındırma sunucusunun kayıtlarında kişisel veri bulunmaz.
- **Harici bağlantı yok.** Yazı tipi, analiz, çerez veya üçüncü taraf betiği kullanılmaz.
- **Şifreli depolama.** Panel verileri AES-GCM 256 ile şifrelenir; anahtar PBKDF2-SHA256 (600.000 tur) ile
  türetilir ve yalnızca bellekte tutulur. Sayfa yenilenince, kapatılınca veya 15 dakika işlem yapılmayınca
  oturum kapanır.
- **Şifreli yedek.** Yedek dosyaları kendi tuzuyla şifrelenir.
- **İçerik Güvenliği Politikası (CSP).** Satır içi betik ve stil yoktur; yalnızca aynı kaynaktan dosya yüklenir.
  Kullanıcı verisi HTML'e yalnızca kaçırılarak (`escapeHtml`) veya `textContent` ile yazılır.
- **Çerçeve koruması, `no-referrer`, `noindex`.** Sayfalar başka sitelerde çerçevelenemez, arama motorlarında
  listelenmez.
- **Açık rıza kaydı.** Her kartvizit için kişinin bilgilendirildiği ve onay verdiği tarih kaydedilir; onaysız
  kartvizit oluşturulamaz. Silinen kayıt kalıcı olarak kaldırılır.
- **Veri minimizasyonu.** Yalnızca kartvizit için gerekli alanlar tutulur; ziyaret veya tarama takibi yapılmaz.

## Geliştirme

Gereksinim: modern bir tarayıcı; testler için Node.js 20+.

```bash
npm start      # http://localhost:8080 adresinde yerel sunucu (Python 3)
npm test       # birim testleri
```

ES modülleri `file://` üzerinden açılamaz; yerel geliştirmede mutlaka bir HTTP sunucusu kullanın.

### Yeni bir kartvizit alanı eklemek
1. `src/config.js` → `CARD_FIELDS` listesinin **sonuna** ekleyin (sıra, QR biçiminin parçasıdır).
2. `src/core/validation.js` → `MAX_LENGTH` ve gerekiyorsa doğrulama kuralı.
3. `index.html` → `f_<alan>` kimlikli form alanı.
4. `src/kartvizit.js` ve `src/core/vcard.js` → gösterim ve vCard satırı.
5. `tests/` → ilgili test.

Mevcut alanların sırası değiştirilirse daha önce basılmış QR kodlar yanlış çözülür; biçim değişikliği
gerekirse `CODEC_VERSION` artırılmalı ve `card-codec.js` eski sürümü de çözecek şekilde güncellenmelidir.

## Yayınlama (GitHub Pages)

Depo ayarlarında **Settings → Pages → Deploy from a branch → main / (root)**. Derleme adımı yoktur;
`main` dalına gönderilen her değişiklik birkaç dakika içinde yayına alınır.
