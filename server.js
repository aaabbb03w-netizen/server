import express from "express";

const app = express();
app.use(express.json());

const PORT = 3000;

// In-memory storage
const devices = new Set();
const smsQueue = {}; // deviceId -> sms data

// Register device
app.post("/register", (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId required" });
  }

  devices.add(deviceId);
  console.log("Registered:", deviceId);

  res.json({ status: "registered", deviceId });
});

// Fetch all device IDs
app.get("/fetch", (req, res) => {
  res.json({ devices: Array.from(devices) });
});

// Send SMS command
app.post("/sendsms", (req, res) => {
  const { deviceId, number, message } = req.body;

  if (!deviceId || !number || !message) {
    return res.status(400).json({ error: "deviceId, number, message required" });
  }

  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: "Device not registered" });
  }

  smsQueue[deviceId] = { number, message };
  console.log("SMS queued for:", deviceId);

  res.json({ status: "queued" });
});

// App polls this
app.get("/poll/:deviceId", (req, res) => {
  const deviceId = req.params.deviceId;

  if (smsQueue[deviceId]) {
    const data = smsQueue[deviceId];
    delete smsQueue[deviceId];
    return res.json({ send: true, ...data });
  }

  res.json({ send: false });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
