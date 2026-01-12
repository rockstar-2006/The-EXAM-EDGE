import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { storage } from "./services/api";

import LoadingScreen from "./components/LoadingScreen";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import CreateQuizPage from "./pages/CreateQuizPage";
import BookmarksPage from "./pages/BookmarksPage";
import StudentQuizPage from "./pages/StudentQuizPage";
import QuizResultsPage from "./pages/QuizResultsPage";
import ResultsPage from "./pages/ResultsPage";
import SettingsPage from "./pages/SettingsPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

import StudentAppLogin from "./pages/StudentAppLogin";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSecureQuiz from "./pages/StudentSecureQuiz";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import UpdateManager from "./components/UpdateManager";

const queryClient = new QueryClient();

const isNativeApp =
  Capacitor.getPlatform() === 'android' ||
  Capacitor.getPlatform() === 'ios';

const AppContent = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // Small delay for branding
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Auto-login check
      const studentToken = storage.getItem('studentToken');
      const teacherToken = storage.getItem('teacherToken') || storage.getItem('token');

      const currentPath = window.location.hash || window.location.pathname;

      if (studentToken && !currentPath.includes('/student/dashboard')) {
        navigate('/student/dashboard', { replace: true });
      } else if (teacherToken && !currentPath.includes('/dashboard')) {
        navigate('/dashboard', { replace: true });
      }

      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Root Directs */}
      <Route path="/" element={
        isNativeApp
          ? <Navigate to="/student/login" replace />
          : <Navigate to="/login" replace />
      } />

      {/* Teacher Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/create-quiz" element={<CreateQuizPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/settings" element={<SettingsPage type="teacher" />} />
        <Route path="/quiz/:quizId/results" element={<QuizResultsPage />} />
      </Route>

      {/* Student Portal Routes */}
      <Route path="/student/login" element={<StudentAppLogin />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/settings" element={<SettingsPage type="student" />} />
      <Route path="/student/quiz/:quizId" element={<StudentSecureQuiz />} />
      <Route path="/student/reset-password/:token" element={<ResetPasswordPage type="student" />} />

      {/* Shared/Public Routes */}
      <Route path="/reset-password/:token" element={<ResetPasswordPage type="teacher" />} />
      <Route path="/quiz/attempt/:token" element={<StudentQuizPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const Router = isNativeApp ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UpdateManager />
        <Toaster />
        <Sonner />
        <Router>
          <AppContent />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;