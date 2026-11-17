import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const assets = (await readdir('dist/assets')).sort().map((file) => '/assets/' + file)
const html = await readFile('dist/index.html', 'utf8')
const mark = await readFile('dist/mark.svg', 'utf8')
const version = createHash('sha256')
  .update(JSON.stringify(assets) + html + mark)
  .digest('hex')
  .slice(0, 16)
await writeFile(
  'dist/sw.js',
  `
const CACHE = 'poppay-static-v1-${version}'
const SHELL = '/index.html'
const ASSETS = new Set(${JSON.stringify(['/mark.svg', ...assets])})
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([new Request(SHELL, { cache: 'reload' }), ...ASSETS])))
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('poppay-static-') && name !== CACHE) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await (await caches.open(CACHE)).match(SHELL)) || Response.error()))
  } else if (ASSETS.has(url.pathname) && !url.search) {
    event.respondWith((async () => (await (await caches.open(CACHE)).match(request)) || fetch(request))())
  }
})
`,
)
