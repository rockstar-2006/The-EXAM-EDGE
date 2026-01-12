import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, AlertCircle, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail } from '@/utils/validators';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherAuthAPI } from '@/services/api';
import { toast } from 'sonner';

export function LoginCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Invalid credentials');
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await teacherAuthAPI.forgotPassword(forgotEmail);
      toast.success('Reset link sent to your email');
      setShowForgot(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain uppercase, lowercase, and a number');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Registration failed');
    }

    setLoading(false);
  };

  const formVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md"
    >
      <Card className="shadow-elevated border-sidebar-border/50 relative overflow-hidden backdrop-blur-sm bg-card/95">
        <div className="absolute top-0 left-0 w-full h-1.5 gradient-primary" />
        <CardHeader className="space-y-4 text-center pt-8 pb-6">
          <motion.div
            initial={{ rotate: -20, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="mx-auto relative"
          >
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-glow group">
              <GraduationCap className="w-9 h-9 text-white group-hover:scale-110 transition-transform" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2 text-primary"
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
          </motion.div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tighter italic">
              FACULTY<span className="text-primary italic">QUEST</span>
            </CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground/60">
              Advanced Faculty Terminal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <div className="w-full space-y-8">
            {!showForgot && (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg data-[state=active]:shadow-md font-bold text-xs uppercase tracking-wider">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-lg data-[state=active]:shadow-md font-bold text-xs uppercase tracking-wider">Join Us</TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <TabsContent value="login" key="login">
                    <motion.form
                      variants={formVariants}
                      initial="hidden"
                      animate="show"
                      onSubmit={handleLogin}
                      className="space-y-4"
                    >
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <Alert variant="destructive" className="py-2.5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                          </Alert>
                        </motion.div>
                      )}

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                          Identity (Email)
                        </Label>
                        <div className="group relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="admin@college.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                            disabled={loading}
                          />
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                          Security Key
                        </Label>
                        <div className="group relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                            disabled={loading}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgot(true);
                              setForgotEmail(email);
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                          >
                            Forgot security key?
                          </button>
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="pt-2">
                        <Button
                          type="submit"
                          className="w-full h-12 gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-[0.1em]"
                          disabled={loading}
                        >
                          {loading ? <span className="animate-pulse">Authorizing...</span> : (
                            <span className="flex items-center gap-2">
                              Access Terminal <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    </motion.form>
                  </TabsContent>

                  <TabsContent value="register" key="register">
                    <motion.form
                      variants={formVariants}
                      initial="hidden"
                      animate="show"
                      onSubmit={handleRegister}
                      className="space-y-4"
                    >
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <Alert variant="destructive" className="py-2.5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                          </Alert>
                        </motion.div>
                      )}

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="register-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Full Name</Label>
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Professor Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                          disabled={loading}
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="register-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Identity (Email)</Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="faculty@college.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                          disabled={loading}
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="register-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Security Key</Label>
                        <div className="group relative">
                          <Input
                            id="register-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            disabled={loading}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="pt-2">
                        <Button
                          type="submit"
                          className="w-full h-12 gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-[0.1em]"
                          disabled={loading}
                        >
                          {loading ? <span className="animate-pulse">Processing...</span> : 'Initialize Account'}
                        </Button>
                      </motion.div>
                    </motion.form>
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            )}

            {showForgot && (
              <motion.form
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={handleForgotPassword}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Recover Access</Label>
                  <p className="text-[10px] text-muted-foreground font-medium italic">Enter your academic email to receive a reset token.</p>
                  <div className="group relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="admin@college.edu"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10 h-12 bg-muted/30 border-sidebar-border"
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 gradient-primary font-black uppercase tracking-wider shadow-glow" disabled={loading}>
                  {loading ? 'Transmitting...' : 'Send Reset Token'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForgot(false)}
                  className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Return to Login
                </Button>
              </motion.form>
            )}
          </div>
        </CardContent>
      </Card>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-6 text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground/40"
      >
        Encrypted Faculty Access • v1.0.5
      </motion.p>
    </motion.div>
  );
}
