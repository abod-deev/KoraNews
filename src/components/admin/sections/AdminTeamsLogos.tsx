import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import {
  ALL_KNOWN_TEAMS,
  SAUDI_TEAMS,
  NATIONAL_TEAMS,
  ARAB_AND_GLOBAL_CLUBS,
} from '../../../services/knownTeamsAndLeagues';
import TeamLogoPickerModal from '../TeamLogoPickerModal';

interface DbTeam {
  id: string;
  name: string;
  logo: string | null;
}

export const AdminTeamsLogos: React.FC = () => {
  const [teams, setTeams] = useState<DbTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'spl' | 'yelo' | 'national' | 'global' | 'custom'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Modal State
  const [editingTeam, setEditingTeam] = useState<DbTeam | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editSyncMatches, setEditSyncMatches] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Team Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  // Logo Picker Modal State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'edit' | 'new'>('edit');

  const fetchTeams = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('server_session_token');
      const res = await fetch('/api/admin/teams', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('فشل في جلب بيانات الأندية');
      }
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تحميل الأندية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleSyncOfficialLogos = async () => {
    setSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem('server_session_token');
      const res = await fetch('/api/admin/teams/sync-official-logos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل في المزامنة');
      }
      setSuccessMessage(
        `✅ تم التحديث بنجاح! تم تصحيح وتحديث ${data.teamsCount || 0} نادٍ و ${data.matchesUpdatedCount || 0} مباراة في قاعدة البيانات.`
      );
      await fetchTeams();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في مزامنة الشعارات الرسمية');
    } finally {
      setSyncing(false);
    }
  };

  const openEditModal = (team: DbTeam) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditLogo(team.logo || '');
    setEditSyncMatches(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setSavingEdit(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('server_session_token');
      const res = await fetch(`/api/admin/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          logo: editLogo,
          syncMatches: editSyncMatches,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل في تحديث بيانات النادي');
      }
      setSuccessMessage(`✅ تم تحديث بيانات وشعار "${editName}" بنجاح!`);
      setEditingTeam(null);
      await fetchTeams();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في حفظ التعديلات');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveNewTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setSavingNew(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('server_session_token');
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: newTeamId.trim() || undefined,
          name: newTeamName.trim(),
          logo: newTeamLogo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل في إضافة النادي');
      }
      setSuccessMessage(`✅ تمت إضافة النادي "${newTeamName}" بنجاح!`);
      setIsAddModalOpen(false);
      setNewTeamName('');
      setNewTeamId('');
      setNewTeamLogo('');
      await fetchTeams();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في إضافة النادي');
    } finally {
      setSavingNew(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف النادي "${teamName}" من قاعدة البيانات؟`)) {
      return;
    }
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('server_session_token');
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل في حذف النادي');
      }
      setSuccessMessage(`✅ تم حذف النادي "${teamName}" بنجاح`);
      await fetchTeams();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في حذف النادي');
    }
  };

  // Filtered teams list
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      // Search check
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query);

      if (!matchSearch) return false;

      // Category check
      if (selectedCategory === 'all') return true;

      const inSaudi = SAUDI_TEAMS.find((st) => st.id === t.id || st.name === t.name);
      if (selectedCategory === 'spl') {
        return inSaudi && inSaudi.league?.includes('روشن');
      }
      if (selectedCategory === 'yelo') {
        return inSaudi && inSaudi.league?.includes('يلو');
      }
      if (selectedCategory === 'national') {
        return NATIONAL_TEAMS.some((nt) => nt.id === t.id || nt.name === t.name);
      }
      if (selectedCategory === 'global') {
        return ARAB_AND_GLOBAL_CLUBS.some((gt) => gt.id === t.id || gt.name === t.name);
      }
      if (selectedCategory === 'custom') {
        return !ALL_KNOWN_TEAMS.some((kt) => kt.id === t.id || kt.name === t.name);
      }

      return true;
    });
  }, [teams, searchTerm, selectedCategory]);

  return (
    <div id="admin-teams-logos-manager" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">إدارة الأندية والشعارات الرسمية</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-2xl">
              يمكنك تعديل أسماء وشعارات الأندية في قاعدة البيانات يدوياً، أو الضغط على زر المزامنة التلقائية لتحديث وتصحيح جميع شعارات الأندية والمباريات السابقة والقادمة إلى الشعارات الرسمية المعتمدة عالية الدقة.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              id="sync-official-logos-btn"
              onClick={handleSyncOfficialLogos}
              disabled={syncing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 text-sm cursor-pointer"
              title="مزامنة وتصحيح جميع شعارات الأندية في قاعدة البيانات والمباريات"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'جارِ المزامنة والتصحيح...' : '⚡ إصلاح وتحديث جميع الشعارات الرسمية'}
            </button>

            <button
              id="add-new-team-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة نادٍ جديد
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center justify-between text-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center justify-between text-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            الكل ({teams.length})
          </button>
          <button
            onClick={() => setSelectedCategory('spl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'spl'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            دوري روشن السعودي
          </button>
          <button
            onClick={() => setSelectedCategory('yelo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'yelo'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            دوري يلو
          </button>
          <button
            onClick={() => setSelectedCategory('national')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'national'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            المنتخبات الوطنية
          </button>
          <button
            onClick={() => setSelectedCategory('global')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'global'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            الأندية العربية والعالمية
          </button>
          <button
            onClick={() => setSelectedCategory('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'custom'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            أندية مخصصة
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث باسم النادي أو المعرف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pr-9 pl-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-900/50 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <span>جارِ تحميل قائمة الأندية والشعارات...</span>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-300">لا توجد أندية مطابقة للبحث</p>
          <p className="text-xs text-slate-500 mt-1">جرب تغيير معيار البحث أو تصنيف الأندية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeams.map((team) => {
            const known = ALL_KNOWN_TEAMS.find((kt) => kt.id === team.id || kt.name === team.name);
            const isSaudi = SAUDI_TEAMS.some((st) => st.id === team.id || st.name === team.name);

            return (
              <div
                key={team.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Team Logo Preview with fallback */}
                    <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 relative flex-shrink-0 group-hover:border-amber-500/40 transition-colors">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = document.getElementById(`fallback-${team.id}`);
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        id={`fallback-${team.id}`}
                        className={`w-full h-full rounded-lg bg-amber-500/10 text-amber-400 items-center justify-center font-bold text-lg ${
                          team.logo ? 'hidden' : 'flex'
                        }`}
                      >
                        {team.name.charAt(0)}
                      </div>
                    </div>

                    {/* Category Tag */}
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                        isSaudi
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                          : known
                          ? 'bg-blue-950/60 border-blue-500/30 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {known?.league || (isSaudi ? 'دوري سعودي' : 'فريق')}
                    </span>
                  </div>

                  {/* Team Info */}
                  <div className="mb-4">
                    <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                      {team.name}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                      <span>ID: {team.id}</span>
                      {known?.country && <span>• {known.country}</span>}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(team)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    تعديل الشعار والاسم
                  </button>

                  <button
                    onClick={() => {
                      openEditModal(team);
                      setPickerTarget('edit');
                      setPickerOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="اختيار شعار من المعرض الرسمي"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  {!ALL_KNOWN_TEAMS.some((kt) => kt.id === team.id) && (
                    <button
                      onClick={() => handleDeleteTeam(team.id, team.name)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="حذف النادي"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Edit2 className="w-5 h-5 text-amber-500" />
                تعديل بيانات وشعار: {editingTeam.name}
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Logo Preview & Pick from Catalog button */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-2 relative flex-shrink-0">
                  {editLogo ? (
                    <img
                      src={editLogo}
                      alt="معاينة الشعار"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white mb-1">معاينة الشعار المباشر</div>
                  <p className="text-xs text-slate-400 mb-2">
                    يمكنك كتابة رابط مخصص أو اختيار الشعار الرسمي مباشرة من الكتالوج.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('edit');
                      setPickerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    اختيار من معرض الشعارات المعتمدة
                  </button>
                </div>
              </div>

              {/* Team Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم النادي</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رابط الشعار (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              {/* Fast suggestions from catalog for this team */}
              <div>
                <span className="text-xs text-slate-400 block mb-1.5">اقتراحات سريعة من الكتالوج:</span>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {ALL_KNOWN_TEAMS.filter((kt) =>
                    kt.name.includes(editName) ||
                    editName.includes(kt.name) ||
                    kt.aliases.some((a) => a.includes(editName))
                  ).map((kt) => (
                    <button
                      key={kt.id}
                      type="button"
                      onClick={() => {
                        setEditName(kt.name);
                        setEditLogo(kt.logo);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500/40 border border-slate-700 text-slate-300 hover:text-amber-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <img
                        src={kt.logo}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 object-contain"
                      />
                      <span>{kt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync checkbox */}
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editSyncMatches}
                  onChange={(e) => setEditSyncMatches(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 bg-slate-900 border-slate-700"
                />
                <span className="text-xs text-slate-300">
                  تحديث هذا الشعار والاسم أيضاً في جميع مباريات التوقعات السابقة والقادمة لهذا الفريق
                </span>
              </label>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جارِ الحفظ...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      حفظ التعديلات
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Team Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Plus className="w-5 h-5 text-amber-500" />
                إضافة نادٍ أو منتخب جديد إلى قاعدة البيانات
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewTeam} className="space-y-4">
              {/* Logo Preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-2 relative flex-shrink-0">
                  {newTeamLogo ? (
                    <img
                      src={newTeamLogo}
                      alt="معاينة"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('new');
                      setPickerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    اختيار الشعار من المعرض
                  </button>
                </div>
              </div>

              {/* Team Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اسم النادي / المنتخب <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نادي الفتح، منتخب البرازيل..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Custom ID (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  المعرف الفريد (اختياري بالإنجليزية)
                </label>
                <input
                  type="text"
                  placeholder="مثال: custom_team_1"
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رابط الشعار المباشر (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newTeamLogo}
                  onChange={(e) => setNewTeamLogo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingNew ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جارِ الإضافة...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      إضافة النادي
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visual Logo Picker Modal */}
      <TeamLogoPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="اختيار شعار رسمي معتمد للأندية"
        currentLogo={pickerTarget === 'edit' ? editLogo : newTeamLogo}
        currentTeamName={pickerTarget === 'edit' ? editName : newTeamName}
        onSelectLogo={(logoUrl, teamName) => {
          if (pickerTarget === 'edit') {
            setEditLogo(logoUrl);
            if (teamName && !editName) setEditName(teamName);
          } else {
            setNewTeamLogo(logoUrl);
            if (teamName && !newTeamName) setNewTeamName(teamName);
          }
          setPickerOpen(false);
        }}
      />
    </div>
  );
};
