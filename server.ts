import express from "express";
import path from "path";
// Remove top-level Vite import to prevent production crashes in serverless envs
// import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from 'fs';
import admin from "firebase-admin";
import * as XLSX from 'xlsx';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "evalix-pro-secret-2026";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});
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
      const projectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0567814489';
      if (saVar) {
        console.log(`Initializing Firebase Admin with Service Account for project: ${projectId}`);
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(saVar.trim())),
          projectId: projectId
        });
      } else {
        console.log(`Initializing Firebase Admin with Project ID: ${projectId}`);
        admin.initializeApp({ projectId: projectId });
      }
    } catch (err) {
      console.error("Firebase Admin init failed:", err);
    }
  }

  const configDbId = firebaseConfig.firestoreDatabaseId;
  const envDbId = process.env.FIRESTORE_DATABASE_ID;
  
  let dbId: string | undefined;
  if (!forceDefault) {
    if (configDbId && configDbId !== '(default)' && configDbId !== 'default' && configDbId !== 'null') {
      dbId = configDbId.trim();
    } else if (envDbId && envDbId !== '(default)' && envDbId !== 'default' && envDbId !== 'null') {
      dbId = envDbId.trim();
    }
  }

  try {
    // Directly instantiate to ensure we have a fresh reference if forcing default
    const engine = dbId ? admin.firestore(dbId) : admin.firestore();
    fdb = engine;
    console.log(`Firestore Engine active: [${dbId || '(default)'}]`);
  } catch (e) {
    console.warn("Failed Firestore instantiation, falling back to default:", e);
    fdb = admin.firestore();
  }
  return fdb;
};

const getFdb = () => {
  if (!fdb) return initFdb();
  return fdb;
};

/**
 * Executes a Firestore operation with automatic fallback to the default database
 * if the primary (named) database is not found or inaccessible.
 */
// Global in-memory fallback for cases where Firestore is completely absent or failing
const mockStore: Record<string, Record<string, any>> = {};

function getMockCollection(path: string) {
  if (!mockStore[path]) mockStore[path] = {};
  return mockStore[path];
}

async function dbRun<T>(operation: (db: admin.firestore.Firestore) => Promise<T>): Promise<T> {
  let current = getFdb();
  try {
    return await operation(current);
  } catch (err: any) {
    // Capture specific error indicators for database existence
    const dbName = (current as any)?._databaseId?.database || '(default)';
    const isDbMissing = err.code === 5 || err.message?.includes('NOT_FOUND') || err.message?.includes('database was not found');
    
    console.warn(`Firestore Engine Error [${dbName}]: code=${err.code}. Msg=${err.message}`);
    
    if (isDbMissing && dbName !== '(default)') {
      console.log("Database ID not found in project. Attempting hot-swap to (default) engine...");
      try {
        current = initFdb(true);
        return await operation(current);
      } catch (fallbackErr: any) {
        console.error("Recovery engine failure:", fallbackErr.message);
        throw fallbackErr;
      }
    }
    
    // If even recovery to (default) fails with NOT_FOUND, it means Firestore is not enabled/provisioned.
    // In this case, we throw a special error that can be caught to use the mock store.
    if (isDbMissing) {
      const offlineErr = new Error("FIRESTORE_OFFLINE");
      (offlineErr as any).code = 404;
      throw offlineErr;
    }
    
    throw err;
  }
}

/**
 * Safe version of dbRun that returns a default value on ANY database failure.
 * Also uses the mock store as a last resort to provide a functioning app.
 */
async function dbSafe<T>(operation: (db: admin.firestore.Firestore) => Promise<T>, fallback: T, mockKey?: string): Promise<T> {
  try {
    return await dbRun(operation);
  } catch (err: any) {
    if (err.message === "FIRESTORE_OFFLINE") {
      console.log(`Neural Offline Mode triggered for key: ${mockKey || 'unknown'}`);
    } else {
      console.error("Firestore operation failed after fallback efforts:", err);
    }
    
    if (mockKey && mockStore[mockKey]) {
      return Object.values(mockStore[mockKey]) as any as T;
    }
    return fallback;
  }
}

interface Faculty {
  id: string;
  uid: string;
  email: string;
  name: string;
  photo: string;
}

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

