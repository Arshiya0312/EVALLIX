import express from "express";
import path from "path";
// Remove top-level Vite import to prevent production crashes in serverless envs
// import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI, SchemaType as Type } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from 'fs';
import admin from "firebase-admin";
import { OAuth2Client } from 'google-auth-library';
import * as XLSX from 'xlsx';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "evalix-pro-secret-2026";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Firebase Admin Initialization
if (!admin.apps.length) {
  try {
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saVar) {
      const serviceAccount = JSON.parse(saVar.trim());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized via Service Account variable.");
    } else {
      // Fallback to default if running in a Google environment with ADC
      admin.initializeApp();
      console.log("Firebase Admin initialized via application default credentials.");
    }
  } catch (err) {
    console.error("CRITICAL: Failed to initialize Firebase Admin:", err);
    // Continue for now, but API calls will fail later
  }
}
const fdb = admin.firestore();

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

const systemPrompt = `
You are Evalix AI, a forensic academic evaluation engine. Your goal is to evaluate student answer sheets with extreme precision.

EVALUATION PROTOCOL:
- Analyze handwritten answers and compare them with the Question Paper and Reference Textbook/Notes.
- STRICT RUBRIC ADHERENCE: Use a mathematical approach to scoring. 
  * Full marks for perfect conceptual match + correct keywords.
  * Partial marks ONLY for partially correct conceptual understanding.
  * Zero marks for irrelevant or factually incorrect content.
- DETERMINISM: Award identical scores for identical answers. Base markings on objective evidence.
- Provide high-fidelity feedback for each question.
- Avoid subjectivity; follow standard academic guidelines strictly.

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

// Removed SQLite setupDb
async function setupDb() {
  console.log("Using Firestore as primary data engine.");
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
  app.set('trust proxy', true);
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
    const pilotEmail = "pilot@evalix.ai";
    const facultyRef = fdb.collection("faculty").doc(pilotEmail);
    const doc = await facultyRef.get();
    
    let faculty;
    if (!doc.exists) {
      faculty = { 
        id: pilotEmail, 
        uid: "demo-uid", 
        email: pilotEmail, 
        name: "Faculty Pilot", 
        photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=pilot" 
      };
      await facultyRef.set(faculty);
    } else {
      faculty = { id: doc.id, ...doc.data() };
    }
    
    const token = jwt.sign({ id: faculty?.id, email: faculty?.email, name: faculty?.name, photo: faculty?.photo }, JWT_SECRET);
    res.json({ token, user: faculty });
  });

  // Support for Firebase ID Token Verification (used by AuthScreen.tsx)
  app.post("/api/auth/google", async (req, res) => {
    const { idToken } = req.body;
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      const facultyRef = fdb.collection("faculty").doc(uid);
      const doc = await facultyRef.get();
      
      let faculty;
      if (!doc.exists) {
        faculty = { id: uid, uid, email, name, photo: picture };
        await facultyRef.set(faculty);
      } else {
        faculty = { id: doc.id, ...doc.data() };
      }

      const token = jwt.sign({ id: faculty?.id, email: faculty?.email, name: faculty?.name, photo: faculty?.photo }, JWT_SECRET);
      res.json({ token, user: faculty });
    } catch (error) {
      console.error("Firebase ID Token verification failed:", error);
      res.status(401).json({ error: "Invalid identity token" });
    }
  });

  // App Routes
  app.get("/api/me", authenticate, (req: any, res) => res.json(req.user));

  app.put("/api/faculty/profile", authenticate, async (req: any, res) => {
    const { name } = req.body;
    await fdb.collection("faculty").doc(req.user.id).update({ name });
    
    // Return a new token with updated name
    const updatedDoc = await fdb.collection("faculty").doc(req.user.id).get();
    const updated = updatedDoc.data();
    const token = jwt.sign({ id: updated?.id, email: updated?.email, name: updated?.name, photo: updated?.photo }, JWT_SECRET);
    res.json({ token, user: updated });
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", authenticate, async (req: any, res) => {
    const classesSnap = await fdb.collection("faculty").doc(req.user.id).collection("classes").get();
    const totalClasses = classesSnap.size;
    
    // Subjects are nested in classes
    let totalSubjects = 0;
    const classes = classesSnap.docs;
    for (const clsDoc of classes) {
      const subjectsSnap = await clsDoc.ref.collection("subjects").get();
      totalSubjects += subjectsSnap.size;
    }

    const evaluationsSnap = await fdb.collection("faculty").doc(req.user.id).collection("evaluations")
      .where("created_at", ">=", new Date(new Date().setHours(0,0,0,0)).toISOString())
      .get();
    const evaluationsToday = evaluationsSnap.size;

    const allEvalsSnap = await fdb.collection("faculty").doc(req.user.id).collection("evaluations").get();
    let totalPerformance = 0;
    allEvalsSnap.forEach(doc => {
      const data = doc.data();
      if (data.total_marks > 0) {
        totalPerformance += (data.obtained_marks / data.total_marks);
      }
    });
    const avgPerformance = allEvalsSnap.size > 0 ? (totalPerformance / allEvalsSnap.size) * 100 : 0;

    res.json({
      classes: totalClasses,
      subjects: totalSubjects,
      evaluationsToday: evaluationsToday,
      performance: Math.round(avgPerformance)
    });
  });

  // Classes & Subjects Management
  app.get("/api/classes", authenticate, async (req: any, res) => {
    const snap = await fdb.collection("faculty").doc(req.user.id).collection("classes").get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  app.post("/api/classes", authenticate, async (req: any, res) => {
    const { name, semester, year, section } = req.body;
    const docRef = await fdb.collection("faculty").doc(req.user.id).collection("classes").add({
      name, semester, year, section, faculty_id: req.user.id
    });
    res.json({ id: docRef.id, name, semester, year, section });
  });

  app.get("/api/classes/:id/subjects", authenticate, async (req: any, res) => {
    const snap = await fdb.collection("faculty").doc(req.user.id).collection("subjects")
      .where("class_id", "==", req.params.id)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  app.post("/api/classes/:id/subjects", authenticate, async (req: any, res) => {
    const { name } = req.body;
    const docRef = await fdb.collection("faculty").doc(req.user.id).collection("subjects").add({
      class_id: req.params.id, name
    });
    res.json({ id: docRef.id, name });
  });

  app.post("/api/subjects/:id/materials", authenticate, upload.fields([
    { name: 'textbook', maxCount: 1 },
    { name: 'notes', maxCount: 1 }
  ]), async (req: any, res) => {
    const facultyId = req.user.id;
    const subjectId = req.params.id;
    const files = req.files as any;
    
    const updates: any = {};
    if (files.textbook) updates.textbook_url = files.textbook[0].originalname;
    if (files.notes) updates.notes_url = files.notes[0].originalname;
    
    await fdb.collection("faculty").doc(facultyId).collection("subjects").doc(subjectId).update(updates);
    res.json({ success: true });
  });

  app.get("/api/classes/:id/students", authenticate, async (req: any, res) => {
    const snap = await fdb.collection("faculty").doc(req.user.id).collection("students")
      .where("class_id", "==", req.params.id)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  app.post("/api/classes/:id/students", authenticate, async (req: any, res) => {
    const { roll_no, name } = req.body;
    const facultyId = req.user.id;
    const classId = req.params.id;

    // Check for unique roll_no in class
    const existing = await fdb.collection("faculty").doc(facultyId).collection("students")
      .where("class_id", "==", classId)
      .where("roll_no", "==", roll_no)
      .get();
    
    if (!existing.empty) {
      return res.status(400).json({ error: "Student roll no already exists in this class" });
    }

    const docRef = await fdb.collection("faculty").doc(facultyId).collection("students").add({
      class_id: classId, roll_no, name
    });
    res.json({ id: docRef.id, roll_no, name });
  });

  app.get("/api/subjects/:id/rubrics", authenticate, async (req: any, res) => {
    const snap = await fdb.collection("faculty").doc(req.user.id).collection("rubrics")
      .where("subject_id", "==", req.params.id)
      .get();
    res.json(snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data, criteria: data.criteria_json ? JSON.parse(data.criteria_json) : [] };
    }));
  });

  app.post("/api/subjects/:id/rubrics", authenticate, async (req: any, res) => {
    const { name, type, criteria } = req.body;
    const docRef = await fdb.collection("faculty").doc(req.user.id).collection("rubrics").add({
      subject_id: req.params.id,
      name,
      type: type || 'unit',
      criteria_json: JSON.stringify(criteria),
      faculty_id: req.user.id
    });
    res.json({ id: docRef.id, name, type, criteria });
  });

  app.delete("/api/rubrics/:id", authenticate, async (req: any, res) => {
    await fdb.collection("faculty").doc(req.user.id).collection("rubrics").doc(req.params.id).delete();
    res.json({ success: true });
  });

  // Evaluation Core
  app.post("/api/evaluate", authenticate, upload.fields([
    { name: 'questionPaper', maxCount: 1 },
    { name: 'answerSheet', maxCount: 1 }
  ]), async (req: any, res) => {
    const { subjectId, studentId, useRubric, rubricContent } = req.body;
    const facultyId = req.user.id;
    const files = req.files as any;

    if (!files.questionPaper || !files.answerSheet) return res.status(400).json({ error: "Missing files" });

    // Verify ownership indirectly by querying Firestore (rules will also enforce this)
    const subjectDoc = await fdb.collection("faculty").doc(facultyId).collection("subjects").doc(subjectId).get();
    const studentDoc = await fdb.collection("faculty").doc(facultyId).collection("students").doc(studentId).get();
    
    if (!subjectDoc.exists || !studentDoc.exists) return res.status(403).json({ error: "Access denied" });

    try {
      const qpMime = files.questionPaper[0].mimetype;
      const asMime = files.answerSheet[0].mimetype;

      let rubricInstruction = "";
      if (useRubric === 'true' && rubricContent) {
        rubricInstruction = `
