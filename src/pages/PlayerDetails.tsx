import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlayerById, getTeamById, Player, Team } from '../services/sportsApi';
import { useSEO } from '../hooks/useSEO';
import { Loader2, User, Target, Activity, Star, Users, Calendar } from 'lucide-react';

export default function PlayerDetails() {
  const { id } = useParams<{ id: string }>();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    getPlayerById(id).then(async (p) => {
      setPlayer(p);
      if (p?.teamId) {
        const t = await getTeamById(p.teamId);
        setTeam(t);
      }
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  useSEO(player ? `${player.name} - إحصائيات ومعلومات` : 'لاعب', `معلومات وإحصائيات اللاعب ${player?.name}`);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">لم يتم العثور على اللاعب</h2>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-8">
      {/* Player Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 h-64 md:h-auto relative bg-gray-100 dark:bg-gray-800">
          <img loading="lazy" src={player.image} alt={player.name} className="w-full h-full object-cover" />
          <div className="absolute top-4 left-4 bg-brand text-white font-black text-2xl w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900">
            {player.number}
          </div>
        </div>
        
        <div className="p-8 md:w-2/3 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
              {player.position}
            </span>
            <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full flex items-center gap-2">
              {player.nationality}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
            {player.name}
          </h1>
          
          {team && (
            <Link to={`/teams/${team.id}`} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-brand/50 transition-colors w-fit">
              <img loading="lazy" src={team.logo} alt={team.name} className="w-10 h-10 object-contain" />
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">النادي الحالي</p>
                <p className="font-bold text-gray-900 dark:text-white">{team.name}</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Section */}
      {player.stats && (
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-brand" />
            إحصائيات الموسم الحالي
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6" />
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{player.stats.goals}</p>
              <p className="text-sm font-medium text-gray-500">الأهداف</p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-brand rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{player.stats.assists}</p>
              <p className="text-sm font-medium text-gray-500">التمريرات الحاسمة</p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{player.stats.matches}</p>
              <p className="text-sm font-medium text-gray-500">المباريات</p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6" />
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">{player.stats.rating}</p>
              <p className="text-sm font-medium text-gray-500">التقييم العام</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
