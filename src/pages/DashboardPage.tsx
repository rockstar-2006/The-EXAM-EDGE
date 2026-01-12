import { useEffect, useState } from 'react';
import { Quiz } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Bookmark, TrendingUp, Sparkles, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import { studentsAPI, quizAPI, bookmarksAPI } from '@/services/api';
import { toast } from 'sonner';
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [savedQuizzes, setSavedQuizzes] = useState<Quiz[]>([]);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsData, quizzesData, bookmarksData] = await Promise.all([
          studentsAPI.getAll(),
          quizAPI.getAll(),
          bookmarksAPI.getAll()
        ]);
        setStudents(studentsData.data || []);
        setSavedQuizzes(quizzesData.data || []);
        setBookmarkedQuestions(bookmarksData.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      title: 'Total Students',
      value: students.length,
      icon: Users,
      description: 'Uploaded student records',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Quizzes Created',
      value: savedQuizzes.length,
      icon: FileText,
      description: 'AI-generated quizzes',
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Bookmarked',
      value: bookmarkedQuestions.length,
      icon: Bookmark,
      description: 'Saved for later use',
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Questions',
      value: savedQuizzes.reduce((acc, quiz) => acc + quiz.questions.length, 0),
      icon: TrendingUp,
      description: 'Questions generated',
      gradient: 'from-emerald-500/20 to-green-500/20',
      iconColor: 'text-emerald-500',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24
      }
    }
  };

  if (loading) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
            <Sparkles className="w-4 h-4" />
            Faculty Management Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">
            Welcome back, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Professor</span>
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-2xl">
            Access your academic dashboard to manage student records, create assessments, and review performance reports.
          </p>
        </div>
        <Button size="lg" className="gradient-primary shadow-glow hover:scale-105 transition-all group" asChild>
          <Link to="/create-quiz">
            <FileText className="w-5 h-5 mr-2" />
            Create New Quiz
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="relative overflow-hidden group hover:shadow-elevated transition-all duration-500 border-sidebar-border/50">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2.5 rounded-xl bg-muted group-hover:bg-white dark:group-hover:bg-card transition-colors duration-500", stat.iconColor)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black tracking-tighter mb-1">{stat.value}</div>
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Quick Portals
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/students" className="group">
              <Card className="h-full border-sidebar-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                  <Users className="w-20 h-20" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg group-hover:shadow-glow transition-all">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Student Database</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    Import, manage, and view detailed records for all student cohorts.
                  </p>
                  <div className="flex items-center text-primary text-sm font-bold group-hover:gap-2 transition-all">
                    Access Portal <ChevronRight className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/bookmarks" className="group">
              <Card className="h-full border-sidebar-border/50 hover:border-secondary/50 transition-all duration-300 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                  <Bookmark className="w-20 h-20" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-glow transition-all bg-gradient-to-br from-secondary to-accent">
                    <Bookmark className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Question Bank</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    Review and reuse your curated collection of AI-generated questions.
                  </p>
                  <div className="flex items-center text-secondary text-sm font-bold group-hover:gap-2 transition-all">
                    View Bank <ChevronRight className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Recent Activity</h2>
          <Card className="border-sidebar-border/50 bg-muted/30">
            <CardContent className="p-4 space-y-4">
              {savedQuizzes.length > 0 ? (
                savedQuizzes.slice(0, 4).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-card border border-sidebar-border/50 hover:border-primary/50 hover:translate-x-1 transition-all duration-300 group cursor-pointer shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold truncate tracking-tight">{quiz.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground/60 flex items-center gap-1 uppercase">
                          <Clock className="w-3 h-3" />
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-bold text-primary/70 uppercase">
                          {quiz.questions.length} Items
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No recent activity detected.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

