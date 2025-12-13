const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PRIVATE_KEY = "12345";

let devices = new Set();
let tasks = {};

// REGISTER DEVICE
app.post("/register", (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
        return res.status(400).json({ error: "deviceId required" });
    }
    devices.add(deviceId);
    res.json({ status: "registered" });
});

// SEND SMS TASK (POST)
app.post("/send", (req, res) => {
    const { deviceId, number, message } = req.body;

    if (!devices.has(deviceId)) {
        return res.status(404).json({ error: "Device not registered" });
    }

    tasks[deviceId] = { number, message };
    res.json({ status: "queued" });
});

// DEVICE POLLING
app.get("/task/:deviceId", (req, res) => {
    const deviceId = req.params.deviceId;

    if (tasks[deviceId]) {
        const task = tasks[deviceId];
        delete tasks[deviceId];

        res.json({
            send: true,
            number: task.number,
            message: task.message
        });
    } else {
        res.json({ send: false });
    }
});

// SHOW ALL DEVICES (PRIVATE KEY)
app.get("/devices", (req, res) => {
    const key = req.headers["x-private-key"];

    if (key !== PRIVATE_KEY) {
        return res.status(401).json({ error: "Invalid private key" });
    }

    res.json({
        total: devices.size,
        devices: Array.from(devices)
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
