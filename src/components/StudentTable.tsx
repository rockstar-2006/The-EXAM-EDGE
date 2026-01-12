import { useState, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Edit, Trash2, MoreVertical, Table as TableIcon, Layers, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Student } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StudentTableProps {
  students: Student[];
  selectedStudents?: string[];
  onSelectionChange?: (selected: string[]) => void;
  showCheckboxes?: boolean;
  onEdit?: (student: Student) => void;
  onDelete?: (studentId: string) => void;
}

export function StudentTable({
  students,
  selectedStudents = [],
  onSelectionChange,
  showCheckboxes = false,
  onEdit,
  onDelete
}: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const branches = useMemo(() =>
    Array.from(new Set(students.map(s => s.branch))).sort(),
    [students]
  );
  const years = useMemo(() =>
    Array.from(new Set(students.map(s => s.year))).sort(),
    [students]
  );
  const semesters = useMemo(() =>
    Array.from(new Set(students.map(s => s.semester))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBranch = branchFilter === 'all' || student.branch === branchFilter;
      const matchesYear = yearFilter === 'all' || student.year === yearFilter;
      const matchesSemester = semesterFilter === 'all' || student.semester === semesterFilter;

      return matchesSearch && matchesBranch && matchesYear && matchesSemester;
    });
  }, [students, searchTerm, branchFilter, yearFilter, semesterFilter]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange(filteredStudents.map(s => s.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectStudent = (id: string, checked: boolean) => {
    if (!id) {
      toast.error('Invalid Student Identifier');
      return;
    }

    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedStudents, id]);
      } else {
        onSelectionChange(selectedStudents.filter(e => e !== id));
      }
    }
  };

  const isAllSelected = filteredStudents.length > 0 &&
    filteredStudents.every(s => selectedStudents.includes(s.id));

  const tableVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search students (Name, USN, Email)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-11 h-12 bg-muted/30 border-sidebar-border/50 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="flex gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[160px] h-12 font-bold uppercase text-[10px] tracking-widest bg-muted/30">
              <div className="flex items-center gap-2">
                <TableIcon className="h-3.5 w-3.5 text-primary" />
                <SelectValue placeholder="Branch" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-[10px] uppercase">All Branches</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch} value={branch} className="font-bold text-[10px] uppercase">{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[130px] h-12 font-bold uppercase text-[10px] tracking-widest bg-muted/30">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-secondary" />
                <SelectValue placeholder="Year" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-[10px] uppercase">All Years</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year} className="font-bold text-[10px] uppercase">Year {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-[130px] h-12 font-bold uppercase text-[10px] tracking-widest bg-muted/30">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-accent" />
                <SelectValue placeholder="Semester" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-[10px] uppercase">All Semesters</SelectItem>
              {semesters.map(sem => (
                <SelectItem key={sem} value={sem} className="font-bold text-[10px] uppercase">Sem {sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          Showing {startIndex + 1} — {Math.min(startIndex + itemsPerPage, filteredStudents.length)} <span className="text-muted-foreground/30 px-1">/</span> Total {filteredStudents.length} Students
        </div>
        {showCheckboxes && selectedStudents.length > 0 && (
          <Badge className="bg-primary text-white font-bold tracking-tighter shadow-glow">
            {selectedStudents.length} Students Selected
          </Badge>
        )}
      </div>

      {/* Table Container */}
      <div className="relative shadow-elevated border border-sidebar-border/50 rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b-sidebar-border/50 hover:bg-muted/50">
              {showCheckboxes && (
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-primary/50"
                  />
                </TableHead>
              )}
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Student Info</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Address</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Branch</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Academic Year</TableHead>
              {(onEdit || onDelete) && <TableHead className="w-20 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="wait">
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showCheckboxes ? 6 : 5}
                    className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 py-20 italic"
                  >
                    No students found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student, idx) => (
                  <motion.tr
                    key={student.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    transition={{ delay: idx * 0.03 }}
                    className="group border-b-sidebar-border/30 hover:bg-primary/[0.02] transition-colors"
                  >
                    {showCheckboxes && (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) =>
                            handleSelectStudent(student.id, checked as boolean)
                          }
                          className="border-primary/30"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors text-foreground">{student.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-foreground/70">{student.usn}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground">{student.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-muted border-sidebar-border/50 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 text-foreground">
                        {student.branch}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Y{student.year}</span>
                        <div className="w-1 h-1 rounded-full bg-primary/30" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">S{student.semester}</span>
                      </div>
                    </TableCell>
                    {(onEdit || onDelete) && (
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-effect border-sidebar-border shadow-xl">
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(student)} className="text-[10px] font-bold uppercase tracking-widest gap-2">
                                <Edit className="h-3.5 w-3.5" />
                                Modify
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem
                                onClick={() => onDelete(student.id)}
                                className="text-red-600 text-[10px] font-bold uppercase tracking-widest gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(p => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="font-bold uppercase text-[10px] tracking-widest h-10 px-6 border-sidebar-border/50 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Prev
          </Button>

          <div className="flex items-center gap-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
              Page <span className="text-primary">{currentPage}</span> / {totalPages}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(p => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="font-bold uppercase text-[10px] tracking-widest h-10 px-6 border-sidebar-border/50 hover:bg-muted"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}