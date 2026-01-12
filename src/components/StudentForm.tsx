import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { studentsAPI } from '@/services/api';
import { Student } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, AlertCircle, User, Mail, Hash, GraduationCap, Calendar, Layers, Activity, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StudentFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    student?: Student | null;
    onSuccess: () => void;
}

export function StudentForm({ open, onOpenChange, student, onSuccess }: StudentFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        usn: '',
        email: '',
        branch: '',
        year: '',
        semester: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitProgress, setSubmitProgress] = useState(0);

    const branchOptions = [
        'Computer Science', 'Information Science', 'Electronics', 'Mechanical', 'Civil',
        'Electrical', 'Chemical', 'Biotechnology', 'Aerospace', 'Other'
    ];
    const yearOptions = ['1', '2', '3', '4'];
    const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name || '',
                usn: student.usn || '',
                email: student.email || '',
                branch: student.branch || '',
                year: student.year || '',
                semester: student.semester || '',
            });
        } else {
            setFormData({ name: '', usn: '', email: '', branch: '', year: '', semester: '' });
        }
        setErrors({});
    }, [student, open]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'REQUIRED';
        if (!formData.usn.trim()) newErrors.usn = 'REQUIRED';
        if (!formData.email.trim()) newErrors.email = 'REQUIRED';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'INVALID';
        if (!formData.branch) newErrors.branch = 'REQUIRED';
        if (!formData.year) newErrors.year = 'REQUIRED';
        if (!formData.semester) newErrors.semester = 'REQUIRED';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setSubmitProgress(0);
        const interval = setInterval(() => setSubmitProgress(p => p >= 90 ? 90 : p + 10), 100);

        try {
            if (student && student.id) {
                await studentsAPI.update(student.id, formData);
                toast.success('Record Updated');
            } else {
                await studentsAPI.add(formData);
                toast.success('Registration Complete');
            }
            setSubmitProgress(100);
            setTimeout(() => {
                onSuccess();
                onOpenChange(false);
            }, 500);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Transaction failed');
        } finally {
            clearInterval(interval);
            setTimeout(() => { setLoading(false); setSubmitProgress(0); }, 300);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-sidebar-border bg-card/95 backdrop-blur-xl shadow-2xl rounded-3xl">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary/20" />

                <DialogHeader className="p-8 pb-4">
                    <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                        <Activity className="w-3 h-3" /> Student Management
                    </div>
                    <DialogTitle className="text-4xl font-black tracking-tighter uppercase italic">
                        {student ? 'Edit' : 'New'} <span className="text-primary italic">Student</span>
                    </DialogTitle>
                    <DialogDescription className="font-bold text-xs uppercase tracking-widest opacity-60">
                        {student ? `Update information for ${student.usn}` : 'Enter details for new student'}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 pt-4 space-y-8">
                    {/* Progress indicator */}
                    <AnimatePresence>
                        {loading && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                                    <span>Saving Data...</span>
                                    <span>{submitProgress}%</span>
                                </div>
                                <Progress value={submitProgress} className="h-1 bg-primary/10" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b pb-2">Student Information</p>
                            <div className="space-y-4">
                                {[
                                    { id: 'name', label: 'Full Name', icon: User, placeholder: 'JOHN DOE' },
                                    { id: 'usn', label: 'Identity USN', icon: Hash, placeholder: '1CR21CS001' },
                                    { id: 'email', label: 'Email Address', icon: Mail, placeholder: 'JOE.D@SMART.EDU' }
                                ].map((f) => (
                                    <div key={f.id} className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{f.label}</Label>
                                        <div className="relative group">
                                            <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                value={formData[f.id as keyof typeof formData]}
                                                onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value.toUpperCase() })}
                                                className={cn(
                                                    "h-12 pl-10 bg-muted/30 border-sidebar-border/50 font-bold uppercase text-xs tracking-tight transition-all focus:border-primary/50",
                                                    errors[f.id] && "border-destructive/50"
                                                )}
                                                placeholder={f.placeholder}
                                            />
                                            {errors[f.id] && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-destructive">{errors[f.id]}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-b pb-2">Academic Details</p>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Assigned Branch</Label>
                                    <Select value={formData.branch} onValueChange={(v) => setFormData({ ...formData, branch: v })}>
                                        <SelectTrigger className="h-12 bg-muted/30 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest">
                                            <SelectValue placeholder="SELECT BRANCH" />
                                        </SelectTrigger>
                                        <SelectContent className="glass-effect">
                                            {branchOptions.map(b => (
                                                <SelectItem key={b} value={b} className="font-bold text-[10px] uppercase">{b}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Year</Label>
                                        <Select value={formData.year} onValueChange={(v) => setFormData({ ...formData, year: v })}>
                                            <SelectTrigger className="h-12 bg-muted/30 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest">
                                                <SelectValue placeholder="YEAR" />
                                            </SelectTrigger>
                                            <SelectContent className="glass-effect">
                                                {yearOptions.map(y => (
                                                    <SelectItem key={y} value={y} className="font-bold text-[10px] uppercase">YEAR {y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Semester</Label>
                                        <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                                            <SelectTrigger className="h-12 bg-muted/30 border-sidebar-border/50 font-bold uppercase text-[10px] tracking-widest">
                                                <SelectValue placeholder="SEM" />
                                            </SelectTrigger>
                                            <SelectContent className="glass-effect">
                                                {semesterOptions.map(s => (
                                                    <SelectItem key={s} value={s} className="font-bold text-[10px] uppercase">SEM {s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 bg-muted/20 border-t border-sidebar-border/50 gap-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-8 font-black uppercase text-[10px] tracking-widest hover:bg-muted/50">Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="h-14 px-10 gradient-primary font-black uppercase tracking-widest text-xs shadow-glow group"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Save Student</span>
                                <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}