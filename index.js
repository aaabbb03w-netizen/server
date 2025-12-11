const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(bodyParser.json());

// Load Firebase service account
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// root route
app.get("/", (req, res) => {
    res.send("WhatsApp Automation Server Running!");
});

// API to send FCM command
app.post("/sendCommand", async (req, res) => {
    try {
        const { token, number, message } = req.body;

        if (!token || !number || !message) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const payload = {
            data: {
                number: number,
                message: message
            }
        };

        await admin.messaging().sendToDevice(token, payload);

        res.json({ success: true, sent: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Render uses dynamic PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
