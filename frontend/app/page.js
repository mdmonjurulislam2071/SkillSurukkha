"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";
import {
  FiArrowRight,
  FiBell,
  FiBriefcase,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiGlobe,
  FiGrid,
  FiHome,
  FiLock,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiMic,
  FiPlus,
  FiSearch,
  FiSettings,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiUploadCloud,
  FiVideo,
  FiX,
  FiZap,
} from "react-icons/fi";

const copy = {
  bn: {
    nav: ["কিভাবে কাজ করে", "সুবিধাসমূহ", "কাজ খুঁজুন"],
    signIn: "লগ ইন",
    join: "শুরু করুন",
    heroTag: "বিশ্বজুড়ে দক্ষ পেশাজীবীদের বিশ্বস্ত প্ল্যাটফর্ম",
    heroTitle: "দক্ষতার মূল্য দিন,",
    heroAccent: "নিরাপদে এগিয়ে যান।",
    heroText:
      "AI যাচাইকৃত দক্ষতা, ব্লকচেইন ব্যাজ এবং নিরাপদ এসক্রো পেমেন্টে গড়ুন নিশ্চিন্ত ফ্রিল্যান্সিং ক্যারিয়ার।",
    findWork: "কাজ খুঁজুন",
    hireTalent: "দক্ষ কর্মী খুঁজুন",
    trustedBy: "হাজারো পেশাজীবীর আস্থার জায়গা",
    dashboard: "ড্যাশবোর্ড",
    projects: "কাজসমূহ",
    verify: "স্কিল ভেরিফাই",
    payments: "পেমেন্ট",
    messages: "মেসেজ",
    settings: "সেটিংস",
    welcome: "শুভ সকাল, আরিফ!",
    welcomeSub: "আপনার ফ্রিল্যান্সিং যাত্রা আজ আরও এক ধাপ এগিয়ে নিন।",
  },
  en: {
    nav: ["How it works", "Features", "Find work"],
    signIn: "Sign in",
    join: "Get started",
    heroTag: "A trusted freelance platform for global talent",
    heroTitle: "Own your skills,",
    heroAccent: "move forward securely.",
    heroText:
      "Build a confident freelance career with AI-verified skills, blockchain badges and secure escrow payments.",
    findWork: "Find work",
    hireTalent: "Hire talent",
    trustedBy: "Trusted by thousands of professionals",
    dashboard: "Dashboard",
    projects: "Projects",
    verify: "Verify skill",
    payments: "Payments",
    messages: "Messages",
    settings: "Settings",
    welcome: "Good morning, Arif!",
    welcomeSub: "Take your freelance journey one step further today.",
  },
};

const tx = (lang, bn, en) => (lang === "bn" ? bn : en);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

const jobs = [
  {
    title: "E-commerce Website UI Design",
    titleBn: "ই-কমার্স ওয়েবসাইট UI ডিজাইন",
    category: "UI/UX Design",
    categoryBn: "UI/UX ডিজাইন",
    budget: "৳ ২৫,০০০",
    budgetEn: "৳ 25,000",
    time: "৭ দিন",
    timeEn: "7 days",
    bids: "১২ proposals",
    bidsEn: "12 proposals",
    skills: ["Figma", "UI Design", "Prototype"],
    skillsBn: ["Figma", "UI ডিজাইন", "প্রোটোটাইপ"],
    color: "bg-violet-100 text-violet-700",
    icon: FiGrid,
  },
  {
    title: "React Landing Page Development",
    titleBn: "React ল্যান্ডিং পেজ ডেভেলপমেন্ট",
    category: "Web Development",
    categoryBn: "ওয়েব ডেভেলপমেন্ট",
    budget: "৳ ১৮,৫০০",
    budgetEn: "৳ 18,500",
    time: "৫ দিন",
    timeEn: "5 days",
    bids: "৮ proposals",
    bidsEn: "8 proposals",
    skills: ["React", "Tailwind", "Responsive"],
    skillsBn: ["React", "Tailwind", "রেসপনসিভ"],
    color: "bg-sky-100 text-sky-700",
    icon: FiZap,
  },
  {
    title: "Brand Identity & Social Media Kit",
    titleBn: "ব্র্যান্ড আইডেন্টিটি ও সোশ্যাল মিডিয়া কিট",
    category: "Graphic Design",
    categoryBn: "গ্রাফিক ডিজাইন",
    budget: "৳ ১২,০০০",
    budgetEn: "৳ 12,000",
    time: "৪ দিন",
    timeEn: "4 days",
    bids: "১৬ proposals",
    bidsEn: "16 proposals",
    skills: ["Branding", "Illustrator", "Social"],
    skillsBn: ["ব্র্যান্ডিং", "Illustrator", "সোশ্যাল"],
    color: "bg-amber-100 text-amber-700",
    icon: FiStar,
  },
];

const sidebar = [
  ["dashboard", FiHome],
  ["projects", FiBriefcase],
  ["verify", FiShield],
  ["payments", FiCreditCard],
  ["messages", FiMessageCircle],
  ["settings", FiSettings],
];

function Logo({ dark = false, compact = false, lang = "en" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 shadow-lg shadow-emerald-900/20">
        <FiShield className="text-xl text-forest" />
        <FiCheck className="absolute text-xs font-bold text-forest" />
      </div>
      {!compact && (
        <div className={`leading-none ${dark ? "text-white" : "text-ink"}`}>
          <p className="text-[19px] font-extrabold tracking-tight">SkillShurokkha</p>
          <p className={`mt-1 text-[9px] font-semibold uppercase tracking-[.26em] ${dark ? "text-emerald-300" : "text-emerald-700"}`}>
            {tx(lang, "দক্ষতা। বিশ্বাস। উন্নতি।", "Skill. Trust. Growth.")}
          </p>
        </div>
      )}
    </div>
  );
}

