const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    // Принимаем только POST-запросы
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Получаем данные из вебхука от Suvvy.ai
    const suvvyData = req.body;

    // URL вашего вебхука в Tilda (получим на следующем шаге)
    const tildaWebhookUrl = process.env.TILDA_WEBHOOK_URL;

    if (!tildaWebhookUrl) {
      console.error('TILDA_WEBHOOK_URL is not set');
      return res.status(500).send('Server configuration error');
    }

    // Подготавливаем данные для отправки в Tilda
    // Вам нужно будет сопоставить поля из Suvvy.ai с полями вашей формы в Tilda
    const tildaData = {
      // Пример: предполагаем, что у вас есть поля 'name' и 'message'
      name: suvvyData.user.name || 'Anonymous',
      message: suvvyData.message.text,
      // Добавьте другие поля по необходимости
    };

    // Отправляем данные в Tilda
    const tildaResponse = await fetch(tildaWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tildaData),
    });

    if (!tildaResponse.ok) {
      const errorText = await tildaResponse.text();
      console.error('Error sending data to Tilda:', errorText);
      throw new Error('Failed to send data to Tilda');
    }

    // Отправляем успешный ответ обратно в Suvvy.ai
    res.status(200).send({ status: 'ok' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};
