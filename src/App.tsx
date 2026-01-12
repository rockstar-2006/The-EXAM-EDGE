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
import StudentQuizPage from "./pages/StudentQuizPage"; // For share token links
import QuizResultsPage from "./pages/QuizResultsPage";
import ResultsPage from "./pages/ResultsPage";
import SettingsPage from "./pages/SettingsPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

import StudentAppLogin from "./pages/StudentAppLogin";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSecureQuiz from "./pages/StudentSecureQuiz"; // For authenticated students
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import { UpdateManager } from "./components/UpdateManager";

const queryClient = new QueryClient();

const isNativeApp =
  Capacitor.getPlatform() === 'android' ||
  Capacitor.getPlatform() === 'ios';

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  /* =========================
     📱 MOBILE (STUDENT)
  ========================= */
  if (isNativeApp) {
    // Auto-login check
    const AutoLoginCheck = () => {
      const [checking, setChecking] = useState(true);
      const navigate = useNavigate();

      useEffect(() => {
        const checkAuth = () => {
          const token = storage.getItem('studentToken');
          const studentData = storage.getItem('studentData');

          if (token && studentData) {
            // User is logged in, redirect to dashboard
            navigate('/student/dashboard', { replace: true });
          }
          setChecking(false);
        };

        checkAuth();
      }, [navigate]);

      if (checking) {
        return <LoadingScreen />;
      }

      return <StudentAppLogin />;
    };

    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {loading && <LoadingScreen />}
          <UpdateManager />
          <Toaster />
          <Sonner />

          <HashRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/student/login" replace />} />
              <Route path="/student/login" element={<AutoLoginCheck />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/settings" element={<SettingsPage type="student" />} />
              <Route path="/student/quiz/:quizId" element={<StudentSecureQuiz />} />
              <Route path="/student/reset-password/:token" element={<ResetPasswordPage type="student" />} />
              <Route path="*" element={<Navigate to="/student/login" replace />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  /* =========================
     🌐 WEB (TEACHER + STUDENT VIA LINKS)
  ========================= */
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {loading && <LoadingScreen />}
        <UpdateManager />
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/quiz/attempt/:token" element={<StudentQuizPage />} /> {/* Share token links */}

            {/* Student authenticated routes (for student portal) */}
            <Route path="/student/login" element={<StudentAppLogin />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/settings" element={<SettingsPage type="student" />} />
            <Route path="/student/quiz/:quizId" element={<StudentSecureQuiz />} />
            <Route path="/student/reset-password/:token" element={<ResetPasswordPage type="student" />} />

            <Route path="/reset-password/:token" element={<ResetPasswordPage type="teacher" />} />

            {/* Teacher protected routes */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/create-quiz" element={<CreateQuizPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/settings" element={<SettingsPage type="teacher" />} />
              <Route path="/quiz/:quizId/results" element={<QuizResultsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;