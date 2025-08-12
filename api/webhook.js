// Файл: api/webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Возвращаем ошибку 405, если метод не POST
    return res.status(405).send('Method Not Allowed');
  }

  // Получаем данные, защищаясь от отсутствующих полей
  // messageText может быть в req.body.message.text или просто в req.body.text
  const messageText = req.body.message?.text || req.body.text;
  // userId может быть в req.body.user.id или просто в req.body.user_id
  const userId = req.body.user?.id || req.body.user_id || 'anonymous';

  // Проверяем наличие API-токена
  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  const SUVVY_WEBHOOK_URL = 'https://api.suvvy.ai/api/webhook/custom/message';

  if (!SUVVY_API_TOKEN) {
    return res.status(500).json({ error: 'Server configuration error: SUVVY_API_TOKEN is not set' });
  }

  // Проверяем, что текст сообщения не пустой
  if (!messageText) {
    return res.status(400).json({ error: 'Message text is missing in the request body' });
  }

  try {
    const suvvyResponse = await fetch(SUVVY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`,
      },
      body: JSON.stringify({
        api_version: 1,
        message_id: `tilda-${Date.now()}`,
        chat_id: userId,
        text: messageText,
        message_sender: "customer",
        source: "Tilda Chat"
      }),
    });

    if (!suvvyResponse.ok) {
      const errorText = await suvvyResponse.text();
      console.error('Error from Suvvy API:', errorText);
      throw new Error(`Suvvy API returned an error: ${errorText}`);
    }

    // Возвращаем успешный ответ, так как Suvvy сам отправит ответ в чат
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
