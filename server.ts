import express from "express";
import path from "path";
// Remove top-level Vite import to prevent production crashes in serverless envs
// import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI, SchemaType as Type } from "@google/generative-ai";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from 'fs';
import admin from "firebase-admin";
import * as XLSX from 'xlsx';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "evalix-pro-secret-2026";

// Firebase Admin Initialization
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json");
}

let fdb: admin.firestore.Firestore;

const initFdb = (forceDefault = false) => {
  if (!admin.apps.length) {
    try {
      const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (saVar) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(saVar.trim()))
        });
      } else {
        admin.initializeApp({ projectId: firebaseConfig.projectId });
      }
    } catch (err) {
      console.error("Firebase Admin init failed:", err);
    }
  }

  const rawDbId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
  const dbId = (!forceDefault && rawDbId && rawDbId.trim() && rawDbId !== "null" && rawDbId !== "undefined") 
    ? rawDbId.trim() 
    : undefined;

  try {
    fdb = (dbId && dbId !== '(default)' && dbId !== 'default') 
      ? admin.firestore(dbId) 
      : admin.firestore();
    console.log(`Firestore connected to: ${dbId || '(default)'}`);
  } catch (e) {
    console.warn("Failed to connect to specific database, falling back to (default):", e);
    fdb = admin.firestore();
  }
  return fdb;
};

const getFdb = () => {
  if (!fdb) return initFdb();
  return fdb;
};

// Global helper for faculty doc with auto-fallback
async function getFacultyDocRobust(uid: string) {
  try {
    const doc = await getFdb().collection("faculty").doc(uid).get();
    return { doc, ref: getFdb().collection("faculty").doc(uid) };
  } catch (err: any) {
    // If NOT_FOUND (5) or PERMISSION_DENIED (7), and probably using a named DB
    const currentDb = (fdb as any)?._databaseId?.database || '(default)';
    if (currentDb !== '(default)' && (err.code === 5 || err.code === 7)) {
      console.warn(`Firestore Error ${err.code} on "${currentDb}". Retrying with default DB...`);
      initFdb(true); // Re-init with default
      const doc = await getFdb().collection("faculty").doc(uid).get();
      return { doc, ref: getFdb().collection("faculty").doc(uid) };
    }
    throw err;
  }
}

