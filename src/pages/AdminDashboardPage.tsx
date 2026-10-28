import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Building2,
  School,
  GraduationCap,
  Users,
  FileQuestion,
  Award,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Database,
  Loader2,
  RotateCcw,
  KeyRound,
  Calendar,
  Lock,
  Mail,
  UserCheck,
  Search,
  Eraser,
  CheckSquare,
  Square,
  BookOpen,
  X
} from 'lucide-react';
import { adminAPI } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [quizList, setQuizList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);

  // Search Filters
  const [facultySearch, setFacultySearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [quizSearch, setQuizSearch] = useState('');

  // Multi-Selection for Batch Actions
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);

  // Batch Delete Modal
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<{ type: 'faculty' | 'quiz' | 'student'; ids: string[]; count: number } | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('faculty');

  // Single Item Delete Modal (Faculty, Quiz, or Student)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'faculty' | 'quiz' | 'student'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inspect Faculty Modal
  const [inspectFaculty, setInspectFaculty] = useState<any>(null);
  const [inspectTab, setInspectTab] = useState<'quizzes' | 'students'>('quizzes');

  // Reset Password Modal (Faculty or Student)
  const [resetTarget, setResetTarget] = useState<{ type: 'faculty' | 'student'; id: string; name: string; email: string; usn?: string } | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Institutional Factory Reset Modal
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  // Manual Fetch
  const handleFetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        adminAPI.getStats(),
        adminAPI.getFacultyList(),
        adminAPI.getAllQuizzes(),
        adminAPI.getStudentList()
      ]);

      const [statsRes, facultyRes, quizRes, studentRes] = results;

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.data);
      }
      if (facultyRes.status === 'fulfilled' && facultyRes.value?.data?.success) {
        setFacultyList(facultyRes.value.data.data || []);
      } else if (facultyRes.status === 'rejected') {
        console.error('Faculty list error:', facultyRes.reason);
      }

      if (quizRes.status === 'fulfilled' && quizRes.value?.data?.success) {
        setQuizList(quizRes.value.data.data || []);
      }
      if (studentRes.status === 'fulfilled' && studentRes.value?.data?.success) {
        setStudentList(studentRes.value.data.data || []);
      } else if (studentRes.status === 'rejected') {
        console.error('Student list error:', studentRes.reason);
      }

      // Reset selection on refresh
      setSelectedFaculty([]);
      setSelectedStudents([]);
      setSelectedQuizzes([]);

      toast.success('Institutional directory synchronized');
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      toast.error('Error synchronizing portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchData();
  }, []);

  // Filtered lists
  const filteredFaculty = useMemo(() => {
    const q = facultySearch.toLowerCase().trim();
    if (!q) return facultyList;
    return facultyList.filter(
      (f) =>
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.email && f.email.toLowerCase().includes(q))
    );
  }, [facultyList, facultySearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return studentList;
    return studentList.filter(
      (st) =>
        (st.name && st.name.toLowerCase().includes(q)) ||
        (st.email && st.email.toLowerCase().includes(q)) ||
        (st.usn && st.usn.toLowerCase().includes(q)) ||
        (st.branch && st.branch.toLowerCase().includes(q))
    );
  }, [studentList, studentSearch]);

  const filteredQuizzes = useMemo(() => {
    const q = quizSearch.toLowerCase().trim();
    if (!q) return quizList;
    return quizList.filter(
      (quiz) =>
        (quiz.title && quiz.title.toLowerCase().includes(q)) ||
        (quiz.userId?.name && quiz.userId.name.toLowerCase().includes(q)) ||
        (quiz.userId?.email && quiz.userId.email.toLowerCase().includes(q)) ||
        (quiz.createdBy && quiz.createdBy.toLowerCase().includes(q))
    );
  }, [quizList, quizSearch]);

  // Selection Toggles
  const toggleSelectFaculty = (id: string) => {
    setSelectedFaculty((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  const toggleSelectAllFaculty = () => {
    if (selectedFaculty.length === filteredFaculty.length) {
      setSelectedFaculty([]);
    } else {
      setSelectedFaculty(filteredFaculty.map((f) => f._id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  const toggleSelectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s._id));
    }
  };

  const toggleSelectQuiz = (id: string) => {
    setSelectedQuizzes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  const toggleSelectAllQuizzes = () => {
    if (selectedQuizzes.length === filteredQuizzes.length) {
      setSelectedQuizzes([]);
    } else {
      setSelectedQuizzes(filteredQuizzes.map((q) => q._id));
    }
  };

  // Single Item Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'faculty') {
        const res = await adminAPI.deleteFaculty(deleteTarget.id);
        toast.success(res.data?.message || 'Faculty account removed successfully');
      } else if (deleteTarget.type === 'quiz') {
        const res = await adminAPI.deleteQuiz(deleteTarget.id);
        toast.success(res.data?.message || 'Assessment removed successfully');
      } else if (deleteTarget.type === 'student') {
        const res = await adminAPI.deleteStudent(deleteTarget.id);
        toast.success(res.data?.message || 'Student record removed successfully');
      }
      setDeleteTarget(null);
      handleFetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove record');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Delete Execution
  const handleConfirmBatchDelete = async () => {
    if (!batchDeleteTarget) return;
    setIsBatchDeleting(true);
    try {
      if (batchDeleteTarget.type === 'faculty') {
        const res = await adminAPI.batchDeleteFaculty(batchDeleteTarget.ids);
        toast.success(res.data?.message || `Removed ${batchDeleteTarget.count} faculty accounts`);
        setSelectedFaculty([]);
      } else if (batchDeleteTarget.type === 'quiz') {
        const res = await adminAPI.batchDeleteQuizzes(batchDeleteTarget.ids);
        toast.success(res.data?.message || `Removed ${batchDeleteTarget.count} assessments`);
        setSelectedQuizzes([]);
      } else if (batchDeleteTarget.type === 'student') {
        const res = await adminAPI.batchDeleteStudents(batchDeleteTarget.ids);
        toast.success(res.data?.message || `Removed ${batchDeleteTarget.count} student accounts`);
        setSelectedStudents([]);
      }
      setBatchDeleteTarget(null);
      handleFetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Batch removal failed');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handlePurgeQuizAttempts = async (quizId: string, quizTitle: string) => {
    if (!window.confirm(`Are you sure you want to clear student submissions for "${quizTitle}"? The quiz questions will be preserved.`)) {
      return;
    }
    try {
      const res = await adminAPI.purgeAttempts(quizId);
      toast.success(res.data?.message || 'Quiz submissions cleared successfully');
      handleFetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear submissions');
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !newAdminPassword || newAdminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsResetting(true);
    try {
      if (resetTarget.type === 'student') {
        const res = await adminAPI.resetStudentPassword(resetTarget.id, newAdminPassword);
        toast.success(res.data?.message || `Password for student ${resetTarget.name} updated!`);
      } else {
        const res = await adminAPI.resetFacultyPassword(resetTarget.id, newAdminPassword);
        toast.success(res.data?.message || `Password for faculty ${resetTarget.name} updated!`);
      }
      setResetTarget(null);
      setNewAdminPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExecuteWipe = async () => {
    if (wipeConfirmText !== 'WIPE_ALL_DATA') {
      toast.error('Please type WIPE_ALL_DATA exactly to confirm.');
      return;
    }
    setIsWiping(true);
    try {
      const res = await adminAPI.wipeEntireDatabase('WIPE_ALL_DATA');
      toast.success(res.data?.message || 'Platform database reset to initial state!');
      setShowWipeModal(false);
      setWipeConfirmText('');
      handleFetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset database');
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* College Institutional Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-8 rounded-3xl text-white border border-indigo-900/30 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
              <Building2 className="w-6 h-6 text-indigo-300" />
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 uppercase text-[10px] tracking-widest font-black">
              Campus Administration Portal
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Academic Directory & Campus Administration</h1>
          <p className="text-indigo-200/70 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
            Centralized institutional portal to oversee department teaching faculty, manage enrolled student cohorts, coordinate course assessments, and maintain campus credentials.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            onClick={handleFetchData}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs gap-2 h-12 px-6 shadow-lg shadow-indigo-950/40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Synchronizing...' : 'Sync Directory Data'}
          </Button>

          <Button
            variant="outline"
            onClick={() => { setWipeConfirmText(''); setShowWipeModal(true); }}
            className="border-rose-400/30 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 hover:text-rose-200 rounded-2xl font-bold text-xs gap-2 h-12 px-5 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            Reset Portal Data
          </Button>
        </div>
      </div>

      {/* College Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-white p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department Faculty</p>
          <h3 className="text-3xl font-black text-slate-900">{stats?.totalFaculty ?? facultyList.length ?? '--'}</h3>
          <p className="text-[11px] text-slate-500 font-semibold">Active teaching instructors</p>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-white p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Assessments</p>
          <h3 className="text-3xl font-black text-indigo-600">{stats?.totalQuizzes ?? quizList.length ?? '--'}</h3>
          <p className="text-[11px] text-slate-500 font-semibold">Created course quizzes</p>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-white p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed Submissions</p>
          <h3 className="text-3xl font-black text-emerald-600">{stats?.totalAttempts ?? '--'}</h3>
          <p className="text-[11px] text-slate-500 font-semibold">Student examination attempts</p>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-white p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enrolled Students</p>
          <h3 className="text-3xl font-black text-amber-600">{stats?.totalStudents ?? studentList.length ?? '--'}</h3>
          <p className="text-[11px] text-slate-500 font-semibold">Registered student accounts</p>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="faculty" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14">
          <TabsTrigger value="faculty" className="rounded-xl font-bold text-xs px-6 data-[state=active]:bg-white data-[state=active]:shadow-md">
            Faculty Directory ({facultyList.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-xl font-bold text-xs px-6 data-[state=active]:bg-white data-[state=active]:shadow-md">
            Student Directory ({studentList.length})
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="rounded-xl font-bold text-xs px-6 data-[state=active]:bg-white data-[state=active]:shadow-md">
            Course Assessments ({quizList.length})
          </TabsTrigger>
        </TabsList>

        {/* 👥 TAB 1: FACULTY DIRECTORY */}
        <TabsContent value="faculty">
          <Card className="rounded-3xl border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Teaching Faculty Directory</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium">
                    Filter by instructor name or email, review assigned course quizzes, inspect enrolled students, or update credentials.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {selectedFaculty.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setBatchDeleteTarget({
                          type: 'faculty',
                          ids: selectedFaculty,
                          count: selectedFaculty.length
                        })
                      }
                      className="h-10 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Selected ({selectedFaculty.length})
                    </Button>
                  )}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search faculty by name or email..."
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4 pl-6 w-10">
                        <input
                          type="checkbox"
                          checked={filteredFaculty.length > 0 && selectedFaculty.length === filteredFaculty.length}
                          onChange={toggleSelectAllFaculty}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Faculty Member & Email</th>
                      <th className="p-4">Assigned Quizzes</th>
                      <th className="p-4">Enrolled Students</th>
                      <th className="p-4">Submissions</th>
                      <th className="p-4 text-right pr-6">Academic Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          {facultySearch ? 'No faculty accounts matched your search.' : 'No registered faculty found in the directory.'}
                        </td>
                      </tr>
                    ) : (
                      filteredFaculty.map((f) => {
                        const isSelected = selectedFaculty.includes(f._id);
                        return (
                          <tr key={f._id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}>
                            <td className="p-4 pl-6">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectFaculty(f._id)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900">{f.name}</p>
                              <p className="text-xs text-slate-400 font-medium font-mono">{f.email}</p>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="font-bold text-indigo-600 bg-indigo-50/50 border-indigo-200">
                                {f.quizCount || 0} Quizzes
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="font-bold text-teal-600 bg-teal-50/50 border-teal-200">
                                {f.studentCount || 0} Students
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-700">{f.attemptCount || 0} submissions</span>
                            </td>
                            <td className="p-4 text-right pr-6 space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setInspectFaculty(f); setInspectTab('quizzes'); }}
                                className="rounded-xl font-bold text-xs h-9 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                              >
                                View Academic Portfolio
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setResetTarget({ type: 'faculty', id: f._id, name: f.name, email: f.email });
                                  setNewAdminPassword('');
                                }}
                                className="rounded-xl font-bold text-xs h-9 border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 gap-1"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                Reset Password
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTarget({ type: 'faculty', id: f._id, name: f.name })}
                                className="rounded-xl font-bold text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Account
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🎓 TAB 2: STUDENT DIRECTORY */}
        <TabsContent value="students">
          <Card className="rounded-3xl border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Student Academic Records</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium">
                    Search student cohorts by USN, email, or department branch. Manage student credentials and review assessment records.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {selectedStudents.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setBatchDeleteTarget({
                          type: 'student',
                          ids: selectedStudents,
                          count: selectedStudents.length
                        })
                      }
                      className="h-10 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Selected ({selectedStudents.length})
                    </Button>
                  )}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by name, USN, or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4 pl-6 w-10">
                        <input
                          type="checkbox"
                          checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                          onChange={toggleSelectAllStudents}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Student Name</th>
                      <th className="p-4">University Seat No. (USN) & Email</th>
                      <th className="p-4">Department Branch & Semester</th>
                      <th className="p-4">Assessments Taken</th>
                      <th className="p-4 text-right pr-6">Academic Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          {studentSearch ? 'No student records matched your search.' : 'No registered students found in the directory.'}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => {
                        const isSelected = selectedStudents.includes(st._id);
                        return (
                          <tr key={st._id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}>
                            <td className="p-4 pl-6">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectStudent(st._id)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900">{st.name}</p>
                              {st.lockUntil && new Date(st.lockUntil) > new Date() ? (
                                <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                                  Locked ({st.failedAttempts} attempts)
                                </Badge>
                              ) : st.isVerified ? (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1 font-bold text-emerald-700 bg-emerald-50">
                                  Verified Cohort
                                </Badge>
                              ) : null}
                            </td>
                            <td className="p-4 font-mono text-xs">
                              <p className="font-bold text-indigo-900">{st.usn || 'N/A'}</p>
                              <p className="text-slate-400 text-[11px]">{st.email}</p>
                            </td>
                            <td className="p-4">
                              <span className="font-medium text-xs text-slate-700">{st.branch || 'General'}</span>
                              {st.semester && <span className="text-xs text-slate-400 ml-1">Sem {st.semester}</span>}
                            </td>
                            <td className="p-4">
                              <Badge className="font-bold text-teal-700 bg-teal-50 border-teal-200">
                                {st.attemptCount || 0} Attempts
                              </Badge>
                            </td>
                            <td className="p-4 text-right pr-6 space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setResetTarget({ type: 'student', id: st._id, name: st.name, email: st.email, usn: st.usn });
                                  setNewAdminPassword('');
                                }}
                                className="rounded-xl font-bold text-xs h-9 border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 gap-1"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                Reset Password
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTarget({ type: 'student', id: st._id, name: st.name })}
                                className="rounded-xl font-bold text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📝 TAB 3: COURSE ASSESSMENTS */}
        <TabsContent value="quizzes">
          <Card className="rounded-3xl border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Academic Quizzes & Exam Papers</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium">
                    Review examination assessments across departments. Clear student submissions or remove unused quizzes.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {selectedQuizzes.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setBatchDeleteTarget({
                          type: 'quiz',
                          ids: selectedQuizzes,
                          count: selectedQuizzes.length
                        })
                      }
                      className="h-10 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Selected ({selectedQuizzes.length})
                    </Button>
                  )}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search quizzes by title or instructor..."
                      value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4 pl-6 w-10">
                        <input
                          type="checkbox"
                          checked={filteredQuizzes.length > 0 && selectedQuizzes.length === filteredQuizzes.length}
                          onChange={toggleSelectAllQuizzes}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Assessment Title</th>
                      <th className="p-4">Course Instructor</th>
                      <th className="p-4">Marks & Duration</th>
                      <th className="p-4">Submissions Recorded</th>
                      <th className="p-4 text-right pr-6">Academic Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuizzes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          {quizSearch ? 'No assessments matched your search.' : 'No course quizzes found in the database.'}
                        </td>
                      </tr>
                    ) : (
                      filteredQuizzes.map((q) => {
                        const isSelected = selectedQuizzes.includes(q._id);
                        return (
                          <tr key={q._id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}>
                            <td className="p-4 pl-6">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectQuiz(q._id)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900">{q.title}</p>
                              <p className="text-xs text-slate-400">{q.questions?.length || 0} questions</p>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-slate-800">{q.userId?.name || q.createdBy || 'Department Faculty'}</p>
                              <p className="text-xs text-slate-400 font-mono">{q.userId?.email}</p>
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-600">
                              {q.totalMarks} Marks • {q.duration} mins
                            </td>
                            <td className="p-4">
                              <Badge className="font-black text-teal-700 bg-teal-50 border-teal-200">
                                {q.attemptCount} Submissions
                              </Badge>
                            </td>
                            <td className="p-4 text-right pr-6 space-x-2">
                              {q.attemptCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePurgeQuizAttempts(q._id, q.title)}
                                  className="rounded-xl font-bold text-xs h-9 border-slate-200 hover:bg-amber-50 hover:text-amber-800 gap-1 text-slate-600"
                                >
                                  <Eraser className="w-3.5 h-3.5 text-amber-600" />
                                  Clear Submissions
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTarget({ type: 'quiz', id: q._id, name: q.title })}
                                className="rounded-xl font-bold text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Quiz
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 🔍 INSPECT FACULTY PORTFOLIO MODAL (Quizzes & Students) */}
      <Dialog open={Boolean(inspectFaculty)} onOpenChange={(o) => { if (!o) setInspectFaculty(null); }}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-3xl border-none shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-slate-900">
              Academic Portfolio: Prof. {inspectFaculty?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              Department Email: {inspectFaculty?.email} • Faculty ID: {inspectFaculty?._id}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={inspectTab} onValueChange={(val: any) => setInspectTab(val)} className="pt-4 space-y-4">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-12 w-full grid grid-cols-2">
              <TabsTrigger value="quizzes" className="rounded-lg font-bold text-xs">
                Created Assessments ({inspectFaculty?.quizzes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="students" className="rounded-lg font-bold text-xs">
                Enrolled Students ({(inspectFaculty?.students?.length || 0) > 0 ? inspectFaculty.students.length : studentList.length})
              </TabsTrigger>
            </TabsList>

            {/* Quizzes list */}
            <TabsContent value="quizzes" className="space-y-3">
              {(!inspectFaculty?.quizzes || inspectFaculty.quizzes.length === 0) ? (
                <p className="text-xs text-slate-400 font-medium py-8 text-center bg-slate-50 rounded-2xl">
                  No course quizzes created under this faculty profile yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {inspectFaculty.quizzes.map((q: any) => (
                    <div key={q._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{q.title}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {q.totalMarks} Marks • {q.duration || 30} mins • {q.questions?.length || 0} Questions
                        </p>
                        {q.sharedWith && q.sharedWith.length > 0 && (
                          <p className="text-[10px] text-indigo-600 font-bold mt-1">
                            Shared with {q.sharedWith.length} enrolled students
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Students list */}
            <TabsContent value="students" className="space-y-3">
              {(() => {
                const displayList = (inspectFaculty?.students && inspectFaculty.students.length > 0)
                  ? inspectFaculty.students
                  : studentList;

                const isFallback = (!inspectFaculty?.students || inspectFaculty.students.length === 0);

                if (displayList.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 font-medium py-8 text-center bg-slate-50 rounded-2xl">
                      No student records found in the institutional directory.
                    </p>
                  );
                }

                return (
                  <div className="space-y-3">
                    {isFallback && (
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between">
                        <span>Displaying all <strong>{studentList.length} enrolled platform students</strong>:</span>
                        <Badge className="bg-indigo-200 text-indigo-900 text-[10px] border-none font-bold">
                          {studentList.length} Students
                        </Badge>
                      </div>
                    )}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto">
                      {displayList.map((st: any, idx: number) => (
                        <div key={st._id || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-xs text-slate-900">{st.name}</p>
                              {st.source && (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1.5 font-bold">
                                  {st.source}
                                </Badge>
                              )}
                              {(st.attemptCount > 0 || st.attemptsCount > 0) && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                                  {st.attemptCount || st.attemptsCount} Attempts
                                </Badge>
                              )}
                              {st.isVerified && (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1 font-bold text-emerald-700 bg-emerald-50">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{st.email} • USN: {st.usn || 'N/A'}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px] bg-white">
                              {st.branch || 'General'} {st.semester ? `Sem ${st.semester}` : ''}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setResetTarget({
                                  type: 'student',
                                  id: st._id || st.authId || st.email || st.usn,
                                  name: st.name,
                                  email: st.email,
                                  usn: st.usn
                                });
                                setNewAdminPassword('');
                              }}
                              className="h-8 rounded-lg text-[11px] font-bold border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 gap-1 px-2.5"
                            >
                              <KeyRound className="w-3 h-3 text-amber-600" />
                              Reset Password
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 🔑 RESET PASSWORD MODAL (Faculty or Student) */}
      <Dialog open={Boolean(resetTarget)} onOpenChange={(o) => { if (!o) setResetTarget(null); }}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md border-none shadow-2xl bg-white">
          <form onSubmit={handleConfirmResetPassword}>
            <DialogHeader className="space-y-2">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center text-xl font-black text-slate-900">
                Update {resetTarget?.type === 'student' ? 'Student' : 'Faculty'} Password
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-500 font-medium">
                Configure a new access password for <span className="font-bold text-slate-900">{resetTarget?.name}</span> ({resetTarget?.email || resetTarget?.usn})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">New Access Password</Label>
              <Input
                type="text"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Enter minimum 6 characters"
                className="h-12 rounded-xl border-slate-200 font-medium"
                required
              />
            </div>

            <DialogFooter className="flex gap-2 sm:justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isResetting}
                onClick={() => setResetTarget(null)}
                className="flex-1 h-12 rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isResetting || newAdminPassword.length < 6}
                className="flex-1 h-12 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🔄 INSTITUTIONAL FACTORY RESET MODAL */}
      <Dialog open={showWipeModal} onOpenChange={setShowWipeModal}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-lg border-2 border-slate-200 shadow-2xl bg-white">
          <DialogHeader className="space-y-3">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-200">
              <RotateCcw className="w-8 h-8 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-2xl font-black text-slate-900">
              Institutional Portal Factory Reset
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-600 font-medium leading-relaxed">
              This administrative action will reset the platform database to its initial clean state, permanently clearing:
              <br />
              <strong className="text-rose-600 block mt-2">
                • All teaching faculty profiles (except Super Administrator)
                <br />• All course quizzes and question repositories
                <br />• All enrolled student accounts and examination submissions
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <p className="text-xs font-bold text-slate-700">
              Type <span className="font-mono font-black text-rose-600 select-all">WIPE_ALL_DATA</span> below to confirm:
            </p>
            <Input
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder="WIPE_ALL_DATA"
              className="h-12 border-slate-200 focus:ring-rose-200 font-mono text-center font-black tracking-widest text-rose-600"
            />
          </div>

          <DialogFooter className="flex gap-3 sm:justify-center">
            <Button
              variant="outline"
              disabled={isWiping}
              onClick={() => { setShowWipeModal(false); setWipeConfirmText(''); }}
              className="flex-1 h-12 rounded-xl font-bold text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isWiping || wipeConfirmText !== 'WIPE_ALL_DATA'}
              onClick={handleExecuteWipe}
              className="flex-1 h-12 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isWiping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Portal Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ⚠️ SINGLE REMOVAL CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md border-none shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-xl font-black text-slate-900">
              Confirm Account Removal
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 font-medium leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-bold text-slate-900">"{deleteTarget?.name}"</span> from the institutional directory?
              <br />
              <span className="text-rose-600 font-bold block mt-2">
                All associated course quizzes, student submissions, and performance marks will be permanently removed.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3 pt-4 sm:justify-center">
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="flex-1 h-12 rounded-xl font-bold text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="flex-1 h-12 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Removal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🗑️ BATCH REMOVAL CONFIRMATION DIALOG */}
      <Dialog open={Boolean(batchDeleteTarget)} onOpenChange={(o) => { if (!o) setBatchDeleteTarget(null); }}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md border-none shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-xl font-black text-slate-900">
              Remove {batchDeleteTarget?.count} Selected Records
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 font-medium leading-relaxed">
              Are you sure you want to remove the <strong className="text-rose-600">{batchDeleteTarget?.count} selected institutional records</strong>?
              <br />
              <span className="text-rose-600 font-bold block mt-2">
                All associated course materials, assessment records, and student scores will be permanently cleared.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3 pt-4 sm:justify-center">
            <Button
              variant="outline"
              disabled={isBatchDeleting}
              onClick={() => setBatchDeleteTarget(null)}
              className="flex-1 h-12 rounded-xl font-bold text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isBatchDeleting}
              onClick={handleConfirmBatchDelete}
              className="flex-1 h-12 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isBatchDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Remove All ${batchDeleteTarget?.count}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
