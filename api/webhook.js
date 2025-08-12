import fetch from 'node-fetch';

// Для обработки входящих сообщений от бота
const botMessageQueue = new Map();

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-ID');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Логирование
  console.log('\n===== NEW REQUEST =====');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));

  try {
    // 1. Обработка сообщений ОТ ПОЛЬЗОВАТЕЛЯ (из Tilda)
    if (req.body && req.body.text) {
      console.log('Processing USER message');
      
      // Проверка токена
      const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
      if (!SUVVY_API_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // Извлечение данных
      const userId = req.headers['x-user-id'] || 'unknown-user';
      const messageText = req.body.text;
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
        message: 'Message forwarded to Suvvy'
      });
    }
    // 2. Обработка сообщений ОТ БОТА (из Suvvy)
    else if (req.body && req.body.event_type === 'new_messages') {
      console.log('Processing BOT message from Suvvy');
      
      const { chat_id, new_messages } = req.body;
      
      if (!chat_id || !new_messages || !Array.isArray(new_messages)) {
        return res.status(400).json({ error: 'Invalid bot message format' });
      }

      // Здесь должна быть логика отправки сообщения пользователю
      // В реальной системе это бы делалось через WebSockets или другую систему
      console.log(`Bot message for ${chat_id}:`, new_messages.map(m => m.text).join(', '));
      
      // Вместо реальной отправки просто подтверждаем получение
      return res.status(200).json({ 
        success: true,
        message: 'Bot message received'
      });
    }
    // 3. Обработка тестовых запросов
    else if (req.body && req.body.event_type === 'test_request') {
      console.log('Processing TEST request');
      return res.status(200).json({ success: true });
    }
    // 4. Неизвестный формат запроса
    else {
      console.log('Unknown request format');
      return res.status(400).json({ error: 'Unsupported request format' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