function LanguageButton({ lang, setLang, dark = false }) {
  return (
    <button
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
        dark ? "text-white hover:bg-white/10" : "text-forest hover:bg-emerald-50"
      }`}
    >
      <FiGlobe />
      {lang === "bn" ? "EN" : "বাং"}
    </button>
  );
}

function Header({ lang, setLang, onLogin }) {
  const t = copy[lang];
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-ink/75 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Logo dark lang={lang} />
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex">
          {t.nav.map((item, index) => (
            <a key={item} href={index === 0 ? "#process" : index === 1 ? "#features" : "#jobs"} className="transition hover:text-emerald-300">
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <LanguageButton lang={lang} setLang={setLang} dark />
          <button onClick={onLogin} className="hidden px-4 py-2 text-sm font-semibold text-white sm:block">
            {t.signIn}
          </button>
          <button onClick={onLogin} className="rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-forest transition hover:bg-emerald-300">
            {t.join}
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ lang, onLogin }) {
  const t = copy[lang];
  return (
    <section className="relative overflow-hidden bg-ink bg-hero-grid bg-[size:52px_52px] pt-32 text-white lg:pt-40">
      <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute right-0 top-48 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-24 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:pb-32">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-2 text-xs font-semibold text-emerald-200">
            <FiShield /> {t.heroTag}
          </div>
          <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.07] tracking-tight sm:text-6xl xl:text-7xl">
            {t.heroTitle}
            <span className="block text-emerald-300">{t.heroAccent}</span>
          </h1>
          <p className="font-bangla mt-7 max-w-xl text-lg leading-8 text-white/68">{t.heroText}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={onLogin} className="flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3.5 text-sm font-bold text-forest transition hover:-translate-y-1 hover:bg-emerald-300 hover:shadow-glow">
              {t.findWork} <FiArrowRight />
            </button>
            <button onClick={onLogin} className="rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
              {t.hireTalent}
            </button>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-white/55">
            <div className="flex -space-x-2">
              {["AR", "NS", "TA", "MR"].map((name, index) => (
                <div key={name} className={`grid h-9 w-9 place-items-center rounded-full border-2 border-ink text-[10px] font-bold text-ink ${["bg-amber-300", "bg-sky-300", "bg-emerald-300", "bg-violet-300"][index]}`}>
                  {name}
                </div>
              ))}
            </div>
            <span>{t.trustedBy}</span>
          </div>
        </motion.div>
        <HeroCard lang={lang} />
      </div>
      <div className="border-t border-white/10 bg-white/[.035]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-5 py-6 sm:grid-cols-4 lg:px-8">
          {(lang === "bn" ? [["২৫K+", "সক্রিয় ব্যবহারকারী"], ["৪.৯/৫", "ব্যবহারকারীর রেটিং"], ["৳২.৫Cr+", "নিরাপদ পেমেন্ট"], ["৯২%", "ভেরিফাইড স্কিল"]] : [["25K+", "Active Users"], ["4.9/5", "User Rating"], ["৳2.5Cr+", "Secure Payments"], ["92%", "Verified Skills"]]).map(([value, label]) => (
            <div key={label}>
              <p className="text-2xl font-bold text-emerald-300">{value}</p>
              <p className="mt-1 text-xs font-medium text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroCard({ lang }) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-5 rounded-[40px] bg-emerald-400/10 blur-2xl" />
      <div className="glass relative overflow-hidden rounded-[30px] p-4 shadow-2xl">
        <div className="relative overflow-hidden rounded-[23px] bg-gradient-to-br from-emerald-100 via-white to-amber-50 p-5 text-ink">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest text-lg font-bold text-emerald-200">AR</div>
              <div>
                <div className="flex items-center gap-1.5 font-bold">Arif Rahman <FiCheckCircle className="text-emerald-600" /></div>
                <p className="mt-1 text-xs text-slate-500">{tx(lang, "UI/UX ডিজাইনার · বিশ্বজুড়ে কাজের জন্য প্রস্তুত", "UI/UX Designer · Available worldwide")}</p>
              </div>
            </div>
            <FiBell className="text-slate-500" />
          </div>
          <div className="mt-6 rounded-2xl bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">{tx(lang, "AI স্কিল স্কোর", "AI SKILL SCORE")}</p>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">{tx(lang, "ভেরিফাইড", "VERIFIED")}</span>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-4xl font-extrabold text-forest">{tx(lang, "৯২", "92")}<span className="text-xl">%</span></p>
              <div className="mb-2 h-2 flex-1 overflow-hidden rounded-full bg-emerald-100">
                <div className="h-full w-[92%] rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-forest p-4 text-white">
              <FiLock className="mb-4 text-emerald-300" />
              <p className="text-xs text-white/55">{tx(lang, "এসক্রো ব্যালেন্স", "Escrow Balance")}</p>
              <p className="mt-1 text-lg font-bold">{tx(lang, "৳ ৪৮,৫০০", "৳ 48,500")}</p>
            </div>
            <div className="rounded-2xl bg-amber-300 p-4">
              <FiTrendingUp className="mb-4" />
              <p className="text-xs text-ink/55">{tx(lang, "সম্পন্ন কাজ", "Completed Jobs")}</p>
              <p className="mt-1 text-lg font-bold">{tx(lang, "৩৮ প্রজেক্ট", "38 Projects")}</p>
            </div>
          </div>
        </div>
      </div>
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3.2, repeat: Infinity }} className="absolute -bottom-7 -left-5 rounded-2xl bg-white p-3 shadow-xl sm:-left-10">
        <div className="flex items-center gap-2 text-xs font-bold text-forest"><FiShield className="text-lg text-emerald-600" /> {tx(lang, "ব্লকচেইন ব্যাজ", "Blockchain Badge")}</div>
      </motion.div>
    </motion.div>
  );
}

function Landing({ lang, setLang, onLogin }) {
  return (
    <>
      <Header lang={lang} setLang={setLang} onLogin={onLogin} />
      <Hero lang={lang} onLogin={onLogin} />
      <section id="process" className="relative px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker={tx(lang, "সহজ ও নিরাপদ", "Simple & Secure")} title={tx(lang, "কাজ করুন নিশ্চিন্তে, মাত্র তিন ধাপে", "Work confidently in just three steps")} text={tx(lang, "দক্ষতা যাচাই থেকে নিরাপদ পেমেন্ট পর্যন্ত প্রতিটি ধাপে থাকছে স্বচ্ছতা।", "Every step stays transparent, from skill verification to secure payment.")} />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              [FiVideo, tx(lang, "০১", "01"), tx(lang, "স্কিল দেখান", "Show your skills"), tx(lang, "সর্বোচ্চ ৫ মিনিটের একটি কাজের ভিডিও রেকর্ড করে আপনার দক্ষতা প্রমাণ করুন।", "Prove your skills by recording a work video of up to 5 minutes.")],
              [FiShield, tx(lang, "০২", "02"), tx(lang, "AI ভেরিফাইড ব্যাজ", "AI-verified badge"), tx(lang, "AI আপনার কাজ বিশ্লেষণ করে স্কোর এবং ব্লকচেইন সমর্থিত ব্যাজ প্রদান করবে।", "AI analyzes your work and provides a score and blockchain-backed badge.")],
              [FiCreditCard, tx(lang, "০৩", "03"), tx(lang, "নিরাপদ পেমেন্ট", "Secure payment"), tx(lang, "এসক্রো সুরক্ষায় কাজ শেষে আপনার পছন্দের পেমেন্ট পদ্ধতিতে পেমেন্ট নিন।", "Receive payment through your preferred supported method after work, protected by escrow.")],
            ].map(([Icon, count, title, text]) => (
              <motion.article whileHover={{ y: -8 }} key={count} className="soft-glass relative overflow-hidden rounded-[26px] p-7 shadow-card">
                <span className="absolute right-5 top-4 text-5xl font-extrabold text-emerald-100">{count}</span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-xl text-emerald-300"><Icon /></div>
                <h3 className="font-bangla mt-6 text-xl font-bold">{title}</h3>
                <p className="font-bangla mt-3 leading-7 text-slate-500">{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
      <section id="features" className="bg-forest px-5 py-24 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-300">{tx(lang, "বিশ্বাসের জন্য নির্মিত", "Designed for trust")}</p>
            <h2 className="font-bangla mt-4 text-4xl font-bold leading-tight sm:text-5xl">{tx(lang, "আপনার প্রতিভা, আপনার পরিচয়", "Your talent, your identity")}</h2>
            <p className="font-bangla mt-5 max-w-xl leading-7 text-white/60">{tx(lang, "যোগ্যতা আর পরিশ্রমের সঠিক মূল্য নিশ্চিত করতে আধুনিক প্রযুক্তির শক্তি এখন আপনার পাশে।", "Modern technology helps ensure your talent and hard work receive the value they deserve.")}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {(lang === "bn" ? ["AI স্কিল ভেরিফিকেশন", "ব্লকচেইন ব্যাজ", "এসক্রো সুরক্ষা", "বাংলা ভয়েস অ্যাসিস্ট্যান্ট"] : ["AI Skill Verification", "Blockchain Badge", "Escrow Protection", "Bangla Voice Assistant"]).map((item) => (
                <div key={item} className="glass flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold">
                  <FiCheckCircle className="text-emerald-300" /> {item}
                </div>
              ))}
            </div>
          </div>
          <div className="dot-grid rounded-[34px] bg-white/5 p-6">
            <div className="rounded-[26px] bg-white p-6 text-ink shadow-2xl">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{tx(lang, "এসক্রো সুরক্ষিত", "Escrow Protected")}</p><p className="mt-2 text-2xl font-bold">{tx(lang, "নিরাপদ লেনদেন", "Secure transaction")}</p></div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700"><FiLock /></div>
              </div>
              <div className="my-6 h-px bg-slate-100" />
              <div className="flex justify-between text-sm"><span className="text-slate-400">{tx(lang, "প্রজেক্ট পেমেন্ট", "Project Payment")}</span><strong>{tx(lang, "৳ ৩৫,০০০", "৳ 35,000")}</strong></div>
              <div className="mt-4 flex justify-between text-sm"><span className="text-slate-400">{tx(lang, "অবস্থা", "Status")}</span><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{tx(lang, "এসক্রোতে লক করা", "LOCKED IN ESCROW")}</span></div>
            </div>
          </div>
        </div>
      </section>
      <section id="jobs" className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker={tx(lang, "নতুন সুযোগ", "Fresh opportunities")} title={tx(lang, "আপনার জন্য বাছাই করা কাজ", "Selected projects for you")} text={tx(lang, "ভেরিফাইড ক্লায়েন্টদের প্রকাশিত সাম্প্রতিক কাজগুলো দেখুন এবং আজই আবেদন করুন।", "Explore recent projects from verified clients and apply today.")} />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {jobs.map((job) => <JobCard key={job.title} job={job} lang={lang} onApply={onLogin} />)}
          </div>
        </div>
      </section>
      <footer className="bg-ink px-5 py-10 text-white lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <Logo dark lang={lang} />
          <p className="text-xs text-white/40">© 2026 SkillShurokkha. {tx(lang, "নিরাপদ দক্ষতা, নিরাপদ ভবিষ্যৎ।", "Secure skills, secure future.")}</p>
        </div>
      </footer>
    </>
  );
}

function SectionTitle({ kicker, title, text }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-600">{kicker}</p>
      <h2 className="font-bangla mt-4 text-3xl font-bold leading-tight text-forest sm:text-4xl">{title}</h2>
      <p className="font-bangla mt-4 leading-7 text-slate-500">{text}</p>
    </div>
  );
}

function JobCard({ job, onApply, dashboard = false, lang = "bn" }) {
  const Icon = job.icon;
  return (
    <motion.article whileHover={{ y: -6 }} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${job.color}`}><Icon /></div>
        <button className="text-slate-300 transition hover:text-amber-500"><FiStar /></button>
      </div>
      <p className="mt-5 text-xs font-semibold text-emerald-600">{tx(lang, job.categoryBn, job.category)}</p>
      <h3 className="mt-2 font-bold leading-snug text-forest">{tx(lang, job.titleBn, job.title)}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {(lang === "bn" ? job.skillsBn : job.skills).map((skill) => <span key={skill} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{skill}</span>)}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><FiClock /> {tx(lang, job.time, job.timeEn)}</span>
        <span>{tx(lang, job.bids.replace("proposals", "টি প্রস্তাব"), job.bidsEn)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <strong className="text-lg text-forest">{tx(lang, job.budget, job.budgetEn)}</strong>
        {onApply && <button onClick={onApply} className={`${dashboard ? "bg-forest text-white" : "bg-emerald-100 text-emerald-800"} rounded-full px-4 py-2 text-xs font-bold transition hover:bg-emerald-400 hover:text-forest`}>
          {tx(lang, "আবেদন করুন", "Apply now")}
        </button>}
      </div>
    </motion.article>
  );
}

