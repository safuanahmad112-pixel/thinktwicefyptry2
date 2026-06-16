import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

/* ===================== MIDDLEWARE ===================== */

app.use(cors({
  origin: "*"
}));

app.use(express.json());

/* ===================== PATH ===================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

/* ===================== ENV CHECK ===================== */

const requiredEnv = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "DB_PORT",
  "GROQ_API_KEY"
];

const missingEnv = requiredEnv.filter(k => !process.env[k]);

if (missingEnv.length > 0) {
  console.log("⚠️ Missing ENV:", missingEnv.join(", "));
}

/* ===================== MYSQL ===================== */

let db = null;

if (missingEnv.length === 0) {
  db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  });

  console.log("✅ MySQL connected");
}

/* ===================== DB CHECK ===================== */

function requireDB(res) {
  if (!db) {
    res.status(500).json({
      success: false,
      message: "Database not configured"
    });
    return false;
  }
  return true;
}

/* ===================== HOME ===================== */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ===================== AI API ===================== */

app.post("/api/analyze", async (req, res) => {
  try {
    const { prompt, aiMode, roles = [], modes = [], singleMode = false } = req.body;

    const finalRoles = roles.length ? roles : ["Investor"];
    const finalModes = modes.length ? modes : ["Critic"];

    let combinations = [];

    if (singleMode) {
      combinations = [{ role: finalRoles[0], mode: finalModes[0] }];
    } else {
      for (const r of finalRoles) {
        for (const m of finalModes) {
          combinations.push({ role: r, mode: m });
        }
      }
    }

    let systemPrompt = "";

    if (aiMode === "chatgpt") {
      systemPrompt = "You are a financial AI assistant.";
    } else if (aiMode === "concept") {
      systemPrompt = `
Strict analysis engine:

${combinations.map(c => `ROLE: ${c.role}\nMODE: ${c.mode}\n---`).join("\n")}

OUTPUT:
📊 SCORE
⚠️ RISK
🎯 VERDICT
🧠 CRITICISM
💡 INSIGHT
🔥 FINAL THOUGHT
`;
    } else {
      systemPrompt = "You are a helpful AI assistant.";
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: aiMode === "concept" ? 0.6 : 0.3,
        max_tokens: 2500
      })
    });

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content;

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "No AI response"
      });
    }

    res.json({ success: true, result });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/* ===================== SIGNUP ===================== */

app.post("/signup", async (req, res) => {
  if (!requireDB(res)) return;

  try {
    const { fullname, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users(fullname, email, password) VALUES (?, ?, ?)",
      [fullname, email, hashed]
    );

    res.json({ success: true, message: "Account created" });

  } catch (err) {
    res.status(400).json({ success: false, message: "Signup error" });
  }
});

/* ===================== LOGIN ===================== */

app.post("/login", async (req, res) => {
  if (!requireDB(res)) return;

  const { email, password } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM users WHERE email=?",
    [email]
  );

  if (!rows.length) {
    return res.json({ success: false, message: "User not found" });
  }

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password);

  if (!ok) {
    return res.json({ success: false, message: "Wrong password" });
  }

  res.json({
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      fullname: user.fullname,
      email: user.email
    }
  });
});

/* ===================== CHECK EMAIL ===================== */

app.post("/check-email", async (req, res) => {
  if (!requireDB(res)) return;

  const { email } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM users WHERE email=?",
    [email]
  );

  if (!rows.length) {
    return res.json({ exists: false });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await db.query(
    "UPDATE users SET reset_token=?, reset_expiry=? WHERE email=?",
    [token, expiry, email]
  );

  res.json({ exists: true, token });
});

/* ===================== RESET PASSWORD ===================== */

app.post("/reset-password", async (req, res) => {
  if (!requireDB(res)) return;

  const { email, token, newPassword } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM users WHERE email=? AND reset_token=?",
    [email, token]
  );

  if (!rows.length) {
    return res.json({ success: false, message: "Invalid token" });
  }

  const user = rows[0];

  if (new Date(user.reset_expiry) < new Date()) {
    return res.json({ success: false, message: "Token expired" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.query(
    `UPDATE users 
     SET password=?, reset_token=NULL, reset_expiry=NULL 
     WHERE email=?`,
    [hashed, email]
  );

  res.json({ success: true, message: "Password updated" });
});

/* ===================== START ===================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
