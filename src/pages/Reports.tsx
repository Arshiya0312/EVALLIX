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
  Trash2,
  BarChart3,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
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
  DialogDescription,
  DialogFooter
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
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const { token } = useAuth();

  const getClassName = (id: string) => classes.find(c => String(c.id) === id)?.name || "Select Class";
  const getSubjectName = (id: string) => subjects.find(s => String(s.id) === id)?.name || "Select Subject";

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
      stu.obtained_marks !== null ? `${stu.total_marks > 0 ? Math.round((stu.obtained_marks / stu.total_marks) * 100) : 0}%` : '--',
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
    
    toast.loading("Optimizing neural archive for A4 printing...");
    
    try {
      // Precision A4 settings
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 1000, // Fixed width for consistent scaling
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const frame = clonedDoc.getElementById('report-content-dialog');
          if (frame) {
            frame.style.width = '210mm'; // Force A4 width
            frame.style.padding = '15mm';
            frame.style.height = 'auto';
            frame.style.overflow = 'visible';
            
            // Apply print-specific structural adjustments
            const viewports = frame.querySelectorAll('[data-radix-scroll-area-viewport]');
            viewports.forEach(vp => {
              (vp as HTMLElement).style.height = 'auto';
              (vp as HTMLElement).style.overflow = 'visible';
              (vp as HTMLElement).style.display = 'block';
            });

            // Ensure charts don't break strangely
            const charts = frame.querySelectorAll('.recharts-responsive-container');
            charts.forEach(chart => {
              (chart as HTMLElement).style.pageBreakInside = 'avoid';
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Multi-page handling
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Evaluation_Report_${selectedReport?.student?.roll_no}.pdf`);
      toast.dismiss();
      toast.success("Identity profile archive exported.");
    } catch (e) {
      console.error("PDF Export Error:", e);
      toast.dismiss();
      toast.error("Export failed. Memory overload.");
    }
  };

  const previewReportPDF = async () => {
    const element = document.getElementById('report-content-dialog');
    if (!element) return;
    
    toast.loading("Generating forensic preview...");
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 1000,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const frame = clonedDoc.getElementById('report-content-dialog');
          if (frame) {
            frame.style.width = '1000px';
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
      const pdfWidth = 210;
      const scaledImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, scaledImgHeight]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledImgHeight);
      
      const blob = pdf.output('blob');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blobURL = URL.createObjectURL(blob);
      setPreviewUrl(blobURL);
      setIsPreviewOpen(true);
      toast.dismiss();
    } catch (e) {
      console.error("Preview Error:", e);
      toast.dismiss();
      toast.error("Forensic synthesis failed. Attempting direct export...");
      downloadReportPDF();
    }
  };

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const getAnalyticsData = () => {
    if (!data || data.length === 0) return { distribution: [], grades: [], stats: { avg: 0, max: 0, min: 0, total: 100 } };
    
    const validMarks = data.filter(d => d.obtained_marks !== null).map(d => d.obtained_marks);
    if (validMarks.length === 0) return { distribution: [], grades: [], stats: { avg: 0, max: 0, min: 0, total: 100 } };

    const totalMarks = data[0].total_marks || 100;
    const stats = {
      avg: Math.round(validMarks.reduce((a, b) => a + b, 0) / validMarks.length),
      max: Math.max(...validMarks),
      min: Math.min(...validMarks),
      total: totalMarks
    };

    // Distribution
    const bins = [
      { name: '0-20%', count: 0, fill: '#E11D48' },
      { name: '21-40%', count: 0, fill: '#F43F5E' },
      { name: '41-60%', count: 0, fill: '#FB7185' },
      { name: '61-80%', count: 0, fill: '#FDA4AF' },
      { name: '81-100%', count: 0, fill: '#10B981' },
    ];

    const grades = [
      { name: 'Distinction (75%+)', value: 0, fill: '#10B981' },
      { name: 'First Class (60-74%)', value: 0, fill: '#3B82F6' },
      { name: 'Second Class (45-59%)', value: 0, fill: '#F59E0B' },
      { name: 'Pass (35-44%)', value: 0, fill: '#A855F7' },
      { name: 'Critique Needed (<35%)', value: 0, fill: '#E11D48' },
    ];

    validMarks.forEach(m => {
      const p = totalMarks > 0 ? (m / totalMarks) * 100 : 0;
      if (p <= 20) bins[0].count++;
      else if (p <= 40) bins[1].count++;
      else if (p <= 60) bins[2].count++;
      else if (p <= 80) bins[3].count++;
      else bins[4].count++;

      if (p >= 75) grades[0].value++;
      else if (p >= 60) grades[1].value++;
      else if (p >= 45) grades[2].value++;
      else if (p >= 35) grades[3].value++;
      else grades[4].value++;
    });

    return { distribution: bins, grades: grades.filter(g => g.value > 0), stats };
  };

  const analytics = getAnalyticsData();

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

      {selectedSubject && data.length > 0 && (
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <Card className="lg:col-span-2 glass-card border-none shadow-2xl p-10 rounded-[3rem] bg-white/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-800">Performance Distribution</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Class-wide cognitive spread</p>
                </div>
                <div className="flex gap-4">
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class Average</p>
                      <p className="text-2xl font-black text-primary">{Math.round(analytics.stats.avg)} <span className="text-xs opacity-30">/ {analytics.stats.total}</span></p>
                   </div>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.distribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }} 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      labelStyle={{ fontWeight: 900, fontSize: '12px', marginBottom: '4px' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
                      {analytics.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="glass-card border-none shadow-2xl p-10 rounded-[3rem] bg-white/80 backdrop-blur-xl flex flex-col justify-between">
              <div className="space-y-2 mb-8">
                <h3 className="text-2xl font-black tracking-tight text-slate-800">Neural Benchmarks</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key performance indicators</p>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Top Score</p>
                      <p className="text-2xl font-black text-slate-800">{analytics.stats.max}</p>
                    </div>
                  </div>
                  <div className="h-2 w-16 bg-emerald-200 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Lowest Score</p>
                      <p className="text-2xl font-black text-slate-800">{analytics.stats.min}</p>
                    </div>
                  </div>
                  <div className="h-2 w-16 bg-blue-200 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500" style={{ width: `${(analytics.stats.min / analytics.stats.max) * 100}%` }} />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                      <BrainCircuit size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Participation</p>
                      <p className="text-2xl font-black text-slate-800">{data.filter(d => d.obtained_marks !== null).length}<span className="text-xs opacity-30 font-bold ml-1">/ {data.length}</span></p>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] gap-3 shadow-xl shadow-slate-900/10 mt-8">
                Neural Insight Deep Dive
              </Button>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 gap-8"
          >
            <Card className="glass-card border-none shadow-2xl p-10 rounded-[3rem] bg-white/80 backdrop-blur-xl">
               <div className="mb-10">
                 <h3 className="text-2xl font-black tracking-tight text-slate-800">Entity Proficiency Matrix</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Granular comparative analysis of individual student performance</p>
               </div>
               
               <div className="h-[400px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data.filter(d => d.obtained_marks !== null).map(d => ({ name: d.name, score: d.obtained_marks, roll: d.roll_no }))}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                       interval={0}
                       angle={-45}
                       textAnchor="end"
                       height={80}
                     />
                     <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                     />
                     <Tooltip 
                       contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                       labelFormatter={(value) => `Entity: ${value}`}
                     />
                     <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                       {data.filter(d => d.obtained_marks !== null).map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.obtained_marks / (data[0]?.total_marks || 100) > 0.75 ? '#10B981' : entry.obtained_marks / (data[0]?.total_marks || 100) > 0.4 ? '#3B82F6' : '#E63939'} fillOpacity={0.8} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 gap-8"
          >
            <Card className="glass-card border-none shadow-2xl p-10 rounded-[3rem] bg-white/80 backdrop-blur-xl">
               <div className="flex flex-col md:flex-row gap-12 items-center">
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-slate-800">Grade Archetypes</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Categorical classification of neural scores</p>
                    </div>
                    <div className="space-y-4">
                       {analytics.grades.map((g, i) => (
                         <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                            <div className="flex items-center gap-4">
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.fill }} />
                               <span className="text-sm font-bold text-slate-700">{g.name}</span>
                            </div>
                            <span className="text-sm font-black text-slate-900">{Math.round((g.value / data.filter(d => d.obtained_marks !== null).length) * 100)}%</span>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="w-full md:w-[400px] h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.grades}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analytics.grades.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </Card>
          </motion.div>
        </div>
      )}

      <Card className="glass-card border-none shadow-2xl p-10 rounded-[3.5rem] overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch gap-8 mb-16 px-2">
          <div className="flex-1 space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 pl-1">Target Node (Class)</label>
            <Select value={selectedClass} onValueChange={handleClassChange}>
              <SelectTrigger className="h-16 rounded-[1.5rem] border-red-100 font-bold bg-white focus:ring-[#E63939]/20 shadow-sm px-6">
                 <Layers className="text-red-300 mr-3" size={18} />
                 <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 pl-1">Analysis Focus (Subject)</label>
            <Select value={selectedSubject} onValueChange={fetchMarksheet} disabled={!selectedClass}>
              <SelectTrigger className="h-16 rounded-[1.5rem] border-red-100 font-bold bg-white disabled:opacity-40 shadow-sm px-6">
                 <BookOpen className="text-red-300 mr-3" size={18} />
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
                           <div className={`h-full ${stu.total_marks > 0 && stu.obtained_marks / stu.total_marks > 0.7 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${stu.total_marks > 0 ? (stu.obtained_marks / stu.total_marks) * 100 : 0}%` }} />
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
          <div className="absolute top-6 right-16 z-20 flex gap-2">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={previewReportPDF}
               className="h-10 rounded-xl gap-2 font-bold text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 shadow-sm"
             >
                <Search size={14} /> Full Preview
             </Button>
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
              <div id="report-content-dialog" className="p-12 space-y-12 bg-white print:p-0">
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    @page { 
                      size: A4; 
                      margin: 15mm; 
                    }
                    body { 
                      background: white; 
                    }
                    #report-content-dialog {
                      width: 210mm !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-shadow: none !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                    .page-break-avoid {
                      page-break-inside: avoid;
                      break-inside: avoid;
                    }
                    .page-break-after {
                      page-break-after: always;
                      break-after: page;
                    }
                  }
                `}} />
                
                <div className="flex justify-between items-start border-b border-slate-50 pb-12 page-break-avoid">
                   <div className="space-y-4 text-left">
                      <Badge className="bg-primary text-white border-none uppercase font-black tracking-[0.5em] text-[8px] py-1.5 px-4 rounded-full">Retrieved Evaluation Node</Badge>
                      <h2 className="text-6xl font-black tracking-tight text-slate-800 leading-tight">
                        {selectedReport.student.name}
                      </h2>
                      <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                        <span>Roll: {selectedReport.student.roll_no}</span>
                        <span>Date: {selectedReport.student.created_at ? new Date(selectedReport.student.created_at).toLocaleDateString() : 'N/A'}</span>
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
                      <div className="p-10 rounded-[3rem] bg-primary/[0.03] border border-primary/5 page-break-avoid">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-8 flex items-center gap-3">
                            <BrainCircuit size={18} /> Evaluation Synthesis
                         </h3>
                         <p className="text-xl font-bold text-slate-700 leading-relaxed italic">"{selectedReport.feedback}"</p>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                         <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 page-break-avoid">
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
                         <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 page-break-avoid">
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
                          <div key={i} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 flex flex-col gap-4 page-break-avoid">
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden bg-slate-900 border-none rounded-[3rem] shadow-4xl flex flex-col z-[100]">
          <DialogHeader className="p-8 border-b border-white/5 bg-slate-900 text-white shrink-0">
            <div className="flex justify-between items-center w-full">
              <div>
                <DialogTitle className="text-2xl font-black">Report Archive Preview</DialogTitle>
                <DialogDescription className="text-xs text-white/40 uppercase tracking-widest mt-1">High-fidelity PDF document stream</DialogDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadReportPDF}
                className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 gap-2"
              >
                <Download size={14} /> Download Archive
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 w-full bg-slate-800 flex items-center justify-center relative">
             {previewUrl ? (
               <iframe 
                 src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                 className="absolute inset-0 w-full h-full border-none bg-white" 
                 title="PDF Archive" 
               />
             ) : (
                <div className="text-white/20 flex flex-col items-center gap-4">
                  <AlertCircle size={80} />
                  <p className="font-black uppercase tracking-widest">No Buffer Stream Detected</p>
                </div>
             )}
          </div>
          <div className="p-6 bg-slate-900 border-t border-white/5 flex justify-end shrink-0">
             <Button onClick={() => setIsPreviewOpen(false)} className="rounded-xl px-10 font-bold bg-white text-slate-900 hover:bg-slate-200">
               Terminate Preview
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