function AuthModal({ close, enterDashboard, lang }) {
  const [register, setRegister] = useState(false);
  const [role, setRole] = useState("freelancer");
  const [form, setForm] = useState({ name: "", contact: "", password: "" });
  const [verification, setVerification] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const submit = async () => {
    setLoading(true);
    try {
      if (verification) {
        const data = await api("/auth/verify-registration", { method: "POST", body: JSON.stringify({ ...verification, code }) });
        enterDashboard(data);
        return;
      }
      if (register) {
        const isEmail = form.contact.includes("@");
        const data = await api("/auth/register", { method: "POST", body: JSON.stringify({ name: form.name, [isEmail ? "email" : "mobile"]: form.contact, password: form.password, role }) });
        setVerification({ contact: data.contact, channel: data.channel });
        if (data.devOtp) Swal.fire({ title: "Development OTP", text: data.devOtp, icon: "info", confirmButtonColor: "#0c3b32" });
        return;
      }
      enterDashboard(await api("/auth/login", { method: "POST", body: JSON.stringify({ contact: form.contact, password: form.password }) }));
    } catch (error) {
      Swal.fire({ title: tx(lang, "অনুরোধ সম্পন্ন হয়নি", "Request failed"), text: error.message, icon: "error", confirmButtonColor: "#0c3b32" });
    } finally { setLoading(false); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.92, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }} className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
        <button onClick={close} className="absolute right-5 top-5 rounded-full bg-slate-100 p-2 text-slate-500"><FiX /></button>
        <Logo lang={lang} />
        <h2 className="font-bangla mt-8 text-2xl font-bold text-forest">{verification ? tx(lang, "ভেরিফিকেশন কোড দিন", "Enter verification code") : register ? tx(lang, "আপনার অ্যাকাউন্ট তৈরি করুন", "Create your account") : tx(lang, "আবারও স্বাগতম", "Welcome back")}</h2>
        <p className="font-bangla mt-2 text-sm text-slate-400">{verification ? tx(lang, `${verification.contact}-এ পাঠানো ৬ সংখ্যার কোডটি লিখুন।`, `Enter the 6-digit code sent to ${verification.contact}.`) : register ? tx(lang, "SkillShurokkha-তে আপনার নতুন যাত্রা শুরু করুন।", "Start your new journey with SkillShurokkha.") : tx(lang, "আপনার অ্যাকাউন্টে লগ ইন করুন।", "Sign in to your account.")}</p>
        {register && !verification && (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1.5">
            {["freelancer", "client"].map((item) => (
              <button key={item} onClick={() => setRole(item)} className={`rounded-xl py-2 text-xs font-bold capitalize transition ${role === item ? "bg-white text-emerald-700 shadow-sm" : "text-slate-400"}`}>{item === "freelancer" ? tx(lang, "ফ্রিল্যান্সার", "Freelancer") : tx(lang, "ক্লায়েন্ট", "Client")}</button>
            ))}
          </div>
        )}
        <div className="mt-5 space-y-3">
          {verification ? <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={6} placeholder="000000" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[.45em] outline-none transition focus:border-emerald-400" /> : <>
          {register && <input value={form.name} onChange={setField("name")} placeholder={tx(lang, "আপনার নাম", "Your name")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400" />}
          <input value={form.contact} onChange={setField("contact")} placeholder={tx(lang, "মোবাইল নম্বর অথবা ইমেইল", "Mobile number or email")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400" />
          <input value={form.password} onChange={setField("password")} placeholder={tx(lang, "পাসওয়ার্ড", "Password")} type="password" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400" /></>}
        </div>
        <button disabled={loading} onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
          {loading ? tx(lang, "অপেক্ষা করুন...", "Please wait...") : verification ? tx(lang, "ভেরিফাই করুন", "Verify account") : register ? tx(lang, "অ্যাকাউন্ট তৈরি করুন", "Create account") : tx(lang, "লগ ইন করুন", "Sign in")} <FiArrowRight />
        </button>
        {!verification && <p className="font-bangla mt-5 text-center text-sm text-slate-400">
          {register ? tx(lang, "আগেই অ্যাকাউন্ট আছে?", "Already have an account?") : tx(lang, "নতুন ব্যবহারকারী?", "New user?")}{" "}
          <button onClick={() => setRegister(!register)} className="font-bold text-emerald-700">{register ? tx(lang, "লগ ইন করুন", "Sign in") : tx(lang, "অ্যাকাউন্ট তৈরি করুন", "Create account")}</button>
        </p>}
      </motion.div>
    </motion.div>
  );
}

function Dashboard({ lang, setLang, leave, session }) {
  const t = copy[lang];
  const user = session.user;
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [active, setActive] = useState("dashboard");
  const [menu, setMenu] = useState(false);
  const alert = (title, text, icon = "success") => Swal.fire({ title, text, icon, confirmButtonColor: "#0c3b32" });
  const labels = { dashboard: t.dashboard, projects: t.projects, verify: t.verify, payments: t.payments, messages: t.messages, settings: t.settings };
  const visibleSidebar = sidebar.filter(([key]) => user.role === "admin" ? ["dashboard", "settings"].includes(key) : user.role === "client" ? key !== "verify" : true);

  return (
    <div className="min-h-screen bg-cloud">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-ink p-5 text-white transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between"><Logo dark lang={lang} /><button className="lg:hidden" onClick={() => setMenu(false)}><FiX /></button></div>
        <div className="mt-11 space-y-1">
          {visibleSidebar.map(([key, Icon]) => (
            <button key={key} onClick={() => { setActive(key); setMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active === key ? "bg-emerald-400 text-forest" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              <Icon /> {labels[key]}
            </button>
          ))}
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <div className="mb-3 rounded-2xl bg-white/5 p-3">
            <p className="text-[11px] text-white/45">{tx(lang, "প্রোফাইল সম্পন্ন", "PROFILE COMPLETION")}</p>
            <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full w-[82%] rounded-full bg-emerald-400" /></div>
            <p className="mt-2 text-xs font-bold text-emerald-300">{tx(lang, "৮২% সম্পন্ন", "82% complete")}</p>
          </div>
          <button onClick={leave} className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-white/50 transition hover:text-white"><FiLogOut /> {tx(lang, "লগ আউট", "Log out")}</button>
        </div>
      </aside>
      <main className="lg:ml-64">
        <div className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-100 bg-white/80 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenu(true)} className="rounded-lg bg-slate-100 p-2 lg:hidden"><FiMenu /></button>
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-400 sm:flex"><FiSearch /><input placeholder={tx(lang, "প্রজেক্ট খুঁজুন...", "Search projects...")} className="w-44 bg-transparent outline-none" /></div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageButton lang={lang} setLang={setLang} />
            <button onClick={() => alert(tx(lang, "নোটিফিকেশন", "Notifications"), tx(lang, "আপনার ৩টি নতুন নোটিফিকেশন আছে।", "You have 3 new notifications."), "info")} className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"><FiBell /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" /></button>
            <div className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-bold text-emerald-200">{initials}</div>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.section key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5 sm:p-8">
            {active === "dashboard" && (user.role === "admin" ? <AdminDashboard lang={lang} token={session.token} /> : <DashboardHome t={t} lang={lang} user={user} changeTab={setActive} alert={alert} />)}
            {active === "projects" && <Projects lang={lang} role={user.role} token={session.token} />}
            {active === "verify" && user.role === "freelancer" && <SkillVerification lang={lang} alert={alert} />}
            {active === "payments" && <Payments lang={lang} />}
            {active === "messages" && <EmptyState Icon={FiMessageCircle} title={tx(lang, "মেসেজ সেন্টার", "Message center")} text={tx(lang, "ক্লায়েন্ট এবং ফ্রিল্যান্সারের সাথে আপনার কথোপকথন এখানে পাওয়া যাবে।", "Find your conversations with clients and freelancers here.")} />}
            {active === "settings" && (user.role === "admin" ? <EmptyState Icon={FiSettings} title={tx(lang, "অ্যাডমিন সেটিংস", "Admin settings")} text={tx(lang, "অ্যাডমিন অ্যাকাউন্টের সেটিংস পরিচালনা করুন।", "Manage administrator account settings.")} /> : <ProfileManager lang={lang} session={session} />)}
          </motion.section>
        </AnimatePresence>
      </main>
      <button onClick={() => alert(tx(lang, "বাংলা ভয়েস সহায়তা", "Bangla voice assistant"), tx(lang, "বলুন, আমি কীভাবে সাহায্য করতে পারি?", "Tell me, how can I help you?"), "info")} className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-emerald-400 text-xl text-forest shadow-glow transition hover:scale-110"><FiMic /></button>
    </div>
  );
}

function DashboardHome({ t, lang, user, changeTab, alert }) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, `স্বাগতম, ${user.name}!`, `Welcome, ${user.name}!`)}</h1><p className="font-bangla mt-2 text-slate-500">{t.welcomeSub}</p></div>
        {user.role === "freelancer" && <button onClick={() => changeTab("verify")} className="flex w-max items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"><FiVideo /> {tx(lang, "স্কিল ভেরিফাই করুন", "Verify a skill")}</button>}
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(lang === "bn" ? [[FiCreditCard, "বর্তমান ব্যালেন্স", "৳ ৪৮,৫০০", "bg-emerald-100 text-emerald-700"], [FiBriefcase, "সক্রিয় প্রজেক্ট", "০৪", "bg-sky-100 text-sky-700"], [FiStar, "প্রোফাইল রেটিং", "৪.৯", "bg-amber-100 text-amber-700"], [FiShield, "ভেরিফাইড স্কিল", "০৩", "bg-violet-100 text-violet-700"]] : [[FiCreditCard, "Available Balance", "৳ 48,500", "bg-emerald-100 text-emerald-700"], [FiBriefcase, "Active Projects", "04", "bg-sky-100 text-sky-700"], [FiStar, "Profile Rating", "4.9", "bg-amber-100 text-amber-700"], [FiShield, "Verified Skills", "03", "bg-violet-100 text-violet-700"]]).map(([Icon, label, value, style]) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow-card"><div className={`grid h-10 w-10 place-items-center rounded-xl ${style}`}><Icon /></div><p className="mt-5 text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-forest">{value}</p></div>
        ))}
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_310px]">
        <div>
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bangla text-xl font-bold text-forest">{tx(lang, "আপনার জন্য কাজ", "Projects for you")}</h2><button onClick={() => changeTab("projects")} className="text-xs font-bold text-emerald-700">{tx(lang, "সব দেখুন", "View all")} <FiArrowRight className="inline" /></button></div>
          <div className="grid gap-4 md:grid-cols-2">{jobs.slice(0, 2).map(job => <JobCard key={job.title} job={job} lang={lang} dashboard onApply={user.role === "freelancer" ? () => alert(tx(lang, "আবেদন পাঠানো হয়েছে!", "Application sent!"), tx(lang, "ক্লায়েন্ট শীঘ্রই আপনার প্রস্তাব পর্যালোচনা করবেন।", "Client will review your proposal shortly.")) : null} />)}</div>
        </div>
        <div className="rounded-2xl bg-forest p-5 text-white shadow-card">
          <FiShield className="text-3xl text-emerald-300" /><h3 className="font-bangla mt-5 text-xl font-bold">{tx(lang, "আপনার স্কিল স্কোর", "Your skill score")}</h3><div className="mt-6 flex items-end justify-between"><strong className="text-5xl text-emerald-300">{tx(lang, "৯২%", "92%")}</strong><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-emerald-200">{tx(lang, "ভেরিফাইড", "VERIFIED")}</span></div>
          <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-full w-[92%] rounded-full bg-emerald-300" /></div><p className="font-bangla mt-5 text-xs leading-6 text-white/55">{tx(lang, "আপনার UI/UX ডিজাইন স্কিল ব্লকচেইন ব্যাজ দ্বারা ভেরিফাইড।", "Your UI/UX Design skill is verified with a blockchain badge.")}</p>
        </div>
      </div>
    </>
  );
}

