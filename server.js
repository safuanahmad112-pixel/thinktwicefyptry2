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

/* ===================== MYSQL (PROMISE VERSION) ===================== */

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "thinktwice_db",
});

try {
  await db.query("SELECT 1");
  console.log("✅ MySQL Connected");
} catch (err) {
  console.log("❌ MySQL Error:", err);
}

/* ===================== PATH ===================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ===================== API KEY ===================== */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/* ===================== API ===================== */

app.post("/api/analyze", async (req, res) => {
  try {
    const {
      prompt,
      aiMode,
      roles = [],
      modes = [],
      singleMode = false   // 🔥 NEW FEATURE
    } = req.body;

    let systemPrompt = "";

    /* ===================== CLEAN INPUT ===================== */

    const finalRoles = Array.isArray(roles) && roles.length
      ? roles
      : ["Investor"];

    const finalModes = Array.isArray(modes) && modes.length
      ? modes
      : ["Critic"];

    /* ===================== COMBINATIONS ===================== */

    let combinations = [];

    // 🔥 KEY LOGIC FIX
    if (singleMode) {
      // ONLY ONE ROLE + ONE MODE
      combinations = [
        {
          role: finalRoles[0],
          mode: finalModes[0]
        }
      ];
    } else {
      // MULTI COMBINATION MODE
      for (const r of finalRoles) {
        for (const m of finalModes) {
          combinations.push({ role: r, mode: m });
        }
      }
    }

    /* ===================== CHATGPT MODE ===================== */

    if (aiMode === "chatgpt") {
      systemPrompt = `
You are a professional accounting and financial analysis AI assistant.

IMPORTANT RULES:
- Respond ONLY in structured format
- Do NOT add extra introduction or conclusion
- Always include all sections
- Be precise and analytical
- Use numbers when possible

OUTPUT FORMAT:

📊 Financial Analysis
🧮 Calculations
📉 Interpretation
⚠️ Risk / Issues
✅ Recommendation
`;
    }

    /* ===================== CONCEPT MODE ===================== */

    else if (aiMode === "concept") {
      systemPrompt = `
You are a STRICT business analysis engine.

RULES:
- Follow ONLY given ROLE and MODE combinations
- Do NOT merge roles or add extra text
- Output must be structured exactly

INPUT:
${combinations.map(c => `ROLE: ${c.role}\nMODE: ${c.mode}\n---`).join("\n")}

OUTPUT FORMAT:

ROLE: <ROLE>
MODE: <MODE>

📊 SCORE: X/10
⚠️ RISK: ...
🎯 VERDICT: ...
🧠 CRITICISM: ...
💡 INSIGHT: ...
🔥 FINAL THOUGHT: ...
`;
    }

    /* ===================== DEFAULT ===================== */

    else {
      systemPrompt = `
You are a helpful AI assistant.
Provide clear, structured responses.
`;
    }

    /* ===================== GROQ CALL ===================== */

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: aiMode === "concept" ? 0.6 : 0.3,
          max_tokens: 2500
        }),
      }
    );

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content;

    if (!result) {
      return res.status(500).json({
        error: "No AI response",
        raw: data
      });
    }

    res.json({ result });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================== START SERVER ===================== */

const PORT = process.env.PORT || 3000;

/* ===================== SIGNUP ===================== */

app.post("/signup", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users(fullname, email, password) VALUES (?, ?, ?)",
      [fullname, email, hashedPassword]
    );

    res.json({ message: "Account created successfully" });
  } catch (err) {
    res.status(400).json({ message: "Email already exists" });
  }
});

/* ===================== LOGIN ===================== */

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  if (rows.length === 0) {
    return res.json({ message: "User not found" });
  }

  const user = rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.json({ message: "Wrong password" });
  }

  res.json({
    message: "Login successful",
    user: {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
    },
  });
});

/* ===================== FORGOT PASSWORD STEP 1 ===================== */
/* check email + create token */

app.post("/check-email", async (req, res) => {
  const { email } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  if (rows.length === 0) {
    return res.json({ exists: false });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await db.query(
    "UPDATE users SET reset_token=?, reset_expiry=? WHERE email=?",
    [token, expiry, email]
  );

  res.json({
    exists: true,
    token,
  });
});

/* ===================== RESET PASSWORD ===================== */

app.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  const [rows] = await db.query(
    "SELECT * FROM users WHERE email=? AND reset_token=?",
    [email, token]
  );

  if (rows.length === 0) {
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

  res.json({
    success: true,
    message: "Password updated successfully",
  });
});

/* ===================== REPORT CONVERSATION ===================== */

/* ===================== REPORT CONVERSATION ===================== */

app.post("/report", async (req, res) => {
  try {

    console.log("REPORT DATA:", req.body);

    const {
      userId,
      email,
      reason,
      description,
      conversation,
      reported_by
    } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required"
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO reports
      (
        user_id,
        email,
        reason,
        description,
        conversation,
        reported_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId || null,
        email || "",
        reason,
        description || "",
        conversation || "",
        reported_by || "user"
      ]
    );

    res.json({
      success: true,
      reportId: result.insertId,
      message: "Report submitted successfully"
    });

  } catch (err) {

    console.error("REPORT ERROR:", err);
    console.error("SQL MESSAGE:", err.sqlMessage);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/action", async (req, res) => {
  const { email, action_type, pdf_name, conversation } = req.body;

  try {
    await db.query(
      `INSERT INTO user_actions 
      (email, action_type, pdf_name, conversation, created_at)
      VALUES (?, ?, ?, ?, NOW())`,
      [email, action_type, pdf_name, conversation]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "DB insert failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});