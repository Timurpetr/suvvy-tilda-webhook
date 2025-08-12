export default function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }


  const dataFromTilda = req.body;

  console.log('Получены данные от Tilda:', dataFromTilda);

  res.status(200).send('OK');
}