function Projects({ lang, role, token }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadProjects = useCallback(() => api("/projects").then((data) => setProjects(data.projects)).catch((error) => Swal.fire({ title: "Projects", text: error.message, icon: "error" })).finally(() => setLoading(false)), []);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  const createProject = async () => {
    const result = await Swal.fire({ title: tx(lang, "নতুন প্রজেক্ট", "New project"), html: `<input id="title" class="swal2-input" placeholder="Title"><textarea id="description" class="swal2-textarea" placeholder="Description"></textarea><input id="budget" type="number" class="swal2-input" placeholder="Budget"><input id="deadline" type="date" class="swal2-input">`, showCancelButton: true, confirmButtonColor: "#0c3b32", preConfirm: () => ({ title: document.getElementById("title").value, description: document.getElementById("description").value, budget: document.getElementById("budget").value, deadline: document.getElementById("deadline").value }) });
    if (!result.isConfirmed) return;
    try { await api("/projects", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(result.value) }); await loadProjects(); } catch (error) { Swal.fire({ title: "Projects", text: error.message, icon: "error" }); }
  };
  const apply = async (project) => {
    const result = await Swal.fire({ title: tx(lang, "প্রস্তাব পাঠান", "Send proposal"), html: `<textarea id="cover" class="swal2-textarea" placeholder="Cover letter"></textarea><input id="budget" type="number" class="swal2-input" placeholder="Proposed budget" value="${project.budget}">`, showCancelButton: true, confirmButtonColor: "#0c3b32", preConfirm: () => ({ coverLetter: document.getElementById("cover").value, proposedBudget: document.getElementById("budget").value }) });
    if (!result.isConfirmed) return;
    try { await api(`/projects/${project.id}/apply`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(result.value) }); Swal.fire({ title: tx(lang, "আবেদন পাঠানো হয়েছে!", "Application sent!"), icon: "success", confirmButtonColor: "#0c3b32" }); } catch (error) { Swal.fire({ title: "Projects", text: error.message, icon: "error" }); }
  };
  return (
    <div><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-bangla text-3xl font-bold text-forest">{role === "client" ? tx(lang, "আপনার প্রজেক্টসমূহ", "Your projects") : tx(lang, "কাজ খুঁজুন", "Find projects")}</h1><p className="font-bangla mt-2 text-slate-500">{role === "client" ? tx(lang, "প্রজেক্ট তৈরি করুন এবং আবেদনকারীদের পরিচালনা করুন।", "Create projects and manage applicants.") : tx(lang, "আপনার দক্ষতার সাথে মানানসই নতুন সুযোগ বেছে নিন।", "Choose new opportunities that match your skills.")}</p></div>{role === "client" && <button onClick={createProject} className="flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-bold text-white"><FiPlus /> {tx(lang, "প্রজেক্ট তৈরি করুন", "Create project")}</button>}</div>
    {loading ? <p className="mt-8 text-slate-500">{tx(lang, "প্রজেক্ট লোড হচ্ছে...", "Loading projects...")}</p> : projects.length ? <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <ApiProjectCard key={project.id} project={project} lang={lang} onApply={role === "freelancer" ? () => apply(project) : null} />)}</div> : <EmptyState Icon={FiBriefcase} title={tx(lang, "এখনো কোনো প্রজেক্ট নেই", "No projects yet")} text={tx(lang, "নতুন প্রজেক্ট প্রকাশ হলে এখানে দেখা যাবে।", "Newly published projects will appear here.")} />}</div>
  );
}

