/**
 * Canonical catalog of Saudi Pro League clubs, Saudi First Division clubs,
 * Arab & International clubs, Leagues, and National Teams with official logos and aliases.
 * This file is purely data + normalization helpers (no DB imports) so it can safely be used
 * on both server-side and client-side.
 */

export interface KnownTeam {
  id: string;
  name: string;
  logo: string;
  aliases: string[];
  league?: string;
  country?: string;
}

export interface KnownLeague {
  id: string;
  name: string;
  logo: string;
  aliases: string[];
  country?: string;
}

export const SAUDI_LEAGUES: KnownLeague[] = [
  {
    id: 'SPL',
    name: 'دوري روشن السعودي',
    logo: '',
    aliases: [
      'دوري روشن السعودي',
      'دوري روشن',
      'الدوري السعودي',
      'دوري المحترفين السعودي',
      'دوري روشن للمحترفين',
      'الدوري السعودي للمحترفين',
      'روشن',
      'Saudi Pro League',
      'SPL',
      'Roshn Saudi League',
      'RSL',
    ],
    country: 'السعودية',
  },
  {
    id: 'KINGS_CUP',
    name: 'كأس خادم الحرمين الشريفين',
    logo: '',
    aliases: [
      'كأس خادم الحرمين الشريفين',
      'كأس الملك',
      'كأس الملك السعودي',
      'كاس الملك',
      'كاس خادم الحرمين الشريفين',
      'King Cup',
      'Kings Cup',
      'Custodian of the Two Holy Mosques Cup',
    ],
    country: 'السعودية',
  },
  {
    id: 'SA_SUPER',
    name: 'كأس السوبر السعودي',
    logo: '',
    aliases: [
      'كأس السوبر السعودي',
      'السوبر السعودي',
      'كاس السوبر السعودي',
      'Saudi Super Cup',
    ],
    country: 'السعودية',
  },
  {
    id: 'YELO',
    name: 'دوري يلو للدرجة الأولى',
    logo: '',
    aliases: [
      'دوري يلو',
      'دوري يلو للدرجة الأولى',
      'دوري الدرجة الأولى السعودي',
      'دوري يلو السعودي',
      'دوري الدرجه الاولى',
      'Yelo League',
      'Saudi First Division',
    ],
    country: 'السعودية',
  },
  {
    id: 'ACL_ELITE',
    name: 'دوري أبطال آسيا للنخبة',
    logo: '',
    aliases: [
      'دوري أبطال آسيا للنخبة',
      'دوري ابطال اسيا للنخبة',
      'دوري أبطال آسيا',
      'دوري ابطال اسيا',
      'ابطال اسيا',
      'أبطال آسيا',
      'دوري ابطال اسيا 2',
      'AFC Champions League Elite',
      'ACL Elite',
      'AFC Champions League',
    ],
  },
  {
    id: 'AC',
    name: 'كأس آسيا',
    logo: '',
    aliases: ['كأس آسيا', 'كاس اسيا', 'كأس أمم آسيا', 'كاس امم اسيا', 'AFC Asian Cup', 'Asian Cup'],
  },
  {
    id: 'AFCON',
    name: 'كأس أمم أفريقيا',
    logo: '',
    aliases: ['كأس أمم أفريقيا', 'كاس امم افريقيا', 'كأس افريقيا', 'كاس افريقيا', 'AFCON', 'Africa Cup of Nations'],
  },
  {
    id: 'GULF',
    name: 'كأس الخليج العربي',
    logo: '',
    aliases: ['كأس الخليج العربي', 'كاس الخليج العربي', 'خليجي', 'كأس الخليج', 'كاس الخليج', 'Gulf Cup'],
  },
  {
    id: 'WCQ',
    name: 'تصفيات كأس العالم',
    logo: '',
    aliases: ['تصفيات كأس العالم', 'تصفيات كاس العالم', 'World Cup Qualifiers', 'WCQ'],
  },
  {
    id: 'EPL',
    name: 'الدوري الإنجليزي الممتاز',
    logo: '',
    aliases: ['الدوري الإنجليزي الممتاز', 'الدوري الانجليزي الممتاز', 'الدوري الإنجليزي', 'الدوري الانجليزي', 'البريميرليج', 'Premier League', 'EPL'],
  },
  {
    id: 'LL',
    name: 'الدوري الإسباني (لا ليغا)',
    logo: '',
    aliases: ['الدوري الإسباني', 'الدوري الاسباني', 'لا ليغا', 'لاليغا', 'La Liga', 'LaLiga'],
  },
  {
    id: 'UCL',
    name: 'دوري أبطال أوروبا',
    logo: '',
    aliases: ['دوري أبطال أوروبا', 'دوري ابطال اوروبا', 'التشامبيونز ليغ', 'UEFA Champions League', 'UCL'],
  },
  {
    id: 'IQ_PL',
    name: 'دوري نجوم العراق',
    logo: '',
    aliases: ['دوري نجوم العراق', 'الدوري العراقي الممتاز', 'الدوري العراقي', 'دوري نجوم العراق للمحترفين', 'Iraq Stars League'],
    country: 'العراق',
  },
  {
    id: 'EG_PL',
    name: 'الدوري المصري الممتاز',
    logo: '',
    aliases: ['الدوري المصري الممتاز', 'الدوري المصري', 'دوري نايل', 'دوري نايل المصري', 'Egyptian Premier League'],
    country: 'مصر',
  },
];

