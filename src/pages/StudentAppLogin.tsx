import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Lock, Mail, User, Shield, Eye, EyeOff, Sparkles, ChevronRight, Activity, BadgeCheck, GraduationCap } from 'lucide-react';
import { studentAuthAPI, storage } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const StudentAppLogin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [regStep, setRegStep] = useState(1);

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    usn: '',
    branch: '',
    year: '',
    semester: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await studentAuthAPI.login(loginData.email, loginData.password);
      storage.setItem('studentToken', response.data.token);
      storage.setItem('studentData', JSON.stringify(response.data.student));
      toast.success('Login Successful: Welcome back!');
      navigate('/student/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Authentication Protocol Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regStep < 3) {
      setRegStep(regStep + 1);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const response = await studentAuthAPI.register({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        usn: registerData.usn,
        branch: registerData.branch,
        year: registerData.year,
        semester: registerData.semester
      });
      storage.setItem('studentToken', response.data.token);
      storage.setItem('studentData', JSON.stringify(response.data.student));
      toast.success('Account Created: Welcome to the Student Portal');
      navigate('/student/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update Failed: Please check your details');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as any,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen w-full bg-background relative flex flex-col items-center p-4 pt-safe pb-safe overflow-y-auto">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md relative z-10 py-10"
      >
        {/* Terminal Header */}
        <motion.div variants={itemVariants} className="text-center mb-8 space-y-4">
          <div className="inline-flex relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-16 h-16 rounded-2xl bg-card border border-sidebar-border/50 shadow-elevated flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-white shadow-glow border-2 border-background">
              <Shield className="w-3 h-3" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              STUDENT <span className="text-primary not-italic">PORTAL</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground font-black uppercase tracking-[0.3em] text-[8px]">
              <Activity className="w-2.5 h-2.5 text-primary" />
              Secure Assessment System
              <Activity className="w-2.5 h-2.5 text-primary" />
            </div>
          </div>
        </motion.div>

        <Card className="border-sidebar-border/30 shadow-elevated bg-card/40 backdrop-blur-2xl overflow-hidden rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />

          <CardHeader className="p-8 pb-4 text-center">
            <CardTitle className="text-xl font-black tracking-tight uppercase italic">Welcome Cadet</CardTitle>
            <CardDescription className="font-bold uppercase text-[9px] tracking-widest opacity-40">
              Please sign in to access your quizzes
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/20 p-1.5 rounded-2xl border border-sidebar-border/30 h-14">
                <TabsTrigger
                  value="login"
                  className="rounded-xl font-black uppercase text-[9px] tracking-widest data-[state=active]:gradient-primary data-[state=active]:text-white transition-all"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-xl font-black uppercase text-[9px] tracking-widest data-[state=active]:gradient-primary data-[state=active]:text-white transition-all"
                  onClick={() => setRegStep(1)}
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="login" key="login">
                  <motion.form
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleLogin}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Faculty ID / Student Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                          <Input
                            type="email"
                            placeholder="your.email@college.edu"
                            className="pl-12 h-14 bg-muted/10 border-sidebar-border/30 rounded-xl focus:ring-primary/20 font-bold text-sm"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Security Key</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••••••"
                            className="pl-12 pr-12 h-14 bg-muted/10 border-sidebar-border/30 rounded-xl focus:ring-primary/20 font-bold text-sm tracking-widest"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full h-14 gradient-primary shadow-glow font-black uppercase tracking-[0.2em] text-xs group rounded-xl">
                      {isLoading ? (
                        <Activity className="w-5 h-5 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          Authorize Entry <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </motion.form>
                </TabsContent>

                <TabsContent value="register" key="register">
                  <motion.form
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleRegister}
                    className="space-y-6"
                  >
                    {/* Progress Indicator */}
                    <div className="flex justify-between items-center px-2 mb-6">
                      {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all duration-300",
                            regStep >= step ? "bg-primary border-primary text-white shadow-glow" : "bg-muted/20 border-sidebar-border/30 text-muted-foreground"
                          )}>
                            {step < regStep ? <BadgeCheck className="w-3.5 h-3.5" /> : step}
                          </div>
                          {step < 3 && <div className={cn("w-8 h-[2px] rounded-full", regStep > step ? "bg-primary" : "bg-muted/20")} />}
                        </div>
                      ))}
                    </div>

                    <div className="min-h-[220px]">
                      <AnimatePresence mode="wait">
                        {regStep === 1 && (
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Verification Name</Label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                                <Input
                                  placeholder="ENTER YOUR FULL NAME"
                                  className="pl-12 h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold uppercase text-xs"
                                  value={registerData.name}
                                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Registry Email</Label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                                <Input
                                  type="email"
                                  placeholder="your.email@college.edu"
                                  className="pl-12 h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold uppercase text-xs"
                                  value={registerData.email}
                                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                  required
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {regStep === 2 && (
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">USN / ID</Label>
                                <Input
                                  placeholder="4MW..."
                                  className="h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold uppercase text-xs"
                                  value={registerData.usn}
                                  onChange={(e) => setRegisterData({ ...registerData, usn: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">BRANCH</Label>
                                <Input
                                  placeholder="CSE / ECE"
                                  className="h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold uppercase text-xs"
                                  value={registerData.branch}
                                  onChange={(e) => setRegisterData({ ...registerData, branch: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">CURRENT YEAR</Label>
                                <Input
                                  placeholder="e.g. 2nd Year"
                                  className="h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold text-xs"
                                  value={registerData.year}
                                  onChange={(e) => setRegisterData({ ...registerData, year: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">SEMESTER</Label>
                                <Input
                                  placeholder="SEM"
                                  className="h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold text-xs"
                                  value={registerData.semester}
                                  onChange={(e) => setRegisterData({ ...registerData, semester: e.target.value })}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {regStep === 3 && (
                          <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Initialize Key</Label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                                <Input
                                  type="password"
                                  placeholder="MINIMUM 8 CHARS"
                                  className="pl-12 h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold text-sm tracking-widest"
                                  value={registerData.password}
                                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Confirm Integrity</Label>
                              <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                                <Input
                                  type="password"
                                  placeholder="RE-ENTER KEY"
                                  className="pl-12 h-14 bg-muted/10 border-sidebar-border/30 rounded-xl font-bold text-sm tracking-widest"
                                  value={registerData.confirmPassword}
                                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                  required
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-4">
                      {regStep > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setRegStep(regStep - 1)}
                          className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest border border-sidebar-border/30 rounded-xl"
                        >
                          Previous
                        </Button>
                      )}
                      <Button type="submit" disabled={isLoading} className="flex-[2] h-14 gradient-secondary shadow-glow font-black uppercase tracking-[0.2em] text-xs rounded-xl group">
                        {isLoading ? (
                          <Activity className="w-5 h-5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-2">
                            {regStep === 3 ? 'Complete Registration' : 'Next Step'}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </motion.form>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security Footer */}
        <motion.div variants={itemVariants} className="mt-8 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground/40 font-black uppercase tracking-[0.2em] text-[7px]">
            <Lock className="w-2.5 h-2.5" />
            End-to-End Encryption Enabled
            <Lock className="w-2.5 h-2.5" />
          </div>
          <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.15em] leading-relaxed px-6">
            Student Portal v1.0.0 • System monitored for academic integrity.
            Please ensure you provide the correct email registered with your faculty.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default StudentAppLogin;
