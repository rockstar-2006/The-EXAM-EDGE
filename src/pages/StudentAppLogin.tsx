import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, Shield, Eye, EyeOff, GraduationCap, ChevronRight, Loader2, Info } from 'lucide-react';
import { studentAuthAPI, storage } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentAuth } from '../context/StudentAuthContext';

const StudentAppLogin = () => {
  const { updateStudentData } = useStudentAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    const token = storage.getItem('studentToken');
    const data = storage.getItem('studentData');
    if (token && data) {
      navigate('/student/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Email and Password are required');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔵 Starting login attempt for:', loginData.email);
      const response = await studentAuthAPI.login({ email: loginData.email, password: loginData.password });
      
      // Detailed logging for success
      console.log('✅ Login response received:', response.data.success);
      
      updateStudentData(response.data.student, response.data.token);
      toast.success('Login Successful');
      navigate('/student/dashboard');
    } catch (error: any) {
      console.error('❌ Login Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Invalid email or password';
      toast.error(errorMessage);
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
      toast.success('Recovery link sent');
      setShowForgot(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send recovery link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFDFF] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Soft background elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[120px] -mr-[300px] -mt-[300px] animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-50/40 rounded-full blur-[120px] -ml-[300px] -mb-[300px] animate-pulse" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Minimalist Professional Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-indigo-100/50 border border-slate-50 mb-8 transform hover:scale-110 transition-transform">
            <GraduationCap className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Student Portal</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Student Login</p>
        </motion.div>

        <Card className="border-slate-100/80 shadow-2xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-2 animate-in zoom-in-95 duration-500">
          <CardHeader className="p-10 pb-4">
            <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">
              {showForgot ? 'Account Recovery' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-semibold text-xs mt-1">
              {showForgot ? 'Enter your institutional email address' : 'Enter your credentials to access the portal'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-10 pt-4">
            <AnimatePresence mode="wait">
              {showForgot ? (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleForgotPassword}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Institutional Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <Input
                        type="email"
                        placeholder="yourname@college.edu"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-14 pl-14 bg-slate-50/50 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 rounded-2xl font-bold transition-all uppercase tracking-widest text-xs">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Recovery Link'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForgot(false)}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    Return to Login
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleLogin}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</Label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                          type="email"
                          placeholder="yourname@college.edu"
                          className="h-14 pl-14 bg-slate-50/80 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Password</Label>
                        <button
                          type="button"
                          onClick={() => setShowForgot(true)}
                          className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-tighter"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Your USN is the initial password"
                          className="h-14 pl-14 pr-14 bg-slate-50/80 border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700 tracking-wide"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-15 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-200 rounded-2xl font-bold transition-all group py-7 uppercase tracking-[0.2em] text-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <span className="flex items-center justify-center gap-3">
                          Login
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Professional Support Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex items-start gap-5 p-6 bg-white/50 border border-slate-100 rounded-3xl backdrop-blur-sm"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
            <Info className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Login Guide</p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              If this is your first time, use your <span className="text-indigo-600 font-black">University Serial Number (USN)</span> as the initial password.
            </p>
          </div>
        </motion.div>

        {/* Global Security Disclaimer */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="h-px w-10 bg-slate-100" />
          <div className="flex items-center gap-2.5 text-slate-300">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Secure Student Portal</span>
          </div>
          <div className="h-px w-10 bg-slate-100" />
        </div>
      </div>
    </div>
  );
};

export default StudentAppLogin;
