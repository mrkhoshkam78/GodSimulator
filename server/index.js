/**
 * Site Source Extractor
 * Takes a public URL → downloads HTML + linked CSS/JS + images + fonts → ZIP
 * Uses system Google Chrome for accurate rendered HTML + asset discovery
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const { URL } = require('url');
const crypto = require('crypto');
const https = require('https');
const httpMod = require('http');

const PORT = process.env.PORT || 3001;
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUTPUTS = path.join(ROOT, 'outputs');
const TEMP = path.join(ROOT, 'temp');

[OUTPUTS, TEMP].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': headers['Content-Type'] || (typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json' : 'text/plain'),
    'Access-Control-Allow-Origin': '*',
    ...headers
  });
  res.end(data);
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.zip': 'application/zip', '.ico': 'image/x-icon'
  };
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  });
}

/** Download a URL to buffer */
function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : httpMod;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      timeout: 20000
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).href;
        res.resume();
        return download(next, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/** Find Chrome/Chromium executable (Windows + Linux + macOS) */
function findChrome() {
  const isWin = process.platform === 'win32';
  const candidates = isWin ? [
    process.env.CHROME_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe'
  ] : [
    process.env.CHROME_PATH,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (c.includes('/') || c.includes('\\\\') || c.endsWith('.exe')) {
      if (fs.existsSync(c)) return c;
    } else {
      // bare command name — try which/where
      return c; // spawn will resolve via PATH
    }
  }
  return isWin ? 'chrome' : 'google-chrome';
}

/** Capture page HTML with Chrome/Edge */
function captureHtml(targetUrl) {
  return new Promise((resolve, reject) => {
    const chromePath = findChrome();
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900',
      '--virtual-time-budget=10000',
      '--dump-dom',
      targetUrl
    ];
    const chrome = spawn(chromePath, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 50000, shell: process.platform === 'win32' });
    let stdout = '', stderr = '';
    chrome.stdout.on('data', d => { stdout += d.toString(); });
    chrome.stderr.on('data', d => { stderr += d.toString(); });
    chrome.on('close', code => {
      if (stdout && stdout.length > 100) resolve(stdout);
      else reject(new Error(stderr.slice(0, 400) || 'Chrome/Edge failed. Install Google Chrome and try again.'));
    });
    chrome.on('error', err => reject(new Error('Chrome not found. Install Google Chrome. ' + err.message)));
  });
}


/** Minimal ZIP writer (STORE only, no compression) — works on Windows without external zip */
function createZipFromDir(dir, outPath) {
  const files = [];
  function walk(current, prefix) {
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const rel = prefix ? prefix + '/' + name : name;
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full, rel);
      else files.push({ name: rel.replace(/\\/g, '/'), data: fs.readFileSync(full) });
    }
  }
  walk(dir, '');

  const parts = [];
  const central = [];
  let offset = 0;

  function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; }
  function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(nameBuf.length), u16(0), nameBuf, f.data
    ]);
    parts.push(local);
    const cen = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
      nameBuf
    ]);
    central.push(cen);
    offset += local.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralBuf.length), u32(offset), u16(0)
  ]);
  fs.writeFileSync(outPath, Buffer.concat([...parts, centralBuf, end]));
  return Promise.resolve();
}

/** Extract asset URLs from HTML */
function extractAssets(html, baseUrl) {
  const assets = { css: new Set(), js: new Set(), images: new Set(), fonts: new Set(), other: new Set() };
  const base = new URL(baseUrl);

  function abs(u) {
    try {
      if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:')) return null;
      return new URL(u, base).href;
    } catch { return null; }
  }

  // <link rel="stylesheet">
  const linkRe = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const tag = m[0].toLowerCase();
    const href = abs(m[1]);
    if (!href) continue;
    if (tag.includes('stylesheet') || href.includes('.css')) assets.css.add(href);
    else if (href.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) assets.fonts.add(href);
    else if (href.match(/\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i)) assets.images.add(href);
  }

  // <script src>
  const scriptRe = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = scriptRe.exec(html))) {
    const href = abs(m[1]);
    if (href) assets.js.add(href);
  }

  // <img src> and srcset
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = imgRe.exec(html))) {
    const href = abs(m[1]);
    if (href) assets.images.add(href);
  }
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html))) {
    m[1].split(',').forEach(part => {
      const u = part.trim().split(/\s+/)[0];
      const href = abs(u);
      if (href) assets.images.add(href);
    });
  }

  // CSS url() inside style tags and inline
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(html))) {
    extractCssUrls(m[1], baseUrl, assets);
  }
  const styleAttrRe = /style=["']([^"']+)["']/gi;
  while ((m = styleAttrRe.exec(html))) {
    extractCssUrls(m[1], baseUrl, assets);
  }

  // background images etc already covered by url()

  return assets;
}

