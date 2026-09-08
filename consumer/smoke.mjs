import { createSeoRoutes, seo } from '@aihu/seo'

const config = {
  siteName: 'isolated consumer',
  baseUrl: 'https://example.test',
  sitemapSources: [{ path: '/docs?a=1&b=2' }],
  robotsOptions: { disallowAiBots: false },
}
const routes = createSeoRoutes(config)
const sitemap = await routes.sitemapXml(new Request('https://example.test/sitemap.xml'))
const body = await sitemap.text()
if (!body.includes('&amp;')) throw new Error('sitemap route did not XML-escape the URL')
const robots = await routes.robotsTxt(new Request('https://example.test/robots.txt'))
if (!(await robots.text()).includes('User-agent: *')) throw new Error('robots route did not render')
if (seo(config).name !== '@aihu/seo') throw new Error('plugin identity changed')
console.log('isolated consumer smoke passed')
