const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize firebase-admin
// Put your Firebase service account JSON at ./serviceAccountKey.json
if (!fs.existsSync('./serviceAccountKey.json')) {
  console.error('Missing serviceAccountKey.json. Get it from Firebase Console.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

// Simple in-memory store for deviceId -> fcmToken
// For production, use a DB (Mongo, Postgres, etc.)
const devices = {}; // { deviceId: fcmToken }

app.post('/register', (req, res) => {
  const { deviceId, fcmToken } = req.body;
  if (!deviceId || !fcmToken) return res.status(400).json({ error: 'deviceId and fcmToken required' });
  devices[deviceId] = fcmToken;
  console.log('Registered:', deviceId);
  return res.json({ ok: true });
});

/**
 * Send command:
 * POST /send
 * body: { targetDeviceId: "...", phoneNumber: "9199xxxxxxx", message: "Hello Ajit" }
 */
app.post('/send', async (req, res) => {
  const { targetDeviceId, phoneNumber, message } = req.body;
  if (!targetDeviceId || !phoneNumber) return res.status(400).json({ error: 'targetDeviceId and phoneNumber required' });

  const token = devices[targetDeviceId];
  if (!token) return res.status(404).json({ error: 'target device not registered' });

  const payload = {
    data: {
      targetDeviceId,
      phoneNumber,
      message: message || ''
    }
  };

  try {
    const resp = await admin.messaging().sendToDevice(token, payload);
    console.log('FCM send result:', resp);
    return res.json({ ok: true, resp });
  } catch (err) {
    console.error('FCM send error:', err);
    return res.status(500).json({ error: 'FCM send failed', details: err.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
