#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const https = require('https')

const APP_DIR = path.join(__dirname, '..', 'app')
const OUT_FILE = path.join(__dirname, '..', 'sitemap.xml')
const OUT_PUBLIC_FILE = path.join(__dirname, '..', 'public', 'sitemap.xml')

function isPageFile(name) {
  return /(^|\.)page\.(tsx|ts|jsx|js|mdx)$/.test(name)
}

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      walk(full, cb)
    } else if (e.isFile()) {
      cb(full)
    }
  }
}

async function fetchSupabasePosts(supabaseUrl, supabaseKey) {
  try {
    // Expect supabaseUrl like https://xyz.supabase.co
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/blogs?select=slug,updated_at,published_at&status=eq.published`
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    return await new Promise((resolve, reject) => {
      const req = https.get(url, { headers }, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve(json)
          } catch (e) {
            reject(new Error('Failed to parse Supabase response: ' + e.message))
          }
        })
      })
      req.on('error', (err) => reject(err))
    })
  } catch (err) {
    console.warn('Supabase fetch failed:', err.message || err)
    return null
  }
}

async function main() {
  const files = []
  if (fs.existsSync(APP_DIR)) {
    walk(APP_DIR, (f) => files.push(f))
  } else {
    console.error('app directory not found:', APP_DIR)
    process.exit(1)
  }

  const urls = []
  for (const f of files) {
    const rel = path.relative(APP_DIR, f).replace(/\\/g, '/')
    // only page files
    if (!isPageFile(path.basename(rel))) continue
    // skip api and admin paths
    if (rel.startsWith('api/') || rel.startsWith('admin/')) continue
    // skip dynamic segments
    if (rel.includes('[') || rel.includes(']')) continue

    // derive route path from directory
    const dir = path.dirname(rel)
    let route = '/' + (dir === '.' ? '' : dir)
    if (route.endsWith('/')) route = route.slice(0, -1)
    if (route === '') route = '/'

    urls.push(route)
  }

  // dedupe and sort
  const unique = Array.from(new Set(urls)).sort()

  // CLI arg takes precedence: node scripts/generate-sitemap-static.js https://example.com
  const cliBase = process.argv[2]
  const baseUrl = (cliBase && cliBase.trim()) || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // helper to choose changefreq/priority for static routes
  function metaForRoute(route) {
    // defaults
    const defaults = { changefreq: 'monthly', priority: '0.5' }
    if (route === '/') return { changefreq: 'weekly', priority: '1.0' }
    if (route === '/blog') return { changefreq: 'weekly', priority: '0.9' }
    if (route.startsWith('/blog/')) return { changefreq: 'monthly', priority: '0.7' }
    if (['/about', '/contact', '/donate', '/partner'].includes(route)) return { changefreq: 'monthly', priority: '0.8' }
    if (['/events', '/stories'].includes(route)) return { changefreq: 'weekly', priority: '0.8' }
    if (['/gallery', '/volunteer'].includes(route)) return { changefreq: 'monthly', priority: '0.7' }
    return defaults
  }

  const items = []
  for (const u of unique) {
    const { changefreq, priority } = metaForRoute(u)
    items.push({ loc: `${baseUrl.replace(/\/$/, '')}${u === '/' ? '/' : u}`, changefreq, priority })
  }

  // Optionally fetch blog post slugs from Supabase when credentials are provided
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
  if (supabaseUrl && supabaseKey) {
    console.log('Fetching blog posts from Supabase...')
    const posts = await fetchSupabasePosts(supabaseUrl, supabaseKey)
    if (Array.isArray(posts)) {
      for (const p of posts) {
        const slug = p.slug
        if (!slug) continue
        const lastmod = p.updated_at || p.published_at || null
        items.push({ loc: `${baseUrl.replace(/\/$/, '')}/blog/${slug}`, lastmod, changefreq: 'monthly', priority: '0.7' })
      }
    } else {
      console.warn('No posts returned from Supabase or failed to parse response')
    }
  } else {
    console.log('Supabase credentials not found — skipping dynamic blog post inclusion')
  }

  // build XML
  const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
  for (const it of items) {
    xmlParts.push('  <url>')
    xmlParts.push(`    <loc>${it.loc}</loc>`)
    if (it.lastmod) xmlParts.push(`    <lastmod>${new Date(it.lastmod).toISOString()}</lastmod>`)
    if (it.changefreq) xmlParts.push(`    <changefreq>${it.changefreq}</changefreq>`)
    if (it.priority) xmlParts.push(`    <priority>${it.priority}</priority>`)
    xmlParts.push('  </url>')
  }
  xmlParts.push('</urlset>')

  const outXml = xmlParts.join('\n') + '\n'
  fs.writeFileSync(OUT_FILE, outXml, 'utf8')
  console.log('Wrote sitemap to', OUT_FILE)
  try {
    // ensure public dir exists
    const pubDir = path.dirname(OUT_PUBLIC_FILE)
    if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true })
    fs.writeFileSync(OUT_PUBLIC_FILE, outXml, 'utf8')
    console.log('Wrote sitemap to', OUT_PUBLIC_FILE)
  } catch (err) {
    console.warn('Could not write public sitemap:', err.message)
  }
}

// run
main().catch((err) => {
  console.error('Failed to generate sitemap:', err)
  process.exit(1)
})
