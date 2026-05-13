/**
 * api/cr-proxy.js — Vercel Serverless Function
 *
 * Proxy seguro para a API do Clash Royale.
 * Roda no SERVIDOR do Vercel — sem restrições de CORS.
 *
 * Uso: GET /api/cr-proxy?path=/players/%232P9UUJY92&token=YOUR_KEY
 *
 * O token é enviado pelo front-end e nunca fica exposto no servidor.
 */

const CR_BASE = 'https://api.clashroyale.com/v1';

export default async function handler(req, res) {
  // Permitir CORS para o front-end
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path, token } = req.query;

  if (!path || !token) {
    return res.status(400).json({ error: 'Parâmetros "path" e "token" são obrigatórios.' });
  }

  // Validação básica: path deve começar com /
  const safePath = path.startsWith('/') ? path : '/' + path;

  // Bloquear paths perigosos
  if (safePath.includes('..') || !safePath.match(/^\/[a-zA-Z0-9%#\/_-]+$/)) {
    return res.status(400).json({ error: 'Path inválido.' });
  }

  const apiUrl = `${CR_BASE}${safePath}`;

  try {
    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const data = await apiRes.json();

    // Repassar o status code original
    res.status(apiRes.status).json(data);

  } catch (err) {
    console.error('[cr-proxy] Fetch error:', err);
    res.status(502).json({ error: 'Erro ao conectar à API do Clash Royale.', detail: err.message });
  }
}
