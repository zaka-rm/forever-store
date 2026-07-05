// Audits which products still need their own correct image and prints a
// priority-ordered checklist. Run: node scripts/gen-image-checklist.cjs
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const srcPath = path.join(__dirname, '../src/lib/products.ts')
const tmpPath = path.join(__dirname, '_products_tmp.cjs')
esbuild.buildSync({ entryPoints: [srcPath], bundle: true, format: 'cjs', platform: 'node', outfile: tmpPath })
const { products } = require(tmpPath)
fs.unlinkSync(tmpPath)

const imgDir = path.join(__dirname, '../public/products')
const existing = new Set(fs.readdirSync(imgDir))

// Count how many products use each image path.
const usage = {}
for (const p of products) usage[p.image] = (usage[p.image] || 0) + 1

function fileFor(img) {
  return img.replace('/products/', '')
}

const rows = products.map((p) => {
  const file = fileFor(p.image)
  const missing = !existing.has(file)
  const shared = usage[p.image] > 1
  const needs = missing || shared
  return { ...p, missing, shared, needs }
})

const broken = rows.filter((r) => r.missing)
const sharedRows = rows.filter((r) => r.shared && !r.missing)
const ok = rows.filter((r) => !r.needs)

// Priority: broken first, then bestsellers, then the rest, grouped by category.
const catOrder = {}
let ci = 0
for (const p of products) if (!(p.category in catOrder)) catOrder[p.category] = ci++

const needList = rows.filter((r) => r.needs).sort((a, b) => {
  if (a.missing !== b.missing) return a.missing ? -1 : 1
  if (!!a.bestSeller !== !!b.bestSeller) return a.bestSeller ? -1 : 1
  if (catOrder[a.category] !== catOrder[b.category]) return catOrder[a.category] - catOrder[b.category]
  return 0
})

let n = 1
const lines = []
lines.push(`# Product image checklist`)
lines.push(``)
lines.push(`Total products: ${products.length} | Need a correct image: ${needList.length} | Already fine: ${ok.length}`)
lines.push(``)
lines.push(`Legend: [BROKEN] = shows nothing now  ·  [SHARED] = shows another product's photo  ·  ★ = bestseller`)
lines.push(``)
for (const r of needList) {
  const flags = []
  if (r.missing) flags.push('BROKEN')
  else if (r.shared) flags.push('SHARED')
  if (r.bestSeller) flags.push('★')
  lines.push(`${String(n).padStart(2, ' ')}. [ ] ${r.name}  (${r.category})  — ${flags.join(' ')}   slug: ${r.slug}`)
  n++
}
lines.push(``)
lines.push(`## Already have a correct image (verify, but likely fine)`)
for (const r of ok) lines.push(`   - ${r.name}  (${r.image.replace('/products/', '')})`)

const out = path.join(__dirname, '../PRODUCT_IMAGE_CHECKLIST.md')
fs.writeFileSync(out, lines.join('\n'), 'utf8')
console.log(lines.join('\n'))
console.log(`\nWrote ${out}`)
