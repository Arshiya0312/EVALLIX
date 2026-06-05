export interface User {
  id: string;
  email: string;
  name: string;
  photo?: string;
  role: 'faculty';
}

export interface Class {
  id: string;
  name: string;
  semester: string;
  year: string;
  section: string;
  faculty_id: string;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
  textbook_url?: string;
  notes_url?: string;
}

export interface Student {
  id: string;
  class_id: string;
  roll_no: string;
  name?: string;
}

export interface Evaluation {
  id: string;
  student_id: string;
  subject_id: string;
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
