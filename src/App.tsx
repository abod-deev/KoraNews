import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MatchRemindersProvider } from './contexts/MatchRemindersContext';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Matches from './pages/Matches';
import LeagueDetails from './pages/LeagueDetails';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { Loader2 } from 'lucide-react';

function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  const isAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin' || user.email === 'abod46071@gmail.com'));

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Admin />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MatchRemindersProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="news" element={<News />} />
                <Route path="news/:id" element={<NewsDetail />} />
                <Route path="matches" element={<Matches />} />
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
  );
}
