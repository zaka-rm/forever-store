const fs = require('fs')
const path = require('path')

const productsSrc = fs.readFileSync(path.join(__dirname, '../src/lib/products.ts'), 'utf8')
const blogSrc = fs.readFileSync(path.join(__dirname, '../src/lib/blogPosts.ts'), 'utf8')

const slugRegex = /slug:\s*'([^']+)'/g
const productSlugs = [...productsSrc.matchAll(slugRegex)].map((m) => m[1])
const blogSlugs = [...blogSrc.matchAll(slugRegex)].map((m) => m[1])

const domain = 'https://votre-domaine.fr'
const staticPaths = ['', '/shop', '/about', '/contact', '/quiz', '/fidelite', '/blog']
const productPaths = productSlugs.map((s) => '/shop/' + s)
const blogPaths = blogSlugs.map((s) => '/blog/' + s)

const all = [...staticPaths, ...productPaths, ...blogPaths]

const urls = all
  .map((p) => `  <url>\n    <loc>${domain}${p}</loc>\n  </url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`

fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), xml)
console.log(
  'Wrote sitemap.xml with',
  all.length,
  'urls (',
  productSlugs.length,
  'products,',
  blogSlugs.length,
  'blog posts)',
)
