import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Lock, Shield, Eye, EyeOff, Save, Loader2, Sparkles, Cpu, CheckCircle2 } from 'lucide-react';
import { teacherAuthAPI, studentAuthAPI } from '@/services/api';
import { motion } from 'framer-motion';

interface SettingsPageProps {
  type: 'teacher' | 'student';
}

export default function SettingsPage({ type }: SettingsPageProps) {
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // AI Configuration state (For Faculty)
  const [aiProvider, setAiProvider] = useState<'system_default' | 'gemini' | 'groq' | 'claude'>('system_default');
  const [aiKey, setAiKey] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    if (type === 'teacher') {
      setIsLoadingAI(true);
      teacherAuthAPI.getAISettings()
        .then(res => {
          if (res.data?.success && res.data.data) {
            const d = res.data.data;
            setAiProvider(d.provider || 'system_default');
            setAiKey(d.apiKey || '');
            setAiModel(d.modelName || 'gemini-2.5-flash');
            setCustomPrompt(d.customPrompt || '');
          }
        })
        .catch(err => console.warn('Could not load AI settings', err))
        .finally(() => setIsLoadingAI(false));
    }
  }, [type]);

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

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAI(true);
    try {
      await teacherAuthAPI.updateAISettings({
        provider: aiProvider,
        apiKey: aiKey,
        modelName: aiModel,
        customPrompt: customPrompt
      });
      toast.success('AI Model & Prompt Persona saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save AI configuration');
    } finally {
      setIsSavingAI(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* 1. AI MODEL & CUSTOM PROMPT CONFIGURATION (Faculty Only) */}
      {type === 'teacher' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-sidebar-border/60 shadow-xl bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden border">
            <CardHeader className="p-6 sm:p-8 pb-4 border-b border-sidebar-border/30">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl border border-indigo-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">AI Assessment Engine & Custom Persona</CardTitle>
                  <CardDescription className="text-xs font-semibold mt-1">
                    Configure your preferred AI model (Gemini, Groq, Claude) and customize the exact question-generation directive.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 pt-6">
              {isLoadingAI ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <form onSubmit={handleSaveAISettings} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Provider</Label>
                      <Select value={aiProvider} onValueChange={(val: any) => {
                        setAiProvider(val);
                        if (val === 'gemini') setAiModel('gemini-2.5-flash');
                        if (val === 'groq') setAiModel('llama-3.3-70b-versatile');
                        if (val === 'claude') setAiModel('claude-3-5-sonnet-20241022');
                      }}>
                        <SelectTrigger className="h-12 rounded-xl bg-muted/40 font-semibold">
                          <SelectValue placeholder="Choose provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system_default">Default Server Gemini</SelectItem>
                          <SelectItem value="gemini">Google Gemini (Own Key)</SelectItem>
                          <SelectItem value="groq">Groq Cloud (Llama 3.3 / Ultra-Fast)</SelectItem>
                          <SelectItem value="claude">Anthropic Claude (Sonnet / Opus)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Model Name</Label>
                      <Input
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder="e.g. gemini-2.5-flash or llama-3.3-70b-versatile"
                        className="h-12 rounded-xl bg-muted/40 font-semibold"
                      />
                      {/* Quick Model Selector Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {aiProvider === 'gemini' || aiProvider === 'system_default' ? (
                          <>
                            {['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setAiModel(m)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                                  aiModel === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </>
                        ) : aiProvider === 'groq' ? (
                          <>
                            {['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setAiModel(m)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                                  aiModel === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </>
                        ) : aiProvider === 'claude' ? (
                          <>
                            {['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setAiModel(m)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                                  aiModel === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {aiProvider !== 'system_default' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Private API Key</Label>
                      <div className="relative">
                        <Input
                          type={showAiKey ? 'text' : 'password'}
                          value={aiKey}
                          onChange={(e) => setAiKey(e.target.value)}
                          placeholder={`Enter your ${aiProvider.toUpperCase()} API Key`}
                          className="h-12 pr-12 rounded-xl bg-muted/40 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAiKey(!showAiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Your key is stored securely and used only for your quizzes.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Custom Master Generation Directive / Persona
                    </Label>
                    <Textarea
                      rows={3}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g., 'Emphasize real-world application, tricky edge cases, and code output prediction. Avoid textbook definition questions.'"
                      className="rounded-xl bg-muted/40 font-medium text-sm resize-none"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      This custom directive will be injected into every AI quiz you generate.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingAI}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs gap-2"
                  >
                    {isSavingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save AI Configuration & Directive
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 2. PASSWORD SECURITY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-sidebar-border/60 shadow-xl bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden border">
          <CardHeader className="p-6 sm:p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Security Credentials</CardTitle>
                <CardDescription className="text-xs font-semibold mt-1">
                  Manage your account access password
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 pt-4">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Current Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium rounded-xl"
                    placeholder="Enter current password"
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
                    className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium rounded-xl"
                    placeholder="Minimum 8 characters"
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
                    className="pl-10 pr-10 h-12 bg-muted/30 border-sidebar-border focus:ring-primary/20 transition-all font-medium rounded-xl"
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
                className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-bold uppercase tracking-wider text-xs gap-2 mt-4"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Commit Password Update
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
