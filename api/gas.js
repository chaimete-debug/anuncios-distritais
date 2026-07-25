/**
 * Vercel Serverless Function — proxy seguro para Google Apps Script.
 * Variáveis obrigatórias no Vercel:
 *   GAS_WEB_APP_URL
 *   PROXY_SECRET
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const proxySecret = process.env.PROXY_SECRET;
  if (!gasUrl || !proxySecret) {
    return res.status(500).json({ ok: false, error: 'O servidor ainda não foi configurado.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: body.action,
        payload: body.payload || {},
        token: body.token || '',
        _proxySecret: proxySecret
      })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(502).json({ ok: false, error: 'Resposta inválida do Google Apps Script.' }); }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(data.ok ? 200 : 400).json(data);
  } catch (err) {
    console.error(err);
    return res.status(502).json({ ok: false, error: 'Não foi possível comunicar com o Google Apps Script.' });
  }
};
