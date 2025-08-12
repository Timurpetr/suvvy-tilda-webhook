import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('\n===== NEW REQUEST =====');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));

  try {
    // Проверка токена
    const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
    if (!SUVVY_API_TOKEN) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Универсальный парсер входящих данных
    let messageText = '';
    let userId = 'unknown-user';
    let clientName = 'Tilda User';

    // Формат 1: Стандартный запрос от Tilda
    if (req.body.text) {
      messageText = req.body.text;
      userId = req.body.user_id || userId;
    }
    // Формат 2: Запрос от формы Tilda
    else if (req.body.Form) {
      const formData = req.body.Form;
      messageText = Object.entries(formData.fields)
        .map(([key, value]) => `${key}: ${value.value}`)
        .join('\n');
      userId = formData.email || formData.phone || userId;
    }
    // Формат 3: Запрос от чата Tilda
    else if (req.body.message?.text) {
      messageText = req.body.message.text;
      userId = req.body.user?.id || userId;
    }
    // Формат 4: Тестовый запрос от Suvvy
    else if (req.body.event_type === 'test_request') {
      return res.status(200).json({ success: true });
    }
    // Формат 5: Сообщение от бота Suvvy
    else if (req.body.event_type === 'new_messages') {
      console.log('Received bot message:', req.body);
      return res.status(200).json({ success: true });
    }
    // Неизвестный формат
    else {
      console.log('Unsupported format, trying to extract text');
      messageText = req.body.text || req.body.message || JSON.stringify(req.body);
    }

    // Проверка текста сообщения
    if (!messageText.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Формирование payload для Suvvy
    const payload = {
      api_version: 1,
      message_id: `tilda-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      chat_id: userId,
      text: messageText,
      source: "Tilda",
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
      message: 'Message processed'
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
