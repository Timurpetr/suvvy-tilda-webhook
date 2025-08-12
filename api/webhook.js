import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-ID');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('\n===== NEW REQUEST =====');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));

  try {
    // 1. Обработка тестовых запросов от Suvvy
    if (req.body.event_type === 'test_request') {
      console.log('Processing test request');
      return res.status(200).json({ success: true });
    }
    
    // 2. Обработка сообщений от бота Suvvy
    if (req.body.event_type === 'new_messages') {
      console.log('Processing bot message from Suvvy');
      return res.status(200).json({ 
        success: true,
        message: 'Bot message received'
      });
    }
    
    // 3. Обработка сообщений от пользователя Tilda
    if (req.body && (req.body.text || req.body.message)) {
      console.log('Processing user message from Tilda');
      
      // Проверка токена
      const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
      if (!SUVVY_API_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // Извлечение данных
      const userId = req.headers['x-user-id'] || 'unknown-user';
      const messageText = req.body.text || req.body.message?.text || '';
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
    
    // 4. Обработка других форматов
    console.log('Unsupported request format');
    return res.status(400).json({ error: 'Unsupported request format' });
    
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
