export interface Student {
  roll_no: string;
  name: string;
  evaluation_status: 'pending' | 'completed' | 'failed' | null;
  result?: EvaluationResult | null;
}

export interface EvaluationResult {
  totalMarksObtained: number;
  maxPossibleMarks: number;
  overallGrade: string;
  detailedAnalysis: string;
  recommendations: string[];
  sections: {
    name: string;
    marks: number;
    feedback: string;
  }[];
}

export interface Subject {
  id: string;
  name: string;
  semester?: string;
  academic_year?: string;
  textbook_url?: string;
  notes_url?: string;
}
