import fetch from 'node-fetch';

// Для отслеживания дубликатов
const processedMessages = new Set();

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Логирование
  console.log('\n===== NEW REQUEST =====');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));

  // Проверка токена
  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  if (!SUVVY_API_TOKEN) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Проверка на дубликат по X-Request-ID
    const requestId = req.headers['x-request-id'];
    if (requestId && processedMessages.has(requestId)) {
      console.log('Duplicate request detected, skipping');
      return res.status(200).json({ success: true, message: 'Duplicate ignored' });
    }
    
    if (requestId) {
      processedMessages.add(requestId);
      // Очистка старых ID (чтобы не накапливались)
      if (processedMessages.size > 1000) {
        const oldest = Array.from(processedMessages).slice(0, 100);
        oldest.forEach(id => processedMessages.delete(id));
      }
    }

    // Обработка тестового запроса
    if (req.body.event_type === 'test_request') {
      return res.status(200).json({ success: true });
    }

    // Извлечение данных
    const messageText = req.body.text || '';
    const userId = req.body.user_id || 'unknown-user';
    const messageId = req.body.message_id || `tilda-${Date.now()}`;

    if (!messageText.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Формирование payload для Suvvy
    const payload = {
      api_version: 1,
      message_id: messageId,
      chat_id: userId,
      text: messageText,
      source: "Tilda Chat",
      message_sender: "customer"
    };

    console.log('Sending to Suvvy:', JSON.stringify(payload));

    // Отправка в Suvvy
    const suvvyResponse = await fetch('https://api.suvvy.ai/api/webhook/custom/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    const responseText = await suvvyResponse.text();
    console.log(`Suvvy response: ${suvvyResponse.status} ${responseText}`);

    return res.status(200).json({ 
      success: suvvyResponse.ok,
      message: suvvyResponse.ok ? 'Successful' : 'Forwarding failed'
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
