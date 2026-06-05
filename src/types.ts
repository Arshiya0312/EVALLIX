export interface Faculty {
  id: string;
  email: string;
  name: string;
  photo?: string;
}

export interface Class {
  id: string;
  name: string;
  semester: string;
  year: string;
  section: string;
}

export interface Student {
  id: string;
  roll_no: string;
  name: string;
}

export interface QuestionResult {
  q_no: string;
  max_marks: number;
  obtained_marks: number;
  comment: string;
}

export interface EvaluationResult {
  score: number;
  total: number;
  feedback: string;
  questions: QuestionResult[];
  summary: {
    strengths: string[];
    weaknesses: string[];
  };
}

export interface Subject {
  id: string;
  name: string;
  textbook_url?: string;
  notes_url?: string;
}

export interface Criterion {
  name: string;
  description: string;
  marks: number;
}

export interface QuestionNode {
  maxMarks: number;
  criteria: Criterion[];
}

export interface UnitRubric {
  id?: string;
  subject_id: string;
  name: string;
  type: 'unit' | 'question';
  criteria: Criterion[] | { [question_id: string]: QuestionNode };
}
