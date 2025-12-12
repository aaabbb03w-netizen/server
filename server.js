const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let logs = [];     // All commands store here
let devices = {};  // Registered devices list

// Register device
app.post("/register", (req, res) => {
    const { deviceId } = req.body;
    devices[deviceId] = true;
    res.json({ status: "registered" });
});

// Log command
app.post("/log-command", (req, res) => {
    logs.push(req.body);
    res.json({ status: "saved" });
});

// Get logs (optional for admin)
app.get("/logs", (req, res) => {
    res.json(logs);
});

// Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
