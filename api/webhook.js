// Файл: api/webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Включаем подробное логирование для диагностики
  console.log('--- NEW REQUEST RECEIVED ---');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    console.error('Error: Only POST method is allowed');
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Use POST method for this endpoint'
    });
  }

  // Получаем токен из переменных окружения
  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  const SUVVY_WEBHOOK_URL = 'https://api.suvvy.ai/api/webhook/custom/message';
  
  // Проверка наличия API-токена
  if (!SUVVY_API_TOKEN) {
    console.error('Critical Error: SUVVY_API_TOKEN is not set');
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'SUVVY_API_TOKEN environment variable is missing'
    });
  }

  // Проверяем наличие тела запроса
  if (!req.body) {
    console.error('Error: Request body is empty');
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Request body is required'
    });
  }

  try {
    // Извлекаем данные с защитой от отсутствующих полей
    const messageText = req.body.text || '';
    const userId = req.body.user_id || 'tilda-user-' + Date.now();
    
    // Проверка наличия текста сообщения
    if (!messageText.trim()) {
      console.error('Validation Error: Message text is missing');
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Message text is required'
      });
    }

    // Формируем payload строго по документации Suvvy
    const payload = {
      api_version: 1,
      message_id: `tilda-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      chat_id: userId,
      text: messageText,
      source: "Tilda Chat",
      message_sender: "customer",
      // Опциональные поля
      ...(req.body.client_name && { client_name: req.body.client_name }),
      ...(req.body.client_phone && { client_phone: req.body.client_phone }),
      ...(req.body.attachments && { attachments: req.body.attachments })
    };

    console.log('Prepared payload for Suvvy:', JSON.stringify(payload, null, 2));

    // Отправляем запрос в Suvvy
    const suvvyResponse = await fetch(SUVVY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`
      },
      body: JSON.stringify(payload),
      timeout: 10000 // 10 секунд таймаут
    });

    // Читаем ответ независимо от статуса
    const responseBody = await suvvyResponse.text();
    
    console.log(`Suvvy API response: ${suvvyResponse.status} ${suvvyResponse.statusText}`);
    console.log('Response body:', responseBody);

    if (!suvvyResponse.ok) {
      return res.status(suvvyResponse.status).json({
        error: 'Suvvy API error',
        status: suvvyResponse.status,
        message: responseBody
      });
    }

    // Успешный ответ
    console.log('Successfully processed webhook');
    return res.status(200).json({ 
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    // Подробное логирование ошибок
    console.error('Unhandled Exception:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
