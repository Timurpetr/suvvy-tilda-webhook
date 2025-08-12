// Файл: api/webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Начало обработки запроса
  console.log('\n===== NEW REQUEST RECEIVED =====');
  console.log(`[${new Date().toISOString()}] Method: ${req.method}`);
  
  // Логируем заголовки
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Логируем тело запроса
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));
  
  // Проверка метода
  if (req.method !== 'POST') {
    console.error('Error: Method not allowed');
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
    console.error('Error: Empty request body');
    return res.status(400).json({ error: 'Empty request body' });
  }

  try {
    // Извлекаем данные
    const { text, user_id, client_name, client_phone, attachments } = req.body;
    
    // Логируем полученные данные
    console.log('Parsed parameters:', {
      text,
      user_id,
      client_name,
      client_phone,
      attachments
    });

    // Проверка текста сообщения
    if (!text || !text.trim()) {
      console.error('Validation Error: Missing message text');
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Формируем payload для Suvvy
    const payload = {
      api_version: 1,
      message_id: `tilda-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      chat_id: user_id || 'tilda-user-' + Date.now(),
      text: text,
      source: "Tilda Chat",
      message_sender: "customer",
      ...(client_name && { client_name }),
      ...(client_phone && { client_phone }),
      ...(attachments && { attachments })
    };

    // Логируем подготовленный payload
    console.log('Payload for Suvvy:', JSON.stringify(payload, null, 2));

    // Отправляем в Suvvy
    const SUVVY_WEBHOOK_URL = 'https://api.suvvy.ai/api/webhook/custom/message';
    console.log(`Sending to: ${SUVVY_WEBHOOK_URL}`);
    
    const suvvyResponse = await fetch(SUVVY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    // Логируем ответ от Suvvy
    const responseBody = await suvvyResponse.text();
    console.log(`Suvvy response status: ${suvvyResponse.status}`);
    console.log('Suvvy response body:', responseBody);

    if (!suvvyResponse.ok) {
      return res.status(suvvyResponse.status).json({
        error: 'Suvvy API error',
        details: responseBody
      });
    }

    // Успешный ответ
    return res.status(200).json({ success: true });

  } catch (error) {
    // Логируем ошибку
    console.error('Unhandled Exception:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
