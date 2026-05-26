import React from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  ChevronRight,
  Printer,
  Table as TableIcon,
  BookOpen,
  BrainCircuit,
  TrendingUp,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Class, Subject } from '@/types';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function Marksheets() {
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<string>('');
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');
  const [data, setData] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<any>(null);

  const { token } = useAuth();

  React.useEffect(() => {
    fetch('/api/classes', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : [])
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, [token]);

  const handleClassChange = async (val: string) => {
    setSelectedClass(val);
    const res = await fetch(`/api/classes/${val}/subjects`, { headers: { 'Authorization': `Bearer ${token}` } });
    const subjectsData = await res.json();
    setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    setSelectedSubject('');
    setData([]);
  };

  const fetchMarksheet = async (subId: string) => {
    setSelectedSubject(subId);
    setLoading(true);
    try {
      const res = await fetch(`/api/marksheets/${subId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const markData = await res.json();
      setData(Array.isArray(markData) ? markData : []);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(stu => 
    stu.name?.toLowerCase().includes(search.toLowerCase()) || 
    stu.roll_no?.toLowerCase().includes(search.toLowerCase())
  );

  const exportTableToPDF = () => {
    if (data.length === 0) return;
    
    const doc = new jsPDF();
    const className = classes.find(c => c.id.toString() === selectedClass)?.name || '';
    const subjectName = subjects.find(s => s.id.toString() === selectedSubject)?.name || '';

    // Add Logo or Header
    doc.setFontSize(20);
    doc.setTextColor(230, 57, 57); // #E63939
    doc.text('Academic Marksheet Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Class: ${className} | Subject: ${subjectName}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);
    
    const tableData = filteredData.map(stu => [
      stu.roll_no,
      stu.name,
      stu.obtained_marks ?? '--',
      stu.total_marks ?? '--',
      stu.obtained_marks !== null ? `${Math.round((stu.obtained_marks / stu.total_marks) * 100)}%` : '--',
      stu.created_at ? new Date(stu.created_at).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Roll No', 'Student Name', 'Marks', 'Total', 'Percentage', 'Date']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [230, 57, 57], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [255, 245, 245] }
    });

    doc.save(`Marksheet_${className}_${subjectName}.pdf`);
    toast.success("Marksheet PDF exported successfully");
  };

  const downloadReportPDF = async () => {
    const element = document.getElementById('report-content-dialog');
    if (!element) return;
    
    toast.loading("Compiling neural archive...");
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const frame = clonedDoc.getElementById('report-content-dialog');
          if (frame) {
            frame.style.height = 'auto';
            frame.style.overflow = 'visible';
            const viewports = frame.querySelectorAll('[data-radix-scroll-area-viewport]');
            viewports.forEach(vp => {
              (vp as HTMLElement).style.height = 'auto';
              (vp as HTMLElement).style.overflow = 'visible';
              (vp as HTMLElement).style.display = 'block';
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const imgProps = (new jsPDF()).getImageProperties(imgData);
      const pdfWidth = 210; // A4 standard width in mm
      const scaledImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, scaledImgHeight]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledImgHeight);
      
      pdf.save(`Evaluation_Report_${selectedReport?.student?.roll_no}.pdf`);
      toast.dismiss();
      toast.success("Identity profile archive exported.");
    } catch (e) {
      toast.dismiss();
      toast.error("Export failed. Memory overload.");
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(d => ({
      'Roll No': d.roll_no,
      'Name': d.name,
      'Obtained Marks': d.obtained_marks ?? 'N/A',
      'Total Marks': d.total_marks ?? 'N/A',
      'Evaluation Date': d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marksheet");
    XLSX.writeFile(wb, `Marksheet_${selectedSubject}.xlsx`);
    toast.success("Spreadsheet export successful");
  };

  const handleViewDetails = (stu: any) => {
    if (!stu.result_json) {
      toast.error("No evaluation data found for this entry.");
      return;
    }
    try {
      const report = JSON.parse(stu.result_json);
      setSelectedReport({ ...report, student: stu });
    } catch (e) {
      toast.error("Neural data corruption detected.");
    }
  };

  const handleDeleteReport = async (stu: any) => {
    if (!confirm(`Are you sure you want to delete the evaluation for ${stu.name}?`)) return;
    
    try {
      const res = await fetch(`/api/evaluations/${stu.student_db_id}/${selectedSubject}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Registry entry purged.");
        fetchMarksheet(selectedSubject);
      } else {
        toast.error("Failed to delete record.");
      }
    } catch (e) {
      toast.error("Deletion failed.");
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-2">
        <div>
          <h1 className="text-5xl font-black tracking-tighter mb-2 text-slate-800">Academic <span className="text-[#E63939]">Reports</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Mark Registry & Performance Analytics</p>
        </div>

        <div className="flex items-center gap-4">
           {data.length > 0 && (
             <Button variant="outline" onClick={exportToExcel} className="h-16 px-10 rounded-[1.5rem] border-emerald-500/20 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white font-black uppercase tracking-[0.2em] text-[10px] gap-3 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all">
               <FileSpreadsheet size={18} /> Export Excel
             </Button>
           )}
           <Button 
             variant="outline" 
             onClick={exportTableToPDF}
             disabled={filteredData.length === 0}
             className="h-16 w-16 rounded-[1.5rem] p-0 border-red-100 bg-red-50 text-[#E63939] hover:bg-[#E63939] hover:text-white transition-all shadow-lg shadow-red-500/5 disabled:opacity-50"
           >
              <Printer size={20} />
           </Button>
        </div>
      </div>

      <Card className="glass-card border-none shadow-2xl p-10 rounded-[3.5rem] overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch gap-8 mb-16 px-2">
          <div className="flex-1 space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 pl-1">Target Node (Class)</label>
            <Select onValueChange={handleClassChange}>
              <SelectTrigger className="h-16 rounded-[1.5rem] border-red-100 font-bold bg-white focus:ring-[#E63939]/20 shadow-sm">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 pl-1">Analysis Focus (Subject)</label>
            <Select onValueChange={fetchMarksheet} disabled={!selectedClass}>
              <SelectTrigger className="h-16 rounded-[1.5rem] border-red-100 font-bold bg-white disabled:opacity-40 shadow-sm">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 pl-1">Search Identifier</label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-red-400" size={20} />
              <Input 
                placeholder="Roll No or Name..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-16 pl-14 rounded-[1.5rem] border-red-100 bg-white shadow-sm focus-visible:ring-red-500/20" 
              />
            </div>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-red-50 overflow-hidden shadow-inner bg-red-50/10">
          <Table>
            <TableHeader className="bg-red-50/50">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="py-8 px-10 font-black uppercase tracking-[0.2em] text-[10px] text-slate-800">Student Entity</TableHead>
                <TableHead className="py-8 px-10 font-black uppercase tracking-[0.2em] text-[10px] text-slate-800">Status</TableHead>
                <TableHead className="py-8 px-10 font-black uppercase tracking-[0.2em] text-[10px] text-slate-800 text-center">Score Profile</TableHead>
                <TableHead className="py-8 px-10 font-black uppercase tracking-[0.2em] text-[10px] text-slate-800">Synthesis Date</TableHead>
                <TableHead className="py-8 px-10 font-black uppercase tracking-[0.2em] text-[10px] text-slate-800 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((stu, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className="border-red-50 hover:bg-red-500/[0.02] transition-colors"
                >
                  <TableCell className="px-10 py-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-[#E63939] font-black text-xs shadow-inner">
                          {stu.roll_no}
                       </div>
                       <div className="flex flex-col">
                         <span className="font-black text-xl tracking-tight text-slate-800">{stu.name || 'Anonymous Entity'}</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Identity Confirmed</span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-10 py-8">
                    {stu.obtained_marks !== null ? (
                      <Badge className="bg-emerald-50 px-4 py-2 text-emerald-600 border-emerald-100 font-black uppercase tracking-[0.2em] text-[10px] rounded-full">Evaluation Complete</Badge>
                    ) : (
                      <Badge className="bg-red-50 px-4 py-2 text-red-400 border-red-50 font-black uppercase tracking-[0.2em] text-[10px] rounded-full">Registry Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-10 py-8 text-center">
                    {stu.obtained_marks !== null ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-slate-800">{stu.obtained_marks}</span>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">/ {stu.total_marks}</span>
                        </div>
                        <div className="w-24 h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                           <div className={`h-full ${stu.obtained_marks / stu.total_marks > 0.7 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${(stu.obtained_marks / stu.total_marks) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-200 font-black text-2xl">--</span>
                    )}
                  </TableCell>
                  <TableCell className="px-10 py-8 font-black text-slate-500 uppercase tracking-widest text-[9px]">
                    {stu.created_at ? new Date(stu.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </TableCell>
                  <TableCell className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-2">
                      {stu.obtained_marks !== null && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteReport(stu)}
                          className="h-12 w-12 rounded-xl text-slate-300 hover:bg-red-100 hover:text-red-500 transition-all active:scale-90"
                        >
                           <Trash2 size={20} />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleViewDetails(stu)}
                        className="h-12 w-12 rounded-xl text-slate-300 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                      >
                         <ChevronRight size={24} />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
              {filteredData.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-6 text-slate-300">
                      <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center animate-float">
                        <TableIcon size={48} className="text-red-200" />
                      </div>
                      <p className="font-black uppercase tracking-[0.5em] text-xs">
                        {data.length === 0 ? "System awaiting registry selection..." : "No matches found in neural logs"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[3rem] border-none shadow-3xl bg-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Evaluation Report for {selectedReport?.student?.name}</DialogTitle>
          </DialogHeader>
          <div className="absolute top-6 right-16 z-20">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={downloadReportPDF}
               className="h-10 rounded-xl gap-2 font-bold text-slate-600 border-slate-200 bg-white/50 backdrop-blur-md shadow-sm"
             >
                <Download size={14} /> Export PDF
             </Button>
          </div>
          <ScrollArea className="h-[80vh]">
            {selectedReport && (
              <div id="report-content-dialog" className="p-12 space-y-12 bg-white">
                <div className="flex justify-between items-start border-b border-slate-50 pb-12">
                   <div className="space-y-4 text-left">
                      <Badge className="bg-primary text-white border-none uppercase font-black tracking-[0.5em] text-[8px] py-1.5 px-4 rounded-full">Retrieved Evaluation Node</Badge>
                      <h2 className="text-6xl font-black tracking-tighter text-slate-800 leading-[0.9]">
                        {selectedReport.student.name}
                      </h2>
                      <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                        <span>Roll: {selectedReport.student.roll_no}</span>
                        <span>Date: {new Date(selectedReport.student.created_at).toLocaleDateString()}</span>
                      </div>
                   </div>
                   <div className="text-center p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 min-w-[140px]">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2">Neural Score</p>
                      <div className="text-6xl font-black tracking-tighter text-primary">{selectedReport.score}</div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mt-1">/ {selectedReport.total}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8 text-left">
                      <div className="p-10 rounded-[3rem] bg-primary/[0.03] border border-primary/5">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-8 flex items-center gap-3">
                            <BrainCircuit size={18} /> Evaluation Synthesis
                         </h3>
                         <p className="text-xl font-bold text-slate-700 leading-relaxed italic">"{selectedReport.feedback}"</p>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                         <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-6 flex items-center gap-2">
                               <TrendingUp size={16} /> Cognitive Strengths
                            </h4>
                            <ul className="space-y-4 text-left">
                               {selectedReport.summary.strengths.map((s: string, i: number) => (
                                 <li key={i} className="flex items-start gap-4 text-sm font-bold text-slate-600 leading-tight">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                    {s}
                                 </li>
                               ))}
                            </ul>
                         </div>
                         <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-600 mb-6 flex items-center gap-2">
                               <AlertCircle size={16} /> Critical Gaps
                            </h4>
                            <ul className="space-y-4 text-left">
                               {selectedReport.summary.weaknesses.map((w: string, i: number) => (
                                 <li key={i} className="flex items-start gap-4 text-sm font-bold text-slate-600 leading-tight">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    {w}
                                 </li>
                               ))}
                            </ul>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8 text-left">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Forensic Question Matrix</h3>
                      <div className="space-y-4">
                        {selectedReport.questions.map((q: any, i: number) => (
                          <div key={i} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                             <div className="flex justify-between items-center">
                               <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-primary border border-slate-100 shadow-sm">{q.q_no}</span>
                               <div className="font-black text-slate-800 flex items-baseline gap-1">
                                  <span className="text-xl">{q.obtained_marks}</span>
                                  <span className="text-[10px] opacity-30">/ {q.max_marks}</span>
                               </div>
                             </div>
                             <p className="text-xs font-bold text-slate-600 italic">"{q.comment}"</p>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
