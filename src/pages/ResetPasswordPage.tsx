import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Shield, Eye, EyeOff, CheckCircle2, Loader2, Key } from 'lucide-react';
import { teacherAuthAPI, studentAuthAPI } from '@/services/api';
import { motion } from 'framer-motion';

interface ResetPasswordPageProps {
    type: 'teacher' | 'student';
}

export default function ResetPasswordPage({ type }: ResetPasswordPageProps) {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            toast.error('Please enter new password');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        try {
            const api = type === 'teacher' ? teacherAuthAPI : studentAuthAPI;
            await api.resetPassword(token!, { password });
            setIsSuccess(true);
            toast.success('Password reset successfully');
            setTimeout(() => {
                navigate(type === 'teacher' ? '/login' : '/student/login');
            }, 3000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Token is invalid or has expired');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md text-center space-y-6"
                >
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-glow-green">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tight uppercase italic text-white">Access Restored</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Your security key has been successfully updated.</p>
                    </div>
                    <p className="text-sm text-slate-500 italic">Redirecting to terminal login...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-subtle flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Card className="border-sidebar-border/50 shadow-elevated overflow-hidden backdrop-blur-sm bg-card/95 relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 gradient-primary" />
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-4 shadow-lg">
                            <Key className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight uppercase italic">New <span className="text-primary italic">Security Key</span></CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/60">Initialize new login credentials</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">New Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                                        placeholder="Min. 8 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Confirm New Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                                        placeholder="Verify new key"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-[0.1em] mt-2"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply New Security Key'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
