import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { OAuth2Client } from 'google-auth-library';
import * as XLSX from 'xlsx';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "smalteval-pro-secret-2026";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) : null;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

const systemPrompt = `
You are SmartEval AI, a forensic academic evaluation engine. Your goal is to evaluate student answer sheets with extreme precision.

EVALUATION PROTOCOL:
- Analyze handwritten answers and compare them with the Question Paper and Reference Textbook/Notes.
- Be fair but rigorous. Award marks based on conceptual depth and keyword accuracy.
- Provide high-fidelity feedback for each question.

OUTPUT_FORMAT:
JSON only.
{
  "score": <number>,
  "total": <number>,
  "feedback": "<Overall constructive summary>",
  "questions": [
    { "q_no": "<number>", "max_marks": <number>, "obtained_marks": <number>, "comment": "<Question-specific feedback>" }
  ],
  "summary": {
    "strengths": ["<strength 1>", "<strength 2>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"]
  }
}
`;

let db: any;

async function setupDb() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE,
      name TEXT,
      photo TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      semester TEXT,
      year TEXT,
      section TEXT,
      faculty_id INTEGER,
      FOREIGN KEY(faculty_id) REFERENCES faculty(id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      name TEXT,
      textbook_url TEXT,
      notes_url TEXT,
      FOREIGN KEY(class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      roll_no TEXT,
      name TEXT,
      FOREIGN KEY(class_id) REFERENCES classes(id),
      UNIQUE(class_id, roll_no)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      subject_id INTEGER,
      question_paper_url TEXT,
      answer_sheet_url TEXT,
      total_marks INTEGER,
      obtained_marks INTEGER,
      result_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );
  `);

  // Migration: Ensure class_id exists in students if the table was created with an old schema
  const studentsColumns = await db.all("PRAGMA table_info(students)");
  if (!studentsColumns.some((c: any) => c.name === 'class_id')) {
    await db.exec("ALTER TABLE students ADD COLUMN class_id INTEGER");
  }

  // Migration: Ensure class_id exists in subjects if the table was created with an old schema
  const subjectsColumns = await db.all("PRAGMA table_info(subjects)");
  if (!subjectsColumns.some((c: any) => c.name === 'class_id')) {
    await db.exec("ALTER TABLE subjects ADD COLUMN class_id INTEGER");
  }
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function startServer() {
  console.log("Starting server setup...");
  try {
    await setupDb();
    console.log("Database synced successfully.");
  } catch (err) {
    console.error("Database sync failed:", err);
    process.exit(1);
  }
  
  const app = express();
  app.use(express.json());

  // OAuth & Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      // Special handle for demo token if we still have it in old sessions
      if (token === 'demo-token-smarteval') {
        req.user = { id: 1, email: 'pilot@smarteval.ai', name: 'Faculty Pilot' };
        return next();
      }
      res.status(401).json({ error: "Invalid session" });
    }
  };

  app.post("/api/auth/demo", async (req, res) => {
    let faculty = await db.get("SELECT * FROM faculty WHERE email = ?", "pilot@smarteval.ai");
    if (!faculty) {
      const result = await db.run(
        "INSERT INTO faculty (google_id, email, name, photo) VALUES (?, ?, ?, ?)",
        "demo-google-id", "pilot@smarteval.ai", "Faculty Pilot", "https://api.dicebear.com/7.x/avataaars/svg?seed=pilot"
      );
      faculty = { id: result.lastID, email: "pilot@smarteval.ai", name: "Faculty Pilot", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=pilot" };
    }
    const token = jwt.sign({ id: faculty.id, email: faculty.email, name: faculty.name, photo: faculty.photo }, JWT_SECRET);
    res.json({ token, user: faculty });
  });

  // Google OAuth Routes
  app.get('/api/auth/google/url', (req, res) => {
    if (!oauthClient) {
      return res.status(503).json({ error: "Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Secrets." });
    }
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const url = oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      redirect_uri: redirectUri
    });
    res.json({ url });
  });

  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    if (!oauthClient) return res.status(503).send("OAuth not configured");
    const { code } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    try {
      const { tokens } = await oauthClient.getToken({
        code: code as string,
        redirect_uri: redirectUri
      });
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      
      if (!payload) throw new Error('No payload');

      // Sync faculty with DB
      let faculty = await db.get("SELECT * FROM faculty WHERE google_id = ?", payload.sub);
      if (!faculty) {
        const result = await db.run(
          "INSERT INTO faculty (google_id, email, name, photo) VALUES (?, ?, ?, ?)",
          payload.sub, payload.email, payload.name, payload.picture
        );
        faculty = { id: result.lastID, ...payload };
      }

      const token = jwt.sign({ id: faculty.id, email: faculty.email, name: faculty.name, photo: faculty.photo }, JWT_SECRET);

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(faculty)} }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      console.error(err);
      res.status(500).send("Auth failed");
    }
  });

  // App Routes
  app.get("/api/me", authenticate, (req: any, res) => res.json(req.user));

  app.put("/api/faculty/profile", authenticate, async (req: any, res) => {
    const { name } = req.body;
    await db.run("UPDATE faculty SET name = ? WHERE id = ?", name, req.user.id);
    // Return a new token with updated name
    const updated = await db.get("SELECT * FROM faculty WHERE id = ?", req.user.id);
    const token = jwt.sign({ id: updated.id, email: updated.email, name: updated.name, photo: updated.photo }, JWT_SECRET);
    res.json({ token, user: updated });
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", authenticate, async (req: any, res) => {
    const totalClasses = await db.get("SELECT COUNT(*) as count FROM classes WHERE faculty_id = ?", req.user.id);
    const totalSubjects = await db.get("SELECT COUNT(*) as count FROM subjects WHERE class_id IN (SELECT id FROM classes WHERE faculty_id = ?)", req.user.id);
    const evaluationsToday = await db.get("SELECT COUNT(*) as count FROM evaluations WHERE created_at >= date('now') AND subject_id IN (SELECT id FROM subjects WHERE class_id IN (SELECT id FROM classes WHERE faculty_id = ?))", req.user.id);
    const avgPerformance = await db.get("SELECT AVG(CAST(obtained_marks AS FLOAT) / total_marks) * 100 as avg FROM evaluations WHERE subject_id IN (SELECT id FROM subjects WHERE class_id IN (SELECT id FROM classes WHERE faculty_id = ?))", req.user.id);

    res.json({
      classes: totalClasses.count,
      subjects: totalSubjects.count,
      evaluationsToday: evaluationsToday.count,
      performance: Math.round(avgPerformance.avg || 0)
    });
  });

  // Classes & Subjects Management
  app.get("/api/classes", authenticate, async (req: any, res) => {
    const classes = await db.all("SELECT * FROM classes WHERE faculty_id = ?", req.user.id);
    res.json(classes);
  });

  app.post("/api/classes", authenticate, async (req: any, res) => {
    const { name, semester, year, section } = req.body;
    const result = await db.run("INSERT INTO classes (name, semester, year, section, faculty_id) VALUES (?, ?, ?, ?, ?)",
      name, semester, year, section, req.user.id);
    res.json({ id: result.lastID, name, semester, year, section });
  });

  app.get("/api/classes/:id/subjects", authenticate, async (req, res) => {
    const subjects = await db.all("SELECT * FROM subjects WHERE class_id = ?", req.params.id);
    res.json(subjects);
  });

  app.post("/api/classes/:id/subjects", authenticate, async (req, res) => {
    const { name } = req.body;
    const result = await db.run("INSERT INTO subjects (class_id, name) VALUES (?, ?)", req.params.id, name);
    res.json({ id: result.lastID, name });
  });

  app.post("/api/subjects/:id/materials", authenticate, upload.fields([
    { name: 'textbook', maxCount: 1 },
    { name: 'notes', maxCount: 1 }
  ]), async (req: any, res) => {
    const files = req.files;
    if (files.textbook) {
      // For demo, we just store the material as "present" - in real app we'd save the file
      await db.run("UPDATE subjects SET textbook_url = ? WHERE id = ?", files.textbook[0].originalname, req.params.id);
    }
    if (files.notes) {
      await db.run("UPDATE subjects SET notes_url = ? WHERE id = ?", files.notes[0].originalname, req.params.id);
    }
    res.json({ success: true });
  });

  app.get("/api/classes/:id/students", authenticate, async (req, res) => {
    const students = await db.all("SELECT * FROM students WHERE class_id = ?", req.params.id);
    res.json(students);
  });

  app.post("/api/classes/:id/students", authenticate, async (req, res) => {
    const { roll_no, name } = req.body;
    try {
      const result = await db.run("INSERT INTO students (class_id, roll_no, name) VALUES (?, ?, ?)", req.params.id, roll_no, name);
      res.json({ id: result.lastID, roll_no, name });
    } catch (e) {
      res.status(400).json({ error: "Student roll no already exists in this class" });
    }
  });

  // Evaluation Core
  app.post("/api/evaluate", authenticate, upload.fields([
    { name: 'questionPaper', maxCount: 1 },
    { name: 'answerSheet', maxCount: 1 }
  ]), async (req: any, res) => {
    const { subjectId, studentId } = req.body;
    const files = req.files;

    if (!files.questionPaper || !files.answerSheet) return res.status(400).json({ error: "Missing files" });

    const subject = await db.get("SELECT * FROM subjects WHERE id = ?", subjectId);

    try {
      const qpMime = files.questionPaper[0].mimetype;
      const asMime = files.answerSheet[0].mimetype;

      const parts = [
        { text: systemPrompt },
        { text: `CONTEXT: Evaluating for subject "${subject?.name}".` },
        { inlineData: { mimeType: qpMime, data: files.questionPaper[0].buffer.toString('base64') } },
        { inlineData: { mimeType: asMime, data: files.answerSheet[0].buffer.toString('base64') } },
        { text: "Evaluate this answer sheet based on the provided question paper. Provide high fidelity marks. Output in raw JSON format matching the schema." }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
        }
      });

      if (!response.text) {
        console.error("AI Response empty", response);
        throw new Error("Model failed to generate content.");
      }

      console.log("AI Raw Response:", response.text);
      const parsedResult = JSON.parse(response.text.trim());
      
      const evalRes = await db.run(
        "INSERT INTO evaluations (student_id, subject_id, total_marks, obtained_marks, result_json) VALUES (?, ?, ?, ?, ?)",
        studentId, subjectId, parsedResult.total || 100, parsedResult.score || 0, JSON.stringify(parsedResult)
      );

      res.json({ id: evalRes.lastID, ...parsedResult });
    } catch (err: any) {
      console.error("AI Evaluation Detailed Error:", err);
      res.status(500).json({ 
        error: "AI Evaluation failed", 
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  // Marksheet Export
  app.get("/api/marksheets/:subjectId", authenticate, async (req, res) => {
    const data = await db.all(`
      SELECT s.id as student_db_id, s.roll_no, s.name, e.obtained_marks, e.total_marks, e.result_json, e.created_at
      FROM students s
      LEFT JOIN evaluations e ON s.id = e.student_id AND e.subject_id = ?
      WHERE s.class_id = (SELECT class_id FROM subjects WHERE id = ?)
    `, req.params.subjectId, req.params.subjectId);
    res.json(data);
  });

  app.delete("/api/evaluations/:studentId/:subjectId", authenticate, async (req, res) => {
    await db.run("DELETE FROM evaluations WHERE student_id = ? AND subject_id = ?", req.params.studentId, req.params.subjectId);
    res.json({ success: true });
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartEval Pro running on port ${PORT}`);
  });
}

startServer();
