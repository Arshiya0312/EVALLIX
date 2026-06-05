export interface User {
  id: number;
  email: string;
  name: string;
  photo?: string;
  role: 'faculty';
}

export interface Class {
  id: number;
  name: string;
  semester: string;
  year: string;
  section: string;
  faculty_id: number;
}

export interface Subject {
  id: number;
  class_id: number;
  name: string;
  textbook_url?: string;
  notes_url?: string;
}

export interface Student {
  id: number;
  class_id: number;
  roll_no: string;
  name?: string;
}

export interface Evaluation {
  id: number;
  student_id: number;
  subject_id: number;
  question_paper_url: string;
  answer_sheet_url: string;
  total_marks: number;
  obtained_marks: number;
  result_json: string;
  created_at: string;
}

export interface EvaluationResult {
  score: number;
  total: number;
  feedback: string;
  questions: {
    q_no: string | number;
    max_marks: number;
    obtained_marks: number;
    comment: string;
  }[];
  summary: {
    strengths: string[];
    weaknesses: string[];
  };
}