RUBRIC-BASED EVALUATION ACTIVE:
The faculty has provided a specific rubric for this assessment. You MUST evaluate the answers strictly based on these criteria:
${rubricContent}
Adjust question-wise scoring to align with these rubric weights and descriptors.
`;
      }

      const parts = [
        { text: systemPrompt },
        { text: `CONTEXT: Evaluating for subject "${subjectDoc.data()?.name}". ${rubricInstruction}` },
        { inlineData: { mimeType: qpMime, data: files.questionPaper[0].buffer.toString('base64') } },
        { inlineData: { mimeType: asMime, data: files.answerSheet[0].buffer.toString('base64') } },
        { text: "Evaluate this answer sheet based on the provided question paper and rubric (if applicable). Provide high fidelity marks. Output in raw JSON format matching the schema." }
      ];

      const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    q_no: { type: Type.STRING },
                    max_marks: { type: Type.NUMBER },
                    obtained_marks: { type: Type.NUMBER },
                    comment: { type: Type.STRING }
                  },
                  required: ["q_no", "max_marks", "obtained_marks", "comment"]
                }
              },
              summary: {
                type: Type.OBJECT,
                properties: {
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["strengths", "weaknesses"]
              }
            },
            required: ["score", "total", "feedback", "questions", "summary"]
          } as any,
          temperature: 0
        }
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts }]
      });
      
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error("AI failed to produce a response.");
      }

      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsedResult = JSON.parse(jsonStr);
      
      const evalRef = await fdb.collection("faculty").doc(facultyId).collection("evaluations").add({
        student_id: studentId,
        subject_id: subjectId,
        total_marks: parsedResult.total || 100,
        obtained_marks: parsedResult.score || 0,
        result_json: JSON.stringify(parsedResult),
        created_at: new Date().toISOString()
      });

      res.json({ id: evalRef.id, ...parsedResult });
    } catch (err: any) {
      console.error("AI Evaluation Error:", err);
      res.status(500).json({ error: "AI Evaluation failed", details: err.message });
    }
  });

  // Marksheet Export
  app.get("/api/marksheets/:subjectId", authenticate, async (req: any, res) => {
    const facultyId = req.user.id;
    const subjectId = req.params.subjectId;

    const subjectDoc = await fdb.collection("faculty").doc(facultyId).collection("subjects").doc(subjectId).get();
    if (!subjectDoc.exists) return res.status(403).json({ error: "Access denied" });
    const classId = subjectDoc.data()?.class_id;

    const studentsSnap = await fdb.collection("faculty").doc(facultyId).collection("students")
      .where("class_id", "==", classId)
      .get();
    
    const evalsSnap = await fdb.collection("faculty").doc(facultyId).collection("evaluations")
      .where("subject_id", "==", subjectId)
      .get();
    
    const evalsMap = new Map();
    evalsSnap.forEach(doc => {
      const data = doc.data();
      evalsMap.set(data.student_id, data);
    });

    const data = studentsSnap.docs.map(doc => {
      const student = doc.data();
      const evaluation = evalsMap.get(doc.id);
      return {
        student_db_id: doc.id,
        roll_no: student.roll_no,
        name: student.name,
        obtained_marks: evaluation?.obtained_marks || null,
        total_marks: evaluation?.total_marks || null,
        result_json: evaluation?.result_json || null,
        created_at: evaluation?.created_at || null
      };
    });

    res.json(data);
  });

  app.delete("/api/evaluations/:studentId/:subjectId", authenticate, async (req: any, res) => {
    const facultyId = req.user.id;
    const snap = await fdb.collection("faculty").doc(facultyId).collection("evaluations")
      .where("student_id", "==", req.params.studentId)
      .where("subject_id", "==", req.params.subjectId)
      .get();
    
    const batch = fdb.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    res.json({ success: true });
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Evalix Pro running on port ${PORT}`);
  });
}

startServer();