export const SAUDI_TEAMS: KnownTeam[] = [
  {
    id: 'sa_hilal',
    name: 'الهلال',
    logo: '',
    aliases: [
      'الهلال',
      'الهلال السعودي',
      'نادي الهلال',
      'نادي الهلال السعودي',
      'الزعيم',
      'Al Hilal',
      'Al-Hilal',
      'AlHilal',
      'Al Hilal SFC',
      'Al-Hilal Saudi',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_nassr',
    name: 'النصر',
    logo: '',
    aliases: [
      'النصر',
      'النصر السعودي',
      'نادي النصر',
      'نادي النصر السعودي',
      'العالمي',
      'فارس نجد',
      'Al Nassr',
      'Al-Nassr',
      'AlNassr',
      'Al Nassr FC',
      'Al-Nassr Saudi',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_ittihad',
    name: 'الاتحاد',
    logo: '',
    aliases: [
      'الاتحاد',
      'الاتحاد السعودي',
      'اتحاد جدة',
      'نادي الاتحاد',
      'نادي الاتحاد السعودي',
      'العميد',
      'النمور',
      'Al Ittihad',
      'Al-Ittihad',
      'AlIttihad',
      'Al Ittihad Club',
      'Ittihad Jeddah',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_ahli',
    name: 'الأهلي',
    logo: '',
    aliases: [
      'الأهلي',
      'الاهلي',
      'الأهلي السعودي',
      'الاهلي السعودي',
      'أهلي جدة',
      'اهلي جدة',
      'نادي الأهلي',
      'نادي الاهلي',
      'نادي الأهلي السعودي',
      'نادي الاهلي السعودي',
      'قلعة الكؤوس',
      'الراقي',
      'Al Ahli',
      'Al-Ahli',
      'AlAhli',
      'Al Ahli Saudi FC',
      'Ahli Jeddah',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_shabab',
    name: 'الشباب',
    logo: '',
    aliases: [
      'الشباب',
      'الشباب السعودي',
      'نادي الشباب',
      'نادي الشباب السعودي',
      'الليث',
      'الليث الأبيض',
      'Al Shabab',
      'Al-Shabab',
      'AlShabab',
      'Al Shabab FC',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_ettifaq',
    name: 'الاتفاق',
    logo: '',
    aliases: [
      'الاتفاق',
      'الاتفاق السعودي',
      'نادي الاتفاق',
      'نادي الاتفاق السعودي',
      'فارس الدهناء',
      'Al Ettifaq',
      'Al-Ettifaq',
      'AlEttifaq',
      'Ettifaq FC',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_taawoun',
    name: 'التعاون',
    logo: '',
    aliases: [
      'التعاون',
      'التعاون السعودي',
      'نادي التعاون',
      'نادي التعاون السعودي',
      'سكري القصيم',
      'ذئاب القصيم',
      'Al Taawoun',
      'Al-Taawoun',
      'AlTaawoun',
      'Al Taawon',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_qadsiah',
    name: 'القادسية',
    logo: '',
    aliases: [
      'القادسية',
      'القادسية السعودي',
      'نادي القادسية',
      'نادي القادسية السعودي',
      'بنو قادس',
      'فخر الشرقية',
      'Al Qadsiah',
      'Al-Qadsiah',
      'AlQadsiah',
      'Al Qadisiya',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_fateh',
    name: 'الفتح',
    logo: '',
    aliases: [
      'الفتح',
      'الفتح السعودي',
      'نادي الفتح',
      'نادي الفتح السعودي',
      'النموذجي',
      'Al Fateh',
      'Al-Fateh',
      'AlFateh',
      'Al Fateh SC',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_damac',
    name: 'ضمك',
    logo: '',
    aliases: [
      'ضمك',
      'ضمك السعودي',
      'نادي ضمك',
      'نادي ضمك السعودي',
      'فارس الجنوب',
      'Damac',
      'Damac FC',
      'Dhamk',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_khaleej',
    name: 'الخليج',
    logo: '',
    aliases: [
      'الخليج',
      'الخليج السعودي',
      'نادي الخليج',
      'نادي الخليج السعودي',
      'الدانة',
      'Al Khaleej',
      'Al-Khaleej',
      'AlKhaleej',
      'Khaleej Club',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_fayha',
    name: 'الفيحاء',
    logo: '',
    aliases: [
      'الفيحاء',
      'الفيحاء السعودي',
      'نادي الفيحاء',
      'نادي الفيحاء السعودي',
      'فهود المجمعة',
      'البرتقالي',
      'Al Fayha',
      'Al-Fayha',
      'AlFayha',
      'Al Feiha',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_raed',
    name: 'الرائد',
    logo: '',
    aliases: [
      'الرائد',
      'الرائد السعودي',
      'نادي الرائد',
      'نادي الرائد السعودي',
      'رائد التحدي',
      'Al Raed',
      'Al-Raed',
      'AlRaed',
      'Al Raed FC',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_wehda',
    name: 'الوحدة',
    logo: '',
    aliases: [
      'الوحدة',
      'الوحدة السعودي',
      'نادي الوحدة',
      'نادي الوحدة السعودي',
      'فرسان مكة',
      'Al Wehda',
      'Al-Wehda',
      'AlWehda',
      'Al Wahda Mecca',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_riyadh',
    name: 'الرياض',
    logo: '',
    aliases: [
      'الرياض',
      'الرياض السعودي',
      'نادي الرياض',
      'نادي الرياض السعودي',
      'مدرسة الوسطى',
      'Al Riyadh',
      'Al-Riyadh',
      'AlRiyadh',
      'Al Riyadh SC',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_akhdood',
    name: 'الأخدود',
    logo: '',
    aliases: [
      'الأخدود',
      'الاخدود',
      'الأخدود السعودي',
      'الاخدود السعودي',
      'نادي الأخدود',
      'نادي الاخدود',
      'Al Akhdood',
      'Al-Akhdood',
      'AlAkhdood',
      'Al Okhdood',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_orobah',
    name: 'العروبة',
    logo: '',
    aliases: [
      'العروبة',
      'العروبة السعودي',
      'نادي العروبة',
      'نادي العروبة السعودي',
      'فخر الشمال',
      'Al Oroba',
      'Al-Orobah',
      'Al Orobah',
      'Al-Orobah FC',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  {
    id: 'sa_kholood',
    name: 'الخلود',
    logo: '',
    aliases: [
      'الخلود',
      'الخلود السعودي',
      'نادي الخلود',
      'نادي الخلود السعودي',
      'فخر الرس',
      'Al Kholood',
      'Al-Kholood',
      'AlKholood',
      'Al-Kholood Club',
    ],
    league: 'دوري روشن السعودي',
    country: 'السعودية',
  },
  // أندية دوري يلو والأندية السعودية العريقة
  {
    id: 'sa_hazem',
    name: 'الحزم',
    logo: '',
    aliases: ['الحزم', 'الحزم السعودي', 'نادي الحزم', 'Al Hazem', 'Al-Hazem', 'Al Hazm'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_tai',
    name: 'الطائي',
    logo: '',
    aliases: ['الطائي', 'الطائي السعودي', 'نادي الطائي', 'صائد الكبار', 'Al Tai', 'Al-Tai', 'Al Taee'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_abha',
    name: 'أبها',
    logo: '',
    aliases: ['أبها', 'ابها', 'أبها السعودي', 'ابها السعودي', 'نادي أبها', 'نادي ابها', 'زعيم الجنوب', 'Abha', 'Abha Club'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_batin',
    name: 'الباطن',
    logo: '',
    aliases: ['الباطن', 'الباطن السعودي', 'نادي الباطن', 'سماوي حفر الباطن', 'Al Batin', 'Al-Batin'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_faisaly',
    name: 'الفيصلي',
    logo: '',
    aliases: ['الفيصلي', 'الفيصلي السعودي', 'نادي الفيصلي', 'عنابي سدير', 'Al Faisaly', 'Al-Faisaly'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_adalah',
    name: 'العدالة',
    logo: '',
    aliases: ['العدالة', 'العدالة السعودي', 'نادي العدالة', 'فارس الأحساء', 'Al Adalah', 'Al-Adalah'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_najran',
    name: 'نجران',
    logo: '',
    aliases: ['نجران', 'نادي نجران', 'Najran'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_hajer',
    name: 'هجر',
    logo: '',
    aliases: ['هجر', 'نادي هجر', 'Hajer'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_jabalain',
    name: 'الجبلين',
    logo: '',
    aliases: ['الجبلين', 'نادي الجبلين', 'Al Jabalain', 'Al-Jabalain'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_ain',
    name: 'العين السعودي',
    logo: '',
    aliases: ['العين السعودي', 'نادي العين السعودي', 'Al Ain Saudi', 'Al-Ain KSA'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_ohod',
    name: 'أحد',
    logo: '',
    aliases: ['أحد', 'احد', 'نادي أحد', 'نادي احد', 'Ohod', 'Ohod Club'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_najma',
    name: 'النجمة',
    logo: '',
    aliases: ['النجمة', 'النجمة السعودي', 'نادي النجمة', 'Al Najma', 'Al-Najma'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_jubail',
    name: 'الجبيل',
    logo: '',
    aliases: ['الجبيل', 'نادي الجبيل', 'Al Jubail', 'Al-Jubail'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_zulfi',
    name: 'الزلفي',
    logo: '',
    aliases: ['الزلفي', 'نادي الزلفي', 'Al Zulfi', 'Al-Zulfi'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_jeddah',
    name: 'جدة',
    logo: '',
    aliases: ['جدة', 'نادي جدة', 'Jeddah Club'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_arabi',
    name: 'العربي السعودي',
    logo: '',
    aliases: ['العربي السعودي', 'نادي العربي السعودي', 'Al Arabi KSA'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_safa',
    name: 'الصفا',
    logo: '',
    aliases: ['الصفا', 'نادي الصفا', 'Al Safa'],
    league: 'دوري يلو للدرجة الأولى',
    country: 'السعودية',
  },
  {
    id: 'sa_taraji',
    name: 'الترجي السعودي',
    logo: '',
    aliases: ['الترجي السعودي', 'نادي الترجي السعودي', 'Al Taraji KSA'],
    country: 'السعودية',
  },
];

export const NATIONAL_TEAMS: KnownTeam[] = [
  // المنتخبات العربية
  {
    id: 'nt_ksa',
    name: 'منتخب السعودية',
    logo: '',
    aliases: ['منتخب السعودية', 'السعودية', 'المنتخب السعودي', 'الأخضر السعودي', 'الصقور الخضر', 'Saudi Arabia', 'KSA'],
  },
  {
    id: 'nt_egy',
    name: 'منتخب مصر',
    logo: '',
    aliases: ['منتخب مصر', 'مصر', 'المنتخب المصري', 'الفراعنة', 'Egypt', 'EGY'],
  },
  {
    id: 'nt_irq',
    name: 'منتخب العراق',
    logo: '',
    aliases: ['منتخب العراق', 'العراق', 'المنتخب العراقي', 'أسود الرافدين', 'Iraq', 'IRQ'],
  },
  {
    id: 'nt_mar',
    name: 'منتخب المغرب',
    logo: '',
    aliases: ['منتخب المغرب', 'المغرب', 'المنتخب المغربي', 'أسود الأطلس', 'Morocco', 'MAR'],
  },
  {
    id: 'nt_dza',
    name: 'منتخب الجزائر',
    logo: '',
    aliases: ['منتخب الجزائر', 'الجزائر', 'المنتخب الجزائري', 'محاربو الصحراء', 'Algeria', 'DZA'],
  },
  {
    id: 'nt_tun',
    name: 'منتخب تونس',
    logo: '',
    aliases: ['منتخب تونس', 'تونس', 'المنتخب التونسي', 'نسور قرطاج', 'Tunisia', 'TUN'],
  },
  {
    id: 'nt_qat',
    name: 'منتخب قطر',
    logo: '',
    aliases: ['منتخب قطر', 'قطر', 'المنتخب القطري', 'العنابي', 'Qatar', 'QAT'],
  },
  {
    id: 'nt_uae',
    name: 'منتخب الإمارات',
    logo: '',
    aliases: ['منتخب الإمارات', 'منتخب الامارات', 'الإمارات', 'الامارات', 'المنتخب الإماراتي', 'الأبيض', 'UAE'],
  },
  {
    id: 'nt_jor',
    name: 'منتخب الأردن',
    logo: '',
    aliases: ['منتخب الأردن', 'منتخب الاردن', 'الأردن', 'الاردن', 'النشامى', 'Jordan', 'JOR'],
  },
  {
    id: 'nt_omn',
    name: 'منتخب عُمان',
    logo: '',
    aliases: ['منتخب عُمان', 'منتخب عمان', 'عُمان', 'عمان', 'الأحمر العماني', 'Oman', 'OMN'],
  },
  {
    id: 'nt_bhr',
    name: 'منتخب البحرين',
    logo: '',
    aliases: ['منتخب البحرين', 'البحرين', 'المنتخب البحريني', 'الأحمر البحريني', 'Bahrain', 'BHR'],
  },
  {
    id: 'nt_kwt',
    name: 'منتخب الكويت',
    logo: '',
    aliases: ['منتخب الكويت', 'الكويت', 'المنتخب الكويتي', 'الأزرق الكويتي', 'Kuwait', 'KWT'],
  },
  {
    id: 'nt_pse',
    name: 'منتخب فلسطين',
    logo: '',
    aliases: ['منتخب فلسطين', 'فلسطين', 'المنتخب الفلسطيني', 'الفدائي', 'Palestine', 'PSE'],
  },
  {
    id: 'nt_syr',
    name: 'منتخب سوريا',
    logo: '',
    aliases: ['منتخب سوريا', 'سوريا', 'المنتخب السوري', 'نسور قاسيون', 'Syria', 'SYR'],
  },
  {
    id: 'nt_lbn',
    name: 'منتخب لبنان',
    logo: '',
    aliases: ['منتخب لبنان', 'لبنان', 'المنتخب اللبناني', 'رجال الأرز', 'Lebanon', 'LBN'],
  },
  {
    id: 'nt_sdn',
    name: 'منتخب السودان',
    logo: '',
    aliases: ['منتخب السودان', 'السودان', 'المنتخب السوداني', 'صقور الجديان', 'Sudan', 'SDN'],
  },
  {
    id: 'nt_lby',
    name: 'منتخب ليبيا',
    logo: '',
    aliases: ['منتخب ليبيا', 'ليبيا', 'المنتخب الليبي', 'فرسان المتوسط', 'Libya', 'LBY'],
  },
  {
    id: 'nt_yem',
    name: 'منتخب اليمن',
    logo: '',
    aliases: ['منتخب اليمن', 'اليمن', 'المنتخب اليمني', 'نسور سبأ', 'Yemen', 'YEM'],
  },
  {
    id: 'nt_mrt',
    name: 'منتخب موريتانيا',
    logo: '',
    aliases: ['منتخب موريتانيا', 'موريتانيا', 'المرابطون', 'Mauritania', 'MRT'],
  },

  // المنتخبات العالمية الكبرى
  { id: 'nt_bra', name: 'منتخب البرازيل', logo: '', aliases: ['منتخب البرازيل', 'البرازيل', 'السيلساو', 'Brazil', 'BRA'] },
  { id: 'nt_arg', name: 'منتخب الأرجنتين', logo: '', aliases: ['منتخب الأرجنتين', 'الأرجنتين', 'الارجنتين', 'التانغو', 'Argentina', 'ARG'] },
  { id: 'nt_fra', name: 'منتخب فرنسا', logo: '', aliases: ['منتخب فرنسا', 'فرنسا', 'الديوك', 'France', 'FRA'] },
  { id: 'nt_eng', name: 'منتخب إنجلترا', logo: '', aliases: ['منتخب إنجلترا', 'منتخب انجلترا', 'إنجلترا', 'انجلترا', 'الأسود الثلاثة', 'England', 'ENG'] },
  { id: 'nt_esp', name: 'منتخب إسبانيا', logo: '', aliases: ['منتخب إسبانيا', 'منتخب اسبانيا', 'إسبانيا', 'اسبانيا', 'الماتادور', 'Spain', 'ESP'] },
  { id: 'nt_deu', name: 'منتخب ألمانيا', logo: '', aliases: ['منتخب ألمانيا', 'منتخب المانيا', 'ألمانيا', 'المانيا', 'المانشافت', 'Germany', 'GER', 'DEU'] },
  { id: 'nt_ita', name: 'منتخب إيطاليا', logo: '', aliases: ['منتخب إيطاليا', 'منتخب ايطاليا', 'إيطاليا', 'ايطاليا', 'الآزوري', 'Italy', 'ITA'] },
  { id: 'nt_prt', name: 'منتخب البرتغال', logo: '', aliases: ['منتخب البرتغال', 'البرتغال', 'برازيل أوروبا', 'Portugal', 'PRT', 'POR'] },
  { id: 'nt_nld', name: 'منتخب هولندا', logo: '', aliases: ['منتخب هولندا', 'هولندا', 'الطواحين', 'Netherlands', 'Holland', 'NLD'] },
  { id: 'nt_bel', name: 'منتخب بلجيكا', logo: '', aliases: ['منتخب بلجيكا', 'بلجيكا', 'الشياطين الحمر', 'Belgium', 'BEL'] },
  { id: 'nt_hrv', name: 'منتخب كرواتيا', logo: '', aliases: ['منتخب كرواتيا', 'كرواتيا', 'الناريون', 'Croatia', 'HRV', 'CRO'] },
  { id: 'nt_ury', name: 'منتخب الأوروغواي', logo: '', aliases: ['منتخب الأوروغواي', 'الأوروغواي', 'الاوروغواي', 'السيليستي', 'Uruguay', 'URY'] },
  { id: 'nt_jpn', name: 'منتخب اليابان', logo: '', aliases: ['منتخب اليابان', 'اليابان', 'محاربو الساموراي', 'Japan', 'JPN'] },
  { id: 'nt_kor', name: 'منتخب كوريا الجنوبية', logo: '', aliases: ['منتخب كوريا الجنوبية', 'كوريا الجنوبية', 'South Korea', 'KOR'] },
  { id: 'nt_sen', name: 'منتخب السنغال', logo: '', aliases: ['منتخب السنغال', 'السنغال', 'أسود التيرانغا', 'Senegal', 'SEN'] },
  { id: 'nt_usa', name: 'منتخب الولايات المتحدة', logo: '', aliases: ['منتخب الولايات المتحدة', 'الولايات المتحدة', 'أمريكا', 'امريكا', 'USA', 'United States'] },
];

export const ARAB_AND_GLOBAL_CLUBS: KnownTeam[] = [
  // أندية عربية كبرى
  { id: 'eg_ahly', name: 'الأهلي المصري', logo: '', aliases: ['الأهلي المصري', 'الاهلي المصري', 'أهلي القاهرة', 'نادي القرن', 'الأهلي', 'Al Ahly', 'Al Ahly SC'] },
  { id: 'eg_zamalek', name: 'الزمالك', logo: '', aliases: ['الزمالك', 'الزمالك المصري', 'نادي الزمالك', 'الفارس الأبيض', 'Zamalek', 'Zamalek SC'] },
  { id: 'eg_pyramids', name: 'بيراميدز', logo: '', aliases: ['بيراميدز', 'بيراميدز المصري', 'نادي بيراميدز', 'Pyramids FC', 'Pyramids'] },
  { id: 'iq_quwa', name: 'القوة الجوية', logo: '', aliases: ['القوة الجوية', 'القوة الجوية العراقي', 'نادي القوة الجوية', 'الصقور', 'Al-Quwa Al-Jawiya', 'Air Force Club'] },
  { id: 'iq_zawraa', name: 'الزوراء', logo: '', aliases: ['الزوراء', 'الزوراء العراقي', 'نادي الزوراء', 'النوارس', 'Al-Zawraa', 'Al Zawra'] },
  { id: 'iq_shorta', name: 'الشرطة العراقي', logo: '', aliases: ['الشرطة العراقي', 'الشرطة', 'نادي الشرطة', 'القيثارة الخضراء', 'Al-Shorta SC', 'Al Shorta'] },
  { id: 'iq_talaba', name: 'الطلبة', logo: '', aliases: ['الطلبة', 'الطلبة العراقي', 'نادي الطلبة', 'الأنيق', 'Al-Talaba', 'Al Talaba'] },
  { id: 'iq_erbil', name: 'أربيل', logo: '', aliases: ['أربيل', 'اربيل', 'نادي أربيل', 'قلعة هولير', 'Erbil SC', 'Arbil'] },
  { id: 'iq_zakho', name: 'زاخو', logo: '', aliases: ['زاخو', 'نادي زاخو', 'Zakho SC'] },
  { id: 'iq_najaf', name: 'النجف', logo: '', aliases: ['النجف', 'نادي النجف', 'غزلان البادية', 'Al-Najaf'] },
  { id: 'iq_mina', name: 'الميناء', logo: '', aliases: ['الميناء', 'نادي الميناء', 'سفانة الجنوب', 'Al-Minaa'] },
  { id: 'ae_ain', name: 'العين الإماراتي', logo: '', aliases: ['العين الإماراتي', 'العين الاماراتي', 'نادي العين الإماراتي', 'الزعيم العيناوي', 'Al Ain FC', 'Al Ain'] },
  { id: 'ae_wasl', name: 'الوصل', logo: '', aliases: ['الوصل', 'الوصل الإماراتي', 'نادي الوصل', 'الإمبراطور', 'Al Wasl'] },
  { id: 'ae_shabab_ahli', name: 'شباب الأهلي', logo: '', aliases: ['شباب الأهلي', 'شباب الاهلي', 'شباب الأهلي دبي', 'فرسان دبي', 'Shabab Al Ahli'] },
  { id: 'ae_jazira', name: 'الجزيرة الإماراتي', logo: '', aliases: ['الجزيرة الإماراتي', 'نادي الجزيرة', 'فخر أبوظبي', 'Al Jazira'] },
  { id: 'qa_sadd', name: 'السد', logo: '', aliases: ['السد', 'السد القطري', 'نادي السد', 'الزعيم السداوي', 'Al Sadd', 'Al-Sadd'] },
  { id: 'qa_duhail', name: 'الدحيل', logo: '', aliases: ['الدحيل', 'الدحيل القطري', 'نادي الدحيل', 'الطوفان', 'Al Duhail', 'Al-Duhail'] },
  { id: 'qa_rayyan', name: 'الريان', logo: '', aliases: ['الريان', 'الريان القطري', 'نادي الريان', 'الرهيب', 'Al Rayyan', 'Al-Rayyan'] },
  { id: 'qa_gharafa', name: 'الغرافة', logo: '', aliases: ['الغرافة', 'الغرافة القطري', 'نادي الغرافة', 'الفهود', 'Al Gharafa'] },
  { id: 'tn_taraji', name: 'الترجي التونسي', logo: '', aliases: ['الترجي التونسي', 'الترجي الرياضي', 'الترجي', 'شيخ الأندية التونسية', 'Esperance de Tunis', 'EST'] },
  { id: 'tn_club_africain', name: 'النادي الإفريقي', logo: '', aliases: ['النادي الإفريقي', 'النادي الافريقي', 'الإفريقي', 'الافريقي', 'Club Africain'] },
  { id: 'tn_etoile', name: 'النجم الساحلي', logo: '', aliases: ['النجم الساحلي', 'النجم الرياضي الساحلي', 'ليتوال', 'Etoile du Sahel', 'ESS'] },
  { id: 'tn_css', name: 'الصفاقسي', logo: '', aliases: ['الصفاقسي', 'النادي الرياضي الصفاقسي', 'CSS', 'CS Sfaxien'] },
  { id: 'ma_raja', name: 'الرجاء الرياضي', logo: '', aliases: ['الرجاء الرياضي', 'الرجاء البيضاوي', 'الرجاء', 'النسور الخضر', 'Raja Club Athletic', 'RCA'] },
  { id: 'ma_wydad', name: 'الوداد الرياضي', logo: '', aliases: ['الوداد الرياضي', 'الوداد البيضاوي', 'الوداد', 'وداد الأمة', 'Wydad AC', 'WAC'] },
  { id: 'ma_far', name: 'الجيش الملكي', logo: '', aliases: ['الجيش الملكي', 'الجيش الملكي المغربي', 'العساكر', 'AS FAR'] },

  // أندية عالمية كبرى
  { id: 'eu_rm', name: 'ريال مدريد', logo: '', aliases: ['ريال مدريد', 'ريال مدريد الإسباني', 'الملكي', 'Real Madrid', 'Real Madrid CF', 'RM'] },
  { id: 'eu_barca', name: 'برشلونة', logo: '', aliases: ['برشلونة', 'برشلونه', 'برشلونة الإسباني', 'البارسا', 'البارشا', 'FC Barcelona', 'Barcelona', 'Barca'] },
  { id: 'eu_mancity', name: 'مانشستر سيتي', logo: '', aliases: ['مانشستر سيتي', 'مان سيتي', 'السيتي', 'Manchester City', 'Man City', 'MCFC'] },
  { id: 'eu_liverpool', name: 'ليفربول', logo: '', aliases: ['ليفربول', 'الريدز', 'Liverpool', 'Liverpool FC', 'LFC'] },
  { id: 'eu_arsenal', name: 'أرسنال', logo: '', aliases: ['أرسنال', 'ارسنال', 'الغانرز', 'Arsenal', 'Arsenal FC'] },
  { id: 'eu_manutd', name: 'مانشستر يونايتد', logo: '', aliases: ['مانشستر يونايتد', 'مان يونايتد', 'الشياطين الحمر', 'Manchester United', 'Man Utd', 'MUFC'] },
  { id: 'eu_chelsea', name: 'تشيلسي', logo: '', aliases: ['تشيلسي', 'البلوز', 'Chelsea', 'Chelsea FC'] },
  { id: 'eu_bayern', name: 'بايرن ميونخ', logo: '', aliases: ['بايرن ميونخ', 'البايرن', 'العملاق البافاري', 'Bayern Munich', 'FC Bayern München'] },
  { id: 'eu_psg', name: 'باريس سان جيرمان', logo: '', aliases: ['باريس سان جيرمان', 'باريس', 'بي اس جي', 'PSG', 'Paris Saint-Germain'] },
  { id: 'eu_inter', name: 'إنتر ميلان', logo: '', aliases: ['إنتر ميلان', 'انتر ميلان', 'إنتر', 'انتر', 'النيراتزوري', 'Inter Milan', 'Inter'] },
  { id: 'eu_milan', name: 'ميلان', logo: '', aliases: ['ميلان', 'إيه سي ميلان', 'اي سي ميلان', 'الروسونيري', 'AC Milan', 'Milan'] },
  { id: 'eu_juve', name: 'يوفنتوس', logo: '', aliases: ['يوفنتوس', 'اليوفي', 'السيدة العجوز', 'البيانكونيري', 'Juventus', 'Juve'] },
  { id: 'eu_atletico', name: 'أتلتيكو مدريد', logo: '', aliases: ['أتلتيكو مدريد', 'اتلتيكو مدريد', 'الروخيبلانكوس', 'Atletico Madrid', 'Atletico'] },
];

export const ALL_KNOWN_TEAMS: KnownTeam[] = [
  ...SAUDI_TEAMS,
  ...NATIONAL_TEAMS,
  ...ARAB_AND_GLOBAL_CLUBS,
];

export const ALL_KNOWN_LEAGUES: KnownLeague[] = [
  ...SAUDI_LEAGUES,
];

/**
 * Normalizes sports team and league names for aggressive, highly tolerant Arabic & English matching.
 */
export function normalizeSportsName(str: string): string {
  if (!str) return '';
  let s = str.trim().toLowerCase();

  // Strip common prefixes
  s = s.replace(/^(نادي|فريق|منتخب|نادى)\s+/g, '');
  s = s.replace(/^(fc|sc|afc|al|el)\s+/g, '');
  s = s.replace(/^(al-|el-)/g, '');

  // Strip common suffixes
  s = s.replace(/\s+(السعودي|المصري|العراقي|الإماراتي|الاماراتي|القطري|المغربي|التونسي|الجزائري|الرياضي|fc|sc|sfc|club)$/g, '');

  // Normalize Arabic letters
  s = s
    .replace(/[أإآء]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[\u064B-\u065F]/g, '') // Tashkeel
    .replace(/ـ/g, '') // Tatweel
    .replace(/[-_.\s]+/g, ' ')
    .trim();

  return s;
}

/**
 * Detects if a tournament or league name is for national teams.
 */
export function isNationalTournament(leagueName?: string): boolean {
  if (!leagueName) return false;
  const raw = leagueName.toLowerCase();
  const norm = normalizeSportsName(leagueName);
  return (
    norm.includes('منتخب') ||
    norm.includes('عالم') ||
    norm.includes('امم') ||
    norm.includes('خليج') ||
    norm.includes('وديه دوليه') ||
    norm.includes('اولمبياد') ||
    norm.includes('fifa') ||
    norm.includes('nations') ||
    norm.includes('qualifiers') ||
    raw.includes('world cup') ||
    raw.includes('asian cup') ||
    raw.includes('afcon') ||
    raw.includes('euro') ||
    (norm.includes('اسيا') && !norm.includes('نخبه') && !norm.includes('انديه') && !norm.includes('ابطال')) ||
    (norm.includes('افريقيا') && !norm.includes('انديه') && !norm.includes('ابطال')) ||
    (norm.includes('عرب') && !norm.includes('انديه') && !norm.includes('ابطال')) ||
    (norm.includes('تصفيات') && !norm.includes('انديه'))
  );
}

/**
 * Detects if a tournament is a Saudi domestic club league or cup.
 */
export function isSaudiTournament(leagueName?: string): boolean {
  if (!leagueName) return false;
  const raw = leagueName.toLowerCase();
  const norm = normalizeSportsName(leagueName);
  return (
    norm.includes('روشن') ||
    norm.includes('يلو') ||
    norm.includes('خادم الحرمين') ||
    norm.includes('كاس الملك') ||
    norm.includes('السوبر السعودي') ||
    raw.includes('spl') ||
    (norm.includes('سعودي') && !norm.includes('منتخب'))
  );
}

/**
 * Returns whether a team belongs to national teams.
 */
export function isNationalTeam(team: KnownTeam | { id?: string; name: string }): boolean {
  if (!team) return false;
  if (team.id && team.id.startsWith('nt_')) return true;
  const norm = normalizeSportsName(team.name);
  if (team.name.startsWith('منتخب') || norm.startsWith('منتخب')) return true;
  return NATIONAL_TEAMS.some((nt) => nt.id === team.id || normalizeSportsName(nt.name) === norm);
}

/**
 * Returns candidate teams categorized for a specific league/tournament context.
 */
export function getSuggestedTeamsForLeague(leagueName?: string): {
  category: 'national' | 'saudi' | 'all';
  teams: KnownTeam[];
} {
  if (isNationalTournament(leagueName)) {
    return { category: 'national', teams: NATIONAL_TEAMS };
  }
  if (isSaudiTournament(leagueName)) {
    return { category: 'saudi', teams: SAUDI_TEAMS };
  }
  return { category: 'all', teams: ALL_KNOWN_TEAMS };
}

/**
 * Smart lookup in the team catalog.
 * Returns the matched team with its official logo if found.
 * Supports leagueContext to disambiguate national teams vs clubs.
 */
export function matchTeamFromCatalog(query: string, leagueContext?: string): KnownTeam | null {
  if (!query || !query.trim()) return null;
  const raw = query.trim().toLowerCase();
  const normalized = normalizeSportsName(raw);

  if (!normalized && !raw) return null;

  const isNationalContext =
    isNationalTournament(leagueContext) ||
    raw.includes('منتخب') ||
    raw.startsWith('nt_');

  const isClubExplicit =
    raw.includes('نادي') ||
    raw.includes('fc') ||
    raw.includes('sc') ||
    raw.includes('club') ||
    isSaudiTournament(leagueContext);

  // Group candidate teams according to context
  let orderedTeams: KnownTeam[];
  if (isNationalContext && !isClubExplicit) {
    orderedTeams = [...NATIONAL_TEAMS, ...SAUDI_TEAMS, ...ARAB_AND_GLOBAL_CLUBS];
  } else if (isClubExplicit) {
    orderedTeams = [...SAUDI_TEAMS, ...ARAB_AND_GLOBAL_CLUBS, ...NATIONAL_TEAMS];
  } else {
    orderedTeams = ALL_KNOWN_TEAMS;
  }

  // 1. Direct exact or ID match (Highest priority)
  for (const team of orderedTeams) {
    if (team.id.toLowerCase() === raw) return team;
    if (team.name.trim().toLowerCase() === raw) return team;
    if (normalizeSportsName(team.name) === normalized) return team;
  }

  // 2. Exact Alias match (High priority)
  for (const team of orderedTeams) {
    for (const alias of team.aliases) {
      if (alias.trim().toLowerCase() === raw) return team;
      if (normalizeSportsName(alias) === normalized) return team;
    }
  }

  // 3. Starts-with / Prefix match within appropriate domain
  if (normalized.length >= 2) {
    for (const team of orderedTeams) {
      const isTeamNt = isNationalTeam(team);
      if (isNationalContext && !isClubExplicit && !isTeamNt) continue;
      if (isClubExplicit && isTeamNt) continue;

      const teamNorm = normalizeSportsName(team.name);
      if (teamNorm.startsWith(normalized)) {
        return team;
      }
      for (const alias of team.aliases) {
        const aliasNorm = normalizeSportsName(alias);
        if (aliasNorm.startsWith(normalized)) {
          return team;
        }
      }
    }
  }

  // 4. Substring / Token match within appropriate domain
  for (const team of orderedTeams) {
    const isTeamNt = isNationalTeam(team);
    if (isNationalContext && !isClubExplicit && !isTeamNt) continue;
    if (isClubExplicit && isTeamNt) continue;

    const teamNorm = normalizeSportsName(team.name);
    if (normalized.length >= 3 && (teamNorm.includes(normalized) || normalized.includes(teamNorm))) {
      return team;
    }
    for (const alias of team.aliases) {
      const aliasNorm = normalizeSportsName(alias);
      if (aliasNorm.length >= 3 && (aliasNorm.includes(normalized) || normalized.includes(aliasNorm))) {
        return team;
      }
    }
  }

  // 5. General fallback substring match across all teams
  for (const team of orderedTeams) {
    const teamNorm = normalizeSportsName(team.name);
    if (normalized.length >= 3 && (teamNorm.includes(normalized) || normalized.includes(teamNorm))) {
      return team;
    }
    for (const alias of team.aliases) {
      const aliasNorm = normalizeSportsName(alias);
      if (aliasNorm.length >= 3 && (aliasNorm.includes(normalized) || normalized.includes(aliasNorm))) {
        return team;
      }
    }
  }

  return null;
}

/**
 * Returns multiple matching teams from catalog for search suggestions, ranked by relevance.
 */
export function searchTeamsFromCatalog(
  query: string,
  leagueContext?: string,
  limit = 8
): KnownTeam[] {
  if (!query || !query.trim()) return [];
  const raw = query.trim().toLowerCase();
  const normalized = normalizeSportsName(raw);

  if (!normalized && !raw) return [];

  const isNationalContext =
    isNationalTournament(leagueContext) ||
    raw.includes('منتخب') ||
    raw.startsWith('nt_');

  const isClubExplicit =
    raw.includes('نادي') ||
    raw.includes('fc') ||
    raw.includes('sc') ||
    raw.includes('club') ||
    isSaudiTournament(leagueContext);

  let orderedTeams: KnownTeam[];
  if (isNationalContext && !isClubExplicit) {
    orderedTeams = [...NATIONAL_TEAMS, ...SAUDI_TEAMS, ...ARAB_AND_GLOBAL_CLUBS];
  } else if (isClubExplicit) {
    orderedTeams = [...SAUDI_TEAMS, ...ARAB_AND_GLOBAL_CLUBS, ...NATIONAL_TEAMS];
  } else {
    orderedTeams = ALL_KNOWN_TEAMS;
  }

  const results: KnownTeam[] = [];
  const addedIds = new Set<string>();

  const addTeam = (team: KnownTeam) => {
    if (!addedIds.has(team.id)) {
      addedIds.add(team.id);
      results.push(team);
    }
  };

  // 1. Exact match (name, id, or alias)
  for (const team of orderedTeams) {
    if (
      team.id.toLowerCase() === raw ||
      team.name.trim().toLowerCase() === raw ||
      normalizeSportsName(team.name) === normalized ||
      team.aliases.some(
        (a) => a.trim().toLowerCase() === raw || normalizeSportsName(a) === normalized
      )
    ) {
      addTeam(team);
    }
  }

  // 2. Starts-with / Prefix match
  for (const team of orderedTeams) {
    const tNorm = normalizeSportsName(team.name);
    if (tNorm.startsWith(normalized)) {
      addTeam(team);
    } else if (team.aliases.some((a) => normalizeSportsName(a).startsWith(normalized))) {
      addTeam(team);
    }
    if (results.length >= limit) return results.slice(0, limit);
  }

  // 3. Substring match
  if (normalized.length >= 2) {
    for (const team of orderedTeams) {
      const tNorm = normalizeSportsName(team.name);
      if (tNorm.includes(normalized)) {
        addTeam(team);
      } else if (team.aliases.some((a) => normalizeSportsName(a).includes(normalized))) {
        addTeam(team);
      }
      if (results.length >= limit) return results.slice(0, limit);
    }
  }

  return results.slice(0, limit);
}

/**
 * Smart lookup in the league catalog.
 * Returns the matched league with its official logo if found.
 */
export function matchLeagueFromCatalog(query: string): KnownLeague | null {
  if (!query || !query.trim()) return null;
  const raw = query.trim().toLowerCase();
  const normalized = normalizeSportsName(raw);

  // Special instant catch for Roshn / Saudi Pro League
  if (
    normalized.includes('روشن') ||
    raw.includes('spl') ||
    normalized.includes('سعودي') ||
    normalized.includes('saudi') ||
    raw.includes('roshn')
  ) {
    const spl = SAUDI_LEAGUES.find((l) => l.id === 'SPL');
    if (spl) return spl;
  }

  // 1. Direct match
  for (const league of ALL_KNOWN_LEAGUES) {
    if (league.id.toLowerCase() === raw) return league;
    if (league.name.trim().toLowerCase() === raw) return league;
    if (normalizeSportsName(league.name) === normalized) return league;
  }

  // 2. Alias match
  for (const league of ALL_KNOWN_LEAGUES) {
    for (const alias of league.aliases) {
      if (alias.trim().toLowerCase() === raw) return league;
      if (normalizeSportsName(alias) === normalized) return league;
    }
  }

  // 3. Substring match
  for (const league of ALL_KNOWN_LEAGUES) {
    const lNorm = normalizeSportsName(league.name);
    if (normalized.length >= 3 && (lNorm.includes(normalized) || normalized.includes(lNorm))) {
      return league;
    }
    for (const alias of league.aliases) {
      const aNorm = normalizeSportsName(alias);
      if (aNorm.length >= 3 && (aNorm.includes(normalized) || normalized.includes(aNorm))) {
        return league;
      }
    }
  }

  return null;
}
