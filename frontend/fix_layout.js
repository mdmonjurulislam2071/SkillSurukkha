const fs = require('fs');
const file = 'g:/3rd Year/2nd Semester/Software Engineering/SkillSurokkha/frontend/app/page.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = `      <section id="jobs" className="bg-[#f6f8f4] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker={tx(lang, "নতুন সুযোগ", "Fresh opportunities")} title={tx(lang, "আপনার জন্য বাছাই করা কাজ", "Selected projects for you")} text={tx(lang, "ভেরিফাইড ক্লায়েন্টদের প্রকাশিত সাম্প্রতিক কাজগুলো দেখুন এবং আজই আবেদন করুন।", "Explore recent projects from verified clients and apply today.")} />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {loadingPostedJobs ? [0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-[24px] bg-white shadow-card" />) : displayedJobs.map((job) => <JobCard key={job.id || job.title} job={job} lang={lang} onApply={onLogin} />)}
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <Logo dark lang={lang} />
          <p className="text-xs text-white/40">© 2026 SkillShurokkha. {tx(lang, "নিরাপদ দক্ষতা, নিরাপদ ভবিষ্যৎ।", "Secure skills, secure future.")}</p>
        </div>
      </footer>`;

const replacement1 = `      <ThemeBackground id="jobs" className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle dark={true} kicker={tx(lang, "নতুন সুযোগ", "Fresh opportunities")} title={tx(lang, "আপনার জন্য বাছাই করা কাজ", "Selected projects for you")} text={tx(lang, "ভেরিফাইড ক্লায়েন্টদের প্রকাশিত সাম্প্রতিক কাজগুলো দেখুন এবং আজই আবেদন করুন।", "Explore recent projects from verified clients and apply today.")} />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {loadingPostedJobs ? [0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-[24px] bg-white/5 shadow-card" />) : displayedJobs.map((job) => <JobCard dark={true} key={job.id || job.title} job={job} lang={lang} onApply={onLogin} />)}
          </div>
        </div>
      </ThemeBackground>
      <footer className="bg-ink px-5 py-10 text-white lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <Logo dark lang={lang} />
          <p className="text-xs text-white/40">© 2026 SkillShurokkha. {tx(lang, "নিরাপদ দক্ষতা, নিরাপদ ভবিষ্যৎ।", "Secure skills, secure future.")}</p>
        </div>
      </footer>`;

if(content.includes(target1)) {
  content = content.replace(target1, replacement1);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully replaced layout!');
} else {
  console.log('Target string not found.');
}
