import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { type Request } from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const backendOrigin = process.env['BACKEND_ORIGIN'] ?? 'http://localhost:8080';

// Atrás do gateway nginx (proxy confiável): autoriza os hosts públicos (allowlist anti-SSRF do
// Angular SSR) e confia nos headers X-Forwarded-* repassados pelo gateway.
const allowedHosts = (process.env['NG_ALLOWED_HOSTS'] ?? 'localhost')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  trustProxyHeaders: true,
});

// O gateway envia X-Forwarded-Proto/Host, então confiamos no proxy para derivar a origem pública.
app.set('trust proxy', true);

interface PostSummaryLite {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
}

function publicOrigin(req: Request): string {
  return `${req.protocol}://${req.get('host')}`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Busca os posts publicados no backend; best-effort (falha → lista vazia), para não derrubar a rota. */
async function fetchPublished(): Promise<PostSummaryLite[]> {
  try {
    const res = await fetch(`${backendOrigin}/api/posts?size=1000`);
    if (!res.ok) {
      return [];
    }
    const page = (await res.json()) as { items?: PostSummaryLite[] };
    return page.items ?? [];
  } catch {
    return [];
  }
}

// robots.txt — libera o portal, bloqueia o admin e aponta o sitemap.
app.get('/robots.txt', (req, res) => {
  const origin = publicOrigin(req);
  res
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`);
});

// sitemap.xml — home, listagem e cada postagem publicada.
app.get('/sitemap.xml', async (req, res) => {
  const origin = publicOrigin(req);
  const posts = await fetchPublished();
  const urls = [
    `<url><loc>${origin}/</loc></url>`,
    `<url><loc>${origin}/posts</loc></url>`,
    ...posts.map(
      (p) =>
        `<url><loc>${origin}/posts/${xmlEscape(p.slug)}</loc>` +
        (p.publishedAt ? `<lastmod>${xmlEscape(p.publishedAt)}</lastmod>` : '') +
        `</url>`,
    ),
  ].join('');
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    );
});

// rss.xml — feed cronológico das postagens publicadas.
app.get('/rss.xml', async (req, res) => {
  const origin = publicOrigin(req);
  const posts = await fetchPublished();
  const items = posts
    .map((p) => {
      const link = `${origin}/posts/${xmlEscape(p.slug)}`;
      return (
        `<item><title>${xmlEscape(p.title)}</title>` +
        `<link>${link}</link><guid>${link}</guid>` +
        (p.summary ? `<description>${xmlEscape(p.summary)}</description>` : '') +
        (p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : '') +
        `</item>`
      );
    })
    .join('');
  res
    .type('application/rss+xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>` +
        `<title>ThothAI</title><link>${origin}/</link>` +
        `<description>Hub de conteúdo técnico</description>${items}</channel></rss>`,
    );
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
