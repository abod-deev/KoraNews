import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Globe,
  Shield,
  Layers,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  Plus
} from 'lucide-react';
import {
  KnownTeam,
  SAUDI_TEAMS,
  NATIONAL_TEAMS,
  ARAB_AND_GLOBAL_CLUBS,
  ALL_KNOWN_TEAMS,
  getSuggestedTeamsForLeague,
  normalizeSportsName,
  isNationalTeam,
} from '../../services/knownTeamsAndLeagues';

export interface TeamLogoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  currentLogo: string;
  currentTeamName?: string;
  leagueName?: string;
  existingTeams?: Array<{ id?: string | number; name: string; logo?: string | null }>;
  onSelectLogo: (logoUrl: string, teamName?: string) => void;
}

type CategoryTab = 'suggested' | 'saudi' | 'national' | 'global' | 'database' | 'custom_url';

export default function TeamLogoPickerModal({
  isOpen,
  onClose,
  title,
  subtitle,
  currentLogo,
  currentTeamName,
  leagueName,
  existingTeams = [],
  onSelectLogo,
}: TeamLogoPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryTab>('suggested');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customUrlError, setCustomUrlError] = useState(false);

  // Pre-calculate suggested teams for league
  const suggestedTeamsData = useMemo(() => {
    if (!leagueName) return [];
    return getSuggestedTeamsForLeague(leagueName).teams;
  }, [leagueName]);

  // If there are suggested teams for this tournament, default to 'suggested', otherwise 'saudi'
  const effectiveDefaultTab = useMemo<CategoryTab>(() => {
    if (leagueName && suggestedTeamsData.length > 0) return 'suggested';
    return 'saudi';
  }, [leagueName, suggestedTeamsData.length]);

  const currentTab = activeTab === 'suggested' && suggestedTeamsData.length === 0 ? 'saudi' : activeTab;

  // Map DB logos from existingTeams
  const dbLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    if (existingTeams) {
      for (const t of existingTeams) {
        if (t.logo) {
          if (t.id) map.set(String(t.id).toLowerCase(), t.logo);
          map.set(t.name.trim().toLowerCase(), t.logo);
          map.set(normalizeSportsName(t.name), t.logo);
        }
      }
    }
    return map;
  }, [existingTeams]);

  // Filtered teams list based on active tab and search query
  const displayedTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qNorm = normalizeSportsName(q);

    let baseList: KnownTeam[] = [];

    if (q) {
      // If user is searching, search globally across all categories
      baseList = ALL_KNOWN_TEAMS;
    } else {
      switch (currentTab) {
        case 'suggested':
          baseList = suggestedTeamsData;
          break;
        case 'saudi':
          baseList = SAUDI_TEAMS;
          break;
        case 'national':
          baseList = NATIONAL_TEAMS;
          break;
        case 'global':
          baseList = ARAB_AND_GLOBAL_CLUBS;
          break;
        case 'database':
          baseList = (existingTeams || [])
            .filter((t) => Boolean(t.logo))
            .map((t) => ({
              id: `db_${t.id || t.name}`,
              name: t.name,
              logo: t.logo!,
              aliases: [t.name],
            }));
          break;
        case 'custom_url':
          return [];
      }
    }

    const resolvedList = baseList.map((team) => {
      const dbLogo =
        dbLogoMap.get(team.id.toLowerCase()) ||
        dbLogoMap.get(team.name.trim().toLowerCase()) ||
        dbLogoMap.get(normalizeSportsName(team.name));
      if (dbLogo && dbLogo !== team.logo) {
        return { ...team, logo: dbLogo };
      }
      return team;
    });

    if (!q) return resolvedList;

    return resolvedList.filter((team) => {
      const nameMatch = team.name.toLowerCase().includes(q) || normalizeSportsName(team.name).includes(qNorm);
      const aliasMatch = team.aliases.some(
        (a) => a.toLowerCase().includes(q) || normalizeSportsName(a).includes(qNorm)
      );
      return nameMatch || aliasMatch;
    });
  }, [searchQuery, currentTab, suggestedTeamsData, existingTeams, dbLogoMap]);

  if (!isOpen) return null;

  const handleSelectTeam = (logoUrl: string, teamName?: string) => {
    onSelectLogo(logoUrl, teamName);
    onClose();
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    onSelectLogo(customUrlInput.trim(), currentTeamName);
    onClose();
  };

  return (
    <div
      id="team-logo-picker-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="team-logo-picker-modal-dialog"
        className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span>{title}</span>
                {currentTeamName && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black">
                    {currentTeamName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                {subtitle || 'اضغط على الشعار المناسب لتحديده وتأكيده مباشرة'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="ابحث عن شعار النادي، المنتخب، أو الدولة (مثال: الاتفاق، الهلال، السعودية، ريال مدريد)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-9 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs (shown when not searching) */}
          {!searchQuery && (
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
              {suggestedTeamsData.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('suggested')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'suggested'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>أندية البطولة ({suggestedTeamsData.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('saudi')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'saudi'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>🇸🇦 أندية السعودية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('national')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'national'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>🌍 المنتخبات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('global')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'global'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>⚽ أندية عالمية وعربية</span>
              </button>

              {existingTeams.filter((t) => t.logo).length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('database')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'database'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>المسجلة ({existingTeams.filter((t) => t.logo).length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('custom_url')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'custom_url'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>رابط مباشر</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body: Logo Grid or Custom URL form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {currentTab === 'custom_url' && !searchQuery ? (
            <form onSubmit={handleApplyCustomUrl} className="space-y-4 max-w-md mx-auto py-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center mx-auto">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white">إدخال رابط صورة مخصص</h4>
                <p className="text-xs text-gray-400">يمكنك لصق رابط شعار مباشر بصيغة PNG أو JPG أو SVG</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  رابط الشعار المباشر (URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/logo.png"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setCustomUrlError(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white dir-ltr text-right"
                />
              </div>

              {customUrlInput.trim() && (
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 p-1.5 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                      <img
                        src={customUrlInput.trim()}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={() => setCustomUrlError(true)}
                        onLoad={() => setCustomUrlError(false)}
                      />
                    </div>
                    <div className="text-xs font-bold">
                      {customUrlError ? (
                        <span className="text-red-500 font-bold block">تعذر تحميل الصورة من هذا الرابط</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block">تم فحص الصورة ومعاينتها بنجاح</span>
                      )}
                      <span className="text-[10px] text-gray-400 truncate max-w-[180px] block dir-ltr">{customUrlInput}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!customUrlInput.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد واستخدام هذا الشعار</span>
                </button>
              </div>
            </form>
          ) : displayedTeams.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 dark:text-gray-200">
                  لم يتم العثور على شعار مطابق للبحث &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  يمكنك استخدام خيار &quot;رابط مباشر&quot; لإدخال رابط شعار مخصص.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('custom_url');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-black hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>إدخال رابط مخصص</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {displayedTeams.map((team) => {
                const isSelected = currentLogo === team.logo;
                const isNt = isNationalTeam(team);

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleSelectTeam(team.logo, team.name)}
                    className={`group relative p-3.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-500 shadow-sm'
                        : 'border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-850 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 hover:shadow-xs'
                    }`}
                  >
                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    {/* Logo Image Container */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 p-2 flex items-center justify-center border border-gray-100 dark:border-gray-700/60 group-hover:scale-105 transition-transform shrink-0">
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Team Name and Badge */}
                    <div className="w-full min-w-0 space-y-0.5">
                      <div className="text-xs font-black text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {team.name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold truncate">
                        {isNt ? '🏳️ منتخب وطني' : team.league || '🛡️ نادي رياضي'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-850/60 flex items-center justify-between text-xs shrink-0">
          <div className="text-gray-400 font-bold flex items-center gap-1.5">
            <span>إجمالي الشعارات المتاحة:</span>
            <span className="font-mono font-black text-gray-700 dark:text-gray-200">
              {ALL_KNOWN_TEAMS.length + existingTeams.filter((t) => t.logo).length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentLogo && (
              <button
                type="button"
                onClick={() => {
                  onSelectLogo('', currentTeamName);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors cursor-pointer"
              >
                مسح الشعار الحالي
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-black transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
