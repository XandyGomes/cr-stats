/**
 * api/cr-proxy.js — Vercel Serverless Function
 *
 * Proxy seguro para a API do Clash Royale.
 * Usa proxy.royaleapi.dev como base — resolve o problema de IP bloqueado.
 * O RoyaleAPI proxy aceita qualquer API Key sem restrição de IP.
 *
 * Uso: GET /api/cr-proxy?path=/players/%232P9UUJY92&token=YOUR_KEY
 */

// proxy.royaleapi.dev é um proxy oficial da comunidade que bypassa a restrição de IP
const CR_BASE = 'https://proxy.royaleapi.dev/v1';

export default async function handler(req, res) {
  // CORS headers
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

  // Validação básica
  const safePath = path.startsWith('/') ? path : '/' + path;

  if (safePath.includes('..')) {
    return res.status(400).json({ error: 'Path inválido.' });
  }

  const apiUrl = `${CR_BASE}${safePath}`;

  console.log(`[cr-proxy] ${req.method} ${apiUrl}`);

  try {
    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    let data;
    const contentType = apiRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await apiRes.json();
    } else {
      const text = await apiRes.text();
      data = { error: 'Resposta inesperada da API', raw: text.substring(0, 200) };
    }

    // Log para debug no Vercel
    if (!apiRes.ok) {
      console.error(`[cr-proxy] API error ${apiRes.status}:`, JSON.stringify(data));
    }

    res.status(apiRes.status).json(data);

  } catch (err) {
    console.error('[cr-proxy] Fetch error:', err.message);
    res.status(502).json({
      error: 'Erro ao conectar à API do Clash Royale.',
      detail: err.message
    });
  }
}