// Error wrapper for async routes to prevent uncaught exceptions in Express
const wrap = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("DEBUG - Route Error:", err);
    console.error("DEBUG - Stack:", err.stack);
    if (!res.headersSent) {
      const statusCode = err.status || (err.code === 5 ? 404 : 500);
      res.status(statusCode).json({ 
        error: "Internal Server Error", 
        details: err.message,
        code: err.code
      });
    }
  });
};

// Removed SQLite setupDb
async function setupDb() {
  console.log("Validating Firestore engine connectivity...");
  try {
    const db = getFdb();
    // Use listCollections as a more reliable check for existence vs health read
    await db.listCollections();
    console.log("Database connection verified.");
  } catch (err: any) {
    const currentDb = (fdb as any)?._databaseId?.database || '(default)';
    if (currentDb !== '(default)' && (err.code === 5 || err.code === 7 || err.code === 3)) {
      console.warn(`Initial connection to "${currentDb}" failed (Error ${err.code}). Attempting recovery to default database...`);
      initFdb(true);
      try {
        await fdb.listCollections();
        console.log("Recovery successful: Default database verified.");
      } catch (fallbackErr: any) {
        console.error("CRITICAL: Default database unreachable:", fallbackErr.message);
      }
    } else {
      console.warn("Firestore connectivity check warning:", err.message);
    }
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

app.get("/api/health", (req, res) => res.json({ status: "neural_link_established", timestamp: new Date().toISOString() }));

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
      const facultyData = await dbSafe(async (db) => {
        const ref = db.collection("faculty").doc(uid);
        const snap = await ref.get();
        return { snap, ref };
      }, null);

      let snap = facultyData?.snap;
      let ref = facultyData?.ref;
      
      let faculty: Faculty;
      if (!snap || !snap.exists) {
        faculty = { 
          id: uid, 
          uid, 
          email, 
          name: trimmedName, 
          photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedName)}` 
        };
        // Try to persist but don't block
        if (ref) {
          ref.set(faculty).catch((e: any) => console.error("Auto-registration persistence failed:", e.message));
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
  app.get("/api/me", authenticate, wrap((req: any, res: any) => res.json(req.user)));

  app.put("/api/faculty/profile", authenticate, wrap(async (req: any, res: any) => {
    const result = await dbRun(async (db) => {
      const facultyRef = db.collection("faculty").doc(req.user.id);
      await facultyRef.set({ name: req.body.name }, { merge: true });
      
      // Return a new token with updated name
      const updatedDoc = await facultyRef.get();
      const updated = updatedDoc.data() as Faculty;
      const token = jwt.sign({ id: updated?.id, email: updated?.email, name: updated?.name, photo: updated?.photo }, JWT_SECRET);
      return { token, user: updated };
    });
    res.json(result);
  }));

  app.get("/api/dashboard/stats", authenticate, wrap(async (req: any, res: any) => {
    try {
      const stats = await dbSafe(async (db) => {
        const facultyRef = db.collection("faculty").doc(req.user.id);
        const classesSnap = await facultyRef.collection("classes").get();
        const totalClasses = classesSnap.size;
        
        const subjectsSnap = await facultyRef.collection("subjects").get();
        const totalSubjects = subjectsSnap.size;

        const evaluationsSnap = await facultyRef.collection("evaluations")
          .orderBy("created_at", "desc")
          .limit(50)
          .get();
          
        const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const todayStr = new Date(new Date().setHours(0,0,0,0)).toISOString();
        const evaluationsToday = evaluations.filter(e => e.created_at >= todayStr).length;

        let totalPerformance = 0;
        evaluations.forEach(data => {
          if (data.total_marks > 0) {
            totalPerformance += (data.obtained_marks / data.total_marks);
          }
        });
        const avgPerformance = evaluations.length > 0 ? (totalPerformance / evaluations.length) * 100 : 0;

        // Fetch student names for recent activity
        const recentEvaluations = evaluations.slice(0, 5);
        const enrichedActivity = await Promise.all(recentEvaluations.map(async (e: any) => {
          const studentDoc = await facultyRef.collection("students").doc(e.student_id).get();
          const subjectDoc = await facultyRef.collection("subjects").doc(e.subject_id).get();
          return {
            ...e,
            student_name: studentDoc.exists ? studentDoc.data()?.name : "Unknown Student",
            subject_name: subjectDoc.exists ? subjectDoc.data()?.name : "Unknown Subject",
            roll_no: studentDoc.exists ? studentDoc.data()?.roll_no : "??"
          };
        }));

        return {
          classes: totalClasses,
          subjects: totalSubjects,
          evaluationsToday: evaluationsToday,
          performance: Math.round(avgPerformance),
          recentActivity: enrichedActivity
        };
      }, { classes: 0, subjects: 0, evaluationsToday: 0, performance: 0, recentActivity: [] });

      res.json(stats);
    } catch (err) {
      res.json({ classes: 0, subjects: 0, evaluationsToday: 0, performance: 0, recentActivity: [] });
    }
  }));

  // Classes & Subjects Management
  app.get("/api/classes", authenticate, wrap(async (req: any, res: any) => {
    const mockKey = `classes_${req.user.id}`;
    const classes = await dbSafe(async (db) => {
      const snap = await db.collection("faculty").doc(req.user.id).collection("classes").get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }, [], mockKey);
    res.json(classes);
  }));

  app.post("/api/classes", authenticate, wrap(async (req: any, res: any) => {
    const { name, semester, year, section } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const mockKey = `classes_${req.user.id}`;
    const tempId = `temp_${Date.now()}`;
    const newClass = { id: tempId, name, semester: semester || "", year: year || "", section: section || "", faculty_id: req.user.id, created_at: new Date().toISOString() };

    try {
      const result = await dbRun(async (db) => {
        const facultyRef = db.collection("faculty").doc(req.user.id);
        // Ensure parent doc exists
        await facultyRef.set({ id: req.user.id, updated_at: new Date().toISOString() }, { merge: true });
        
        const docRef = await facultyRef.collection("classes").add(newClass);
        return { ...newClass, id: docRef.id };
      });
      res.json(result);
    } catch (err: any) {
      console.error("Class creation failed (Firestore):", err);
      // Persist in session-only mock store
      const store = getMockCollection(mockKey);
      store[tempId] = newClass;
      res.status(201).json({ ...newClass, warning: "Stored locally for this session" });
    }
  }));

  app.get("/api/classes/:id/subjects", authenticate, wrap(async (req: any, res: any) => {
    const mockKey = `subjects_${req.params.id}`;
    const subjects = await dbSafe(async (db) => {
      const snap = await db.collection("faculty").doc(req.user.id).collection("subjects")
        .where("class_id", "==", req.params.id)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }, [], mockKey);
    res.json(subjects);
  }));

  app.post("/api/classes/:id/subjects", authenticate, wrap(async (req: any, res: any) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    
    const mockKey = `subjects_${req.params.id}`;
    const tempId = `temp_sub_${Date.now()}`;
    const newSub = { id: tempId, class_id: req.params.id, name, created_at: new Date().toISOString() };

    try {
      const result = await dbRun(async (db) => {
        const facultyRef = db.collection("faculty").doc(req.user.id);
        // Ensure parent doc exists
        await facultyRef.set({ id: req.user.id, last_sub_at: new Date().toISOString() }, { merge: true });
        
        const docRef = await facultyRef.collection("subjects").add(newSub);
        return { ...newSub, id: docRef.id };
      });
      res.json(result);
    } catch (err: any) {
      console.error("Subject creation failed (Firestore):", err);
      const store = getMockCollection(mockKey);
      store[tempId] = newSub;
      res.status(201).json({ ...newSub, warning: "Stored locally" });
    }
  }));

  app.post("/api/subjects/:id/materials", authenticate, upload.fields([
    { name: 'textbook', maxCount: 1 },
    { name: 'notes', maxCount: 1 }
  ]), wrap(async (req: any, res: any) => {
    const facultyId = req.user.id;
    const subjectId = req.params.id;
    const files = req.files as any;
    
    const updates: any = {};
    if (files.textbook) updates.textbook_url = files.textbook[0].originalname;
    if (files.notes) updates.notes_url = files.notes[0].originalname;
    
    try {
      await dbRun(async (db) => {
        await db.collection("faculty").doc(facultyId).collection("subjects").doc(subjectId).update(updates);
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Material upload failed (Firestore):", err.message);
      // Attempt to find which class this subject belongs to for the mock key
      // or just use a generic subjects mock key if it was created during POST
      // In our app, subjects mock key is subjects_${class_id}
      // Since we don't have class_id here easily without another query, 
      // we'll try to find it in all mock subject collections
      for (const key in mockStore) {
        if (key.startsWith('subjects_') && mockStore[key][subjectId]) {
          mockStore[key][subjectId] = { ...mockStore[key][subjectId], ...updates };
          break;
        }
      }
      res.json({ success: true, warning: "Offline sync active" });
    }
  }));

  app.get("/api/classes/:id/students", authenticate, wrap(async (req: any, res: any) => {
    const mockKey = `students_${req.params.id}`;
    const students = await dbSafe(async (db) => {
      const snap = await db.collection("faculty").doc(req.user.id).collection("students")
        .where("class_id", "==", req.params.id)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }, [], mockKey);
    res.json(students);
  }));

  app.post("/api/classes/:id/students", authenticate, wrap(async (req: any, res: any) => {
    const { roll_no, name } = req.body;
    const facultyId = req.user.id;
    const classId = req.params.id;
    const mockKey = `students_${classId}`;

    if (!roll_no) return res.status(400).json({ error: "Roll no is required" });
    
    const tempId = `temp_stu_${Date.now()}`;
    const newStudent = { id: tempId, class_id: classId, roll_no, name, created_at: new Date().toISOString() };

    try {
      const result = await dbRun(async (db) => {
        const facultyRef = db.collection("faculty").doc(facultyId);
        const existing = await facultyRef.collection("students")
          .where("class_id", "==", classId)
          .where("roll_no", "==", roll_no)
          .get();
        
        if (!existing.empty) {
          throw { code: 'ALREADY_EXISTS', message: "Student roll no already exists in this class" };
        }

        const docRef = await facultyRef.collection("students").add(newStudent);
        return { ...newStudent, id: docRef.id };
      });
      res.json(result);
    } catch (err: any) {
      if (err.code === 'ALREADY_EXISTS') return res.status(400).json({ error: err.message });
      console.error("Student registration failed (Firestore):", err.message);
      
      const store = getMockCollection(mockKey);
      store[tempId] = newStudent;
      res.status(201).json({ ...newStudent, warning: "Stored locally" });
    }
  }));

  app.get("/api/subjects/:id/rubrics", authenticate, wrap(async (req: any, res: any) => {
    const rubrics = await dbSafe(async (db) => {
      const snap = await db.collection("faculty").doc(req.user.id).collection("rubrics")
        .where("subject_id", "==", req.params.id)
        .get();
      return snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, criteria: data.criteria_json ? JSON.parse(data.criteria_json) : [] };
      });
    }, []);
    res.json(rubrics);
  }));

  app.post("/api/subjects/:id/rubrics", authenticate, wrap(async (req: any, res: any) => {
    const { name, type, criteria } = req.body;
    const result = await dbRun(async (db) => {
      const docRef = await db.collection("faculty").doc(req.user.id).collection("rubrics").add({
        subject_id: req.params.id,
        name,
        type: type || 'unit',
        criteria_json: JSON.stringify(criteria),
        faculty_id: req.user.id
      });
      return { id: docRef.id, name, type, criteria };
    });
    res.json(result);
  }));

  app.delete("/api/rubrics/:id", authenticate, wrap(async (req: any, res: any) => {
    await dbRun(async (db) => {
      await db.collection("faculty").doc(req.user.id).collection("rubrics").doc(req.params.id).delete();
    });
    res.json({ success: true });
  }));

  // Evaluation Core
  app.post("/api/evaluate", authenticate, upload.fields([
    { name: 'questionPaper', maxCount: 1 },
    { name: 'answerSheet', maxCount: 1 }
  ]), wrap(async (req: any, res: any) => {
    const { subjectId, studentId, useRubric, rubricContent } = req.body;
    const facultyId = req.user.id;
    const files = req.files as any;

    if (!files.questionPaper || !files.answerSheet) return res.status(400).json({ error: "Missing files" });

    const result = await dbRun(async (db) => {
      const facultyRefBase = db.collection("faculty").doc(facultyId);
      
      let subjectDocData: any;
      let studentDocData: any;

      try {
        const subjectDoc = await facultyRefBase.collection("subjects").doc(subjectId).get();
        const studentDoc = await facultyRefBase.collection("students").doc(studentId).get();

        if (subjectDoc.exists) subjectDocData = subjectDoc.data();
        if (studentDoc.exists) studentDocData = studentDoc.data();
      } catch (err) {
        console.warn("Firestore lookup failed during evaluation, checking mock store...");
      }

      // Check mock store if Firestore docs are missing
      if (!subjectDocData) {
        for (const key in mockStore) {
          if (key.startsWith('subjects_') && mockStore[key][subjectId]) {
            subjectDocData = mockStore[key][subjectId];
            break;
          }
        }
      }
      if (!studentDocData) {
        for (const key in mockStore) {
          if (key.startsWith('students_')) {
             if (mockStore[key][studentId]) {
               studentDocData = mockStore[key][studentId];
               break;
             }
             // Fallback: check values if keys are not the IDs
             const studentsInCollection = Object.values(mockStore[key]);
             const found = studentsInCollection.find((s: any) => s.id === studentId);
             if (found) {
               studentDocData = found;
               break;
             }
          }
        }
      }
      
      // Final validation
      if (!subjectDocData) {
        throw { code: 'NOT_FOUND', status: 404, message: "Subject node not found. Please sync." };
      }
      if (!studentDocData) {
        throw { code: 'NOT_FOUND', status: 404, message: "Student entity not found. Please record." };
      }

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
          { text: `CONTEXT: Evaluating for subject "${subjectDocData?.name || 'Unknown Subject'}". ${rubricInstruction}` },
          { inlineData: { mimeType: qpMime, data: files.questionPaper[0].buffer.toString('base64') } },
          { inlineData: { mimeType: asMime, data: files.answerSheet[0].buffer.toString('base64') } },
          { text: "Evaluate this answer sheet based on the provided question paper and rubric (if applicable). Provide high fidelity marks. Output in raw JSON format matching the schema." }
        ];

        const modelResult = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: { parts: parts },
          config: {
            systemInstruction: systemPrompt,
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
        
        const text = modelResult.text;

        if (!text) {
          throw new Error("AI failed to produce a response text stream.");
        }

        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const parsedResult = JSON.parse(jsonStr);
        
        const evalData = {
          student_id: studentId,
          subject_id: subjectId,
          total_marks: parsedResult.total || 100,
          obtained_marks: parsedResult.score || 0,
          result_json: JSON.stringify(parsedResult),
          created_at: new Date().toISOString()
        };

        try {
          const evalRef = await facultyRefBase.collection("evaluations").add(evalData);
          return { id: evalRef.id, ...parsedResult };
        } catch (dbErr) {
          console.warn("Could not save evaluation to Firestore, returning result anyway.");
          const mockKey = `evaluations_${facultyId}`;
          const store = getMockCollection(mockKey);
          const tempId = `temp_eval_${Date.now()}`;
          store[tempId] = evalData;
          return { id: tempId, ...parsedResult };
        }
      } catch (err: any) {
        console.error("AI Evaluation Error (Internal):", err);
        throw err;
      }
    });

    res.json(result);
  }));

  // Marksheet Export
  app.get("/api/marksheets/:subjectId", authenticate, wrap(async (req: any, res: any) => {
    const facultyId = req.user.id;
    const subjectId = req.params.subjectId;

    const data = await dbRun(async (db) => {
      const facultyRefBase = db.collection("faculty").doc(facultyId);
      const subjectDoc = await facultyRefBase.collection("subjects").doc(subjectId).get();
      if (!subjectDoc.exists) throw { code: 'PERMISSION_DENIED', status: 403, message: "Access denied" };
      const classId = subjectDoc.data()?.class_id;

      const studentsSnap = await facultyRefBase.collection("students")
        .where("class_id", "==", classId)
        .get();
      
      const evalsSnap = await facultyRefBase.collection("evaluations")
        .where("subject_id", "==", subjectId)
        .get();
      
      const evalsMap = new Map();
      evalsSnap.forEach(doc => {
        const evalData = doc.data();
        evalsMap.set(evalData.student_id, evalData);
      });

      return studentsSnap.docs.map(doc => {
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
    });

    res.json(data);
  }));

  app.delete("/api/evaluations/:studentId/:subjectId", authenticate, wrap(async (req: any, res: any) => {
    const facultyId = req.user.id;
    await dbRun(async (db) => {
      const snap = await db.collection("faculty").doc(facultyId).collection("evaluations")
        .where("student_id", "==", req.params.studentId)
        .where("subject_id", "==", req.params.subjectId)
        .get();
      
      const batch = db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    });
    
    res.json({ success: true });
  }));

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