function ApiProjectCard({ project, lang, onApply }) {
  const skills = typeof project.skills === "string" ? JSON.parse(project.skills) : project.skills || [];
  return <article className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-card"><p className="text-xs font-semibold text-emerald-600">{project.client_name}</p><h3 className="mt-3 font-bold leading-snug text-forest">{project.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{project.description}</p><div className="mt-4 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{skill}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><strong className="text-lg text-forest">৳ {Number(project.budget).toLocaleString()}</strong>{onApply && <button onClick={onApply} className="rounded-full bg-forest px-4 py-2 text-xs font-bold text-white">{tx(lang, "আবেদন করুন", "Apply now")}</button>}</div></article>;
}

function SkillVerification({ alert, lang }) {
  return (
    <div className="mx-auto max-w-4xl"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">{tx(lang, "AI-চালিত ভেরিফিকেশন", "AI-powered verification")}</p><h1 className="font-bangla mt-3 text-3xl font-bold text-forest">{tx(lang, "আপনার দক্ষতা প্রমাণ করুন", "Prove your skills")}</h1><p className="font-bangla mx-auto mt-3 max-w-lg text-slate-500">{tx(lang, "একটি স্কিল এবং টাস্ক নির্বাচন করে ৫ মিনিটের মধ্যে ডেমো ভিডিও আপলোড করুন।", "Select a skill and task, then upload a demo video within 5 minutes.")}</p></div>
    <div className="mt-8 rounded-[26px] bg-white p-6 shadow-card sm:p-8"><div className="grid gap-4 sm:grid-cols-3">{(lang === "bn" ? ["UI/UX ডিজাইন", "ওয়েব ডেভেলপমেন্ট", "গ্রাফিক ডিজাইন"] : ["UI/UX Design", "Web Development", "Graphic Design"]).map((item, index) => <button key={item} className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${index === 0 ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-100 text-slate-500 hover:border-emerald-200"}`}><FiCheckCircle className="mb-4 text-xl" />{item}</button>)}</div>
    <div className="font-bangla mt-6 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold text-emerald-700">{tx(lang, "আপনার টাস্ক", "YOUR TASK")}</p><h3 className="mt-2 font-bold text-forest">{tx(lang, "একটি মোবাইল ব্যাংকিং অ্যাপের লেনদেনের ইতিহাস স্ক্রিন ডিজাইন করুন।", "Design a transaction history screen for a mobile banking app.")}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{tx(lang, "আপনার কাজের প্রক্রিয়া এবং গুরুত্বপূর্ণ ডিজাইন সিদ্ধান্তগুলো ব্যাখ্যা করুন।", "Explain your work process and important design decisions.")}</p></div>
    <button onClick={() => alert(tx(lang, "ভিডিও আপলোড হয়েছে!", "Video uploaded!"), tx(lang, "AI বিশ্লেষণ শুরু হয়েছে। শীঘ্রই আপনার স্কোর পাবেন।", "AI analysis has started. You will receive your score shortly."))} className="mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-emerald-700 transition hover:bg-emerald-50"><FiUploadCloud className="text-4xl" /><strong className="mt-3">{tx(lang, "ভিডিও আপলোড করতে ক্লিক করুন", "Click to upload video")}</strong><span className="mt-1 text-xs text-slate-400">{tx(lang, "MP4 অথবা MOV · সর্বোচ্চ ৫ মিনিট", "MP4 or MOV · Maximum 5 minutes")}</span></button></div></div>
  );
}

function Payments({ lang }) {
  return (
    <div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "পেমেন্ট ও এসক্রো", "Payments and escrow")}</h1><p className="font-bangla mt-2 text-slate-500">{tx(lang, "আপনার আয় এবং নিরাপদ লেনদেনের বিস্তারিত দেখুন।", "View details of your earnings and secure transactions.")}</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-3">{(lang === "bn" ? [["বর্তমান ব্যালেন্স", "৳ ৪৮,৫০০", "text-emerald-700"], ["এসক্রোতে আছে", "৳ ৩৫,০০০", "text-amber-600"], ["মোট আয়", "৳ ২,৮৪,০০০", "text-forest"]] : [["Available", "৳ 48,500", "text-emerald-700"], ["In escrow", "৳ 35,000", "text-amber-600"], ["Total earned", "৳ 284,000", "text-forest"]]).map(([label, value, style]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-card"><p className="text-xs font-semibold text-slate-400">{label}</p><p className={`mt-2 text-2xl font-bold ${style}`}>{value}</p></div>)}</div>
    <div className="mt-6 rounded-2xl bg-white p-5 shadow-card"><h2 className="font-bold text-forest">{tx(lang, "সাম্প্রতিক লেনদেন", "Recent transactions")}</h2>{(lang === "bn" ? [["ই-কমার্স ওয়েবসাইট UI", "+ ৳ ২৫,০০০", "রিলিজ হয়েছে", true], ["React ল্যান্ডিং পেজ", "৳ ১৮,৫০০", "এসক্রোতে আছে", false], ["ব্র্যান্ড আইডেন্টিটি কিট", "+ ৳ ১২,০০০", "রিলিজ হয়েছে", true]] : [["E-commerce Website UI", "+ ৳ 25,000", "Released", true], ["React Landing Page", "৳ 18,500", "In escrow", false], ["Brand Identity Kit", "+ ৳ 12,000", "Released", true]]).map(([name, amount, status, released]) => <div key={name} className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><div><p className="text-sm font-semibold text-forest">{name}</p><p className="mt-1 text-xs text-slate-400">{status}</p></div><strong className={released ? "text-emerald-600" : "text-amber-600"}>{amount}</strong></div>)}</div></div>
  );
}

