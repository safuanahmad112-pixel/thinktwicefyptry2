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

app.use(cors());
app.use(express.json());

/* ===================== PATH ===================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (images, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

/* ===================== MYSQL ===================== */

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "thinktwice_db",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Test connection
try {
  const connection = await db.getConnection();
  console.log("✅ MySQL Connected Successfully!");
  connection.release();
} catch (err) {
  console.log("❌ MySQL Connection Error:", err.message);
}

/* ===================== ROUTES FOR ALL PAGES ===================== */

// Main pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/fyp", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "fyp.html"));
});

app.get("/plan", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "plan.html"));
});

app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy.html"));
});

app.get("/tos", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tos.html"));
});

app.get("/hc", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "hc.html"));
});

app.get("/rn", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "rn.html"));
});

// Privacy policy pages
app.get("/privacypolicy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacypolicy.html"));
});

app.get("/privacypolicies", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacypolicies.html"));
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
      systemPrompt = `You are a financial AI assistant. Respond in structured format only.`;
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
      systemPrompt = `You are a helpful AI assistant.`;
    }

    const response = await globalThis.fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: aiMode === "concept" ? 0.6 : 0.3,
          max_tokens: 2500,
        }),
      }
    );

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content;

    if (!result) {
      return res.status(500).json({
        error: "No AI response",
        raw: data,
      });
    }

    res.json({ result });

  } catch (err) {
    console.error("API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================== SIGNUP ===================== */

app.post("/signup", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: "Email already registered" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users(fullname, email, password) VALUES (?, ?, ?)",
      [fullname, email, hashedPassword]
    );

    res.json({ 
      success: true,
      message: "Account created successfully" 
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(400).json({ 
      success: false,
      message: "Error creating account" 
    });
  }
});

/* ===================== LOGIN ===================== */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      return res.json({ 
        success: false,
        message: "User not found" 
      });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.json({ 
        success: false,
        message: "Wrong password" 
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
});

/* ===================== CHECK EMAIL ===================== */

app.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
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
  } catch (err) {
    console.error("Check Email Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===================== RESET PASSWORD ===================== */

app.post("/reset-password", async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===================== START SERVER ===================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`📄 Pages available:`);
  console.log(`   - http://localhost:${PORT}/ (Login)`);
  console.log(`   - http://localhost:${PORT}/fyp`);
  console.log(`   - http://localhost:${PORT}/plan`);
  console.log(`   - http://localhost:${PORT}/privacy`);
  console.log(`   - http://localhost:${PORT}/tos`);
});
