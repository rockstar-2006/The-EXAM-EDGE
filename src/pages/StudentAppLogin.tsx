import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, Shield, Eye, EyeOff, GraduationCap, ChevronRight, Loader2, Info } from 'lucide-react';
import { studentAuthAPI, storage } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

const StudentAppLogin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Identity and Security Key are required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await studentAuthAPI.login({ email: loginData.email, password: loginData.password });
      storage.setItem('studentToken', response.data.token);
      storage.setItem('studentData', JSON.stringify(response.data.student));
      toast.success('Access Granted: Welcome back!');
      navigate('/student/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed. Check your credentials.');
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
      toast.success('Recovery link transmitted successfully');
      setShowForgot(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Recovery transmission failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Soft background elements for depth without heavy GPU load */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl -mr-[250px] -mt-[250px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl -ml-[250px] -mb-[250px]" />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Minimalist Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Identity verification required</p>
        </motion.div>

        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/40 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden border-t-0 ring-1 ring-slate-100">
          {/* Subtle Progress Bar-like indicator */}
          <div className="h-1 w-full bg-slate-50 relative overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: isLoading ? '0%' : '-100%' }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="absolute inset-0 bg-indigo-500 w-1/3"
            />
          </div>

          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800">
              {showForgot ? 'Account Recovery' : 'Log In'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium text-xs">
              {showForgot ? 'Enter your institutional email' : 'Access your assessments and results'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-2">
            <AnimatePresence mode="wait">
              {showForgot ? (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleForgotPassword}
                  className="space-y-6"
                >
                  <div className="space-y-2.5">
                    <Label className="text-xs font-semibold text-slate-700 pl-1">Institutional Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="yourname@college.edu"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-12 pl-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:ring-indigo-100 transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 rounded-xl font-bold transition-all">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Recovery Link'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForgot(false)}
                    className="w-full text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    Back to Knowledge Portal
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleLogin}
                  className="space-y-6"
                >
                  <div className="space-y-5">
                    <div className="space-y-2.5">
                      <Label className="text-xs font-semibold text-slate-700 pl-1">Identity (Email)</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="Your college email"
                          className="h-12 pl-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:ring-indigo-100 transition-all font-medium"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 pl-1">Access Key</Label>
                        <button
                          type="button"
                          onClick={() => setShowForgot(true)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          Forgot Key?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Initially your USN"
                          className="h-12 pl-12 pr-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:ring-indigo-100 transition-all font-medium"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-indigo-600 hover:bg-blue-700 text-white shadow-lg shadow-indigo-100 rounded-xl font-bold transition-all group"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Enter Assessment Portal
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Informational Tooltip / Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm"
        >
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">First Time Access?</p>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-1 font-medium">
              Use your <span className="text-indigo-600 font-bold">University Serial Number (USN)</span> as the initial Access Key. You can change this later in settings.
            </p>
          </div>
        </motion.div>

        {/* Security Badge */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">End-to-End Encrypted</span>
          </div>
          <div className="h-px w-8 bg-slate-200" />
        </div>
      </div>
    </div>
  );
};

export default StudentAppLogin;
