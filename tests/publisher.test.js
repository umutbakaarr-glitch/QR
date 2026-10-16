import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubPublisher } from '../src/core/publisher.js';

const TARGET = { owner: 'sahip', repo: 'depo', branch: 'main', dir: 'kartvizit/k', api: 'https://api.example' };

/** GitHub contents API'sini taklit eden sahte fetch. */
function fakeGitHub({ push = true } = {}) {
  const files = new Map();
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    const reply = (status, body = {}) => ({ ok: status < 300, status, json: async () => body });
    if (url === 'https://api.example/repos/sahip/depo') return reply(200, { permissions: { push } });
    const path = decodeURIComponent(url.replace('https://api.example/repos/sahip/depo/contents/', '').split('?')[0]);
    const method = init.method ?? 'GET';
    if (method === 'GET') return files.has(path) ? reply(200, { sha: files.get(path).sha }) : reply(404);
    const body = JSON.parse(init.body);
    if (files.has(path) && body.sha !== files.get(path).sha) return reply(409);
    if (method === 'PUT') { files.set(path, { sha: `sha${calls.length}`, content: atob(body.content) }); return reply(201); }
    if (method === 'DELETE') { files.delete(path); return reply(200); }
    return reply(400);
  };
  return { fetch, files, calls };
}

test('yetki doğrulanır', async () => {
  await new GitHubPublisher('t', { fetch: fakeGitHub().fetch, target: TARGET }).verify();
  await assert.rejects(() => new GitHubPublisher('t', { fetch: fakeGitHub({ push: false }).fetch, target: TARGET }).verify(), /yazma/);
});

test('dosya oluşturulur, güncellenir (sha ile) ve silinir', async () => {
  const gh = fakeGitHub();
  const publisher = new GitHubPublisher('gizli', { fetch: gh.fetch, target: TARGET });
  await publisher.put('kartvizit/k/abc.json', 'v1', 'm');
  await publisher.put('kartvizit/k/abc.json', 'v2', 'm');
  assert.equal(gh.files.get('kartvizit/k/abc.json').content, 'v2');
  assert.ok(gh.calls.every((call) => call.init.headers.Authorization === 'Bearer gizli'));
  await publisher.remove('kartvizit/k/abc.json', 'm');
  assert.equal(gh.files.size, 0);
  await publisher.remove('kartvizit/k/abc.json', 'm'); // zaten yoksa hata vermez
});

test('geçersiz anahtar anlaşılır hata verir', async () => {
  const publisher = new GitHubPublisher('t', { fetch: async () => ({ ok: false, status: 401 }), target: TARGET });
  await assert.rejects(() => publisher.put('a.json', 'x', 'm'), /geçersiz/);
});
