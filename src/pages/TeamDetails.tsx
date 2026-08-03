import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTeamById, getPlayers, Team, Player } from '../services/sportsApi';
import { useSEO } from '../hooks/useSEO';
import { Loader2, Users, Calendar, MapPin, User, ChevronRight } from 'lucide-react';

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      getTeamById(id),
      getPlayers(id)
    ]).then(([t, p]) => {
      setTeam(t);
      setPlayers(p);
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  useSEO(team ? `${team.name} - التفاصيل واللاعبين` : 'فريق', team?.description || 'معلومات وتفاصيل الفريق');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">لم يتم العثور على الفريق</h2>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-8">
      {/* Team Header */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="absolute inset-0 bg-brand/5 dark:bg-brand/10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/20 via-transparent to-transparent"></div>
        
        <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center p-6 shadow-sm border-4 border-gray-50 dark:border-gray-800 shrink-0">
            <img loading="lazy" src={team.logo} alt={team.name} className="w-full h-full object-contain" />
          </div>
          
          <div className="text-center md:text-right flex-1">
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">{team.name}</h1>
            {team.description && (
              <p className="text-gray-600 dark:text-gray-400 font-medium max-w-2xl mb-6 leading-relaxed">
                {team.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {team.founded && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 text-brand" />
                  تأسس عام {team.founded}
                </div>
              )}
              {team.stadium && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 text-brand" />
                  {team.stadium}
                </div>
              )}
              {team.coach && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300">
                  <User className="w-4 h-4 text-brand" />
                  المدرب: {team.coach}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Players Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-brand" />
            قائمة اللاعبين
          </h2>
        </div>

        {players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {players.map(player => (
              <Link to={`/players/${player.id}`} key={player.id} className="block group">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all group-hover:border-brand/50">
                  <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <img loading="lazy" src={player.image} alt={player.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3 bg-brand text-white font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                      {player.number}
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand transition-colors text-lg mb-1">{player.name}</h3>
                    <p className="text-sm font-semibold text-gray-500">{player.position}</p>
                    <p className="text-xs text-gray-400 mt-2">{player.nationality}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا يوجد لاعبين</h3>
            <p className="text-gray-500">لم يتم إضافة لاعبين لهذا الفريق بعد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