function ProfileManager({ lang, session }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = session.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  const isFreelancer = session.user.role === "freelancer";
  useEffect(() => {
    api("/profiles/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ profile: data }) => setProfile({ ...data, skillsText: (data.skills || []).join(", ") }))
      .catch((error) => Swal.fire({ title: "Profile", text: error.message, icon: "error" }))
      .finally(() => setLoading(false));
  }, [token]);
  const field = (name) => (event) => setProfile({ ...profile, [name]: event.target.value });
  const save = async () => {
    try {
      await api("/profiles/me", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ ...profile, skills: profile.skillsText.split(",").map((item) => item.trim()).filter(Boolean) }),
      });
      Swal.fire({ title: tx(lang, "প্রোফাইল আপডেট হয়েছে", "Profile updated"), icon: "success", confirmButtonColor: "#0c3b32" });
    } catch (error) { Swal.fire({ title: "Profile", text: error.message, icon: "error" }); }
  };
  const uploadAvatar = async (event) => {
    if (!event.target.files[0]) return;
    const body = new FormData();
    body.append("avatar", event.target.files[0]);
    try {
      const response = await fetch(`${API_URL}/profiles/me/avatar`, { method: "POST", headers: authHeaders, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setProfile({ ...profile, avatar_url: data.avatarUrl });
    } catch (error) { Swal.fire({ title: "Photo upload", text: error.message, icon: "error" }); }
  };
  if (loading) return <p>{tx(lang, "প্রোফাইল লোড হচ্ছে...", "Loading profile...")}</p>;
  if (!profile) return null;
  const avatar = profile.avatar_url ? `${API_URL.replace(/\/api$/, "")}${profile.avatar_url}` : null;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "আপনার প্রোফাইল", "Your profile")}</h1><p className="font-bangla mt-2 text-slate-500">{tx(lang, "ক্লায়েন্টদের কাছে আপনার সেরা পরিচয় তুলে ধরুন।", "Present your best professional identity to clients.")}</p></div>
        <button onClick={save} className="rounded-full bg-forest px-5 py-3 text-sm font-bold text-white">{tx(lang, "পরিবর্তন সংরক্ষণ করুন", "Save changes")}</button>
      </div>
      <div className="mt-7 rounded-[26px] bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-emerald-100">
            {avatar ? <Image src={avatar} alt={profile.name} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-2xl font-bold text-emerald-700">{profile.name.slice(0, 2).toUpperCase()}</div>}
            <label className="absolute bottom-1 right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-forest text-white"><FiCamera /><input onChange={uploadAvatar} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" /></label>
          </div>
          <div><h2 className="text-xl font-bold text-forest">{profile.name}</h2><p className="mt-1 text-sm capitalize text-emerald-700">{profile.role}</p><p className="mt-2 text-xs text-slate-400">{tx(lang, "JPG, PNG অথবা WEBP · সর্বোচ্চ ৫MB", "JPG, PNG or WEBP · Maximum 5MB")}</p></div>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <ProfileInput label={tx(lang, "নাম", "Name")} value={profile.name || ""} onChange={field("name")} />
          <ProfileInput label={tx(lang, "পেশাগত শিরোনাম", "Professional headline")} value={profile.headline || ""} onChange={field("headline")} />
          <ProfileInput label={tx(lang, "দেশ", "Country")} value={profile.country || ""} onChange={field("country")} />
          <ProfileInput label={tx(lang, "শহর", "City")} value={profile.city || ""} onChange={field("city")} />
          {isFreelancer && <ProfileInput label={tx(lang, "স্কিলসমূহ (কমা দিয়ে লিখুন)", "Skills (comma separated)")} value={profile.skillsText || ""} onChange={field("skillsText")} />}
          {isFreelancer && <ProfileInput label={tx(lang, "প্রতি ঘণ্টার রেট", "Hourly rate")} type="number" value={profile.hourly_rate || ""} onChange={field("hourly_rate")} />}
          {isFreelancer && <ProfileInput label={tx(lang, "কাজের জন্য সময়", "Availability")} value={profile.availability || ""} onChange={field("availability")} />}
          {!isFreelancer && <ProfileInput label={tx(lang, "কোম্পানির নাম", "Company name")} value={profile.company_name || ""} onChange={field("company_name")} />}
          {!isFreelancer && <ProfileInput label={tx(lang, "কোম্পানির ওয়েবসাইট", "Company website")} value={profile.company_website || ""} onChange={field("company_website")} />}
        </div>
        <label className="mt-4 block text-xs font-bold text-slate-500">{tx(lang, "পরিচিতি", "About")}<textarea value={profile.bio || ""} onChange={field("bio")} rows={5} className="mt-2 w-full rounded-2xl border border-slate-200 p-4 text-sm font-normal outline-none focus:border-emerald-400" /></label>
      </div>
    </div>
  );
}

