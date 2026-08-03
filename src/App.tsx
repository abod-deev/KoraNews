import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Matches from './pages/Matches';
import LeagueDetails from './pages/LeagueDetails';
import Teams from './pages/Teams';
import TeamDetails from './pages/TeamDetails';
import Players from './pages/Players';
import PlayerDetails from './pages/PlayerDetails';
import Admin from './pages/Admin';
import Login from './pages/Login';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="news" element={<News />} />
              <Route path="news/:id" element={<NewsDetail />} />
              <Route path="matches" element={<Matches />} />
              <Route path="leagues/:id" element={<LeagueDetails />} />
              <Route path="teams" element={<Teams />} />
              <Route path="teams/:id" element={<TeamDetails />} />
              <Route path="players" element={<Players />} />
              <Route path="players/:id" element={<PlayerDetails />} />
              <Route path="admin" element={<Admin />} />
              <Route path="login" element={<Login />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
