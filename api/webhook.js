// Файл: api/webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log('\n===== NEW REQUEST RECEIVED =====');
  console.log(`[${new Date().toISOString()}] Method: ${req.method}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));
  
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Проверка наличия токена
  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  if (!SUVVY_API_TOKEN) {
    console.error('Critical Error: SUVVY_API_TOKEN is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Проверка тела запроса
  if (!req.body) {
    return res.status(400).json({ error: 'Empty request body' });
  }

  try {
    // Обработка ТЕСТОВОГО запроса от Suvvy
    if (req.body.event_type === 'test_request') {
      console.log('Received test request from Suvvy');
      return res.status(200).json({ 
        success: true,
        message: 'Test webhook received' 
      });
    }

    // Обработка РЕАЛЬНОГО запроса от Tilda
    const { 
      text: messageText, 
      user_id: userId, 
      client_name, 
      client_phone,
      attachments = []
    } = req.body;

    // Проверка текста сообщения
    if (!messageText || !messageText.trim()) {
      console.error('Validation Error: Missing message text');
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Формируем payload для Suvvy
    const payload = {
      api_version: 1,
      message_id: `tilda-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      chat_id: userId || 'tilda-user-' + Date.now(),
      text: messageText,
      source: "Tilda Chat",
      message_sender: "customer",
      ...(client_name && { client_name }),
      ...(client_phone && { client_phone }),
      ...(attachments.length > 0 && { attachments })
    };

    console.log('Prepared payload for Suvvy:', JSON.stringify(payload, null, 2));

    // Отправляем в Suvvy
    const SUVVY_WEBHOOK_URL = 'https://api.suvvy.ai/api/webhook/custom/message';
    const suvvyResponse = await fetch(SUVVY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    // Обработка ответа
    const responseBody = await suvvyResponse.text();
    console.log(`Suvvy response: ${suvvyResponse.status} ${responseBody}`);
    
    if (!suvvyResponse.ok) {
      return res.status(suvvyResponse.status).json({
        error: 'Suvvy API error',
        details: responseBody
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Unhandled Exception:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
