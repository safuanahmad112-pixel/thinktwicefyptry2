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

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ===================== MYSQL (XAMPP LOCALHOST) ===================== */

// XAMPP default credentials
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",  // XAMPP default is empty
  database: "thinktwice_db",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Test connection
try {
  const connection = await db.getConnection();
  console.log("✅ MySQL Connected Successfully to XAMPP!");
  connection.release();
} catch (err) {
  console.log("❌ MySQL Connection Error:", err.message);
  console.log("⚠️ Make sure XAMPP is running and database 'thinktwice_db' exists");
}

/* ===================== API KEY ===================== */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.log("⚠️ GROQ_API_KEY is missing in environment variables");
}

/* ===================== API ===================== */

app.post("/api/analyze", async (req, res) => {
  try {
    const {
      prompt,
      aiMode,
      roles = [],
      modes = [],
      singleMode = false
    } = req.body;

    let systemPrompt = "";

    const finalRoles = Array.isArray(roles) && roles.length
      ? roles
      : ["Investor"];

    const finalModes = Array.isArray(modes) && modes.length
      ? modes
      : ["Critic"];

    let combinations = [];

    if (singleMode) {
      combinations = [
        {
          role: finalRoles[0],
          mode: finalModes[0]
        }
      ];
    } else {
      for (const r of finalRoles) {
        for (const m of finalModes) {
          combinations.push({ role: r, mode: m });
        }
      }
    }

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
    } else if (aiMode === "concept") {
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
    } else {
      systemPrompt = `
You are a helpful AI assistant.
Provide clear, structured responses.
`;
    }

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

/* ===================== SIGNUP ===================== */

app.post("/signup", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    // Check if user already exists
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

    if (rows.length === 0) {
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

/* ===================== FORGOT PASSWORD STEP 1 ===================== */

app.post("/check-email", async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Check Email Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
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

    if (rows.length === 0) {
      return res.json({ 
        success: false, 
        message: "Invalid token" 
      });
    }

    const user = rows[0];

    if (new Date(user.reset_expiry) < new Date()) {
      return res.json({ 
        success: false, 
        message: "Token expired" 
      });
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
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

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

/* ===================== USER ACTION ===================== */

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
    res.status(500).json({ 
      success: false, 
      error: "DB insert failed" 
    });
  }
});

/* ===================== START SERVER ===================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