interface Faculty {
  id: string;
  uid: string;
  email: string;
  name: string;
  photo: string;
}

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

  // Support for Simple Name-based Login
  app.post("/api/auth/simple", async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Please enter a valid faculty name (min 2 characters)" });
    }

    const trimmedName = name.trim();
    // Deterministic UID based on name for persistence across sessions
    const uid = `faculty_${trimmedName.toLowerCase().replace(/\s+/g, '_')}`;
    const email = `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@evalix.faculty`;

    try {
      // Attempt robust database fetch
      let snap: any;
      let ref: any;
      try {
        const robust = await getFacultyDocRobust(uid);
        snap = robust.doc;
        ref = robust.ref;
      } catch (dbErr) {
        console.warn("Database unavailable, proceeding with virtual session mode.");
        // Fallthrough to virtual user creation
      }
      
      let faculty: Faculty;
      if (!snap || !snap.exists) {
        faculty = { 
          id: uid, 
          uid, 
          email, 
          name: trimmedName, 
          photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}` 
        };
        // Try to persist if possible, but don't block if it fails
        if (ref) {
          ref.set(faculty).catch((e: any) => console.error("Persistence failed:", e.message));
        }
      } else {
        faculty = { id: snap.id, ...(snap.data() as any) } as Faculty;
      }

      const token = jwt.sign({ id: faculty.id, email: faculty.email, name: faculty.name, photo: faculty.photo }, JWT_SECRET);
      res.json({ token, user: faculty });
    } catch (error: any) {
      console.error("Critical login error:", error);
      // Final emergency fallback: Always allow entry if we have a name
      const emergencyFaculty = {
        id: uid,
        uid,
        email,
        name: trimmedName,
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}`
      };
      const token = jwt.sign(emergencyFaculty, JWT_SECRET);
      res.json({ token, user: emergencyFaculty, warning: "Database unreachable" });
    }
  });

  // App Routes
  app.get("/api/me", authenticate, (req: any, res) => res.json(req.user));

  app.put("/api/faculty/profile", authenticate, async (req: any, res) => {
    const { name } = req.body;
    const facultyRef = getFdb().collection("faculty").doc(req.user.id);
    await facultyRef.update({ name });
    
    // Return a new token with updated name
    const updatedDoc = await facultyRef.get();
    const updated = updatedDoc.data() as Faculty;
    const token = jwt.sign({ id: updated?.id, email: updated?.email, name: updated?.name, photo: updated?.photo }, JWT_SECRET);
    res.json({ token, user: updated });
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", authenticate, async (req: any, res) => {
    const classesSnap = await getFdb().collection("faculty").doc(req.user.id).collection("classes").get();
    const totalClasses = classesSnap.size;
    
    // Subjects are nested in classes
    let totalSubjects = 0;
    const classes = classesSnap.docs;
    for (const clsDoc of classes) {
      const subjectsSnap = await clsDoc.ref.collection("subjects").get();
      totalSubjects += subjectsSnap.size;
    }

    const evaluationsSnap = await getFdb().collection("faculty").doc(req.user.id).collection("evaluations")
      .where("created_at", ">=", new Date(new Date().setHours(0,0,0,0)).toISOString())
      .get();
    const evaluationsToday = evaluationsSnap.size;

    const allEvalsSnap = await getFdb().collection("faculty").doc(req.user.id).collection("evaluations").get();
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
    const snap = await getFdb().collection("faculty").doc(req.user.id).collection("classes").get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  app.post("/api/classes", authenticate, async (req: any, res) => {
    const { name, semester, year, section } = req.body;
    const docRef = await getFdb().collection("faculty").doc(req.user.id).collection("classes").add({
      name, semester, year, section, faculty_id: req.user.id
    });
    res.json({ id: docRef.id, name, semester, year, section });
  });

  app.get("/api/classes/:id/subjects", authenticate, async (req: any, res) => {
    const snap = await getFdb().collection("faculty").doc(req.user.id).collection("subjects")
      .where("class_id", "==", req.params.id)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  app.post("/api/classes/:id/subjects", authenticate, async (req: any, res) => {
    const { name } = req.body;
    const docRef = await getFdb().collection("faculty").doc(req.user.id).collection("subjects").add({
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
    
    await getFdb().collection("faculty").doc(facultyId).collection("subjects").doc(subjectId).update(updates);
    res.json({ success: true });
  });

  app.get("/api/classes/:id/students", authenticate, async (req: any, res) => {
    const snap = await getFdb().collection("faculty").doc(req.user.id).collection("students")
      .where("class_id", "==", req.params.id)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  app.post("/api/classes/:id/students", authenticate, async (req: any, res) => {
    const { roll_no, name } = req.body;
    const facultyId = req.user.id;
    const classId = req.params.id;

    const facultyRef = getFdb().collection("faculty").doc(facultyId);
    const existing = await facultyRef.collection("students")
      .where("class_id", "==", classId)
      .where("roll_no", "==", roll_no)
      .get();
    
    if (!existing.empty) {
      return res.status(400).json({ error: "Student roll no already exists in this class" });
    }

    const docRef = await facultyRef.collection("students").add({
      class_id: classId, roll_no, name
    });
    res.json({ id: docRef.id, roll_no, name });
  });

  app.get("/api/subjects/:id/rubrics", authenticate, async (req: any, res) => {
    const snap = await getFdb().collection("faculty").doc(req.user.id).collection("rubrics")
      .where("subject_id", "==", req.params.id)
      .get();
    res.json(snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data, criteria: data.criteria_json ? JSON.parse(data.criteria_json) : [] };
    }));
  });

  app.post("/api/subjects/:id/rubrics", authenticate, async (req: any, res) => {
    const { name, type, criteria } = req.body;
    const docRef = await getFdb().collection("faculty").doc(req.user.id).collection("rubrics").add({
      subject_id: req.params.id,
      name,
      type: type || 'unit',
      criteria_json: JSON.stringify(criteria),
      faculty_id: req.user.id
    });
    res.json({ id: docRef.id, name, type, criteria });
  });

  app.delete("/api/rubrics/:id", authenticate, async (req: any, res) => {
    await getFdb().collection("faculty").doc(req.user.id).collection("rubrics").doc(req.params.id).delete();
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

    const facultyRefBase = getFdb().collection("faculty").doc(facultyId);
    const subjectDoc = await facultyRefBase.collection("subjects").doc(subjectId).get();
    const studentDoc = await facultyRefBase.collection("students").doc(studentId).get();
    
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
      
      const evalRef = await getFdb().collection("faculty").doc(facultyId).collection("evaluations").add({
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

    const facultyRefBase = getFdb().collection("faculty").doc(facultyId);
    const subjectDoc = await facultyRefBase.collection("subjects").doc(subjectId).get();
    if (!subjectDoc.exists) return res.status(403).json({ error: "Access denied" });
    const classId = subjectDoc.data()?.class_id;

    const studentsSnap = await facultyRefBase.collection("students")
      .where("class_id", "==", classId)
      .get();
    
    const evalsSnap = await facultyRefBase.collection("evaluations")
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
    const snap = await getFdb().collection("faculty").doc(facultyId).collection("evaluations")
      .where("student_id", "==", req.params.studentId)
      .where("subject_id", "==", req.params.subjectId)
      .get();
    
    const batch = getFdb().batch();
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
