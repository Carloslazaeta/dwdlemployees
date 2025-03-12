const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const fs = require("fs");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Configuración de Firebase
const firebaseCredentials = require("./dwdlemployees-firebase-adminsdk-fbsvc-2a2bcd698b.json");
admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
    databaseURL: "https://dwdlemployees-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Configuración de Google Sheets
const credentials = JSON.parse(fs.readFileSync("new-user-453301-a19c69913794.json"));
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const SHEET_ID = "1sFKy9a9n2rEdceUtEVzhwr-zKiNylIDEuTxErGkVrrs";

// ✅ Leer datos de Google Sheets
app.get("/read-sheet", async (req, res) => {
    try {
        const sheets = google.sheets({ version: "v4", auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: "A:K"
        });

        res.json({ status: "success", data: response.data.values || [] });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// ✅ Obtener datos de usuario específico
app.get("/get-user-data", async (req, res) => {
    try {
        const name = req.query.name;
        const sheets = google.sheets({ version: "v4", auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: "A:K"
        });

        let rows = response.data.values || [];
        let userData = rows.find(row => row[1] === name);

        if (!userData) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        res.json({ status: "success", data: userData });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// ✅ Subir usuario aprobado a Firebase
app.post("/upload-to-firebase", async (req, res) => {
    try {
        const userData = req.body;
        const ref = db.ref("approvedUsers").push();
        await ref.set({ ...userData, timestamp: new Date().toISOString() });

        res.json({ status: "success", message: "User uploaded to Firebase" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// ✅ Borrar fecha en Google Sheets
app.post("/update-date", async (req, res) => {
    try {
        const { name } = req.body;
        const sheets = google.sheets({ version: "v4", auth });

        let response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: "A:K"
        });

        let rows = response.data.values;
        let rowIndex = rows.findIndex(row => row[1] === name);
        if (rowIndex === -1) return res.status(404).json({ status: "error", message: "User not found" });

        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `D${rowIndex + 1}`,
            valueInputOption: "RAW",
            resource: { values: [[""]] }
        });

        res.json({ status: "success", message: "Date cleared" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
