// Файл: api/webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Конфигурационные параметры
  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  const SUVVY_WEBHOOK_URL = 'https://api.suvvy.ai/api/webhook/custom/message';
  
  // Проверка наличия API-токена
  if (!SUVVY_API_TOKEN) {
    console.error('SUVVY_API_TOKEN is not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Логируем входящий запрос для отладки
    console.log('Incoming request from Tilda:', JSON.stringify(req.body, null, 2));

    // Извлекаем данные из запроса Tilda
    const { 
      text: messageText, 
      user_id: userId, 
      client_name, 
      client_phone,
      attachments = []
    } = req.body;

    // Проверка обязательных полей
    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Формируем payload для Suvvy
    const payload = {
      api_version: 1,
      message_id: `tilda-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      chat_id: userId || 'unknown-user',
      text: messageText,
      source: "Tilda Chat",
      message_sender: "customer",
      ...(client_name && { client_name }),
      ...(client_phone && { client_phone }),
      ...(attachments.length > 0 && { attachments })
    };

    // Логируем payload перед отправкой
    console.log('Sending to Suvvy:', payload);

    // Отправляем запрос в Suvvy
    const suvvyResponse = await fetch(SUVVY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    // Обрабатываем ответ от Suvvy
    const responseBody = await suvvyResponse.text();
    
    if (!suvvyResponse.ok) {
      console.error(`Suvvy API error ${suvvyResponse.status}: ${responseBody}`);
      return res.status(suvvyResponse.status).json({
        error: 'Error forwarding to Suvvy',
        details: responseBody
      });
    }

    // Успешный ответ
    console.log('Successfully forwarded to Suvvy:', responseBody);
    return res.status(200).json({ success: true });

  } catch (error) {
    // Обработка ошибок
    console.error('Unhandled error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
