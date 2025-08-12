// Файл: api/webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { message, user } = req.body;

  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  const SUVVY_API_URL = 'https://api.suvvy.ai/api/webhook/custom/message'; 

  if (!SUVVY_API_TOKEN) {
    return res.status(500).json({ error: 'Server configuration error: SUVVY_API_TOKEN is not set' });
  }

  try {
    // Пересылаем запрос в Suvvy.ai
    const suvvyResponse = await fetch(SUVVY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`,
      },
      body: JSON.stringify({
        // Структура запроса может отличаться, сверьтесь с документацией Suvvy.ai
        model: "model-name", // Укажите нужную модель
        messages: [{ role: "user", content: message.text }],
        user: user.id
      }),
    });

    if (!suvvyResponse.ok) {
      const errorText = await suvvyResponse.text();
      console.error('Error from Suvvy API:', errorText);
      throw new Error('Failed to get response from Suvvy');
    }

    const suvvyData = await suvvyResponse.json();

    // Отправляем ответ от Suvvy обратно в наш чат на Tilda
    const replyText = suvvyData.choices[0].message.content;
    res.status(200).json({ text: replyText });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
