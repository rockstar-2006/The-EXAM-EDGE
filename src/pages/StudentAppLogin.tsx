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
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
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
      const response = await studentAuthAPI.login({ email: loginData.email, password: loginData.password });
      storage.setItem('studentToken', response.data.token);
      storage.setItem('studentData', JSON.stringify(response.data.student));
      toast.success('Login Successful: Welcome back!');
      navigate('/student/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      await studentAuthAPI.forgotPassword(forgotEmail);
      toast.success('Reset link sent to your email');
      setShowForgot(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-[100vh] overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] space-y-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="text-center space-y-4"
        >
          <div className="relative inline-block group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-16 h-16 rounded-2xl bg-card border border-sidebar-border/50 shadow-elevated flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-white shadow-glow border-2 border-background">
              <Shield className="w-3 h-3" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-foreground">
              STUDENT <span className="text-primary not-italic">PORTAL</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground font-black uppercase tracking-[0.3em] text-[8px]">
              <Activity className="w-2.5 h-2.5 text-primary" />
              Student Assessment System
              <Activity className="w-2.5 h-2.5 text-primary" />
            </div>
          </div>
        </motion.div>

        <Card className="border-sidebar-border/30 shadow-elevated bg-card/40 backdrop-blur-2xl overflow-hidden rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />

          <CardHeader className="p-8 pb-4 text-center">
            <CardTitle className="text-xl font-black tracking-tight uppercase italic text-foreground">
              {showForgot ? 'Recover Key' : 'Welcome Student'}
            </CardTitle>
            <CardDescription className="font-bold uppercase text-[9px] tracking-widest opacity-40">
              {showForgot ? 'Reset your portal access' : 'Please sign in to access your quizzes'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-0">
            {showForgot ? (
              <motion.form
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleForgotPassword}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Identity (Email)</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input
                      type="email"
                      placeholder="yourname@college.edu"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-14 pl-12 bg-muted/20 border-sidebar-border focus:ring-primary/20 backdrop-blur-xl"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-14 gradient-primary shadow-glow rounded-2xl font-black uppercase tracking-widest group">
                  {isLoading ? <Activity className="w-5 h-5 animate-pulse" /> : (
                    <>
                      Transmit Link
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForgot(false)}
                  className="w-full text-[9px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  Return to login
                </Button>
              </motion.form>
            ) : (
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
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <TabsContent value="login" key="login">
                    <motion.form
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      onSubmit={handleLogin}
                      className="space-y-6"
                    >
                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="login-email" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Identity (Email)</Label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-focus-within:scale-110 transition-transform" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="Your College Email"
                            className="h-14 pl-12 bg-muted/20 border-sidebar-border focus:ring-primary/20 backdrop-blur-xl"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            disabled={isLoading}
                          />
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="login-password" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Security Key</Label>
                        <div className="space-y-3">
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-focus-within:scale-110 transition-transform" />
                            <Input
                              id="login-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="h-14 pl-12 pr-12 bg-muted/20 border-sidebar-border focus:ring-primary/20 backdrop-blur-xl"
                              value={loginData.password}
                              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="text-right px-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowForgot(true);
                                setForgotEmail(loginData.email);
                              }}
                              className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                            >
                              Lost security key?
                            </button>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-14 gradient-primary shadow-glow rounded-2xl font-black uppercase tracking-widest group"
                        >
                          {isLoading ? (
                            <Activity className="w-5 h-5 animate-pulse" />
                          ) : (
                            <>
                              Access Portal
                              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </motion.form>
                  </TabsContent>

                  <TabsContent value="register" key="register">
                    <form onSubmit={handleRegister} className="space-y-6">
                      <AnimatePresence mode="wait">
                        {regStep === 1 && (
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                          >
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Full Name</Label>
                              <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                <Input
                                  placeholder="As per records"
                                  className="h-14 pl-12 bg-muted/20 border-sidebar-border"
                                  value={registerData.name}
                                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Identity (Email)</Label>
                              <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                <Input
                                  type="email"
                                  placeholder="faculty-shared@college.edu"
                                  className="h-14 pl-12 bg-muted/20 border-sidebar-border"
                                  value={registerData.email}
                                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {regStep === 2 && (
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">USN</Label>
                                <Input placeholder="4NM..." className="h-12 bg-muted/20 border-sidebar-border" value={registerData.usn} onChange={(e) => setRegisterData({ ...registerData, usn: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Branch</Label>
                                <Input placeholder="e.g. ISE" className="h-12 bg-muted/20 border-sidebar-border" value={registerData.branch} onChange={(e) => setRegisterData({ ...registerData, branch: e.target.value })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Year</Label>
                                <Input placeholder="e.g. 3rd" className="h-12 bg-muted/20 border-sidebar-border" value={registerData.year} onChange={(e) => setRegisterData({ ...registerData, year: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Semester</Label>
                                <Input placeholder="e.g. 5th" className="h-12 bg-muted/20 border-sidebar-border" value={registerData.semester} onChange={(e) => setRegisterData({ ...registerData, semester: e.target.value })} />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {regStep === 3 && (
                          <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                          >
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Security Key</Label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                <Input
                                  type="password"
                                  placeholder="Create strong key"
                                  className="h-14 pl-12 bg-muted/20 border-sidebar-border"
                                  value={registerData.password}
                                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">Verify Key</Label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                <Input
                                  type="password"
                                  placeholder="Confirm key"
                                  className="h-14 pl-12 bg-muted/20 border-sidebar-border"
                                  value={registerData.confirmPassword}
                                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-3">
                        {regStep > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRegStep(regStep - 1)}
                            className="h-14 px-6 border-sidebar-border rounded-2xl font-black uppercase text-[9px] tracking-widest"
                          >
                            Back
                          </Button>
                        )}
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 h-14 gradient-primary shadow-glow rounded-2xl font-black uppercase tracking-widest group"
                        >
                          {isLoading ? (
                            <Activity className="w-5 h-5 animate-pulse" />
                          ) : (
                            <>
                              {regStep === 3 ? 'Finalize' : 'Continue'}
                              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="flex justify-center gap-2">
                        {[1, 2, 3].map((s) => (
                          <div
                            key={s}
                            className={cn(
                              "w-10 h-1 rounded-full transition-all duration-300",
                              regStep === s ? "bg-primary w-16" : "bg-sidebar-border/30"
                            )}
                          />
                        ))}
                      </div>
                    </form>
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col items-center gap-4 py-4"
        >
          <div className="w-px h-8 bg-gradient-to-b from-primary/50 to-transparent" />
          <div className="flex items-center gap-4 bg-card/40 backdrop-blur-md px-6 py-2.5 rounded-full border border-sidebar-border/30 shadow-sm">
            <BadgeCheck className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-muted-foreground/80">
              Terminal v2.0.1 • Secured Connection
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentAppLogin;