function extractCssUrls(cssText, baseUrl, assets) {
  const urlRe = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
  let m;
  const base = new URL(baseUrl);
  while ((m = urlRe.exec(cssText))) {
    let u = m[1];
    if (u.startsWith('data:')) continue;
    try {
      const href = new URL(u, base).href;
      if (href.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) assets.fonts.add(href);
      else if (href.match(/\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i)) assets.images.add(href);
      else if (href.match(/\.css(\?|$)/i)) assets.css.add(href);
      else assets.other.add(href);
    } catch {}
  }
  // @import
  const importRe = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/gi;
  while ((m = importRe.exec(cssText))) {
    try {
      const href = new URL(m[1], base).href;
      assets.css.add(href);
    } catch {}
  }
}

function safeFilename(url, fallback) {
  try {
    const u = new URL(url);
    let name = path.basename(u.pathname) || fallback || 'file';
    name = name.replace(/[?#].*$/, '').replace(/[^\w.\-]+/g, '_');
    if (!path.extname(name)) {
      if (url.includes('.css')) name += '.css';
      else if (url.includes('.js')) name += '.js';
      else if (url.match(/woff2/)) name += '.woff2';
      else if (url.match(/woff/)) name += '.woff';
    }
    return name.slice(0, 120) || fallback || 'file';
  } catch {
    return fallback || 'file';
  }
}

function uniqueName(dir, name) {
  let final = name;
  let i = 1;
  while (fs.existsSync(path.join(dir, final))) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    final = `${base}_${i}${ext}`;
    i++;
  }
  return final;
}

/** Main extraction pipeline */
async function extractSite(targetUrl, jobId, onProgress) {
  onProgress('capturing HTML with Chromium', 15);
  const html = await captureHtml(targetUrl);

  onProgress('discovering assets', 30);
  const assets = extractAssets(html, targetUrl);

  const workDir = path.join(TEMP, jobId);
  const cssDir = path.join(workDir, 'css');
  const jsDir = path.join(workDir, 'js');
  const imgDir = path.join(workDir, 'images');
  const fontDir = path.join(workDir, 'fonts');
  [workDir, cssDir, jsDir, imgDir, fontDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

  const urlMap = {}; // original URL → local relative path
  let downloaded = 0;
  const allUrls = [
    ...[...assets.css].map(u => ({ url: u, type: 'css', dir: cssDir, prefix: 'css/' })),
    ...[...assets.js].map(u => ({ url: u, type: 'js', dir: jsDir, prefix: 'js/' })),
    ...[...assets.images].map(u => ({ url: u, type: 'img', dir: imgDir, prefix: 'images/' })),
    ...[...assets.fonts].map(u => ({ url: u, type: 'font', dir: fontDir, prefix: 'fonts/' }))
  ];

  const total = allUrls.length || 1;
  onProgress(`downloading assets (0/${total})`, 35);

  // Limit concurrent downloads
  const concurrency = 6;
  let idx = 0;
  async function worker() {
    while (idx < allUrls.length) {
      const i = idx++;
      const item = allUrls[i];
      try {
        const { buffer } = await download(item.url);
        const name = uniqueName(item.dir, safeFilename(item.url, `${item.type}_${i}`));
        fs.writeFileSync(path.join(item.dir, name), buffer);
        urlMap[item.url] = item.prefix + name;

        // If CSS, also pull urls inside it
        if (item.type === 'css') {
          const cssText = buffer.toString('utf8');
          const nested = { css: new Set(), js: new Set(), images: new Set(), fonts: new Set(), other: new Set() };
          extractCssUrls(cssText, item.url, nested);
          for (const f of nested.fonts) {
            if (!urlMap[f] && !allUrls.find(x => x.url === f)) {
              allUrls.push({ url: f, type: 'font', dir: fontDir, prefix: 'fonts/' });
            }
          }
          for (const img of nested.images) {
            if (!urlMap[img] && !allUrls.find(x => x.url === img)) {
              allUrls.push({ url: img, type: 'img', dir: imgDir, prefix: 'images/' });
            }
          }
        }
      } catch (e) {
        // skip failed assets
      }
      downloaded++;
      const pct = 35 + Math.floor((downloaded / Math.max(allUrls.length, 1)) * 45);
      onProgress(`downloading assets (${downloaded}/${allUrls.length})`, Math.min(pct, 80));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  onProgress('rewriting HTML paths', 85);

  // Rewrite HTML to use local paths
  let localHtml = html;

  // Replace absolute/relative asset URLs
  for (const [orig, local] of Object.entries(urlMap)) {
    // escape for regex
    const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    localHtml = localHtml.replace(new RegExp(escaped, 'g'), local);
    // also try path-only version
    try {
      const u = new URL(orig);
      const pathOnly = u.pathname + u.search;
      if (pathOnly.length > 3) {
        localHtml = localHtml.replace(new RegExp(pathOnly.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), local);
      }
    } catch {}
  }

  // Basic cleanup: remove integrity & crossorigin that break local
  localHtml = localHtml
    .replace(/\s+integrity=["'][^"']*["']/gi, '')
    .replace(/\s+crossorigin=["'][^"']*["']/gi, '')
    .replace(/\s+crossorigin(?=[\s>])/gi, '');

  fs.writeFileSync(path.join(workDir, 'index.html'), localHtml, 'utf8');

  // README
  const readme = `# Extracted source — ${targetUrl}

Extracted on ${new Date().toISOString()}

## Contents
- index.html (original DOM, paths rewritten to local)
- css/     — stylesheets
- js/      — scripts
- images/  — images
- fonts/   — web fonts

## How to view
Open index.html in a browser, or:
\`\`\`
npx serve .
\`\`\`

Note: Some sites load extra assets dynamically via JavaScript after page load.
Those runtime-only assets may be missing.
`;
  fs.writeFileSync(path.join(workDir, 'README.md'), readme);

  onProgress('creating ZIP', 92);

  const zipPath = path.join(OUTPUTS, `${jobId}.zip`);
  await createZipFromDir(workDir, zipPath);

  // cleanup temp
  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}

  onProgress('done', 100);
  return {
    zipPath,
    stats: {
      css: assets.css.size,
      js: assets.js.size,
      images: assets.images.size,
      fonts: assets.fonts.size,
      downloaded: Object.keys(urlMap).length
    }
  };
}

// ---------- HTTP ----------
const jobs = new Map();

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    return serveStatic(res, path.join(PUBLIC, 'index.html'));
  }
  if (req.method === 'GET' && (pathname === '/styles.css' || pathname === '/app.js')) {
    return serveStatic(res, path.join(PUBLIC, pathname.slice(1)));
  }

  if (req.method === 'POST' && pathname === '/api/extract') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const targetUrl = (data.url || '').trim();
        if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
          return send(res, 400, { error: 'Valid http(s) URL required' });
        }
        const jobId = uuid();
        jobs.set(jobId, { status: 'running', stage: 'starting', progress: 5 });
        send(res, 202, { jobId, status: 'accepted' });

        (async () => {
          try {
            const result = await extractSite(targetUrl, jobId, (stage, progress) => {
              jobs.set(jobId, { status: 'running', stage, progress });
            });
            jobs.set(jobId, {
              status: 'completed',
              progress: 100,
              stage: 'done',
              jobId,
              zipUrl: `/api/download/${jobId}`,
              stats: result.stats,
              sourceUrl: targetUrl
            });
          } catch (e) {
            console.error(e);
            jobs.set(jobId, { status: 'failed', error: e.message || String(e), progress: 0 });
          }
        })();
      } catch (e) {
        send(res, 400, { error: e.message });
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/job/')) {
    const jobId = pathname.split('/').pop();
    const job = jobs.get(jobId);
    if (!job) return send(res, 404, { error: 'Job not found' });
    return send(res, 200, job);
  }

  if (req.method === 'GET' && pathname.startsWith('/api/download/')) {
    const jobId = pathname.split('/').pop();
    const zipPath = path.join(OUTPUTS, `${jobId}.zip`);
    if (!fs.existsSync(zipPath)) return send(res, 404, { error: 'ZIP not found' });
    const stat = fs.statSync(zipPath);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="site-source-${jobId.slice(0, 8)}.zip"`,
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(zipPath).pipe(res);
    return;
  }

  if (pathname === '/api/health') {
    return send(res, 200, { ok: true, tool: 'Site Source Extractor' });
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n📦 Site Source Extractor running at http://localhost:${PORT}\n`);
});
