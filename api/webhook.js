import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  const SUVVY_WEBHOOK_URL = 'https://api.suvvy.ai/api/webhook/custom/message';

  if (!SUVVY_API_TOKEN) {
    return res.status(500).json({ error: 'SUVVY_API_TOKEN is not set' });
  }

  // Расширенная логика получения данных
  const messageText = req.body.message?.text || req.body.text || req.body.query;
  const userId = req.body.user?.id || req.body.user_id || `tilda-${Date.now()}`;

  if (!messageText) {
    return res.status(400).json({ error: 'Missing message text' });
  }

  try {
    // Формируем тело согласно документации Suvvy
    const payload = {
      api_version: 1, // Проверьте актуальную версию!
      message_id: `tilda-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      chat_id: userId,
      text: messageText,
      event: "message", // Обязательное поле
      source: "Tilda",
      metadata: {} // Опционально, но может требоваться
    };

    console.log("Sending to Suvvy:", payload);

    const suvvyResponse = await fetch(SUVVY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const responseBody = await suvvyResponse.text();
    console.log(`Suvvy response [${suvvyResponse.status}]:`, responseBody);

    if (!suvvyResponse.ok) {
      throw new Error(`Suvvy error: ${suvvyResponse.status} ${responseBody}`);
    }

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal error',
      details: error.message
    });
  }
}
