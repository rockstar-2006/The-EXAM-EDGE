import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

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
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

import StudentAppLogin from "./pages/StudentAppLogin";
import StudentDashboard from "./pages/StudentDashboard";
import StudentSecureQuiz from "./pages/StudentSecureQuiz";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import UpdateManager from "./components/UpdateManager";

const queryClient = new QueryClient();

const App = () => {
    const [loading, setLoading] = useState(true);
    const isMobile = Capacitor.getPlatform() !== 'web';

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const Router = isMobile ? HashRouter : BrowserRouter;

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                {loading && <LoadingScreen />}
                <UpdateManager />
                <Toaster />
                <Sonner position="top-center" />

                <Router>
                    <Routes>
                        {/* Faculty Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/reset-password/:token" element={<ResetPasswordPage type="teacher" />} />

                        <Route element={<ProtectedRoute role="teacher" />}>
                            <Route element={<DashboardLayout />}>
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/students" element={<StudentsPage />} />
                                <Route path="/create-quiz" element={<CreateQuizPage />} />
                                <Route path="/results" element={<ResultsPage />} />
                                <Route path="/quiz/:quizId/results" element={<QuizResultsPage />} />
                                <Route path="/bookmarks" element={<BookmarksPage />} />
                                <Route path="/settings" element={<SettingsPage type="teacher" />} />
                            </Route>
                        </Route>

                        {/* Student Routes */}
                        <Route path="/student/login" element={<StudentAppLogin />} />
                        <Route path="/student/reset-password/:token" element={<ResetPasswordPage type="student" />} />
                        <Route path="/quiz/share/:token" element={<StudentQuizPage />} />

                        <Route element={<ProtectedRoute role="student" />}>
                            <Route path="/student/dashboard" element={<StudentDashboard />} />
                            <Route path="/student/quiz/:quizId" element={<StudentSecureQuiz />} />
                            <Route path="/student/settings" element={<SettingsPage type="student" />} />
                        </Route>

                        {/* General Routes */}
                        <Route path="/" element={<Navigate to={isMobile ? "/student/login" : "/login"} replace />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Router>
            </TooltipProvider>
        </QueryClientProvider>
    );
};

export default App;
