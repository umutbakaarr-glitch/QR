/**
 * Kartvizit dosyalarını GitHub deposuna yazar / siler (GitHub REST API, contents uç noktası).
 * Yalnızca ilgili depoda "Contents: Read and write" yetkisi olan, ince ayarlı (fine-grained)
 * bir erişim anahtarı kullanılmalıdır. Anahtar tarayıcıda yalnızca şifreli kasada saklanır.
 */
import { PUBLISH } from '../config.js?v=9';

const encodeBase64Utf8 = (text) => {
  let binary = '';
  new TextEncoder().encode(text).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

export class GitHubPublisher {
  /**
   * @param {string} token
   * @param {{ fetch?: typeof fetch, target?: typeof PUBLISH }} [options] Testlerde değiştirilebilir.
   */
  constructor(token, { fetch: fetchImpl = globalThis.fetch.bind(globalThis), target = PUBLISH } = {}) {
    this.token = token;
    this.fetch = fetchImpl;
    this.target = target;
  }

  #url(path = '') {
    const { api, owner, repo } = this.target;
    return `${api}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${path}`;
  }

  async #request(path, init = {}) {
    const response = await this.fetch(this.#url(path), {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (response.status === 401) throw new Error('GitHub erişim anahtarı geçersiz veya süresi dolmuş.');
    if (response.status === 403) throw new Error('GitHub erişim anahtarının bu depoya yazma yetkisi yok.');
    return response;
  }

  /** Anahtarın depoya yazma yetkisi olduğunu doğrular. */
  async verify() {
    const response = await this.#request('');
    if (response.status === 404) throw new Error('Depo bulunamadı veya erişim anahtarı bu depoyu kapsamıyor.');
    if (!response.ok) throw new Error(`GitHub bağlantısı kurulamadı (${response.status}).`);
    const repo = await response.json();
    if (repo.permissions && !repo.permissions.push) throw new Error('Erişim anahtarının bu depoya yazma yetkisi yok.');
    return true;
  }

  async #sha(path) {
    const response = await this.#request(`/contents/${path}?ref=${encodeURIComponent(this.target.branch)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub dosya bilgisi alınamadı (${response.status}).`);
    return (await response.json()).sha;
  }

  /** Dosyayı oluşturur veya günceller. */
  async put(path, content, message) {
    const sha = await this.#sha(path);
    const response = await this.#request(`/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ message, content: encodeBase64Utf8(content), branch: this.target.branch, ...(sha ? { sha } : {}) }),
    });
    if (!response.ok) throw new Error(`Kartvizit yayınlanamadı (${response.status}).`);
  }

  /** Dosyayı siler; zaten yoksa sessizce geçer. */
  async remove(path, message) {
    const sha = await this.#sha(path);
    if (!sha) return;
    const response = await this.#request(`/contents/${path}`, {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch: this.target.branch }),
    });
    if (!response.ok) throw new Error(`Kartvizit yayından kaldırılamadı (${response.status}).`);
  }
}
