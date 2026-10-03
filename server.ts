import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'school_database.json');

app.use(express.json({ limit: '15mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// API: Get latest shared school database across devices
app.get('/api/cloud-database', (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      return res.json({ exists: true, data });
    }
    return res.json({ exists: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ralat membaca pangkalan data';
    return res.status(500).json({ error: message });
  }
});

// API: Save latest shared school database
app.post('/api/cloud-database', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.teachers) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    const timestamp = new Date().toLocaleString('ms-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const toSave = {
      ...payload,
      updatedAt: timestamp,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
    return res.json({ success: true, timestamp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ralat menyimpan pangkalan data';
    return res.status(500).json({ error: message });
  }
});

// API: Clear/Reset database
app.delete('/api/cloud-database', (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
    return res.json({ success: true, message: 'Pangkalan data berjaya dipadam' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ralat memadam pangkalan data';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  const getIndexHtmlWithInitialData = (rawHtml: string) => {
    let initialDataScript = '<script>window.__INITIAL_DATA__ = null;</script>';
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        // Escape special chars to prevent script injection issues
        const safeJson = content.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
        initialDataScript = `<script>window.__INITIAL_DATA__ = ${safeJson};</script>`;
      }
    } catch (e) {
      console.warn('Gagal membaca data permulaan sekolah untuk HTML:', e);
    }
    return rawHtml.replace('</head>', `${initialDataScript}</head>`);
  };

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist'), { index: false }));
    app.get('*', (req, res) => {
      try {
        const htmlPath = path.resolve(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(htmlPath)) {
          const rawHtml = fs.readFileSync(htmlPath, 'utf-8');
          const finalHtml = getIndexHtmlWithInitialData(rawHtml);
          return res.setHeader('Content-Type', 'text/html').send(finalHtml);
        }
      } catch (err) {
        console.error('Ralat membaca index.html pengeluaran:', err);
      }
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    // In dev mode, intercept index.html to inject initial database
    app.use(async (req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && (req.headers.accept || '').includes('text/html')) {
        try {
          const template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl, template);
          const finalHtml = getIndexHtmlWithInitialData(transformedHtml);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
        } catch (e) {
          return next(e);
        }
      }
      next();
    });

    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`e-KOKU GPK Server berjalan di port ${PORT}`);
  });
}

startServer();
