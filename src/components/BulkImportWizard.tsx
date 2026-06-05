import React from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Info,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BulkImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  onImportSuccess: () => void;
  token: string | null;
}

interface UploadedStudent {
  roll_no: string;
  name: string;
  status: 'pending' | 'valid' | 'error' | 'duplicate';
  error?: string;
}

export default function BulkImportWizard({ isOpen, onClose, classId, onImportSuccess, token }: BulkImportWizardProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [data, setData] = React.useState<UploadedStudent[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedData: UploadedStudent[] = json.map((row: any) => {
          // Flexible column mapping
          const roll_no = row['Roll Number'] || row['roll_no'] || row['Roll No'] || row['ID'] || row['roll'];
          const name = row['Name'] || row['Student Name'] || row['name'] || row['Full Name'];

          let status: 'valid' | 'error' = 'valid';
          let error = '';

          if (!roll_no) {
            status = 'error';
            error = 'Missing Roll Number';
          }

          return {
            roll_no: roll_no?.toString() || '',
            name: name?.toString() || '',
            status,
            error
          };
        });

        // Check for duplicates within the file
        const seen = new Set();
        const withDups = formattedData.map(s => {
          if (s.status === 'error') return s;
          if (seen.has(s.roll_no)) {
             return { ...s, status: 'duplicate' as const, error: 'Duplicate in file' };
          }
          seen.add(s.roll_no);
          return s;
        });

        setData(withDups);
      } catch (err) {
        toast.error("Failed to parse identity matrix.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    const validStudents = data.filter(s => s.status === 'valid');
    if (validStudents.length === 0) {
      toast.error("No valid entities found for ingestion.");
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/students/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ students: validStudents })
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Ingestion successful: ${result.imported} students added.`);
        onImportSuccess();
        onClose();
        reset();
      } else {
        toast.error("Bulk ingestion protocol failed.");
      }
    } catch (err) {
      toast.error("Neural link interrupted during bulk transfer.");
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setData([]);
    setIsLoading(false);
    setIsImporting(false);
  };

  const errorCount = data.filter(s => s.status === 'error' || s.status === 'duplicate').length;
  const validCount = data.filter(s => s.status === 'valid').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[3rem] border-none shadow-3xl bg-white">
        <DialogHeader className="p-10 pb-0 shrink-0">
          <div className="flex items-center gap-6 mb-4">
             <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl">
                <FileSpreadsheet size={32} />
             </div>
             <div>
                <DialogTitle className="text-3xl font-black tracking-tight text-slate-800">Bulk Roster Import</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Ingest multiple student identities into the neural registry</DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="p-10 pt-6">
          {!file ? (
            <div 
              onClick={() => document.getElementById('bulk-import-input')?.click()}
              className="group border-2 border-dashed border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/30 rounded-[2.5rem] p-20 flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <input 
                id="bulk-import-input" 
                type="file" 
                hidden 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileChange} 
              />
              <div className="w-20 h-20 bg-slate-50 group-hover:bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-all mb-6">
                <Upload size={40} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Upload Identity Manifest</h4>
              <p className="text-xs text-slate-500 font-medium">Excel (.xlsx) or CSV format supported</p>
              
              <div className="mt-10 flex gap-10">
                 <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-2">Requirement 1</span>
                    <Badge variant="outline" className="rounded-lg font-bold border-slate-100 px-3 py-1">Roll Number</Badge>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-2">Requirement 2</span>
                    <Badge variant="outline" className="rounded-lg font-bold border-slate-100 px-3 py-1">Student Name</Badge>
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500">
                       <FileSpreadsheet size={20} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-800">{file.name}</p>
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{(file.size / 1024).toFixed(1)} KB • Ingestion Ready</p>
                    </div>
                 </div>
                 <Button variant="ghost" onClick={reset} className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50">
                    <X size={20} />
                 </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-500 shadow-sm">
                       <CheckCircle2 size={18} />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Valid Entities</p>
                       <p className="text-xl font-black text-emerald-950">{validCount}</p>
                    </div>
                 </div>
                 <div className={`p-4 ${errorCount > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'} rounded-2xl flex items-center gap-4 transition-colors`}>
                    <div className={`w-8 h-8 bg-white rounded-lg flex items-center justify-center ${errorCount > 0 ? 'text-red-500' : 'text-slate-300'} shadow-sm`}>
                       <AlertCircle size={18} />
                    </div>
                    <div>
                       <p className={`text-[9px] font-black ${errorCount > 0 ? 'text-red-600' : 'text-slate-400'} uppercase tracking-widest leading-none mb-1`}>Critical Errors</p>
                       <p className="text-xl font-black text-slate-900">{errorCount}</p>
                    </div>
                 </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 overflow-hidden bg-slate-50/30">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Roll No</TableHead>
                        <TableHead className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Full Nomenclature</TableHead>
                        <TableHead className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Sanity Check</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((stu, i) => (
                        <TableRow key={i} className="border-slate-50 hover:bg-white transition-colors">
                          <TableCell className="px-6 py-4 font-black text-slate-600 text-xs">{stu.roll_no}</TableCell>
                          <TableCell className="px-6 py-4 font-bold text-slate-800 text-sm">{stu.name}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                             {stu.status === 'valid' ? (
                               <Badge className="bg-emerald-50 text-emerald-600 border-none uppercase font-black tracking-widest text-[8px] px-2 py-0.5">Ready</Badge>
                             ) : stu.status === 'duplicate' ? (
                               <Badge className="bg-amber-50 text-amber-600 border-none uppercase font-black tracking-widest text-[8px] px-2 py-0.5">Duplicate</Badge>
                             ) : (
                               <Badge className="bg-red-50 text-red-500 border-none uppercase font-black tracking-widest text-[8px] px-2 py-0.5">Error</Badge>
                             )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
                 <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
                 <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                   Only entities with <span className="text-emerald-600 font-bold">"Ready"</span> status will be ingested during the synchronization phase. Existing roll numbers in this class will be automatically filtered to prevent redundancy.
                 </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-10 pt-0">
          <div className="flex w-full gap-4">
             <Button 
               variant="ghost" 
               onClick={onClose} 
               className="h-14 flex-1 rounded-2xl font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100"
             >
               Cancel Phase
             </Button>
             <Button 
               onClick={handleImport}
               disabled={!file || validCount === 0 || isImporting}
               className="h-14 flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-500/20 disabled:opacity-30 gap-2"
             >
               {isImporting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
               {isImporting ? "Synching..." : "Finalize Ingestion"}
             </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
