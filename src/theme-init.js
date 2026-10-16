/*
 * Temayı sayfa çizilmeden önce uygular (beyaz ekran yanıp sönmesini önler).
 * Kayıtlı tercih yoksa cihazın açık/koyu ayarı izlenir.
 * Klasik betik olarak <head> içinde yüklenir; tercih yalnızca "light" veya "dark" olabilir.
 */
(function applyTheme() {
  var saved = null;
  try { saved = localStorage.getItem('canlarqr.theme'); } catch (e) { /* depolama kapalı olabilir */ }
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}());
