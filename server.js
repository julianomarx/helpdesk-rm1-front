import express from 'express';

const app  = express();
const PORT = 3000;
const API  = 'http://localhost:8001';

// Proxy /api → backend
app.use('/api', async (req, res) => {
  const url = `${API}/api${req.url}`;
  try {
    const headers = { ...req.headers, host: 'localhost:8001' };
    delete headers['content-length'];

    const chunks = [];
    req.on('data', c => chunks.push(c));
    await new Promise(r => req.on('end', r));
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const upstream = await fetch(url, {
      method:  req.method,
      headers,
      body:    ['GET', 'HEAD'].includes(req.method) ? undefined : body,
      redirect: 'manual'
    });

    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (!['transfer-encoding', 'connection'].includes(k)) res.setHeader(k, v);
    });

    const buf = await upstream.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    console.error('[proxy error]', err.message);
    res.status(502).json({ error: 'Backend indisponível' });
  }
});

// Arquivos estáticos do frontend
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API proxy: http://localhost:${PORT}/api → ${API}/api`);
});
