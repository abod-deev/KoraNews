import React, { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MatchRemindersProvider } from './contexts/MatchRemindersContext';
import AnalyticsTracker from './components/common/AnalyticsTracker';
import MainLayout from './components/layout/MainLayout';
import { initializeIdlePreload } from './utils/routePreload';
// Resilient lazy loader helper that recovers from transient chunk loading issues and dev server restarts
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2
) {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            const msg = String(error?.message || error || '').toLowerCase();
            const isChunkError =
              msg.includes('dynamically imported module') ||
              msg.includes('failed to fetch') ||
              msg.includes('loading chunk') ||
              msg.includes('error loading');

            if (isChunkError && remaining > 0) {
              setTimeout(() => attempt(remaining - 1), 750);
            } else if (isChunkError && typeof window !== 'undefined') {
              const retryKey = 'chunk_reload_' + window.location.pathname;
              if (!sessionStorage.getItem(retryKey)) {
                sessionStorage.setItem(retryKey, '1');
                window.location.reload();
                return;
              }
              sessionStorage.removeItem(retryKey);
              reject(error);
            } else {
              reject(error);
            }
          });
      };
      attempt(retries);
    })
  );
}

const Home = lazyWithRetry(() => import('./pages/Home'));
const News = lazyWithRetry(() => import('./pages/News'));
const NewsDetail = lazyWithRetry(() => import('./pages/NewsDetail'));
const Matches = lazyWithRetry(() => import('./pages/Matches'));
const LeagueDetails = lazyWithRetry(() => import('./pages/LeagueDetails'));
const Predictions = lazyWithRetry(() => import('./pages/Predictions'));
const PredictionsLeaderboardPage = lazyWithRetry(() => import('./pages/PredictionsLeaderboardPage'));
const GoldenLeaderboardPage = lazyWithRetry(() => import('./pages/GoldenLeaderboardPage'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
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
  useEffect(() => {
    initializeIdlePreload();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <MatchRemindersProvider>
            <BrowserRouter>
              <AnalyticsTracker />
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
            </BrowserRouter>
          </MatchRemindersProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
