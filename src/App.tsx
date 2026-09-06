import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MatchRemindersProvider } from './contexts/MatchRemindersContext';
import AnalyticsTracker from './components/common/AnalyticsTracker';
import MainLayout from './components/layout/MainLayout';
const Home = lazy(() => import('./pages/Home'));
const News = lazy(() => import('./pages/News'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const Matches = lazy(() => import('./pages/Matches'));
const LeagueDetails = lazy(() => import('./pages/LeagueDetails'));
const Predictions = lazy(() => import('./pages/Predictions'));
const PredictionsLeaderboardPage = lazy(() => import('./pages/PredictionsLeaderboardPage'));
const GoldenLeaderboardPage = lazy(() => import('./pages/GoldenLeaderboardPage'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import { checkIsAdmin } from './utils/authHelpers';

function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  const isAdmin = checkIsAdmin(user);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Admin />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <MatchRemindersProvider>
            <BrowserRouter>
              <AnalyticsTracker />
              <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950 text-brand"><Loader2 className="w-10 h-10 animate-spin text-brand" /><span className="text-sm font-bold text-gray-500 dark:text-gray-400 dir-rtl">جاري التحميل...</span></div>}>
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<Home />} />
                    <Route path="news" element={<News />} />
                    <Route path="news/:id" element={<NewsDetail />} />
                    <Route path="matches" element={<Matches />} />
                    <Route path="predictions" element={<Predictions />} />
                    <Route path="predictions/leaderboard" element={<PredictionsLeaderboardPage />} />
                    <Route path="predictions/golden" element={<GoldenLeaderboardPage />} />
                    <Route path="leagues/:id" element={<LeagueDetails />} />
                    <Route path="admin" element={<AdminRoute />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </MatchRemindersProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
