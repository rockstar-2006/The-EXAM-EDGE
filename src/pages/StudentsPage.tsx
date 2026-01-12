import { useState, useEffect, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle2, Plus, Edit, Trash2, Users, BarChart, Filter, UserPlus, FileSpreadsheet, Sparkles, ChevronRight, Activity, Database, Terminal, FolderEdit, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StudentTable } from '@/components/StudentTable';
import { StudentForm } from '@/components/StudentForm';
import { parseExcelFile, generateSampleExcel } from '@/services/excelService';
import { studentsAPI, storage } from '@/services/api';
import { Student } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('manage');
  const [cohortLabels, setCohortLabels] = useState<Record<string, string>>(() => {
    const saved = storage.getItem('cohortLabels');
    return saved ? JSON.parse(saved) : {};
  });
  const [editingLabel, setEditingLabel] = useState<{ id: string, name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    storage.setItem('cohortLabels', JSON.stringify(cohortLabels));
  }, [cohortLabels]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.getAll();
      const studentsData = response.data?.students || response.data || response;
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Sync failed: Database unreachable');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrors([]);
    setSuccess(false);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 8, 92));
    }, 150);

    try {
      const result = await parseExcelFile(file);

      if (!result.isValid) {
        setErrors(result.errors);
        toast.error('Data Validation Failed');
        clearInterval(progressInterval);
        return;
      }

      await studentsAPI.upload(result.students);
      setUploadProgress(100);
      await fetchStudents();
      setSuccess(true);

      toast.success('Student records sync complete', {
        description: `${result.students.length} records imported.`,
        icon: <Database className="h-5 w-5 text-primary" />,
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => setUploading(false), 800);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Erase this student record?')) return;
    try {
      await studentsAPI.delete(id);
      toast.success('Record removed from database');
      fetchStudents();
    } catch (error) {
      toast.error('Deletion failure');
    }
  };

  const handleDeleteMultiple = async () => {
    if (!window.confirm(`Permanently delete records for ${selectedStudents.length} students?`)) return;
    try {
      setDeleting(true);
      await Promise.all(selectedStudents.map(id => studentsAPI.delete(id)));
      toast.success('Successfully removed selected students');
      setSelectedStudents([]);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to complete deletion process');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('CRITICAL: Are you sure you want to delete ALL students? This action cannot be undone.')) return;
    try {
      setLoading(true);
      await studentsAPI.deleteAll();
      toast.success('All student records purged successfully');
      setStudents([]);
      setSelectedStudents([]);
    } catch (error) {
      toast.error('Failed to delete all student records');
    } finally {
      setLoading(false);
    }
  };

  const branchStats = students.reduce((acc, student) => {
    if (student.branch) {
      acc[student.branch] = (acc[student.branch] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  if (loading && students.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Loading Database...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            <Users className="w-4 h-4" />
            Registry Management
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">
            Student <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Management</span>
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl">
            Maintain accurate student records and manage information across different academic levels.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setShowAddForm(true)}
              className="gradient-primary h-14 px-8 font-black uppercase tracking-widest shadow-glow rounded-xl"
            >
              <UserPlus className="w-5 h-5 mr-3" />
              Add Student
            </Button>
          </motion.div>

          {students.length > 0 && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={handleDeleteAll}
                className="h-14 px-8 font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <Trash2 className="w-5 h-5 mr-3" />
                Delete All Students
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stats Dashboard */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Registered', value: students.length, sub: `Across ${Object.keys(branchStats).length} Branches`, icon: Users, color: 'primary' },
          { label: 'Active Branches', value: Object.keys(branchStats).length, sub: 'Faculty-wide Distribution', icon: BarChart, color: 'secondary' },
          { label: 'System Status', value: '100%', sub: 'Real-time Synchronization', icon: CheckCircle2, color: 'accent' }
        ].map((stat, i) => (
          <Card key={i} className="shadow-elevated border-sidebar-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden group">
            <div className={cn("absolute top-0 left-0 w-full h-1", {
              "bg-primary": stat.color === 'primary',
              "bg-secondary": stat.color === 'secondary',
              "bg-accent": stat.color === 'accent'
            })} />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
                  <h3 className="text-4xl font-black tracking-tighter">{stat.value}</h3>
                  <p className="text-xs font-bold text-muted-foreground mt-2">{stat.sub}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", {
                  "bg-primary/10 text-primary": stat.color === 'primary',
                  "bg-secondary/10 text-secondary": stat.color === 'secondary',
                  "bg-accent/10 text-accent": stat.color === 'accent'
                })}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Interface */}
      <motion.div variants={itemVariants} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/30 p-1.5 h-14 rounded-2xl border border-sidebar-border/50 mb-8">
            <TabsTrigger
              value="manage"
              className="rounded-xl h-11 px-8 font-bold uppercase text-[10px] tracking-widest data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              Student Registry
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="rounded-xl h-11 px-8 font-bold uppercase text-[10px] tracking-widest data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              Bulk Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Organized Folder-wise Cohorts */}
              <div className="space-y-4">
                <Accordion type="multiple" defaultValue={[]} className="space-y-4">
                  {Object.keys(students.reduce((acc, s) => {
                    const yearSuffix = s.year === '1' ? 'ST' : s.year === '2' ? 'ND' : s.year === '3' ? 'RD' : 'TH';
                    const key = `${s.year}${yearSuffix} YEAR - COHORT ${new Date(s.createdAt || Date.now()).getFullYear()}`;
                    acc[key] = true;
                    return acc;
                  }, {} as any)).sort().map(cohort => {
                    const cohortLabel = cohortLabels[cohort] || cohort;
                    const cohortStudents = students.filter(s => {
                      const yearSuffix = s.year === '1' ? 'ST' : s.year === '2' ? 'ND' : s.year === '3' ? 'RD' : 'TH';
                      return `${s.year}${yearSuffix} YEAR - COHORT ${new Date(s.createdAt || Date.now()).getFullYear()}` === cohort;
                    });

                    return (
                      <AccordionItem key={cohort} value={cohort} className="border-none">
                        <Card className="shadow-elevated border-sidebar-border/50 glass-effect overflow-hidden">
                          <AccordionTrigger className="hover:no-underline py-0 px-0 [&[data-state=open]>div]:border-b">
                            <div className="w-full bg-muted/10 py-6 px-8 flex items-center justify-between transition-all group">
                              <div className="flex items-center gap-4 text-left">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                  <Database className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                  <h3 className="text-lg font-black uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">
                                    {cohortLabel}
                                  </h3>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                    {cohortStudents.length} Students • Click to expand
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mr-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLabel({ id: cohort, name: cohortLabel });
                                  }}
                                  className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <FolderEdit className="w-4 h-4" />
                                </Button>
                                {selectedStudents.some(id => cohortStudents.map(s => s.id).includes(id)) && (
                                  <Badge className="bg-primary text-white border-none text-[8px] font-black uppercase px-2 py-1 shadow-glow animate-pulse">
                                    {selectedStudents.filter(id => cohortStudents.map(s => s.id).includes(id)).length} Selected
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                            <div className="p-4 md:p-8 bg-card/30">
                              <StudentTable
                                students={cohortStudents}
                                selectedStudents={selectedStudents}
                                onSelectionChange={setSelectedStudents}
                                showCheckboxes={true}
                                onEdit={(s) => setEditingStudent(s)}
                                onDelete={handleDeleteStudent}
                              />
                            </div>
                          </AccordionContent>
                        </Card>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                {students.length === 0 && (
                  <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4 bg-muted/5">
                    <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center opacity-40">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black uppercase italic tracking-tighter">No Students Found</h3>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                        The student registry is currently empty. Add students manually or use the bulk upload feature.
                      </p>
                    </div>
                    <Button onClick={() => setShowAddForm(true)} variant="outline" className="font-black uppercase text-[10px] tracking-widest px-8">
                      Manual Ingress
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <Card className="shadow-elevated border-sidebar-border/50 glass-effect max-w-4xl mx-auto">
              <CardHeader className="border-b border-sidebar-border/50 py-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                    <FileSpreadsheet className="w-7 h-7 text-white" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Student Import Pipeline</CardTitle>
                    <CardDescription className="text-sm font-bold opacity-60 uppercase tracking-widest">Import many student records at once via Excel/CSV files.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Upload Zone</h3>
                    <div
                      className={cn(
                        "relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 transition-all text-center",
                        uploading ? "border-primary bg-primary/5" : "border-sidebar-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                      onClick={() => !uploading && fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                      />
                      <AnimatePresence mode="wait">
                        {uploading ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                          >
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                            <p className="text-sm font-black uppercase tracking-widest text-primary">In Progress {uploadProgress}%</p>
                            <Progress value={uploadProgress} className="h-1.5" />
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center mx-auto mb-4">
                              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                              <p className="text-lg font-bold">Select File</p>
                              <p className="text-xs font-semibold text-muted-foreground/60 mt-1 uppercase tracking-widest">XLSX, XLS, or CSV supported</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary">Data Requirements</h3>
                      <Button variant="link" onClick={generateSampleExcel} className="h-auto p-0 text-[10px] font-black uppercase tracking-widest text-primary italic">Download Sample</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['Name', 'USN', 'Email', 'Branch', 'Year', 'Semester'].map((col, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-sidebar-border/50 group hover:border-secondary/30 transition-all">
                          <Terminal className="w-3.5 h-3.5 text-secondary opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">{col}</span>
                        </div>
                      ))}
                    </div>
                    <Alert className="bg-secondary/5 border-secondary/20 rounded-2xl">
                      <AlertCircle className="w-4 h-4 text-secondary" />
                      <AlertDescription className="text-[10px] font-bold uppercase tracking-widest text-secondary/80 ml-2">
                        System automatically performs case-insensitive header mapping.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <AnimatePresence>
                  {errors.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <Alert variant="destructive" className="rounded-2xl border-2">
                        <AlertCircle className="h-5 w-5" />
                        <AlertDescription>
                          <p className="font-black uppercase text-xs tracking-widest mb-3">Integrity Violations Detected:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                            {errors.map((error, idx) => (
                              <div key={idx} className="text-[10px] font-bold text-destructive/80 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-destructive" />
                                {error}
                              </div>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <StudentForm
        open={showAddForm || !!editingStudent}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingStudent(null);
          }
        }}
        student={editingStudent}
        onSuccess={() => {
          fetchStudents();
          setShowAddForm(false);
          setEditingStudent(null);
        }}
      />

      <Dialog open={!!editingLabel} onOpenChange={() => setEditingLabel(null)}>
        <DialogContent className="glass-effect border-sidebar-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Rename Folder</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Give this cohort a custom academic designation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Folder Name</label>
              <Input
                value={editingLabel?.name || ''}
                onChange={(e) => setEditingLabel(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="e.g. 1st Year 2026 CS Section..."
                className="h-14 text-base font-bold rounded-xl border-sidebar-border/50 bg-muted/30 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setEditingLabel(null)} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest">Cancel</Button>
              <Button
                onClick={() => {
                  if (editingLabel) {
                    setCohortLabels(prev => ({ ...prev, [editingLabel.id]: editingLabel.name }));
                    setEditingLabel(null);
                    toast.success('Folder designation updated');
                  }
                }}
                className="flex-1 h-14 gradient-primary font-black uppercase text-[10px] tracking-widest shadow-glow"
              >
                Update Designation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}