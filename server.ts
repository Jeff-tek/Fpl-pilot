import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Force IPv4 first DNS resolution for cloud container environments (prevents IPv6 routing timeouts)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const distPath = path.resolve(__dirname, 'dist');
const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
const isProduction = process.env.NODE_ENV === 'production' || hasDist;

// Fallback snapshots directory
const DATA_DIR = path.resolve(process.cwd(), 'src', 'data');

function loadFallbackJson(fileName: string): any | null {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`Could not load fallback file ${fileName}:`, err);
  }
  return null;
}

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

  // Helper to serve snapshot data if available
  const serveFallbackIfAvailable = () => {
    if (cleanSubpath.startsWith('bootstrap-static')) {
      const fb = loadFallbackJson('bootstrap-fallback.json');
      if (fb) {
        res.setHeader('X-Fallback', 'true');
        res.setHeader('X-FPL-Status', 'offline-snapshot');
        return res.status(200).json(fb);
      }
    }
    if (cleanSubpath.startsWith('fixtures')) {
      const fb = loadFallbackJson('fixtures-fallback.json');
      if (fb) {
        res.setHeader('X-Fallback', 'true');
        res.setHeader('X-FPL-Status', 'offline-snapshot');
        return res.status(200).json(fb);
      }
    }
    // Team 2432 demo snapshots
    if (cleanSubpath.includes('2432')) {
      if (cleanSubpath.includes('picks')) {
        const fb = loadFallbackJson('demo-picks-2432.json');
        if (fb) {
          res.setHeader('X-Fallback', 'true');
          res.setHeader('X-FPL-Status', 'demo-snapshot');
          return res.status(200).json(fb);
        }
      }
      if (cleanSubpath.includes('history')) {
        const fb = loadFallbackJson('demo-history-2432.json');
        if (fb) {
          res.setHeader('X-Fallback', 'true');
          res.setHeader('X-FPL-Status', 'demo-snapshot');
          return res.status(200).json(fb);
        }
      }
      // Entry profile
      const fb = loadFallbackJson('demo-entry-2432.json');
      if (fb) {
        res.setHeader('X-Fallback', 'true');
        res.setHeader('X-FPL-Status', 'demo-snapshot');
        return res.status(200).json(fb);
      }
    }
    // Team 1 demo snapshots
    if (cleanSubpath === 'entry/1' || cleanSubpath.startsWith('entry/1/')) {
      if (cleanSubpath.includes('picks')) {
        const fb = loadFallbackJson('demo-picks-1.json');
        if (fb) {
          res.setHeader('X-Fallback', 'true');
          res.setHeader('X-FPL-Status', 'demo-snapshot');
          return res.status(200).json(fb);
        }
      }
      if (cleanSubpath.includes('history')) {
        const fb = loadFallbackJson('demo-history-1.json');
        if (fb) {
          res.setHeader('X-Fallback', 'true');
          res.setHeader('X-FPL-Status', 'demo-snapshot');
          return res.status(200).json(fb);
        }
      }
      const fb = loadFallbackJson('demo-entry-1.json');
      if (fb) {
        res.setHeader('X-Fallback', 'true');
        res.setHeader('X-FPL-Status', 'demo-snapshot');
        return res.status(200).json(fb);
      }
    }

    if (cleanSubpath.includes('/history')) {
      res.setHeader('X-Fallback', 'true');
      res.setHeader('X-FPL-Status', 'empty-history');
      return res.status(200).json({ current: [], past: [], chips: [] });
    }
    const entryMatch = cleanSubpath.match(/^entry\/(\d+)/);
    if (entryMatch) {
      const idNum = Number(entryMatch[1]);
      res.setHeader('X-Fallback', 'true');
      res.setHeader('X-FPL-Status', 'synthesized-profile');
      return res.status(200).json({
        id: idNum,
        name: `Team #${idNum}`,
        player_first_name: 'FPL',
        player_last_name: 'Manager',
        summary_overall_points: 0,
        summary_overall_rank: 0,
        summary_event_points: 0,
        summary_event_rank: 0,
        current_event: 6,
        last_deadline_bank: 0,
        last_deadline_value: 1000,
        last_deadline_total_transfers: 0,
        leagues: { classic: [], h2h: [] },
      });
    }
    if (cleanSubpath.includes('/live')) {
      res.setHeader('X-Fallback', 'true');
      res.setHeader('X-FPL-Status', 'empty-live');
      return res.status(200).json({ elements: [] });
    }
    if (cleanSubpath.startsWith('element-summary/')) {
      res.setHeader('X-Fallback', 'true');
      res.setHeader('X-FPL-Status', 'empty-summary');
      return res.status(200).json({ fixtures: [], history: [], history_past: [] });
    }
    return null;
  };

  // Normalized cache key without ephemeral query params
  const cacheKey = `${cleanSubpath}${normalizedQuery}`;

  // If force refresh is requested, purge any cached items matching this subpath
  if (isForceRefresh) {
    memoryCache.delete(cacheKey);
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

  const cleanSubpathWithSlash = cleanSubpath.endsWith('/') ? cleanSubpath : `${cleanSubpath}/`;
  const queryString = normalizedQuery ? (normalizedQuery.startsWith('?') ? normalizedQuery : `?${normalizedQuery}`) : '';
  const targetUrl = `https://fantasy.premierleague.com/api/${cleanSubpathWithSlash}${queryString}`;

  try {
    let fplResponse = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en;q=0.9',
        Referer: 'https://fantasy.premierleague.com/',
      },
    });

    let contentType = fplResponse.headers.get('content-type') || '';

    // If FPL blocks the browser user-agent or returns non-JSON, retry with clean curl user-agent
    if (fplResponse.status === 403 || !contentType.includes('application/json')) {
      try {
        const retryRes = await fetch(targetUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'curl/8.0.1',
            Accept: '*/*',
          },
        });
        if (retryRes.ok && (retryRes.headers.get('content-type') || '').includes('application/json')) {
          fplResponse = retryRes;
          contentType = retryRes.headers.get('content-type') || '';
        }
      } catch {
        // ignore retry error
      }
    }

    // If FPL returns 503 (updating) or HTML maintenance page
    if (fplResponse.status === 503 || !contentType.includes('application/json')) {
      if (cached) {
        res.setHeader('X-Cache-Hit', 'stale');
        res.setHeader('X-Cached-At', new Date(cached.cachedAt).toISOString());
        return res.status(200).json(cached.data);
      }

      // Check for pre-cached snapshot fallback
      const fallbackServed = serveFallbackIfAvailable();
      if (fallbackServed) return;

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

    // Check for pre-cached snapshot fallback
    const fallbackServed = serveFallbackIfAvailable();
    if (fallbackServed) return;

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
    // Prevent missing static assets from falling through to index.html (which causes JS SyntaxError '<')
    app.all('/assets/*', (req, res) => {
      res.status(404).type('text/plain').send('Asset not found');
    });
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FPL Pilot] Server running on http://0.0.0.0:${PORT} (Mode: ${isProduction ? 'production' : 'development'})`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}

export default app;
