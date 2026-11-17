// Local verification server for the built files. Netlify serves dist directly in production.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { parse } from 'smol-toml'

const config = parse(await readFile('netlify.toml', 'utf8'))
const root = resolve(config.build.publish)
await stat(resolve(root, 'index.html'))
const port = Number(process.env.POPPAY_PREVIEW_PORT ?? 4173)
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}
const glob = (pattern, pathname) =>
  pattern.endsWith('*') ? pathname.startsWith(pattern.slice(0, -1)) : pattern === pathname
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    const path = decodeURIComponent(url.pathname)
    for (const rule of config.headers ?? []) {
      if (glob(rule.for, path))
        for (const [key, value] of Object.entries(rule.values)) res.setHeader(key, value)
    }
    if (!res.hasHeader('Cache-Control'))
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    const filename = resolve(root, '.' + path)
    if (filename !== root && !filename.startsWith(root + sep)) {
      res.writeHead(404).end()
      return
    }
    let target = filename
    if (!(await stat(target).catch(() => null))?.isFile()) {
      const rule = config.redirects?.find((rule) => rule.status === 200 && glob(rule.from, path))
      if (!rule) {
        res.writeHead(404).end()
        return
      }
      target = resolve(root, '.' + rule.to)
    }
    const bytes = await readFile(target)
    res.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream' })
    res.end(req.method === 'HEAD' ? undefined : bytes)
  } catch {
    res.writeHead(400).end('Invalid request')
  }
}).listen(port, '127.0.0.1', () =>
  process.stdout.write(`PopPay static preview on http://127.0.0.1:${port}\n`),
)
