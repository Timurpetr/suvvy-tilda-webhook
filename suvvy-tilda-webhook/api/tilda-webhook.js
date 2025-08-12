import axios from 'axios';

export default async (req, res) => {
  try {

    const SUVVY_API_KEY = 'sk-ваш_ключ_из_suvvy';
    const CHANNEL_ID = 'cc-89ba820595b3a9735d337237e2ac291a473fa41237814fe1c98d4098b5c0e89c';
    const SUVVY_URL = `https://api.suvvy.ai/v1/personal/channels/${CHANNEL_ID}/messages`;

    // Получаем данные от Tilda
    const { message, user_id } = req.body;

    // Отправляем запрос в Suvvy
    const response = await axios.post(
      SUVVY_URL,
      {
        message,
        user_id: user_id || 'user_' + Math.random().toString(36).substring(2, 10)
      },
      {
        headers: {
          'Authorization': `Bearer ${SUVVY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Возвращаем ответ в Tilda
    res.status(200).json({
      success: true,
      response: response.data.response
    });
    
  } catch (error) {
    console.error('Ошибка вебхука:', error);
    res.status(500).json({
      success: false,
      error: 'Произошла ошибка. Попробуйте позже.'
    });
  }
};
