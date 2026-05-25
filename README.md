# SmartEval AI: Intelligent Exam Evaluator

SmartEval AI is a high-end, production-ready web application designed to automate the evaluation of exam answer sheets using the Google Gemini 1.5 Pro multimodal engine. 

## 🚀 Key Features
- **Multimodal Evaluation**: Support for both digital PDFs and handwritten answer sheet images.
- **Academic Grounding**: Evaluates answers strictly based on provided Textbooks and Lecture Notes.
- **Vision Analysis**: AI-powered diagram checking and handwriting recognition.
- **Detailed Analytics**: Precise marking, partial credit logic, and diagnostic feedback for students.
- **JWT Security**: Professional-grade authentication for faculty access.
- **PDF Export**: Generate high-fidelity evaluation reports instantly.

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion.
- **Backend**: Node.js (Express), SQLite (better-sqlite3), JWT, Multer.
- **AI**: Google Gemini 1.5 Pro (via @google/genai SDK).

---

## ⚡ Quick Start (Under 5 Minutes)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### 2. Setup
1. **Clone/Download** the project files.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   - Copy `.env.example` to `.env`
   - Paste your `GEMINI_API_KEY` into the `.env` file.

### 3. Run the Application
Start the unified development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

---

## 📂 Project Structure
- `src/`: React frontend source code. (Components, UI, Logic)
- `server.ts`: Express backend entry point. (API, Auth, AI Processing)
- `public/`: Static assets and uploaded materials (processed into database).
- `metadata.json`: Application identity and permissions.

## 🧠 AI Prompting Strategy
SmartEval uses a **Semantic Grounding Pattern**. The system prompt forces the Gemini model to:
1. Load "Source of Truth" from local materials first.
2. Cross-reference question weightage from the Question Paper.
3. Apply a specialized JSON schema for consistent, deterministic outputs.

---

## 📜 License
SPDX-License-Identifier: Apache-2.0
Designed for Modern Academic Institutions.
