# Canlar Group QR Kod Sistemi

Personel için dijital kartvizit ve QR kod yönetimi. Panelde oluşturulan her kartvizit için iki tür QR üretilir

## Güvenlik ve KVKK

- **Kişisel veri sunucuya gitmez.** Kartvizit bilgileri bağlantının `#` sonrasında taşınır; tarayıcılar bu
  kısmı sunucuya göndermez. Barındırma sunucusunun kayıtlarında kişisel veri bulunmaz.
- **Kalıcı QR, şifreli kartvizit dosyaları.** Her kişinin QR'ı değişmez; bilgiler `kartvizit/k/<kimlik>.json` dosyasına
  kişiye özel 256 bit anahtarla (AES-GCM) şifreli yazılır. Anahtar yalnızca QR bağlantısının `#` sonrasında bulunur.
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
