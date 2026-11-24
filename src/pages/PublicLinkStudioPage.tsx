import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Globe,
  Copy,
  ExternalLink,
  Save,
  ArrowLeft,
  Settings,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Shield,
  Eye,
  Sliders,
  HelpCircle,
  Clock,
  Sparkles,
  Loader2,
  User,
  GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { quizAPI, publicQuizAPI } from '@/services/api';

export default function PublicLinkStudioPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);

  // Form Configuration State
  const [isPublicLinkEnabled, setIsPublicLinkEnabled] = useState(true);
  const [requireName, setRequireName] = useState(true);
  const [nameLabel, setNameLabel] = useState('Full Name');
  const [namePlaceholder, setNamePlaceholder] = useState('Enter your first and last name');

  const [requireRollNo, setRequireRollNo] = useState(true);
  const [rollNoLabel, setRollNoLabel] = useState('Roll Number / USN / Reg No');
  const [rollNoPlaceholder, setRollNoPlaceholder] = useState('e.g. 4SO21CS001 or ROLL-24');

  const [requireAcademicLevel, setRequireAcademicLevel] = useState(true);
  const [academicLevelLabel, setAcademicLevelLabel] = useState('Class / Academic Level');
  const [academicLevels, setAcademicLevels] = useState<string[]>([
    'High School (8th - 10th)',
    '1st PUC / 11th Grade',
    '2nd PUC / 12th Grade',
    'Diploma',
    'Undergraduate - 1st Year',
    'Undergraduate - 2nd Year',
    'Undergraduate - 3rd Year',
    'Undergraduate - 4th Year',
    'Postgraduate / Masters',
    'Other'
  ]);
  const [newLevelOption, setNewLevelOption] = useState('');

  const [requireBranch, setRequireBranch] = useState(false);
  const [branchLabel, setBranchLabel] = useState('Stream / Department / Branch');
  const [branchPlaceholder, setBranchPlaceholder] = useState('e.g. Science / Computer Science');

  const [requireSection, setRequireSection] = useState(false);
  const [sectionLabel, setSectionLabel] = useState('Section / Division');
  const [sectionPlaceholder, setSectionPlaceholder] = useState('e.g. Section A');

  const [requireEmail, setRequireEmail] = useState(false);
  const [requirePhone, setRequirePhone] = useState(false);
  const [allowInstantResults, setAllowInstantResults] = useState(true);

  // 1. Fetch Quiz & Current Form Settings
  useEffect(() => {
    if (!quizId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await quizAPI.getById(quizId);
        const q = res.data;
        setQuiz(q);

        if (typeof q.isPublicLinkEnabled !== 'undefined') {
          setIsPublicLinkEnabled(q.isPublicLinkEnabled);
        }

        const cfg = q.publicRegistrationConfig || {};
        if (typeof cfg.requireName !== 'undefined') setRequireName(cfg.requireName);
        if (cfg.nameLabel) setNameLabel(cfg.nameLabel);

        if (typeof cfg.requireRollNo !== 'undefined') setRequireRollNo(cfg.requireRollNo);
        if (cfg.rollNoLabel) setRollNoLabel(cfg.rollNoLabel);

        if (typeof cfg.requireAcademicLevel !== 'undefined') setRequireAcademicLevel(cfg.requireAcademicLevel);
        if (cfg.academicLevelLabel) setAcademicLevelLabel(cfg.academicLevelLabel);
        if (Array.isArray(cfg.academicLevels) && cfg.academicLevels.length > 0) {
          setAcademicLevels(cfg.academicLevels);
        }

        if (typeof cfg.requireBranch !== 'undefined') setRequireBranch(cfg.requireBranch);
        if (cfg.branchLabel) setBranchLabel(cfg.branchLabel);

        if (typeof cfg.requireSection !== 'undefined') setRequireSection(cfg.requireSection);
        if (cfg.sectionLabel) setSectionLabel(cfg.sectionLabel);

        if (typeof cfg.requireEmail !== 'undefined') setRequireEmail(cfg.requireEmail);
        if (typeof cfg.requirePhone !== 'undefined') setRequirePhone(cfg.requirePhone);
        if (typeof cfg.allowInstantResults !== 'undefined') setAllowInstantResults(cfg.allowInstantResults);

      } catch (err: any) {
        console.error('Failed to load quiz settings:', err);
        toast.error('Could not load quiz settings');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [quizId]);

  const isDesktopOrCap = typeof window !== 'undefined' && (
    Boolean((window as any).desktopSecurity) || 
    window.location.pathname.endsWith('.html')
  );
  const publicUrl = isDesktopOrCap
    ? `${window.location.origin}/#/quiz/public/${quizId}`
    : `${window.location.origin}/quiz/public/${quizId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    toast.success('🌐 Public Exam Link Copied!', {
      description: 'Share this link anywhere. Students can register and take the proctored exam in any browser without logging in.'
    });
  };

  const handleAddLevel = () => {
    if (!newLevelOption.trim()) return;
    if (academicLevels.includes(newLevelOption.trim())) {
      toast.info('Option already exists');
      return;
    }
    setAcademicLevels(prev => [...prev, newLevelOption.trim()]);
    setNewLevelOption('');
    toast.success('Added class/level option');
  };

  const handleRemoveLevel = (index: number) => {
    if (academicLevels.length <= 1) {
      toast.error('At least one class/level option is required');
      return;
    }
    setAcademicLevels(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const configPayload = {
        requireName,
        nameLabel: nameLabel.trim() || 'Full Name',
        requireRollNo,
        rollNoLabel: rollNoLabel.trim() || 'Roll Number / USN',
        requireAcademicLevel,
        academicLevelLabel: academicLevelLabel.trim() || 'Class / Academic Level',
        academicLevels,
        requireBranch,
        branchLabel: branchLabel.trim() || 'Stream / Branch',
        requireSection,
        sectionLabel: sectionLabel.trim() || 'Section',
        requireEmail,
        requirePhone,
        allowInstantResults
      };

      await publicQuizAPI.updatePublicConfig(quizId!, {
        isPublicLinkEnabled,
        publicRegistrationConfig: configPayload
      });

      toast.success('Student Entry Form & Public Link settings saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Loading Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black uppercase">
                🌐 Public Web Studio
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{quiz?.questions?.length || 0} Questions • {quiz?.duration || 30} Mins</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-0.5">
              {quiz?.title || 'Assessment'}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.open(publicUrl, '_blank')}
            className="h-11 px-4 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Student View</span>
          </Button>
          <Button
            onClick={handleCopyLink}
            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 shadow-sm"
          >
            <Copy className="w-4 h-4" />
            <span>{copiedLink ? '✓ Copied Link' : 'Copy Public Link'}</span>
          </Button>
          <Button
            disabled={saving}
            onClick={handleSaveSettings}
            className="h-11 px-6 gradient-primary text-white text-xs font-black uppercase tracking-wider shadow-glow gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Form Settings</span>
          </Button>
        </div>
      </div>

      {/* Shareable Link Banner */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-indigo-50/80 shadow-xs rounded-2xl overflow-hidden p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <p className="text-xs font-black uppercase tracking-wider text-indigo-950">Active Public Examination Link</p>
            </div>
            <p className="text-xs text-indigo-800 font-medium leading-relaxed">
              Anyone with this link can open the examination in any browser (Chrome, Edge, Safari, Firefox). Students enter their details on your custom registration form, then proceed into lockdown examination mode.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-indigo-200 text-xs font-mono font-bold text-slate-800 select-all max-w-md truncate">
              {publicUrl}
            </div>
            <Button
              size="sm"
              onClick={handleCopyLink}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Visual Form Customizer (Google Forms Builder Style) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-sidebar-border shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-sidebar-border pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black flex items-center gap-2 text-foreground">
                    <Sliders className="w-5 h-5 text-primary" />
                    Student Registration Form Builder
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                    Customize the text boxes, labels, and dropdowns that students fill out before entering the quiz.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted/60 p-1.5 px-3 rounded-xl border border-border">
                  <Label className="text-[11px] font-bold text-foreground">Public Access</Label>
                  <Switch
                    checked={isPublicLinkEnabled}
                    onCheckedChange={setIsPublicLinkEnabled}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Field 1: Full Name */}
              <div className="p-4 rounded-2xl border border-muted bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black uppercase text-foreground">1. Student Full Name</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-bold text-emerald-700 bg-emerald-50">
                    Always Required
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Field Label</Label>
                    <Input
                      value={nameLabel}
                      onChange={(e) => setNameLabel(e.target.value)}
                      placeholder="Full Name"
                      className="h-10 text-xs font-bold mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Placeholder Hint</Label>
                    <Input
                      value={namePlaceholder}
                      onChange={(e) => setNamePlaceholder(e.target.value)}
                      placeholder="Enter your first and last name"
                      className="h-10 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Field 2: Roll Number / USN / Reg No */}
              <div className="p-4 rounded-2xl border border-muted bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black uppercase text-foreground">2. Roll Number / USN / Reg ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Include</span>
                    <Switch
                      checked={requireRollNo}
                      onCheckedChange={setRequireRollNo}
                    />
                  </div>
                </div>

                {requireRollNo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Field Label</Label>
                      <Input
                        value={rollNoLabel}
                        onChange={(e) => setRollNoLabel(e.target.value)}
                        placeholder="Roll Number / USN"
                        className="h-10 text-xs font-bold mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Placeholder Hint</Label>
                      <Input
                        value={rollNoPlaceholder}
                        onChange={(e) => setRollNoPlaceholder(e.target.value)}
                        placeholder="e.g. 4SO21CS001"
                        className="h-10 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3: Class / Academic Level Dropdown with Options Editor */}
              <div className="p-4 rounded-2xl border border-muted bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black uppercase text-foreground">3. Class / Academic Level</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Include</span>
                    <Switch
                      checked={requireAcademicLevel}
                      onCheckedChange={setRequireAcademicLevel}
                    />
                  </div>
                </div>

                {requireAcademicLevel && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Field Label</Label>
                      <Input
                        value={academicLevelLabel}
                        onChange={(e) => setAcademicLevelLabel(e.target.value)}
                        placeholder="Class / Academic Level"
                        className="h-10 text-xs font-bold mt-1"
                      />
                    </div>

                    {/* Options list */}
                    <div className="space-y-2 pt-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        Dropdown Options (High School, PUC, College, Degree, etc.)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {academicLevels.map((lvl, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs py-1 px-2.5 font-bold bg-white text-slate-800 border-slate-300 gap-1.5"
                          >
                            <span>{lvl}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLevel(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>

                      {/* Add new option input */}
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={newLevelOption}
                          onChange={(e) => setNewLevelOption(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLevel(); } }}
                          placeholder="Type new option (e.g. 10th Standard or 1st PUC)..."
                          className="h-9 text-xs font-medium"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddLevel}
                          className="h-9 px-3 bg-slate-800 text-white font-bold text-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 4: Stream / Branch / Department */}
              <div className="p-4 rounded-2xl border border-muted bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-foreground">4. Stream / Branch / Department</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Include</span>
                    <Switch
                      checked={requireBranch}
                      onCheckedChange={setRequireBranch}
                    />
                  </div>
                </div>

                {requireBranch && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Field Label</Label>
                      <Input
                        value={branchLabel}
                        onChange={(e) => setBranchLabel(e.target.value)}
                        className="h-10 text-xs font-bold mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Placeholder</Label>
                      <Input
                        value={branchPlaceholder}
                        onChange={(e) => setBranchPlaceholder(e.target.value)}
                        className="h-10 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Field 5: Section / Division */}
              <div className="p-4 rounded-2xl border border-muted bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-foreground">5. Section / Division</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Include</span>
                    <Switch
                      checked={requireSection}
                      onCheckedChange={setRequireSection}
                    />
                  </div>
                </div>

                {requireSection && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Field Label</Label>
                      <Input
                        value={sectionLabel}
                        onChange={(e) => setSectionLabel(e.target.value)}
                        className="h-10 text-xs font-bold mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Placeholder</Label>
                      <Input
                        value={sectionPlaceholder}
                        onChange={(e) => setSectionPlaceholder(e.target.value)}
                        className="h-10 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Field 6 & 7: Email & Instant Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-muted bg-card/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-foreground uppercase">Require Email</p>
                    <p className="text-[10px] text-muted-foreground">Collect student email address</p>
                  </div>
                  <Switch
                    checked={requireEmail}
                    onCheckedChange={setRequireEmail}
                  />
                </div>

                <div className="p-4 rounded-2xl border border-muted bg-card/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-foreground uppercase">Instant Scores</p>
                    <p className="text-[10px] text-muted-foreground">Show marks upon completion</p>
                  </div>
                  <Switch
                    checked={allowInstantResults}
                    onCheckedChange={setAllowInstantResults}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/10 border-t border-sidebar-border p-5 flex justify-end">
              <Button
                disabled={saving}
                onClick={handleSaveSettings}
                className="h-12 px-8 gradient-primary text-white font-black text-xs uppercase tracking-wider shadow-glow rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                <span>Save All Form Settings</span>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* RIGHT COLUMN: Live Interactive Student Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Eye className="w-4 h-4 text-primary" />
              <span>Live Student Form Preview</span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              Realtime Updates
            </Badge>
          </div>

          {/* Student Form Mockup Card */}
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 text-white">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-950 p-4 rounded-2xl border border-indigo-800/40 space-y-2">
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[9px] font-bold">
                Student Entrance Form
              </Badge>
              <h3 className="font-black text-lg text-white leading-tight">{quiz?.title}</h3>
              <p className="text-[11px] text-slate-300">
                {quiz?.numQuestions || quiz?.questions?.length || 0} Questions • {quiz?.duration || 30} Mins Duration
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              {/* Full Name */}
              <div className="space-y-1">
                <span className="font-bold text-slate-300">{nameLabel} *</span>
                <div className="h-10 bg-slate-900 border border-slate-700/80 rounded-xl px-3 flex items-center text-slate-500 text-xs">
                  {namePlaceholder}
                </div>
              </div>

              {/* Roll No */}
              {requireRollNo && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-300">{rollNoLabel} *</span>
                  <div className="h-10 bg-slate-900 border border-slate-700/80 rounded-xl px-3 flex items-center text-slate-500 text-xs font-mono">
                    {rollNoPlaceholder}
                  </div>
                </div>
              )}

              {/* Academic Level */}
              {requireAcademicLevel && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-300">{academicLevelLabel} *</span>
                  <div className="h-10 bg-slate-900 border border-slate-700/80 rounded-xl px-3 flex items-center justify-between text-slate-400 text-xs">
                    <span>{academicLevels[0] || 'Select level'}</span>
                    <span className="text-[10px] text-slate-500">▼</span>
                  </div>
                </div>
              )}

              {/* Branch */}
              {requireBranch && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-300">{branchLabel}</span>
                  <div className="h-10 bg-slate-900 border border-slate-700/80 rounded-xl px-3 flex items-center text-slate-500 text-xs">
                    {branchPlaceholder}
                  </div>
                </div>
              )}

              {/* Section */}
              {requireSection && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-300">{sectionLabel}</span>
                  <div className="h-10 bg-slate-900 border border-slate-700/80 rounded-xl px-3 flex items-center text-slate-500 text-xs">
                    {sectionPlaceholder}
                  </div>
                </div>
              )}

              {/* Email */}
              {requireEmail && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-300">Email Address *</span>
                  <div className="h-10 bg-slate-900 border border-slate-700/80 rounded-xl px-3 flex items-center text-slate-500 text-xs">
                    student@institution.edu
                  </div>
                </div>
              )}

              {/* Start Button Simulation */}
              <div className="pt-2">
                <div className="w-full h-11 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md">
                  Proceed to Examination Lockdown →
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
