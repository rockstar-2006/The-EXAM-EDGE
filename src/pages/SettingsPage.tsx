import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Shield, Eye, EyeOff, Save, Loader2, Key, CheckCircle2 } from 'lucide-react';
import { teacherAuthAPI, studentAuthAPI } from '@/services/api';
import { motion } from 'framer-motion';

interface SettingsPageProps {
    type: 'teacher' | 'student';
}

export default function SettingsPage({ type }: SettingsPageProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        try {
            const api = type === 'teacher' ? teacherAuthAPI : studentAuthAPI;
            await api.updatePassword({ currentPassword, newPassword });
            toast.success('Security credentials updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight uppercase italic">{type === 'teacher' ? 'Faculty' : 'Student'} <span className="text-primary italic">Settings</span></h1>
                        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Manage your security and account</p>
                    </div>
                </div>

                <Card className="border-sidebar-border/50 shadow-elevated overflow-hidden backdrop-blur-sm bg-card/95 relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 gradient-primary" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 group">
                            <Key className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
                            Security Protocol
                        </CardTitle>
                        <CardDescription className="font-medium">Update your access credentials to maintain terminal security.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Current Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type={showCurrent ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                                        placeholder="Enter current security key"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    >
                                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">New Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type={showNew ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                                        placeholder="Create new security key"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    >
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Confirm New Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                                        placeholder="Verify new security key"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-[0.1em] gap-2 mt-4"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Commit Security Update
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-8 flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-primary">System Integrity Recommendation</p>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed mt-1">
                            For maximum protection, ensure your security key contains a mix of uppercase letters, numbers, and symbols.
                            Avoid reusing keys from other academic platforms.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
