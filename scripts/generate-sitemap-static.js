#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

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

const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for (const u of unique) {
  const loc = `${baseUrl.replace(/\/$/, '')}${u === '/' ? '/' : u}`
  xmlParts.push('  <url>')
  xmlParts.push(`    <loc>${loc}</loc>`)
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
