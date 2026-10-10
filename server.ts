import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// In-memory cache store
interface CacheEntry {
  data: any;
  status: number;
  cachedAt: number;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds
function getCacheTTL(urlPath: string): number {
  if (urlPath.includes('/event/') && urlPath.includes('/live')) {
    return 60 * 1000; // 60s for live scores
  }
  if (urlPath.includes('/bootstrap-static') || urlPath.includes('/fixtures')) {
    return 10 * 60 * 1000; // 10 minutes for static & fixtures
  }
  if (urlPath.includes('/element-summary')) {
    return 10 * 60 * 1000; // 10 minutes for player element summaries
  }
  return 5 * 60 * 1000; // 5 minutes default for entry, picks, history, leagues
}

app.use(express.json());

// Cache purge endpoint for manual refresh (must be before wildcard route)
app.all('/api/fpl/purge-cache', (req, res) => {
  const count = memoryCache.size;
  memoryCache.clear();
  return res.json({ success: true, message: `FPL Pilot proxy cache cleared (${count} entries removed).` });
});

// FPL API proxy handler (handles /api/fpl and /api/fpl/*)
app.get(['/api/fpl', '/api/fpl/*'], async (req, res) => {
  // Support both /api/fpl/endpoint and /api/fpl?subpath=endpoint
  let fplSubpath = (req.params as any)[0] || '';
  if (!fplSubpath && req.path.startsWith('/api/fpl/')) {
    fplSubpath = req.path.replace(/^\/api\/fpl\//, '');
  }
  
  // Clean query string (strip refresh flag for clean forwarding and normalized cache key)
  const isForceRefresh = req.query.refresh === 'true' || req.headers['cache-control'] === 'no-cache';
  
  const rawQuery = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const cleanQuery = rawQuery
    .replace(/[?&]refresh=[^&]*/g, '')
    .replace(/^&/, '?');
  const normalizedQuery = cleanQuery === '?' ? '' : cleanQuery;
  
  // Target FPL API URL (strip trailing/leading slashes from subpath so URL is clean)
  const cleanSubpath = fplSubpath.replace(/^\/+|\/+$/g, '');
  if (!cleanSubpath) {
    return res.status(400).json({ error: 'missing_subpath', message: 'No FPL API endpoint specified.' });
  }

  // Normalized cache key without ephemeral query params
  const cacheKey = `${cleanSubpath}${normalizedQuery}`;

  // If force refresh is requested, purge any cached items matching this subpath (e.g. entry/123/...)
  if (isForceRefresh) {
    memoryCache.delete(cacheKey);
    // If refreshing an entry, clear all sub-routes for that entry
    for (const key of memoryCache.keys()) {
      if (key.startsWith(cleanSubpath) || cleanSubpath.startsWith(key)) {
        memoryCache.delete(key);
      }
    }
  }

  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (!isForceRefresh && cached && now < cached.expiresAt) {
    res.setHeader('X-Cache-Hit', 'true');
    res.setHeader('X-Cached-At', new Date(cached.cachedAt).toISOString());
    return res.status(cached.status).json(cached.data);
  }

  const targetUrl = `https://fantasy.premierleague.com/api/${cleanSubpath}/${normalizedQuery}`;

  try {
    const fplResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FPLPilot/1.0',
        Accept: 'application/json',
      },
    });

    const contentType = fplResponse.headers.get('content-type') || '';

    // If FPL returns 503 (updating) or HTML maintenance page, return friendly error or serve stale cache if available
    if (fplResponse.status === 503 || !contentType.includes('application/json')) {
      if (cached) {
        res.setHeader('X-Cache-Hit', 'stale');
        res.setHeader('X-Cached-At', new Date(cached.cachedAt).toISOString());
        return res.status(200).json(cached.data);
      }
      return res.status(503).json({
        error: 'fpl_maintenance',
        message: 'The official Fantasy Premier League game is currently undergoing live game updates. Please try again shortly.',
        status: 503,
      });
    }

    const data = await fplResponse.json();
    const ttl = getCacheTTL(cleanSubpath);

    // Save into cache if successful
    if (fplResponse.status === 200) {
      memoryCache.set(cacheKey, {
        data,
        status: fplResponse.status,
        cachedAt: now,
        expiresAt: now + ttl,
      });
    }

    res.setHeader('X-Cache-Hit', 'false');
    res.setHeader('X-Cached-At', new Date(now).toISOString());
    return res.status(fplResponse.status).json(data);
  } catch (error: any) {
    console.error(`Error proxying FPL request to ${targetUrl}:`, error);

    // Fallback to stale cache if network error occurs
    if (cached) {
      res.setHeader('X-Cache-Hit', 'stale');
      res.setHeader('X-Cached-At', new Date(cached.cachedAt).toISOString());
      return res.status(200).json(cached.data);
    }

    return res.status(502).json({
      error: 'proxy_fetch_failed',
      message: 'Failed to reach Fantasy Premier League servers. Check your internet connection.',
      details: error?.message || String(error),
    });
  }
});

// JSON 404 catch-all for any unhandled /api/* routes so Vite NEVER returns HTML
app.all('/api/*', (req, res) => {
  return res.status(404).json({
    error: 'endpoint_not_found',
    message: `API endpoint ${req.method} ${req.path} not found.`,
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FPL Pilot] Server running on http://0.0.0.0:${PORT} (Mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
