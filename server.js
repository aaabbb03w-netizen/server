import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// file to persist devices/commands
const DB_FILE = path.join(process.cwd(), "devices.json");

// load DB (if missing, create)
let db = {};
try {
  if (fs.existsSync(DB_FILE)) {
    const txt = fs.readFileSync(DB_FILE, "utf8");
    db = txt ? JSON.parse(txt) : {};
  } else {
    db = {};
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
} catch (err) {
  console.error("DB load error:", err);
  db = {};
}

// helper to save DB
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("DB save error:", err);
  }
}

/**
 * Register device
 * POST /register
 * { deviceId }
 */
app.post("/register", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ ok: false, error: "deviceId required" });
  if (!db[deviceId]) {
    db[deviceId] = { command: null, updatedAt: Date.now() };
    saveDB();
  } else {
    db[deviceId].updatedAt = Date.now();
    saveDB();
  }
  console.log("Registered:", deviceId);
  res.json({ ok: true });
});

/**
 * Send command to device (admin)
 * POST /send
 * { deviceId, phoneNumber, message }
 */
app.post("/send", (req, res) => {
  const { deviceId, phoneNumber, message } = req.body;
  if (!deviceId || !phoneNumber) return res.status(400).json({ ok: false, error: "deviceId and phoneNumber required" });
  if (!db[deviceId]) return res.status(404).json({ ok: false, error: "device not registered" });

  // store command (delivered-once)
  db[deviceId].command = {
    phoneNumber: phoneNumber,
    message: message || "",
    createdAt: Date.now()
  };
  saveDB();
  console.log(`Command queued for ${deviceId}: ${phoneNumber} | ${message}`);
  res.json({ ok: true });
});

/**
 * Device fetches command (once-only)
 * GET /fetch?deviceId=...
 */
app.get("/fetch", (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) return res.status(400).json({ ok: false, error: "deviceId required" });
  if (!db[deviceId]) return res.status(404).json({ ok: false, error: "device not registered" });

  const cmd = db[deviceId].command || null;
  if (!cmd) return res.json({ phoneNumber: "", message: "" });

  // deliver and clear command
  db[deviceId].command = null;
  saveDB();
  console.log(`Delivered command to ${deviceId}`);
  res.json({ phoneNumber: cmd.phoneNumber, message: cmd.message });
});

// health
app.get("/", (req, res) => res.send("whatsremote server running"));

// listen (Render sets PORT env)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
