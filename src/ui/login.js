/**
 * Giriş ekranı.
 */
import { unlock } from '../core/session.js?v=10';
import { $ } from './dom.js?v=10';

/**
 * Giriş ekranını gösterir; doğru bilgi girildiğinde anahtarla birlikte onUnlock çağrılır.
 * @param {(key: CryptoKey) => Promise<void>} onUnlock
 */
export function showLogin(onUnlock) {
  const form = $('#loginForm');
  const input = $('#loginSecret');
  const error = $('#loginErr');
  const button = $('button[type=submit]', form);

  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
  input.focus();

  form.onsubmit = async (event) => {
    event.preventDefault();
    error.textContent = '';
    button.disabled = true;
    try {
      const key = await unlock(input.value);
      input.value = '';
      await onUnlock(key);
    } catch (err) {
      error.textContent = err.message;
      input.select();
    } finally {
      button.disabled = false;
    }
  };
}
