const express = require("express");
const app = express();

let commands = {};

app.use(express.json());

app.post("/setcmd", (req, res) => {
    const { device, open } = req.body;
    commands[device] = { open };
    res.send("OK");
});

app.get("/getcmd", (req, res) => {
    const device = req.query.device;
    res.json(commands[device] || { open: false });
});

app.listen(10000, () => console.log("Server running"));