function ProfileInput({ label, ...props }) {
  return <label className="text-xs font-bold text-slate-500">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-emerald-400" /></label>;
}

function AdminDashboard({ lang, token }) {
  const [users, setUsers] = useState([]);
  useEffect(() => { api("/admin/users", { headers: { Authorization: `Bearer ${token}` } }).then((data) => setUsers(data.users)).catch(() => {}); }, [token]);
  return <div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "অ্যাডমিন ড্যাশবোর্ড", "Admin dashboard")}</h1><p className="mt-2 text-slate-500">{tx(lang, "ব্যবহারকারী এবং তাদের ভূমিকা পর্যবেক্ষণ করুন।", "Monitor users and their roles.")}</p><div className="mt-7 overflow-hidden rounded-2xl bg-white shadow-card">{users.map((user) => <div key={user.id} className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0"><div><p className="font-bold text-forest">{user.name}</p><p className="mt-1 text-xs text-slate-400">{user.email || user.mobile}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{user.role}</span></div>)}</div></div>;
}

function EmptyState({ Icon, title, text }) {
  return <div className="grid min-h-[65vh] place-items-center"><div className="max-w-md text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-100 text-3xl text-emerald-700"><Icon /></div><h1 className="mt-5 text-2xl font-bold text-forest">{title}</h1><p className="font-bangla mt-3 leading-7 text-slate-500">{text}</p></div></div>;
}

export default function Home() {
  const [lang, setLang] = useState("bn");
  const [auth, setAuth] = useState(false);
  const [session, setSession] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("skillshurokkha_session");
    if (saved) setSession(JSON.parse(saved));
  }, []);
  const enterDashboard = (data) => {
    const nextSession = { token: data.token, user: data.user };
    localStorage.setItem("skillshurokkha_session", JSON.stringify(nextSession));
    setSession(nextSession);
    setAuth(false);
  };
  const leave = () => {
    localStorage.removeItem("skillshurokkha_session");
    setSession(null);
  };

  return (
    <>
      {session ? <Dashboard lang={lang} setLang={setLang} session={session} leave={leave} /> : <Landing lang={lang} setLang={setLang} onLogin={() => setAuth(true)} />}
      <AnimatePresence>{auth && <AuthModal lang={lang} close={() => setAuth(false)} enterDashboard={enterDashboard} />}</AnimatePresence>
    </>
  );
}
