import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

type TabKey = 'terms' | 'privacy';

interface TabItem {
  key: TabKey;
  label: string;
}

const TABS: TabItem[] = [
  { key: 'terms', label: 'سياسة الاستخدام' },
  { key: 'privacy', label: 'الخصوصية والأمان' },
];

export default function TermsAndPolicies() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve initial tab based on route path or query param
  const getInitialTab = (): TabKey => {
    const path = location.pathname;
    if (path.includes('privacy') || path.includes('security')) return 'privacy';
    const queryTab = searchParams.get('tab') as TabKey;
    if (queryTab === 'privacy') return 'privacy';
    return 'terms';
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);

  useEffect(() => {
    const nextTab = getInitialTab();
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [location.pathname, searchParams]);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useSEO(
    'سياسة الاستخدام والخصوصية والأمان | أخبار كرة القدم العالمية',
    'الوثيقة الرسمية لسياسة الاستخدام ومعايير الخصوصية والأمان في منصة أخبار كرة القدم العالمية.'
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <header className="mb-10 sm:mb-12 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
              الوثائق التنظيمية الرسمية
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              سياسة الاستخدام والخصوصية والأمان
            </h1>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-normal">
            آخر تحديث: سبتمبر 2026
          </div>
        </div>

        {/* Global corporate tab navigation */}
        <nav
          aria-label="أقسام السياسة والخصوصية"
          className="flex items-center gap-8 mt-8 overflow-x-auto scrollbar-hide text-sm"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`pb-3 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Document Body */}
      <main className="min-h-[300px]">
        {activeTab === 'terms' && <TermsSection />}
        {activeTab === 'privacy' && <PrivacySection />}
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// 1. سياسة الاستخدام - تعبير عام ومباشر
// ----------------------------------------------------------------------
function TermsSection() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          سياسة الاستخدام
        </h2>
        <p className="text-xs text-slate-400">
          تحدد هذه الشروط الضوابط المنظمة لاستخدام الموقع والخدمات والمحتوى الرياضي المتاح.
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          1. القبول بالسياسة والشروط
        </h3>
        <p>
          يعد دخولك إلى المنصة أو تسجيل حساب مستخدم فيها موافقة صريحة وكاملة على الالتزام بجميع بنود هذه السياسة. إذا كنت لا توافق على هذه الشروط، يرجى الامتناع عن استخدام الموقع.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          2. تسجيل الحساب وأمان البيانات
        </h3>
        <p>
          يتطلب الاستفادة من ميزات المنصة، مثل مسابقة التوقعات وحفظ التفضيلات، إنشاء حساب مستخدم وفق الضوابط التالية:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pr-2">
          <li>تقديم معلومات صحيحة ومحدثة عند التسجيل (الاسم وعنوان البريد الإلكتروني).</li>
          <li>تفعيل الحساب من خلال رمز التحقق لمرة واحدة (OTP) المرسل إلى بريدك الإلكتروني للتحقق من ملكيته.</li>
          <li>المستخدم مسؤول مسؤولية تامة عن سرية بيانات حسابه وكلمة المرور وكافة الأنشطة التي تتم من خلاله.</li>
          <li>يُحظر إنشاء حسابات متعددة للشخص نفسه، وتخضع الحسابات المكررة للحظر الفوري حفاظاً على نزاهة المنافسة.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          3. الاستخدام المقبول والسلوك العام
        </h3>
        <p>
          تُقدم المنصة خدماتها للأغراض الرياضية والإعلامية والترفيهية الشخصية فقط، ويشترط في الاستخدام الالتزام بالقواعد الآتية:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pr-2">
          <li>يُحظر استخدام أي أدوات برمجية مؤتمتة (Bots)، أو كشط البيانات، أو محاولة استغلال أي ثغرات برمجية للوصول غير المصرح به.</li>
          <li>يُحظر أي محاولة للتلاعب بنتائج التوقعات أو أوقات إرسالها بعد انتهاء المدة المحددة لكل مباراة.</li>
          <li>يُمنع نشر أي محتوى أو تعليقات تتضمن إساءة، أو تشهيراً، أو تعصباً رياضياً غير لائق، أو ألفاظاً تحث على الكراهية.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          4. طبيعة المسابقات وحظر المراهنات
        </h3>
        <p>
          المنصة مجانية تماماً، وتقتصر مسابقة التوقعات على التنافس الرياضي الفكري الترفيهي. لا يقدم الموقع ولا يشجع ولا يرتبط بأي نشاط من أنشطة المراهنات المالية أو القمار بأي شكل من الأشكال.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          5. التعديل وإنهاء الخدمة
        </h3>
        <p>
          تحتفظ إدارة المنصة بالحق في تعديل أو تحديث هذه السياسة في أي وقت، وتصبح التعديلات نافذة فور نشرها على هذه الصفحة. كما يحق للإدارة تعليق أو حذف حساب أي مستخدم يثبت ارتكابه لمخالفة صريحة للشروط دون إشعار مسبق.
        </p>
      </section>
    </article>
  );
}

// ----------------------------------------------------------------------
// 2. الخصوصية والأمان - تعبير عام ومباشر
// ----------------------------------------------------------------------
function PrivacySection() {
  return (
    <article className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          الخصوصية والأمان
        </h2>
        <p className="text-xs text-slate-400">
          بيان رسمي يوضح كيفية جمع البيانات ومعالجتها ومعايير الحماية والتشفير المطبقة.
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          1. البيانات التي نجمعها
        </h3>
        <p>
          نقتصر في جمع المعلومات على الحد الأدنى الضروري لتشغيل المنصة وتقديم خدماتها بكفاءة:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pr-2">
          <li><strong>بيانات التعريف الشخصية:</strong> الاسم المعروض وعنوان البريد الإلكتروني المعتمد عند التسجيل.</li>
          <li><strong>سجلات النشاط والتوقعات:</strong> خيارات التوقعات المدخلة للمباريات، النقاط المكتسبة، وسجلات الترتيب.</li>
          <li><strong>البيانات الفنية والتشغيلية:</strong> سجلات مؤقتة تشمل عناوين IP ونوع المتصفح المستخدم لأغراض الأمان ومنع محاولات الاختراق.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          2. معايير الأمان والتشفير
        </h3>
        <p>
          نعتمد إجراءات أمنية وتشفيرية متقدمة لحماية معلومات المستخدمين من الوصول غير المصرح به:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pr-2">
          <li>تشفير كلمات المرور في قاعدة البيانات باستخدام خوارزمية <code>Scrypt</code> مع أملاح تشفيرية عشوائية تمنع فك الشفرة أو استرجاع النص الأصلي.</li>
          <li>تشفير كافة الاتصالات ونقل البيانات بين جهاز المستخدم وخوادم المنصة عبر بروتوكولات الاتصال الآمنة (HTTPS/TLS).</li>
          <li>استخدام رموز تحقق مؤقتة (OTP) ذات صلاحية زمنية محددة للتحقق من البريد الإلكتروني ومنع انتحال الهوية.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          3. عدم مشاركة البيانات أو بيعها
        </h3>
        <p>
          نلتزم بعدم بيع أو تأجير أو مشاركة البيانات الشخصية أو عناوين البريد الإلكتروني للمستخدمين مع أي شركات تجارية أو جهات تسويقية خارجية. تقتصر معالجة البيانات على الأغراض التشغيلية وإدارة الحسابات داخل المنصة فقط.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          4. التخزين المحلي وملفات الجلسة
        </h3>
        <p>
          تستخدم المنصة تقنيات التخزين المحلي في المتصفح لحفظ جلسة تسجيل الدخول وتفضيلات التصفح (مثل الوضع الداكن وتنبيهات المباريات). لا نستخدم ملفات تعريف ارتباط خاصة بأطراف ثالثة لأغراض التتبع الإعلاني، ويمكن للمستخدم مسح بيانات التخزين من متصفحه في أي وقت.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          5. حقوق المستخدم والاتصال
        </h3>
        <p>
          يحق للمستخدم تحديث بيانات حسابه أو طلب حذف حسابه وبياناته المسجلة عبر التواصل مع إدارة المنصة، ويتم التعامل مع هذه الطلبات وفق اللوائح التنظيمية المعمول بها.
        </p>
      </section>
    </article>
  );
}
