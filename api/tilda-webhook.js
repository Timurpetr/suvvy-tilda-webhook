const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {

    const suvvyData = req.body;

    const tildaWebhookUrl = process.env.TILDA_WEBHOOK_URL;

    if (!tildaWebhookUrl) {
      console.error('TILDA_WEBHOOK_URL is not set');
      return res.status(500).send('Server configuration error');
    }

    const tildaData = {
      name: suvvyData.user.name || 'Anonymous',
      message: suvvyData.message.text,
    };

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

    res.status(200).send({ status: 'ok' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};