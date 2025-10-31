#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const APP_DIR = path.join(ROOT, 'app')
const OUT_FILE = path.join(ROOT, 'sitemap.xml')

function isPageFile(name) {
  return /(^page\.(t|j)sx?$)/i.test(name)
}

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      // skip api and sitemap and admin routes from public sitemap
      if (ent.name === 'api' || ent.name === 'sitemap.xml' || ent.name === 'admin') continue
      walk(full, cb)
    } else {
      cb(full)
    }
  }
}

function pagePathToUrl(filePath) {
  let rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/')
  rel = rel.replace(/\/page\.(t|j)sx?$/i, '')
  if (rel === '') return '/'
  rel = rel.replace(/\/index$/i, '')
  rel = rel.replace(/^\/+/, '').replace(/\/+$/,'')
  return '/' + rel
}

async function expandDynamicRoutes(routes) {
  const expanded = []
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  const hasBlogTemplate = routes.find(r => r.includes('/blog/['))
  if (hasBlogTemplate) {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (SUPABASE_URL && SERVICE_KEY) {
      try {
        const { createClient } = require('@supabase/supabase-js')
        const svc = createClient(SUPABASE_URL, SERVICE_KEY)
        const res = await svc.from('blogs').select('slug').eq('status', 'published')
        const data = res.data || []
        if (Array.isArray(data)) {
          for (const row of data) {
            if (row && row.slug) expanded.push(`/blog/${row.slug}`)
          }
        }
      } catch (e) {
        console.warn('Could not expand blog slugs via Supabase:', e && e.message ? e.message : e)
      }
    } else {
      console.warn('Supabase credentials not found; skipping expansion of blog dynamic routes. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to enable.')
    }
  }

  return { expanded, baseUrl }
}

async function main() {
  const pages = new Set()
  walk(APP_DIR, (file) => {
    const name = path.basename(file)
    if (!isPageFile(name)) return
    const url = pagePathToUrl(file)
    if (url.startsWith('/api')) return
    if (url.startsWith('/admin')) return
    pages.add(url)
  })

  const { expanded, baseUrl } = await expandDynamicRoutes(Array.from(pages))
  for (const p of expanded) pages.add(p)

  const urls = Array.from(pages).sort().map(u => `  <url>\n    <loc>${baseUrl.replace(/\/$/, '')}${u}</loc>\n  </url>`)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

  fs.writeFileSync(OUT_FILE, xml, 'utf8')
  console.log('Wrote', OUT_FILE)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const APP_DIR = path.join(ROOT, 'app')
const OUT_FILE = path.join(ROOT, 'sitemap.xml')

function isPageFile(name) {
