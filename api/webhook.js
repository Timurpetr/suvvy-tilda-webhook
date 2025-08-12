// Файл: api/webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { message, user } = req.body;

  const SUVVY_API_TOKEN = process.env.SUVVY_API_TOKEN;
  // Используйте правильный URL для вебхука, как в документации Suvvy
  const SUVVY_WEBHOOK_URL = 'https://api.suvvy.ai/api/webhook/custom/message';

  if (!SUVVY_API_TOKEN) {
    return res.status(500).json({ error: 'Server configuration error: SUVVY_API_TOKEN is not set' });
  }

  try {
    const suvvyResponse = await fetch(SUVVY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUVVY_API_TOKEN}`,
      },
      body: JSON.stringify({
        api_version: 1, 
        message_id: `tilda-${Date.now()}`, 
        chat_id: user.id || 'anonymous',
        text: message.text, 
        message_sender: "customer", 
        source: "Tilda Chat" 
      }),
    });

    if (!suvvyResponse.ok) {
      const errorText = await suvvyResponse.text();
      console.error('Error from Suvvy API:', errorText);
      throw new Error('Failed to get response from Suvvy');
    }


    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
