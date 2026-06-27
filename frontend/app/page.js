"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";
import { io } from "socket.io-client";
import ThemeBackground from "../components/ThemeBackground";
import {
  FiArrowRight,
  FiAward,
  FiBell,
  FiBookmark,
  FiBriefcase,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiExternalLink,
  FiGlobe,
  FiGrid,
  FiHome,
  FiEye,
  FiEyeOff,
  FiLock,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiFile,
  FiFileText,
  FiImage,
  FiMessageCircle,
  FiMic,
  FiPaperclip,
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
const LANGUAGE_STORAGE_KEY = "skillshurokkha_language";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const ASSET_URL = API_URL.replace(/\/api$/, "");

async function api(path, options = {}) {
  const multipart = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(multipart ? {} : { "Content-Type": "application/json" }), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString()}`;
const formatPlainNumber = (value) => Number(value || 0).toLocaleString();
const CLIENT_PASS_SCORE = 25;
const canClientReviewProject = (project) => {
  const score = project.latest_evaluation_score == null ? null : Number(project.latest_evaluation_score);
  return project.status === "submitted" || (project.latest_submission_status === "ai_revision_required" && score !== null && score > CLIENT_PASS_SCORE);
};
const canClientReviewSubmission = (submission) => {
  const score = submission.evaluation_score == null ? null : Number(submission.evaluation_score);
  return submission.status === "submitted" || (submission.status === "ai_revision_required" && score !== null && score > CLIENT_PASS_SCORE);
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const localDate = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const tomorrow = () => { const date = new Date(); date.setDate(date.getDate() + 1); return localDate(date); };
const fieldStyle = "display:block;width:100%;box-sizing:border-box;margin:7px 0 0;border:1px solid #dbe5e2;border-radius:12px;padding:12px 14px;font:inherit;color:#123c35;background:#fff;";
const proposalMiniCard = "border:1px solid #e4eee9;background:#f8fbfa;border-radius:16px;padding:14px;";
const proposalForm = (project) => `<div style="text-align:left;margin:-4px 0 0">
  <div style="border:1px solid #dbeee7;background:linear-gradient(135deg,#f2fbf7,#ffffff);border-radius:20px;padding:16px 18px">
    <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start">
      <div><p style="margin:0;color:#047857;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em">Project proposal</p><h3 style="margin:7px 0 0;color:#123c35;font-size:18px;line-height:1.35">${escapeHtml(project.title)}</h3></div>
      <div style="text-align:right"><p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase">Client budget</p><strong style="display:block;margin-top:4px;color:#123c35;font-size:18px">${formatCurrency(project.budget)}</strong></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px">
      <div style="${proposalMiniCard}"><p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase">Deadline</p><strong style="display:block;margin-top:5px;color:#123c35;font-size:12px">${escapeHtml(new Date(project.deadline).toLocaleDateString())}</strong></div>
      <div style="${proposalMiniCard}"><p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase">Escrow</p><strong style="display:block;margin-top:5px;color:#047857;font-size:12px">Protected payment</strong></div>
      <div style="${proposalMiniCard}"><p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase">Profile</p><strong style="display:block;margin-top:5px;color:#047857;font-size:12px">Verified-ready</strong></div>
    </div>
  </div>
  <p style="margin:16px 0 0;color:#64748b;font-size:13px;line-height:1.6">Send a focused proposal like Upwork/Fiverr: explain your approach, timeline, proof of work, and bid.</p>
  <label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:800">Cover letter <span style="color:#94a3b8;font-weight:600">(or attach a document)</span><textarea id="cover" rows="5" style="${fieldStyle}resize:vertical" placeholder="Hi, I can help with this project. My approach will be..."></textarea></label>
  <label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:800">Work plan / milestones <span style="color:#94a3b8;font-weight:600">(recommended)</span><textarea id="milestones" rows="4" style="${fieldStyle}resize:vertical" placeholder="1. Requirement review&#10;2. UI/API implementation&#10;3. Testing and final delivery"></textarea></label>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
    <label style="color:#123c35;font-size:13px;font-weight:800">Proposed budget<input id="budget" type="number" min="1" style="${fieldStyle}" value="${escapeHtml(project.budget)}"></label>
    <label style="color:#123c35;font-size:13px;font-weight:800">Estimated delivery date<input id="delivery" type="date" min="${tomorrow()}" max="${escapeHtml(String(project.deadline).slice(0, 10))}" style="${fieldStyle}"></label>
  </div>
  <label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:800">Relevant portfolio / proof link <span style="color:#94a3b8;font-weight:600">(optional)</span><input id="portfolio-link" type="url" style="${fieldStyle}" placeholder="https://github.com/username/project or live demo"></label>
  <label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:800">Why choose me? <span style="color:#94a3b8;font-weight:600">(short pitch)</span><textarea id="why-me" rows="3" style="${fieldStyle}resize:vertical" placeholder="I have built similar work, communicate clearly, and can deliver within the deadline."></textarea></label>
  <label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:800">Proposal attachment <span style="color:#94a3b8;font-weight:600">(optional)</span><input id="attachment" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" style="${fieldStyle}padding:9px 12px"><small style="display:block;margin-top:6px;color:#94a3b8;font-weight:600">PDF, DOC, DOCX or TXT - maximum 5 MB</small></label>
</div>`;
const readProposalForm = () => {
  const coverLetter = document.getElementById("cover").value.trim();
  const milestones = document.getElementById("milestones").value.trim();
  const proposedBudget = document.getElementById("budget").value;
  const estimatedDeliveryDate = document.getElementById("delivery").value;
  const portfolioLink = document.getElementById("portfolio-link").value.trim();
  const whyMe = document.getElementById("why-me").value.trim();
  const coverLetterFile = document.getElementById("attachment").files[0];
  if (!coverLetter && !milestones && !coverLetterFile) return Swal.showValidationMessage("Write a cover letter, add a work plan, or attach a document.");
  if (!proposedBudget || Number(proposedBudget) <= 0) return Swal.showValidationMessage("Enter a positive proposed budget.");
  if (!estimatedDeliveryDate) return Swal.showValidationMessage("Choose an estimated delivery date.");
  if (portfolioLink && !/^https?:\/\/\S+$/i.test(portfolioLink)) return Swal.showValidationMessage("Portfolio link must start with http:// or https://.");
  const body = new FormData();
  body.append("coverLetter", [
    coverLetter,
    milestones && `\n\nWork plan / milestones:\n${milestones}`,
    portfolioLink && `\n\nRelevant portfolio:\n${portfolioLink}`,
    whyMe && `\n\nWhy choose me:\n${whyMe}`,
  ].filter(Boolean).join(""));
  body.append("proposedBudget", proposedBudget);
  body.append("estimatedDeliveryDate", estimatedDeliveryDate);
  if (coverLetterFile) body.append("coverLetterFile", coverLetterFile);
  return body;
};
const submissionForm = (project) => `<div style="text-align:left"><p style="margin:0 0 18px;color:#64748b;font-size:13px;line-height:1.6">Every submission becomes an immutable backup version. The archive is inspected as source code and is never executed by the marketplace.</p><label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:700">Completion summary<textarea id="submission-message" rows="4" style="${fieldStyle}resize:vertical" placeholder="What is complete and how should it be reviewed?"></textarea></label><label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:700">Project ZIP <span style="color:#94a3b8;font-weight:500">(recommended)</span><input id="project-archive" type="file" accept=".zip,application/zip" style="${fieldStyle}padding:9px 12px"><small style="display:block;margin-top:6px;color:#94a3b8;font-weight:500">Source code only · ZIP · up to 1 GB · exclude node_modules/build folders</small></label><label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:700">GitHub / repository URL<input id="repository-url" type="url" style="${fieldStyle}" placeholder="https://github.com/..."></label><label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:700">Live demo URL<input id="live-url" type="url" style="${fieldStyle}" placeholder="https://your-project.example"></label><label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:700">Implementation evidence<textarea id="implementation-notes" rows="6" style="${fieldStyle}resize:vertical" placeholder="Requirement 1: implemented in src/... and tested by ...&#10;Requirement 2: ..."></textarea></label><div style="margin-top:16px;border-radius:14px;background:#ecfdf5;padding:12px 14px;color:#047857;font-size:12px;line-height:1.6"><strong>${escapeHtml(project.title)}</strong>: above 50% goes to client review with a requirement-match badge. Above 70% also starts a 24-hour dispute hold and automatic 90% release. Client approval releases all remaining escrow to the freelancer.</div></div>`;
const readSubmissionForm = () => {
  const message = document.getElementById("submission-message").value.trim();
  const projectArchive = document.getElementById("project-archive").files[0];
  const repositoryUrl = document.getElementById("repository-url").value.trim();
  const liveUrl = document.getElementById("live-url").value.trim();
  const implementationNotes = document.getElementById("implementation-notes").value.trim();
  if (!message) return Swal.showValidationMessage("Describe the completed work.");
  if (!projectArchive && !repositoryUrl && !liveUrl) return Swal.showValidationMessage("Upload a ZIP or provide a repository/live demo URL.");
  const body = new FormData();
  body.append("message", message);
  body.append("repositoryUrl", repositoryUrl);
  body.append("liveUrl", liveUrl);
  body.append("implementationNotes", implementationNotes);
  if (projectArchive) body.append("projectArchive", projectArchive);
  return body;
};

const projectPostTemplates = {
  web_app: {
    label: "Web app / dashboard",
    title: "Build a responsive business web application",
    skills: "React, Next.js, Node.js, MySQL, Tailwind CSS",
    goal: "Create a secure web application that helps users complete the main business workflow from account access to final action without confusion.",
    audience: "Customers, staff members and administrators who need a fast browser-based workflow on desktop and mobile.",
    deliverables: "Responsive frontend screens\nBackend REST APIs\nDatabase schema and seed data\nAdmin/user role controls\nDeployment notes and source code",
    features: "User registration, login and logout\nRole-based dashboard navigation\nCreate, view, update and delete core records\nSearch, filter and status tracking\nForm validation and clear error messages",
    requirements: "Users can register, log in and log out securely\nDashboard data loads from the backend database\nCore records can be created, edited, deleted and searched\nUnauthorized users cannot access protected pages\nThe UI works correctly on mobile, tablet and desktop\nSource code is delivered with setup instructions",
  },
  ecommerce: {
    label: "E-commerce / order system",
    title: "Build an e-commerce website with order management",
    skills: "Laravel, PHP, MySQL, JavaScript, Bootstrap",
    goal: "Launch an online store where customers can browse products, place orders and admins can manage inventory and order status.",
    audience: "Retail customers and store administrators.",
    deliverables: "Product catalog pages\nCart and checkout flow\nAdmin product/order panel\nDatabase setup\nDeployment-ready source code",
    features: "Product category and detail pages\nCart add, update and remove actions\nCheckout with customer information\nAdmin product CRUD\nOrder status update workflow",
    requirements: "Customers can browse products by category\nCustomers can add products to cart and update quantities\nCheckout stores customer and order details in the database\nAdmins can create, edit and delete products\nAdmins can update order status\nThe site is responsive and ready for hosting",
  },
  mobile_app: {
    label: "Mobile app",
    title: "Design and develop a mobile app",
    skills: "Flutter, Firebase, REST API, UI Design",
    goal: "Build a mobile application with a clean user flow, reliable data storage and production-ready screens.",
    audience: "Mobile users who need a simple app experience on Android and common mobile screen sizes.",
    deliverables: "Mobile app source code\nAuthentication screens\nMain feature screens\nAPI/Firebase integration\nBuild and setup instructions",
    features: "Splash and onboarding flow\nLogin and registration\nProfile management\nCore feature create/view/update actions\nNotification-ready structure",
    requirements: "Users can sign up and log in from the app\nMain screens match the approved design\nUser data is saved and loaded correctly\nForms validate required information\nApp layout works on common Android screen sizes\nFinal source includes setup and build instructions",
  },
  ui_ux: {
    label: "UI/UX design",
    title: "Create a polished UI/UX design system and screens",
    skills: "Figma, UX Research, Prototyping, Design System",
    goal: "Design a clear and modern product experience that makes the target workflow easy to understand and fast to complete.",
    audience: "End users of the product and the development team that will implement the design.",
    deliverables: "User flow map\nHigh-fidelity Figma screens\nReusable components\nClickable prototype\nDeveloper handoff notes",
    features: "Landing or dashboard layout\nAuthentication screens\nPrimary workflow screens\nEmpty, loading and error states\nResponsive mobile variants",
    requirements: "Figma file includes organized pages and named components\nAll requested screens are designed in desktop and mobile sizes\nClickable prototype demonstrates the main user flow\nColors, typography and spacing are consistent\nDeveloper handoff includes measurements and asset notes",
  },
  branding: {
    label: "Branding / graphics",
    title: "Create a complete brand identity package",
    skills: "Logo Design, Illustrator, Photoshop, Brand Guidelines",
    goal: "Build a professional visual identity that can be used consistently across digital and print materials.",
    audience: "Customers who will see the brand on websites, social media, packaging and marketing materials.",
    deliverables: "Logo concepts and final logo\nColor palette and typography\nSocial media kit\nBusiness card or stationery design\nEditable source files",
    features: "Primary and secondary logo versions\nLight and dark background variations\nBrand usage rules\nExported PNG, JPG, SVG or PDF files\nEditable AI/PSD/Figma source",
    requirements: "At least three initial logo concepts are provided\nFinal logo includes transparent and background variants\nBrand colors and font recommendations are documented\nSocial media templates are editable\nAll final files are delivered in agreed formats",
  },
  content: {
    label: "Content writing",
    title: "Write SEO-friendly website content",
    skills: "Content Writing, SEO, Copywriting, Research",
    goal: "Create clear, original and search-friendly content that explains the service and converts visitors into leads.",
    audience: "Potential customers searching for the service online.",
    deliverables: "Homepage copy\nService page copy\nAbout page copy\nSEO titles and meta descriptions\nFinal editable document",
    features: "Brand tone alignment\nKeyword-focused headings\nClear call-to-action sections\nReadable short paragraphs\nProofread final copy",
    requirements: "Content is original and free from plagiarism\nEach page includes SEO title and meta description\nHeadings follow a clear H1/H2/H3 structure\nCopy uses the agreed brand tone\nFinal document is proofread and ready to publish",
  },
  data_ai: {
    label: "Data / AI automation",
    title: "Build a data analysis and automation workflow",
    skills: "Python, Data Analysis, Automation, API Integration",
    goal: "Create an automated workflow that processes data, produces useful outputs and reduces manual work.",
    audience: "Business operators or analysts who need repeatable reports and automation.",
    deliverables: "Data processing script or notebook\nInput/output format documentation\nDashboard or report file\nAutomation instructions\nSource code",
    features: "Import data from CSV/API/database\nClean and validate input data\nGenerate summary metrics\nExport report files\nHandle common error cases",
    requirements: "Workflow accepts the agreed input format\nInvalid or missing data is handled safely\nReport outputs match the requested metrics\nCode is documented enough to run locally\nFinal delivery includes setup and run instructions",
  },
  bug_fix: {
    label: "Bug fix / improvement",
    title: "Fix bugs and improve an existing project",
    skills: "Debugging, JavaScript, PHP, MySQL, Git",
    goal: "Resolve the listed issues without breaking existing working features.",
    audience: "Current users of the existing website or application.",
    deliverables: "Bug-fixed source code\nShort change summary\nTesting notes\nDeployment instructions",
    features: "Reproduce reported bugs\nFix root causes\nImprove validation or error handling\nCheck related pages\nDocument changed files",
    requirements: "All listed bugs are reproducible before the fix and resolved after the fix\nExisting login and main workflow still work\nNo unrelated UI or database changes are introduced\nChanged files are documented\nFinal version is tested locally before delivery",
  },
};

const projectPostOptionHtml = Object.entries(projectPostTemplates)
  .map(([key, item]) => `<option value="${key}">${escapeHtml(item.label)}</option>`)
  .join("");
const splitLines = (value) => String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const splitCsv = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const projectPostForm = () => `<div style="text-align:left">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <label style="font-size:12px;font-weight:800;color:#123c35">Project type<select id="project-type" style="${fieldStyle}">${projectPostOptionHtml}</select></label>
    <label style="font-size:12px;font-weight:800;color:#123c35">Budget (BDT)<input id="project-budget" type="number" min="1" style="${fieldStyle}" placeholder="25000"></label>
  </div>
  <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#123c35">Project title<input id="project-title" style="${fieldStyle}" placeholder="Project title"></label>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
    <label style="font-size:12px;font-weight:800;color:#123c35">Deadline<input id="project-deadline" type="date" min="${tomorrow()}" style="${fieldStyle}"></label>
    <label style="font-size:12px;font-weight:800;color:#123c35">Required skills<input id="project-skills" style="${fieldStyle}" placeholder="React, Laravel, Figma"></label>
  </div>
  <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#123c35">Business goal<textarea id="project-goal" rows="3" style="${fieldStyle}resize:vertical" placeholder="What should this project achieve?"></textarea></label>
  <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#123c35">Target users<textarea id="project-audience" rows="2" style="${fieldStyle}resize:vertical" placeholder="Who will use it?"></textarea></label>
  <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#123c35">Deliverables <span style="color:#94a3b8;font-weight:600">(one per line)</span><textarea id="project-deliverables" rows="5" style="${fieldStyle}resize:vertical" placeholder="Responsive frontend screens&#10;Admin dashboard&#10;Source code and setup guide"></textarea></label>
  <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#123c35">Main features <span style="color:#94a3b8;font-weight:600">(one per line)</span><textarea id="project-features" rows="5" style="${fieldStyle}resize:vertical" placeholder="User login&#10;Search and filter&#10;Payment status tracking"></textarea></label>
  <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#123c35">Acceptance requirements for AI review <span style="color:#94a3b8;font-weight:600">(one per line)</span><textarea id="project-requirements" rows="7" style="${fieldStyle}resize:vertical" placeholder="Users can register and log in securely&#10;Admin can manage records&#10;Responsive UI works on mobile"></textarea></label>
  <label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#123c35">Out of scope / notes <span style="color:#94a3b8;font-weight:600">(optional)</span><textarea id="project-notes" rows="3" style="${fieldStyle}resize:vertical" placeholder="Payment gateway will be added later, content will be provided by client, etc."></textarea></label>
</div>`;

const fillProjectPostTemplate = (force = false) => {
  const selected = document.getElementById("project-type")?.value || "web_app";
  const template = projectPostTemplates[selected] || projectPostTemplates.web_app;
  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element && (force || !element.value.trim())) element.value = value;
  };
  setValue("project-title", template.title);
  setValue("project-skills", template.skills);
  setValue("project-goal", template.goal);
  setValue("project-audience", template.audience);
  setValue("project-deliverables", template.deliverables);
  setValue("project-features", template.features);
  setValue("project-requirements", template.requirements);
};

const readProjectPostForm = () => {
  const type = document.getElementById("project-type").value;
  const template = projectPostTemplates[type] || projectPostTemplates.web_app;
  const title = document.getElementById("project-title").value.trim();
  const budget = document.getElementById("project-budget").value;
  const deadline = document.getElementById("project-deadline").value;
  const skills = splitCsv(document.getElementById("project-skills").value);
  const goal = document.getElementById("project-goal").value.trim();
  const audience = document.getElementById("project-audience").value.trim();
  const deliverables = splitLines(document.getElementById("project-deliverables").value);
  const features = splitLines(document.getElementById("project-features").value);
  const requirements = splitLines(document.getElementById("project-requirements").value);
  const notes = document.getElementById("project-notes").value.trim();
  if (title.length < 8) return Swal.showValidationMessage("Write a specific project title.");
  if (!goal || goal.length < 20) return Swal.showValidationMessage("Write a clear business goal.");
  if (!audience) return Swal.showValidationMessage("Add the target users.");
  if (deliverables.length < 2) return Swal.showValidationMessage("Add at least two deliverables.");
  if (features.length < 2) return Swal.showValidationMessage("Add at least two main features.");
  if (requirements.length < 3) return Swal.showValidationMessage("Add at least three acceptance requirements.");
  if (!skills.length) return Swal.showValidationMessage("Add at least one required skill.");
  if (!budget || Number(budget) <= 0) return Swal.showValidationMessage("Enter a positive budget.");
  if (!deadline) return Swal.showValidationMessage("Choose a deadline.");
  const description = [
    `Project type: ${template.label}`,
    "",
    "Business goal:",
    goal,
    "",
    "Target users:",
    audience,
    "",
    "Deliverables:",
    ...deliverables.map((item) => `- ${item}`),
    "",
    "Main features:",
    ...features.map((item) => `- ${item}`),
    "",
    "Out of scope / notes:",
    notes || "No extra notes.",
  ].join("\n");
  return { title, description, budget, deadline, skills, requirements };
};

const reportList = (items, empty) => items?.length
  ? `<ul style="margin:8px 0 0;padding-left:18px">${items.map((item) => `<li style="margin:5px 0">${escapeHtml(item)}</li>`).join("")}</ul>`
  : `<p style="margin:8px 0 0;color:#94a3b8">${escapeHtml(empty)}</p>`;

const clientRatingForm = () => `<div style="text-align:left"><p style="margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.6">Rate the freelancer's quality, communication and delivery. This rating will appear on their public marketplace profile.</p><label style="display:block;color:#123c35;font-size:13px;font-weight:800">Star rating<select id="client-rating" style="${fieldStyle}"><option value="">Skip rating for now</option><option value="5">★★★★★ 5 - Excellent</option><option value="4">★★★★☆ 4 - Good</option><option value="3">★★★☆☆ 3 - Average</option><option value="2">★★☆☆☆ 2 - Needs improvement</option><option value="1">★☆☆☆☆ 1 - Poor</option></select></label><label style="display:block;margin-top:14px;color:#123c35;font-size:13px;font-weight:800">Public review <span style="color:#94a3b8;font-weight:600">(optional)</span><textarea id="client-review-comment" rows="4" style="${fieldStyle}resize:vertical" placeholder="Share what went well, communication quality, and delivery experience."></textarea></label></div>`;

function evaluationReportHtml(submission) {
  const report = parseStoredJson(submission.evaluation_report);
  const requirements = Array.isArray(report.requirements) ? report.requirements : [];
  const links = [
    submission.repository_url && `<a href="${escapeHtml(submission.repository_url)}" target="_blank" rel="noopener noreferrer" style="color:#047857;font-weight:700">Repository</a>`,
    submission.live_url && `<a href="${escapeHtml(submission.live_url)}" target="_blank" rel="noopener noreferrer" style="color:#047857;font-weight:700">Live demo</a>`,
  ].filter(Boolean).join(" · ");
  const requirementCards = requirements.map((item) => {
    const score = Number(item.score || 0);
    const color = score >= 80 ? "#047857" : score >= 60 ? "#b45309" : "#dc2626";
    return `<section style="margin-top:12px;border:1px solid #e2e8f0;border-radius:14px;padding:14px;text-align:left"><div style="display:flex;justify-content:space-between;gap:12px"><strong style="color:#123c35">${escapeHtml(item.requirement)}</strong><strong style="color:${color};white-space:nowrap">${score}%</strong></div><p style="margin:8px 0 0;color:#64748b;font-size:12px;text-transform:capitalize">${escapeHtml(item.status)}</p><div style="margin-top:10px;color:#475569;font-size:12px"><strong>Evidence</strong>${reportList(item.evidence, "No verified evidence found.")}<strong style="display:block;margin-top:10px">Missing / unverified</strong>${reportList(item.missing, "Nothing reported missing.")}<strong style="display:block;margin-top:10px">Improve</strong>${reportList(item.improvements, "No improvement requested.")}</div></section>`;
  }).join("");
  const revision = parseStoredJson(submission.revision_details);
  return `<div style="text-align:left"><div style="border-radius:18px;background:${Number(submission.evaluation_score) > 50 ? "#ecfdf5" : "#fff7ed"};padding:18px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><p style="margin:0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase">Version ${Number(submission.version_number || 1)} · Requirement match</p><h2 style="margin:5px 0 0;color:#123c35;font-size:28px">${submission.evaluation_score == null ? "Pending" : `${Number(submission.evaluation_score)}%`}</h2></div><span style="border-radius:999px;background:white;padding:8px 12px;color:#047857;font-size:11px;font-weight:800;text-transform:uppercase">${escapeHtml(submission.status.replace(/_/g, " "))}</span></div><p style="margin:10px 0 0;color:#475569;font-size:13px;line-height:1.6">${escapeHtml(report.summary || submission.evaluation_error || "Automated review is still running.")}</p><p style="margin:10px 0 0;color:#64748b;font-size:11px">Reviewer: ${escapeHtml(submission.evaluation_model || submission.evaluation_provider || "pending")}${submission.ai_badge_reference ? ` · Badge: ${escapeHtml(submission.ai_badge_reference)}` : ""}</p><p style="margin:8px 0 0;color:#64748b;font-size:11px">${submission.dispute_deadline ? `Dispute hold: ${escapeHtml(new Date(submission.dispute_deadline).toLocaleString())}` : ""}${submission.review_deadline ? ` · Review deadline: ${escapeHtml(new Date(submission.review_deadline).toLocaleString())}` : ""}${submission.initial_release_at ? " · 90% released" : ""}</p>${links ? `<p style="margin:10px 0 0;font-size:12px">${links}</p>` : ""}</div>${revision.issue ? `<section style="margin-top:12px;border-radius:14px;background:#fff7ed;padding:14px;color:#9a3412;font-size:12px"><strong>Client revision request</strong><p>${escapeHtml(revision.issue)}</p><p><strong>Expected:</strong> ${escapeHtml(revision.expectedResult)}</p><p><strong>Evidence:</strong> ${escapeHtml(revision.evidence)}</p></section>` : ""}${requirementCards}${report.risks?.length ? `<section style="margin-top:12px;border-radius:14px;background:#fff1f2;padding:14px;color:#9f1239;font-size:12px"><strong>Review limitations / risks</strong>${reportList(report.risks, "")}</section>` : ""}</div>`;
}

function deliveryLinksHtml(submission) {
  const links = [
    submission.repository_url && ["GitHub / repository", submission.repository_url],
    submission.live_url && ["Live demo", submission.live_url],
  ].filter(Boolean);
  if (!links.length) return `<p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">No repository or live demo link was included with this accepted submission.</p>`;
  return `<div style="text-align:left"><p style="margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.6">Accepted submission v${Number(submission.version_number || 1)} delivery links are available below.</p><div style="display:grid;gap:10px">${links.map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #d1fae5;border-radius:14px;padding:12px 14px;color:#047857;font-size:13px;font-weight:800;text-decoration:none"><span>${escapeHtml(label)}</span><span style="max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#64748b;font-size:12px;font-weight:600">${escapeHtml(url)}</span></a>`).join("")}</div></div>`;
}

function projectRequirements(project) {
  try {
    const requirements = typeof project.requirements === "string" ? JSON.parse(project.requirements || "[]") : project.requirements || [];
    return requirements.map((item, index) => ({ id: Number(item.id || index + 1), title: item.title || item.requirement || String(item) }));
  } catch { return []; }
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

const landingJobFromProject = (project, index = 0) => {
  const skills = typeof project.skills === "string" ? parseStoredJson(project.skills) : project.skills || [];
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const daysLeft = deadline ? Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 86400000)) : null;
  const styles = ["bg-emerald-100 text-emerald-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700"];
  const icons = [FiBriefcase, FiZap, FiStar, FiGrid];
  return {
    id: project.id,
    title: project.title,
    titleBn: project.title,
    category: project.client_name ? `Client: ${project.client_name}` : "Posted project",
    categoryBn: project.client_name ? `Client: ${project.client_name}` : "Posted project",
    budget: formatCurrency(project.budget),
    budgetEn: formatCurrency(project.budget),
    time: daysLeft ? `${daysLeft} days left` : "Open deadline",
    timeEn: daysLeft ? `${daysLeft} days left` : "Open deadline",
    bids: "Open project",
    bidsEn: "Open project",
    skills: skills.length ? skills.slice(0, 3) : ["Project", "Open", "Hiring"],
    skillsBn: skills.length ? skills.slice(0, 3) : ["Project", "Open", "Hiring"],
    color: styles[index % styles.length],
    icon: icons[index % icons.length],
  };
};

const sidebar = [
  ["dashboard", FiHome],
  ["projects", FiBriefcase],
  ["myWork", FiUploadCloud],
  ["reviews", FiFileText],
  ["verify", FiShield],
  ["nidVerification", FiCheckCircle],
  ["payments", FiCreditCard],
  ["messages", FiMessageCircle],
  ["notifications", FiBell],
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
    <ThemeBackground className="relative overflow-hidden pt-32 text-white lg:pt-40">
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-24 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:pb-32">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-2 text-xs font-semibold text-emerald-200">
            <FiShield /> {t.heroTag}
          </div>
          <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.07] tracking-tight sm:text-6xl xl:text-7xl">
            {lang === "en" ? <>
              Own your <span className="relative isolate inline-grid h-[3.35em] w-[3.35em] align-middle place-items-center text-white">
                <span className="pointer-events-none absolute inset-[0.08em] z-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(167,243,208,0.18),rgba(16,185,129,0.07)_48%,rgba(6,78,59,0.1)_74%,rgba(6,78,59,0)_100%)] shadow-[inset_16px_18px_38px_rgba(110,231,183,0.08),0_0_34px_rgba(16,185,129,0.16)]" />
                <span className="pointer-events-none absolute inset-[0.08em] z-20 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(16,185,129,0.16),rgba(3,35,30,0.38)_58%,rgba(2,24,21,0.58)_100%)] shadow-[inset_12px_14px_30px_rgba(167,243,208,0.08)]" />
                <svg className="pointer-events-none absolute inset-0 z-[1000] h-full w-full overflow-visible drop-shadow-[0_0_18px_rgba(52,211,153,0.2)]" viewBox="0 0 240 240" aria-hidden="true">
                  <text x="120" y="120" fill="white" fontFamily="inherit" fontSize="44" fontWeight="800" textAnchor="middle" dominantBaseline="central">
                    skills
                  </text>
                  <g fill="none" strokeLinecap="round">
                    <circle cx="120" cy="120" r="106" stroke="rgba(250,204,21,0.78)" strokeWidth="3">
                      <animateTransform attributeName="transform" type="rotate" from="0 120 120" to="360 120 120" dur="18s" repeatCount="indefinite" />
                    </circle>
                    <motion.g
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                      style={{ transformBox: "view-box", transformOrigin: "120px 120px" }}
                    >
                      <ellipse cx="120" cy="120" rx="98" ry="25" stroke="rgba(250,204,21,0.78)" strokeWidth="3" />
                      <ellipse cx="120" cy="120" rx="98" ry="25" stroke="rgba(250,204,21,0.78)" strokeWidth="3" transform="rotate(60 120 120)" />
                      <ellipse cx="120" cy="120" rx="98" ry="25" stroke="rgba(250,204,21,0.78)" strokeWidth="3" transform="rotate(120 120 120)" />
                    </motion.g>
                    <g fill="none" stroke="rgb(250,204,21)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <animateMotion
                        path="M218 120 A98 25 0 1 1 22 120 A98 25 0 1 1 218 120"
                        dur="8s"
                        repeatCount="indefinite"
                        rotate="0"
                      />
                      <g transform="translate(-20 -20)" stroke="rgb(147,197,253)" strokeWidth="2.8">
                        <path d="M20 9 11 15M20 9l9 6M11 25l9 6M29 25l-9 6" />
                        {[[20, 6], [8, 20], [32, 20], [20, 34]].map(([x, y]) => (
                          <g key={`${x}-${y}`} transform={`translate(${x - 5} ${y - 5})`}>
                            <polygon points="5,0 10,3 5,6 0,3" fill="rgb(147,197,253)" />
                            <polygon points="0,3 5,6 5,11 0,8" fill="rgb(59,130,246)" />
                            <polygon points="10,3 5,6 5,11 10,8" fill="rgb(29,78,216)" />
                          </g>
                        ))}
                      </g>
                    </g>
                    <g fill="none" stroke="rgb(110,231,183)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                      <animateMotion
                        path="M22 120 A98 25 0 1 0 218 120 A98 25 0 1 0 22 120"
                        dur="10s"
                        repeatCount="indefinite"
                        rotate="0"
                      />
                      <g transform="translate(-18 -18)">
                        <rect x="7" y="7" width="22" height="22" rx="4" fill="rgb(8,47,73)" stroke="rgb(125,211,252)" strokeWidth="2.4" />
                        <path d="M12 7V3M18 7V1M24 7V3M12 29v4M18 29v6M24 29v4M7 12H3M7 18H1M7 24H3M29 12h4M29 18h6M29 24h4" />
                        {[[12, 3], [18, 1], [24, 3], [12, 33], [18, 35], [24, 33], [3, 12], [1, 18], [3, 24], [33, 12], [35, 18], [33, 24]].map(([cx, cy]) => (
                          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="rgb(3,35,30)" />
                        ))}
                        <text x="18" y="18.5" fill="rgb(186,230,253)" stroke="none" fontFamily="inherit" fontSize="9" fontWeight="900" textAnchor="middle" dominantBaseline="central">
                          AI
                        </text>
                      </g>
                    </g>
                  </g>
                  <g stroke="rgba(6,78,59,0.82)" strokeLinejoin="round" strokeWidth="1.1">
                    <animateTransform attributeName="transform" type="rotate" from="0 120 120" to="360 120 120" dur="18s" repeatCount="indefinite" />
                    {[[120, 16], [193, 47], [224, 120], [193, 193], [120, 224], [47, 193], [16, 120], [47, 47]].map(([x, y]) => (
                      <g key={`${x}-${y}`} transform={`translate(${x - 9} ${y - 9})`}>
                        <polygon points="9,0 18,5 9,10 0,5" fill="rgb(167,243,208)" />
                        <polygon points="0,5 9,10 9,19 0,14" fill="rgb(16,185,129)" />
                        <polygon points="18,5 9,10 9,19 18,14" fill="rgb(5,150,105)" />
                        <path d="M9 0v10M0 5v9M18 5v9M0 14l9 5 9-5" fill="none" stroke="rgba(236,253,245,0.72)" strokeWidth="0.8" />
                      </g>
                    ))}
                  </g>
                </svg>
              </span>
            </> : t.heroTitle}
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
    </ThemeBackground>
  );
}

function HeroCard({ lang }) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative mx-auto w-full max-w-lg">
      <div className="glass relative overflow-hidden rounded-[30px] p-4 shadow-2xl">
        <div className="relative overflow-hidden rounded-[23px] bg-[#f8faf7] p-5 text-ink">
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
  const [postedJobs, setPostedJobs] = useState([]);
  const [loadingPostedJobs, setLoadingPostedJobs] = useState(true);
  useEffect(() => {
    api("/projects")
      .then((data) => setPostedJobs((data.projects || []).map(landingJobFromProject)))
      .catch(() => setPostedJobs([]))
      .finally(() => setLoadingPostedJobs(false));
  }, []);
  const displayedJobs = postedJobs.length ? postedJobs : jobs;
  return (
    <>
      <Header lang={lang} setLang={setLang} onLogin={onLogin} />
      <Hero lang={lang} onLogin={onLogin} />
      <section id="process" className="relative bg-[#f6f8f4] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker={tx(lang, "সহজ ও নিরাপদ", "Simple & Secure")} title={tx(lang, "কাজ করুন নিশ্চিন্তে, মাত্র তিন ধাপে", "Work confidently in just three steps")} text={tx(lang, "দক্ষতা যাচাই থেকে নিরাপদ পেমেন্ট পর্যন্ত প্রতিটি ধাপে থাকছে স্বচ্ছতা।", "Every step stays transparent, from skill verification to secure payment.")} />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              [FiVideo, tx(lang, "০১", "01"), tx(lang, "স্কিল দেখান", "Show your skills"), tx(lang, "সর্বোচ্চ ৫ মিনিটের একটি কাজের ভিডিও রেকর্ড করে আপনার দক্ষতা প্রমাণ করুন।", "Prove your skills by recording a work video of up to 5 minutes.")],
              [FiShield, tx(lang, "০২", "02"), tx(lang, "AI ভেরিফাইড ব্যাজ", "AI-verified badge"), tx(lang, "AI আপনার কাজ বিশ্লেষণ করে স্কোর এবং ব্লকচেইন সমর্থিত ব্যাজ প্রদান করবে।", "AI analyzes your work and provides a score and blockchain-backed badge.")],
              [FiCreditCard, tx(lang, "০৩", "03"), tx(lang, "নিরাপদ পেমেন্ট", "Secure payment"), tx(lang, "এসক্রো সুরক্ষায় কাজ শেষে আপনার পছন্দের পেমেন্ট পদ্ধতিতে পেমেন্ট নিন।", "Receive payment through your preferred supported method after work, protected by escrow.")],
            ].map(([Icon, count, title, text], index) => (
              <motion.article
                key={count}
                initial={{ opacity: 0, x: -140, scale: 0.94 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 1.15, delay: index * 0.18, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -8 }}
                className="relative overflow-hidden rounded-[26px] border border-[#e2ebe5] bg-white p-7 shadow-card"
              >
                <span className="absolute right-5 top-4 text-5xl font-extrabold text-emerald-300">{count}</span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-xl text-emerald-300"><Icon /></div>
                <h3 className="font-bangla mt-6 text-xl font-bold">{title}</h3>
                <p className="font-bangla mt-3 leading-7 text-slate-500">{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
      <ThemeBackground id="features" className="px-5 py-24 text-white lg:px-8">
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
            <motion.div whileHover={{ y: -5 }} className="glass relative rounded-[26px] p-6 text-white shadow-[0_0_40px_rgba(52,211,153,0.15)] overflow-hidden">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-300 drop-shadow-sm">{tx(lang, "এসক্রো সুরক্ষিত", "Escrow Protected")}</p><p className="mt-2 text-2xl font-bold">{tx(lang, "নিরাপদ লেনদেন", "Secure transaction")}</p></div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/20 text-2xl text-emerald-300 border border-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.3)]"><FiLock /></div>
              </div>
              <div className="my-6 h-px bg-white/10" />
              <div className="flex justify-between text-sm"><span className="text-white/60">{tx(lang, "প্রজেক্ট পেমেন্ট", "Project Payment")}</span><strong>{tx(lang, "৳ ৩৫,০০০", "৳ 35,000")}</strong></div>
              <div className="mt-4 flex justify-between text-sm items-center"><span className="text-white/60">{tx(lang, "অবস্থা", "Status")}</span><span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]">{tx(lang, "এসক্রোতে লক করা", "LOCKED IN ESCROW")}</span></div>
            </motion.div>
          </div>
        </div>
      </ThemeBackground>
      <section id="jobs" className="bg-[#f6f8f4] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker={tx(lang, "নতুন সুযোগ", "Fresh opportunities")} title={tx(lang, "আপনার জন্য বাছাই করা কাজ", "Selected projects for you")} text={tx(lang, "ভেরিফাইড ক্লায়েন্টদের প্রকাশিত সাম্প্রতিক কাজগুলো দেখুন এবং আজই আবেদন করুন।", "Explore recent projects from verified clients and apply today.")} />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {loadingPostedJobs ? [0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-[24px] bg-white shadow-card" />) : displayedJobs.map((job) => <JobCard key={job.id || job.title} job={job} lang={lang} onApply={onLogin} />)}
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
  const [showPassword, setShowPassword] = useState(false);
  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const submit = async () => {
    setLoading(true);
    try {
      if (verification) {
        await api("/auth/verify-registration", { method: "POST", body: JSON.stringify({ ...verification, code }) });
        setRegister(false);
        setVerification(null);
        setCode("");
        setForm((current) => ({ ...current, name: "", password: "" }));
        Swal.fire({
          title: tx(lang, "অ্যাকাউন্ট তৈরি হয়েছে", "Account created"),
          text: tx(lang, "এখন আপনার ইমেইল/মোবাইল ও পাসওয়ার্ড দিয়ে লগ ইন করুন।", "Now sign in with your email/mobile and password."),
          icon: "success",
          confirmButtonColor: "#0c3b32",
        });
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
          <div className="relative">
            <input value={form.password} onChange={setField("password")} placeholder={tx(lang, "পাসওয়ার্ড", "Password")} type={showPassword ? "text" : "password"} className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-emerald-400" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-emerald-700" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div></>}
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

function NidVerificationGate({ token, user, leave, onVerified }) {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nidNumber, setNidNumber] = useState("");
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const authHeaders = { Authorization: `Bearer ${token}` };
  const loadVerification = useCallback(() => {
    setLoading(true);
    api("/profiles/nid-verification", { headers: authHeaders })
      .then(({ verification: data }) => {
        setVerification(data || null);
        if (data?.status === "verified") onVerified();
      })
      .catch((error) => Swal.fire({ title: "NID verification", text: error.message, icon: "error" }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, onVerified]);
  useEffect(() => { loadVerification(); }, [loadVerification]);
  const submit = async (event) => {
    event.preventDefault();
    if (!/^[0-9]{10,17}$/.test(nidNumber.trim())) return Swal.fire({ title: "Invalid NID", text: "Enter a valid 10 to 17 digit National ID number.", icon: "warning" });
    if (!frontImage || !backImage) return Swal.fire({ title: "Images required", text: "Upload both front and back side NID images.", icon: "warning" });
    const body = new FormData();
    body.append("nidNumber", nidNumber.trim());
    body.append("frontImage", frontImage);
    body.append("backImage", backImage);
    try {
      setSubmitting(true);
      const response = await fetch(`${API_URL}/profiles/nid-verification`, { method: "POST", headers: authHeaders, body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "NID submission failed.");
      setVerification(data.verification);
      setNidNumber("");
      setFrontImage(null);
      setBackImage(null);
      Swal.fire({ title: "Submitted successfully", text: "Your NID verification is now processing.", icon: "success", confirmButtonColor: "#0c3b32" });
    } catch (error) {
      Swal.fire({ title: "NID verification", text: error.message, icon: "error" });
    } finally {
      setSubmitting(false);
    }
  };
  const pending = verification?.status === "pending";
  const rejected = verification?.status === "rejected";
  return <main className="min-h-screen bg-[#f6f8f4] px-5 py-8 text-forest sm:px-8"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between gap-4"><Logo lang="en" /><button onClick={leave} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">Log out</button></div><section className="mt-8 rounded-[28px] bg-white p-6 shadow-card sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-600">National ID verification</p><h1 className="mt-3 text-3xl font-black text-forest">Verify your identity</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Hi {user.name}, submit your National ID number with clear front and back side images. You can access your account after NID verification by Admin.</p></div><div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-3xl text-emerald-700"><FiShield /></div></div>{loading ? <p className="mt-8 text-sm font-bold text-slate-400">Loading verification status...</p> : pending ? <div className="mt-8 rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-cyan-800"><h2 className="font-black">Your NID verification is now processing.</h2><p className="mt-2 text-sm leading-6">Submitted successfully. You can access your account after NID verification by Admin.</p><button onClick={loadVerification} className="mt-4 rounded-full bg-cyan-600 px-4 py-2 text-xs font-bold text-white">Refresh status</button></div> : <><div className={`mt-8 rounded-2xl p-5 ${rejected ? "border border-red-100 bg-red-50 text-red-700" : "border border-emerald-100 bg-emerald-50 text-emerald-800"}`}><h2 className="font-black">{rejected ? "Your NID verification was rejected." : "NID verification required."}</h2><p className="mt-2 text-sm leading-6">{rejected ? verification.rejection_reason || "Admin rejected the submission. Please submit correct information again." : "Submit your National ID details to continue."}</p></div><form onSubmit={submit} className="mt-7 grid gap-5"><label className="block text-sm font-bold text-slate-600">National ID number<input value={nidNumber} onChange={(event) => setNidNumber(event.target.value.replace(/\D/g, ""))} maxLength={17} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" placeholder="10 to 17 digit NID number" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-sm font-bold text-slate-600"><FiUploadCloud className="mb-3 text-2xl text-emerald-600" />Front side image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFrontImage(event.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-slate-500" />{frontImage && <span className="mt-2 block truncate text-xs text-emerald-700">{frontImage.name}</span>}</label><label className="block rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-sm font-bold text-slate-600"><FiUploadCloud className="mb-3 text-2xl text-emerald-600" />Back side image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBackImage(event.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-slate-500" />{backImage && <span className="mt-2 block truncate text-xs text-emerald-700">{backImage.name}</span>}</label></div><button disabled={submitting} className="rounded-full bg-forest px-6 py-4 text-sm font-black text-white disabled:bg-slate-300">{submitting ? "Submitting..." : "Submit for admin verification"}</button></form></>}</section></div></main>;
}

function Dashboard({ lang, setLang, leave, session }) {
  const t = copy[lang];
  const user = session.user;
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const routeStorageKey = `skillshurokkha_dashboard_route_${user.id}`;
  const allowedRoutes = user.role === "admin"
    ? ["dashboard", "nidVerification", "notifications", "settings"]
    : user.role === "client"
      ? ["dashboard", "projects", "reviews", "applicants", "applicantDetails", "payments", "messages", "notifications", "settings"]
      : ["dashboard", "projects", "myWork", "applicants", "applicantDetails", "verify", "payments", "messages", "notifications", "settings"];
  const readInitialRoute = () => {
    if (typeof window === "undefined") return { active: "dashboard", routeData: {} };
    const stored = JSON.parse(sessionStorage.getItem(routeStorageKey) || "{}");
    const hashRoute = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    const nextActive = allowedRoutes.includes(hashRoute) ? hashRoute : allowedRoutes.includes(stored.active) ? stored.active : "dashboard";
    return { active: nextActive, routeData: stored.routeData || {} };
  };
  const [active, setActive] = useState(() => readInitialRoute().active);
  const [routeData, setRouteData] = useState(() => readInitialRoute().routeData);
  const [menu, setMenu] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [nidAccess, setNidAccess] = useState(user.role === "admin" || user.nid_status === "verified");
  const alert = (title, text, icon = "success") => Swal.fire({ title, text, icon, confirmButtonColor: "#0c3b32" });
  const labels = { dashboard: t.dashboard, projects: t.projects, myWork: "My Work", reviews: "Submitted Work", verify: t.verify, nidVerification: "NID Verification", payments: t.payments, messages: t.messages, notifications: "Notifications", settings: t.settings };
  const visibleSidebar = sidebar.filter(([key]) => user.role === "admin"
    ? ["dashboard", "nidVerification", "notifications", "settings"].includes(key)
    : user.role === "client"
      ? !["verify", "myWork", "nidVerification"].includes(key)
      : !["reviews", "nidVerification"].includes(key));
  const leaveDashboard = () => {
    if (typeof window !== "undefined") sessionStorage.removeItem(routeStorageKey);
    leave();
  };
  const openTab = (key, data = {}, historyMode = "push") => {
    const nextActive = allowedRoutes.includes(key) ? key : "dashboard";
    setRouteData(data);
    setActive(nextActive);
    if (typeof window === "undefined") return;
    sessionStorage.setItem(routeStorageKey, JSON.stringify({ active: nextActive, routeData: data }));
    const nextUrl = `${window.location.pathname}${window.location.search}#${encodeURIComponent(nextActive)}`;
    const state = { skillshurokkhaRoute: { active: nextActive, routeData: data } };
    if (historyMode === "replace") window.history.replaceState(state, "", nextUrl);
    else window.history.pushState(state, "", nextUrl);
  };
  const reloadApplicantRoute = useCallback(async (project, selectedId = routeData.applicant?.id) => {
    const data = await api(`/projects/${project.id}/applications`, { headers: { Authorization: `Bearer ${session.token}` } });
    const applications = data.applications || [];
    setRouteData((current) => ({ ...current, project, applications, applicant: selectedId ? applications.find((item) => String(item.id) === String(selectedId)) : current.applicant }));
    return applications;
  }, [routeData.applicant?.id, session.token]);
  const startEscrowFunding = async (project) => {
    const headers = { Authorization: `Bearer ${session.token}` };
    const { providers } = await api("/payments/providers", { headers });
    if (!providers?.length) throw new Error("No payment provider is configured yet.");
    const options = Object.fromEntries((providers || []).map((provider) => [provider.id, provider.label]));
    const result = await Swal.fire({
      title: "Fund escrow",
      text: `Choose a payment method for ${formatCurrency(project.budget)}. Development payment is for local testing; real gateways redirect to provider checkout.`,
      input: "select",
      inputOptions: options,
      inputValue: providers?.[0]?.id,
      showCancelButton: true,
      confirmButtonText: "Continue",
      confirmButtonColor: "#0c3b32",
    });
    if (!result.isConfirmed) return null;
    const payment = await api(`/projects/${project.id}/escrow`, { method: "POST", headers, body: JSON.stringify({ provider: result.value }) });
    if (payment.checkoutUrl) {
      const next = await Swal.fire({ title: "Payment session ready", text: "Open checkout to complete escrow funding.", icon: "info", showCancelButton: true, confirmButtonText: "Open checkout", confirmButtonColor: "#0c3b32" });
      if (next.isConfirmed) {
        try {
          window.open(new URL(payment.checkoutUrl, window.location.origin).toString(), "_blank", "noopener,noreferrer");
        } catch {
          Swal.fire({ title: "Invalid checkout link", text: "Payment provider returned an invalid checkout URL. Please try again after refreshing.", icon: "error" });
        }
      }
    } else {
      Swal.fire({ title: payment.message || "Escrow funded", icon: payment.escrow?.status === "funded" ? "success" : "info", confirmButtonColor: "#0c3b32" });
    }
    setRouteData((current) => ({ ...current, project: { ...current.project, escrow_status: payment.escrow?.status || current.project?.escrow_status } }));
    return payment;
  };
  const runApplicantAction = async (application, action) => {
    try {
      await api(`/projects/${routeData.project.id}/applications/${application.id}/${action}`, { method: "PATCH", headers: { Authorization: `Bearer ${session.token}` } });
      const applications = await reloadApplicantRoute(routeData.project, application.id);
      const updated = applications.find((item) => String(item.id) === String(application.id));
      setRouteData((current) => ({ ...current, applicant: updated || application }));
      Swal.fire({ title: action === "hire" ? "Freelancer hired" : "Application shortlisted", icon: "success", confirmButtonColor: "#0c3b32" });
    } catch (error) {
      if (action === "hire" && /fund escrow/i.test(error.message)) {
        const decision = await Swal.fire({ title: "Fund escrow required", text: "You need to fund escrow before hiring this freelancer.", icon: "warning", showCancelButton: true, confirmButtonText: "Fund escrow", confirmButtonColor: "#0c3b32" });
        if (decision.isConfirmed) await startEscrowFunding(routeData.project);
        return;
      }
      Swal.fire({ title: "Applicants", text: error.message, icon: "error" });
    }
  };
  const startApplicantMessage = async (application) => {
    try {
      const data = application.conversation_id
        ? { conversation: { id: application.conversation_id } }
        : await api(`/messages/applications/${application.id}`, { method: "POST", headers: { Authorization: `Bearer ${session.token}` } });
      openTab("messages", { conversationId: data.conversation.id });
    } catch (error) { Swal.fire({ title: "Messages", text: error.message, icon: "error" }); }
  };
  const rateApplicant = async (application) => {
    if (!routeData.project || !application) return;
    const result = await Swal.fire({
      title: `Rate ${application.name}`,
      html: clientRatingForm(),
      width: 560,
      showCancelButton: true,
      confirmButtonText: "Save rating",
      confirmButtonColor: "#0c3b32",
      preConfirm: () => {
        const rating = document.getElementById("client-rating").value;
        const reviewComment = document.getElementById("client-review-comment").value.trim();
        if (!rating) return Swal.showValidationMessage("Select a star rating.");
        return { rating, reviewComment };
      },
    });
    if (!result.isConfirmed) return;
    try {
      await api(`/projects/${routeData.project.id}/review`, { method: "POST", headers: { Authorization: `Bearer ${session.token}` }, body: JSON.stringify(result.value) });
      const applications = await reloadApplicantRoute(routeData.project, application.id);
      const updated = applications.find((item) => String(item.id) === String(application.id));
      setRouteData((current) => ({ ...current, applicant: updated || application }));
      Swal.fire({ title: "Rating saved", icon: "success", confirmButtonColor: "#0c3b32" });
    } catch (error) { Swal.fire({ title: "Rating", text: error.message, icon: "error" }); }
  };

  useEffect(() => {
    openTab(active, routeData, "replace");
    const handlePopState = (event) => {
      const stored = JSON.parse(sessionStorage.getItem(routeStorageKey) || "{}");
      const hashRoute = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      const nextActive = allowedRoutes.includes(event.state?.skillshurokkhaRoute?.active)
        ? event.state.skillshurokkhaRoute.active
        : allowedRoutes.includes(hashRoute)
          ? hashRoute
          : allowedRoutes.includes(stored.active)
            ? stored.active
            : "dashboard";
      const nextRouteData = event.state?.skillshurokkhaRoute?.routeData || stored.routeData || {};
      setActive(nextActive);
      setRouteData(nextRouteData);
      sessionStorage.setItem(routeStorageKey, JSON.stringify({ active: nextActive, routeData: nextRouteData }));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user.role === "admin") return;
    api("/dashboard/me", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((data) => setProfileCompletion(Number(data.stats?.profileCompletion || 0)))
      .catch(() => setProfileCompletion(0));
  }, [session.token, user.role]);
  useEffect(() => {
    api("/notifications", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((data) => setUnreadNotifications(Number(data.unreadCount || 0)))
      .catch(() => setUnreadNotifications(0));
  }, [session.token]);
  useEffect(() => {
    const notificationSocket = io(ASSET_URL, { auth: { token: session.token } });
    notificationSocket.on("notification:new", () => setUnreadNotifications((count) => count + 1));
    return () => notificationSocket.disconnect();
  }, [session.token]);

  if (!nidAccess && user.role !== "admin") {
    return <NidVerificationGate token={session.token} user={user} leave={leaveDashboard} onVerified={() => setNidAccess(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-ink p-5 text-white transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between"><Logo dark lang={lang} /><button className="lg:hidden" onClick={() => setMenu(false)}><FiX /></button></div>
        <div className="mt-11 space-y-1">
          {visibleSidebar.map(([key, Icon]) => (
            <button key={key} onClick={() => { openTab(key); setMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white transition ${active === key ? "bg-emerald-400" : "hover:bg-white/5"}`}>
              <Icon /> {labels[key]}
            </button>
          ))}
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <div className="mb-3 rounded-2xl bg-white/5 p-3">
            <p className="text-[11px] text-white/45">{tx(lang, "প্রোফাইল সম্পন্ন", "PROFILE COMPLETION")}</p>
            <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${profileCompletion}%` }} /></div>
            <p className="mt-2 text-xs font-bold text-emerald-300">{profileCompletion}% complete</p>
          </div>
          <button onClick={leaveDashboard} className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left text-sm font-bold text-white/70 transition hover:bg-rose-600 hover:text-white hover:border-rose-500"><FiLogOut className="shrink-0 text-xl" /> {tx(lang, "লগ আউট", "Log out")}</button>
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
            <button onClick={() => openTab("notifications")} className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"><FiBell />{unreadNotifications > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-forest">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}</button>
            <div className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-bold text-emerald-200">{initials}</div>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.section key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5 sm:p-8">
            {active === "dashboard" && (user.role === "admin" ? <AdminDashboard lang={lang} token={session.token} /> : <DashboardHome t={t} lang={lang} user={user} token={session.token} changeTab={openTab} />)}
            {active === "nidVerification" && user.role === "admin" && <AdminNidVerificationPage token={session.token} />}
            {active === "projects" && <ManagedProjects lang={lang} role={user.role} token={session.token} openApplicants={(project, applications) => openTab("applicants", { project, applications })} />}
            {active === "myWork" && user.role === "freelancer" && <ManagedProjects lang={lang} role={user.role} token={session.token} freelancerWorkspace openApplicants={(project, applications) => openTab("applicants", { project, applications })} />}
            {active === "reviews" && user.role === "client" && <ManagedProjects lang={lang} role={user.role} token={session.token} reviewInbox openApplicants={(project, applications) => openTab("applicants", { project, applications })} />}
            {active === "applicants" && <ApplicantsListPage project={routeData.project} applications={routeData.applications || []} back={() => openTab("projects")} selectApplicant={(applicant) => openTab("applicantDetails", { ...routeData, applicant })} />}
            {active === "applicantDetails" && <ApplicantDetailsPage project={routeData.project} applicant={routeData.applicant} back={() => openTab("applicants", routeData)} runAction={runApplicantAction} openMessage={startApplicantMessage} fundEscrow={startEscrowFunding} rateFreelancer={rateApplicant} />}
            {active === "verify" && user.role === "freelancer" && <SkillVerification lang={lang} token={session.token} alert={alert} changeTab={openTab} />}
            {active === "payments" && <ManagedPayments lang={lang} token={session.token} />}
            {active === "messages" && <InteractiveMessageCenter token={session.token} user={user} initialConversationId={routeData.conversationId} />}
            {active === "notifications" && <NotificationsPage token={session.token} openTab={openTab} onUnreadChange={setUnreadNotifications} />}
            {active === "settings" && (user.role === "admin" ? <EmptyState Icon={FiSettings} title={tx(lang, "অ্যাডমিন সেটিংস", "Admin settings")} text={tx(lang, "অ্যাডমিন অ্যাকাউন্টের সেটিংস পরিচালনা করুন।", "Manage administrator account settings.")} /> : <ProfileManager lang={lang} session={session} />)}
          </motion.section>
        </AnimatePresence>
      </main>
      <button onClick={() => alert(tx(lang, "বাংলা ভয়েস সহায়তা", "Bangla voice assistant"), tx(lang, "বলুন, আমি কীভাবে সাহায্য করতে পারি?", "Tell me, how can I help you?"), "info")} className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-emerald-400 text-xl text-forest shadow-glow transition hover:scale-110"><FiMic /></button>
    </div>
  );
}

function DashboardHome({ t, lang, user, token, changeTab }) {
  const [dashboard, setDashboard] = useState({ stats: null, projects: [], latestVerification: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api("/dashboard/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setDashboard({ stats: data.stats || {}, projects: data.projects || [], latestVerification: data.latestVerification || null });
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const stats = dashboard.stats || {};
  const latestVerification = dashboard.latestVerification;
  const latestStatus = latestVerification ? verificationStatus[latestVerification.status] || [latestVerification.status, "bg-slate-100 text-slate-600"] : null;
  const skillScore = Math.round(Number(stats.skillScore || 0));
  const freelancerMetrics = [
    [FiCreditCard, "Available Balance", formatCurrency(stats.availableBalance), "bg-emerald-100 text-emerald-700"],
    [FiBriefcase, "Active Projects", formatPlainNumber(stats.activeProjects), "bg-sky-100 text-sky-700"],
    [FiStar, "Profile Rating", Number(stats.profileRating || 0).toFixed(1), "bg-amber-100 text-amber-700"],
    [FiShield, "Verified Skills", formatPlainNumber(stats.verifiedSkills), "bg-violet-100 text-violet-700"],
  ];
  const clientMetrics = [
    [FiPlus, "Open Projects", formatPlainNumber(stats.openProjects), "bg-emerald-100 text-emerald-700"],
    [FiBriefcase, "Active Projects", formatPlainNumber(stats.activeProjects), "bg-sky-100 text-sky-700"],
    [FiLock, "In Escrow", formatCurrency(stats.inEscrow), "bg-amber-100 text-amber-700"],
    [FiCheckCircle, "Completed Projects", formatPlainNumber(stats.completedProjects), "bg-violet-100 text-violet-700"],
  ];
  const metrics = user.role === "client" ? clientMetrics : freelancerMetrics;

  if (dashboard) return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, `Welcome, ${user.name}!`, `Welcome, ${user.name}!`)}</h1><p className="font-bangla mt-2 text-slate-500">{user.role === "client" ? "Post projects, manage freelancers and track protected escrow payments." : t.welcomeSub}</p></div>
        {user.role === "freelancer" ? <button onClick={() => changeTab("verify")} className="flex w-max items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"><FiVideo /> Verify a skill</button> : <button onClick={() => changeTab("projects")} className="flex w-max items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"><FiPlus /> Create a project</button>}
      </div>
      {error && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div>}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([Icon, label, value, style]) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow-card"><div className={`grid h-10 w-10 place-items-center rounded-xl ${style}`}><Icon /></div><p className="mt-5 text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-forest">{value}</p></div>
        ))}
      </div>
      {user.role === "client" && <button onClick={() => changeTab("reviews")} className={`mt-7 flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl p-5 text-left shadow-card transition hover:-translate-y-0.5 ${Number(stats.pendingReviews || 0) > 0 ? "bg-forest text-white" : "border border-slate-100 bg-white text-forest"}`}>
        <div className="flex items-center gap-4">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${Number(stats.pendingReviews || 0) > 0 ? "bg-emerald-300 text-forest" : "bg-emerald-100 text-emerald-700"}`}><FiFileText className="text-xl" /></div>
          <div><p className="text-lg font-bold">Submitted work</p><p className={`mt-1 text-sm ${Number(stats.pendingReviews || 0) > 0 ? "text-white/65" : "text-slate-500"}`}>{Number(stats.pendingReviews || 0) > 0 ? `${stats.pendingReviews} project${Number(stats.pendingReviews) === 1 ? "" : "s"} waiting for your review.` : "Freelancer submissions, AI reports and version backups appear here."}</p></div>
        </div>
        <span className={`rounded-full px-4 py-2 text-xs font-bold ${Number(stats.pendingReviews || 0) > 0 ? "bg-white text-forest" : "bg-forest text-white"}`}>Open review inbox <FiArrowRight className="ml-1 inline" /></span>
      </button>}
      {user.role === "freelancer" && latestVerification && <div className="mt-7 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Latest skill verification</p><h2 className="mt-2 text-xl font-bold text-forest">{latestVerification.skill_name}</h2><p className="mt-1 text-xs text-slate-400">Submission #{latestVerification.id} · {new Date(latestVerification.created_at).toLocaleString()}</p></div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${latestStatus[1]}`}>{latestStatus[0]}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{latestVerification.ai_score !== null ? <><strong className="text-2xl text-forest">{Math.round(Number(latestVerification.ai_score))}%</strong> <span className="ml-2">AI preliminary score, not the final verified score.</span></> : "AI analysis is waiting to produce a preliminary score."}</p>
          <button onClick={() => changeTab("verify")} className="rounded-full bg-forest px-4 py-2 text-xs font-bold text-white">View details</button>
        </div>
      </div>}
      {user.role === "freelancer" ? <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_310px]">
        <div>
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bangla text-xl font-bold text-forest">My Projects</h2><button onClick={() => changeTab("myWork")} className="text-xs font-bold text-emerald-700">Open workspace <FiArrowRight className="inline" /></button></div>
          {loading ? <p className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-400 shadow-card">Loading dashboard...</p> : dashboard.projects.length ? <div className="grid gap-4 md:grid-cols-2">{dashboard.projects.map((project) => <ApiProjectCard key={project.id} project={project} lang={lang} />)}</div> : <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-card"><FiBriefcase className="mx-auto text-3xl text-slate-300" /><h3 className="mt-4 font-bold text-forest">No projects yet</h3><p className="mt-2 text-sm text-slate-500">{user.role === "freelancer" ? "You have not applied to or been hired for any project yet." : "You have not created any project yet."}</p></div>}
        </div>
        <div className="rounded-2xl bg-forest p-5 text-white shadow-card">
          <FiShield className="text-3xl text-emerald-300" /><h3 className="font-bangla mt-5 text-xl font-bold">Your skill score</h3><div className="mt-6 flex items-end justify-between"><strong className="text-5xl text-emerald-300">{skillScore}%</strong><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-emerald-200">{stats.verifiedSkills ? "VERIFIED" : "NO BADGE"}</span></div>
          <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(skillScore, 100)}%` }} /></div><p className="font-bangla mt-5 text-xs leading-6 text-white/55">{stats.verifiedSkills ? "Your verified skill score is calculated from backend verification records." : "No verified skill yet. Verify a skill to generate a real score and badge."}</p>
        </div>
      </div> : <div className="mt-7 max-w-xl rounded-2xl bg-forest p-6 text-white shadow-card">
        <FiBriefcase className="text-3xl text-emerald-300" /><h3 className="mt-5 text-xl font-bold">Hire with confidence</h3><p className="mt-3 text-xs leading-6 text-white/60">Create a project, review proposals, fund escrow and hire the right freelancer.</p><button onClick={() => changeTab("projects")} className="mt-5 rounded-full bg-emerald-300 px-4 py-2 text-xs font-bold text-forest">Manage projects</button>
      </div>}
    </>
  );
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
    const result = await Swal.fire({ title: tx(lang, "প্রস্তাব পাঠান", "Send proposal"), html: proposalForm(project), width: 760, padding: "1.75rem", showCancelButton: true, confirmButtonText: "Submit proposal", cancelButtonText: "Cancel", confirmButtonColor: "#0c3b32", preConfirm: readProposalForm });
    if (!result.isConfirmed) return;
    try { await api(`/projects/${project.id}/apply`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: result.value }); Swal.fire({ title: tx(lang, "আবেদন পাঠানো হয়েছে!", "Application sent!"), icon: "success", confirmButtonColor: "#0c3b32" }); } catch (error) { Swal.fire({ title: "Projects", text: error.message, icon: "error" }); }
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

function ManagedProjects({ lang, role, token, openApplicants, reviewInbox = false, freelancerWorkspace = false }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewFilter, setReviewFilter] = useState("needs_review");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewSort, setReviewSort] = useState("urgent");
  const [workFilter, setWorkFilter] = useState("action_required");
  const [workSearch, setWorkSearch] = useState("");
  const [freelancerMarketplaceActive, setFreelancerMarketplaceActive] = useState(null);
  const headers = () => ({ Authorization: `Bearer ${token}` });
  const loadProjects = useCallback(() => {
    const request = role === "client"
      ? api("/projects/mine", { headers: { Authorization: `Bearer ${token}` } })
      : Promise.all([api("/projects"), api("/projects/mine", { headers: { Authorization: `Bearer ${token}` } })]).then(([available, mine]) => {
        const merged = new Map([...(available.projects || []), ...(mine.projects || [])].map((project) => [project.id, project]));
        return { projects: [...merged.values()] };
      });
    return request.then((data) => setProjects(data.projects || [])).catch((error) => Swal.fire({ title: "Projects", text: error.message, icon: "error" })).finally(() => setLoading(false));
  }, [role, token]);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => {
    if (role !== "freelancer") return;
    api("/skills/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setFreelancerMarketplaceActive((data.verifications || []).some((item) => Number(item.ai_score || 0) >= 50 && ["verified", "review_ready"].includes(item.status))))
      .catch(() => setFreelancerMarketplaceActive(false));
  }, [role, token]);
  const runAction = async (path, options, message) => {
    try { await api(path, { ...options, headers: headers() }); await loadProjects(); Swal.fire({ title: message, icon: "success", confirmButtonColor: "#0c3b32" }); }
    catch (error) { Swal.fire({ title: "Projects", text: error.message, icon: "error" }); }
  };
  const createProject = async () => {
    const result = await Swal.fire({
      title: "Create a perfect project brief",
      width: 760,
      html: projectPostForm(),
      showCancelButton: true,
      confirmButtonText: "Post project",
      confirmButtonColor: "#0c3b32",
      didOpen: () => {
        fillProjectPostTemplate();
        document.getElementById("project-type")?.addEventListener("change", () => fillProjectPostTemplate(true));
      },
      preConfirm: readProjectPostForm,
    });
    if (result.isConfirmed) await runAction("/projects", { method: "POST", body: JSON.stringify(result.value) }, "Project created");
  };
  const apply = async (project) => {
    if (role === "freelancer" && freelancerMarketplaceActive === false) {
      return Swal.fire({ title: "Skill verification required", text: "Score 50% or higher in a skill verification video before applying to projects.", icon: "info", confirmButtonText: "Verify skill", confirmButtonColor: "#0c3b32" });
    }
    const result = await Swal.fire({ title: "Send proposal", html: proposalForm(project), width: 760, padding: "1.75rem", showCancelButton: true, confirmButtonText: "Submit proposal", cancelButtonText: "Cancel", confirmButtonColor: "#0c3b32", preConfirm: readProposalForm });
    if (result.isConfirmed) await runAction(`/projects/${project.id}/apply`, { method: "POST", body: result.value }, "Application submitted");
  };
  const fund = async (project) => {
    try {
      const { providers } = await api("/payments/providers", { headers: headers() });
      if (!providers?.length) throw new Error("No payment provider is configured yet.");
      const options = Object.fromEntries((providers || []).map((provider) => [provider.id, provider.label]));
      const result = await Swal.fire({
        title: "Fund escrow",
        text: `Choose a payment method for ${formatCurrency(project.budget)}. Development payment is for local testing; real gateways redirect to provider checkout.`,
        input: "select",
        inputOptions: options,
        inputValue: providers?.[0]?.id,
        showCancelButton: true,
        confirmButtonText: "Continue",
        confirmButtonColor: "#0c3b32",
      });
      if (!result.isConfirmed) return;
      const payment = await api(`/projects/${project.id}/escrow`, { method: "POST", headers: headers(), body: JSON.stringify({ provider: result.value }) });
      await loadProjects();
      if (payment.checkoutUrl) {
        const next = await Swal.fire({ title: "Payment session ready", text: "Open checkout to complete escrow funding.", icon: "info", showCancelButton: true, confirmButtonText: "Open checkout", confirmButtonColor: "#0c3b32" });
        if (next.isConfirmed) {
          try {
            window.open(new URL(payment.checkoutUrl, window.location.origin).toString(), "_blank", "noopener,noreferrer");
          } catch {
            Swal.fire({ title: "Invalid checkout link", text: "Payment provider returned an invalid checkout URL. Please try again after refreshing.", icon: "error" });
          }
        }
      } else {
        Swal.fire({ title: payment.message || "Escrow funded", icon: payment.escrow?.status === "funded" ? "success" : "info", confirmButtonColor: "#0c3b32" });
      }
    } catch (error) { Swal.fire({ title: "Escrow", text: error.message, icon: "error" }); }
  };
  const applicants = async (project) => {
    try {
      const data = await api(`/projects/${project.id}/applications`, { headers: headers() });
      if (!data.applications.length) return Swal.fire({ title: "No applications yet", icon: "info" });
      openApplicants(project, data.applications);
    } catch (error) { Swal.fire({ title: "Applicants", text: error.message, icon: "error" }); }
  };
  const submit = async (project) => {
    const result = await Swal.fire({ title: "Submit project for AI review", html: submissionForm(project), width: 680, padding: "1.75rem", showCancelButton: true, confirmButtonText: "Start requirement review", confirmButtonColor: "#0c3b32", preConfirm: readSubmissionForm });
    if (result.isConfirmed) await runAction(`/projects/${project.id}/submissions`, { method: "POST", body: result.value }, "Automated requirement review started");
  };
  const report = async (project) => {
    try {
      const data = await api(`/projects/${project.id}/submissions`, { headers: headers() });
      const submissions = data.submissions || [];
      if (!submissions.length) return Swal.fire({ title: "No submission report yet", text: "Submit the project first to start automated requirement review.", icon: "info" });
      let submission = submissions[0];
      if (submissions.length > 1) {
        const choice = await Swal.fire({ title: "Choose submission version", input: "select", inputOptions: Object.fromEntries(submissions.map((item) => [item.id, `Version ${item.version_number} · ${item.evaluation_score ?? "pending"}% · ${item.status.replace(/_/g, " ")}`])), showCancelButton: true, confirmButtonColor: "#0c3b32" });
        if (!choice.isConfirmed) return;
        submission = submissions.find((item) => Number(item.id) === Number(choice.value));
      }
      const retry = ["analysis_failed", "ai_revision_required"].includes(submission.status);
      const result = await Swal.fire({ title: "AI requirement report", html: evaluationReportHtml(submission), width: 820, showCancelButton: retry, cancelButtonText: "Close", showConfirmButton: retry, confirmButtonText: "Retry analysis", confirmButtonColor: "#0c3b32" });
      if (retry && result.isConfirmed) await runAction(`/projects/${project.id}/submissions/${submission.id}/retry-analysis`, { method: "POST" }, "Automated review restarted");
    } catch (error) { Swal.fire({ title: "Submission report", text: error.message, icon: "error" }); }
  };
  const downloadSubmission = async (project, submission) => {
    const response = await fetch(`${API_URL}/projects/${project.id}/submissions/${submission.id}/download`, { headers: headers() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Project download failed.");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plainName = disposition.match(/filename="?([^"]+)"?/i)?.[1];
    const filename = encodedName ? decodeURIComponent(encodedName) : plainName || `${project.title}-v${submission.version_number}-delivery.zip`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  const download = async (project) => {
    try {
      const data = await api(`/projects/${project.id}/submissions`, { headers: headers() });
      const versions = (data.submissions || []).filter((item) => item.has_archive);
      if (!versions.length) throw new Error("No downloadable project ZIP is available.");
      let submission = versions[0];
      if (versions.length > 1) {
        const choice = await Swal.fire({ title: "Download immutable backup", text: "Every submitted version is preserved.", input: "select", inputOptions: Object.fromEntries(versions.map((item) => [item.id, `Version ${item.version_number} · ${item.evaluation_score ?? "pending"}% · ${new Date(item.created_at).toLocaleString()}`])), showCancelButton: true, confirmButtonText: "Download", confirmButtonColor: "#0c3b32" });
        if (!choice.isConfirmed) return;
        submission = versions.find((item) => Number(item.id) === Number(choice.value));
      }
      await downloadSubmission(project, submission);
    } catch (error) { Swal.fire({ title: "Protected delivery", text: error.message, icon: "error" }); }
  };
  const delivery = async (project) => {
    try {
      const data = await api(`/projects/${project.id}/submissions`, { headers: headers() });
      const submissions = data.submissions || [];
      const submission = submissions.find((item) => item.repository_url || item.live_url) || submissions[0];
      if (!submission) return Swal.fire({ title: "Delivery links", text: "No submitted work is available yet.", icon: "info" });
      await Swal.fire({ title: "Delivery links", html: deliveryLinksHtml(submission), width: 640, confirmButtonText: "Close", confirmButtonColor: "#0c3b32" });
    } catch (error) { Swal.fire({ title: "Delivery links", text: error.message, icon: "error" }); }
  };
  const review = async (project) => {
    try {
      const data = await api(`/projects/${project.id}/submissions`, { headers: headers() });
      const submission = data.submissions.find(canClientReviewSubmission);
      if (!submission) return Swal.fire({ title: "No submitted work found", icon: "info" });
      const decision = await Swal.fire({ title: `Review submitted work · ${Number(submission.evaluation_score || 0)}% match`, html: evaluationReportHtml(submission), width: 820, input: "select", inputOptions: { approve: "Approve and release payment", revision: "Request revision" }, showCancelButton: true, confirmButtonColor: "#0c3b32" });
      if (!decision.isConfirmed) return;
      let feedback = "";
      let clientReview = {};
      if (decision.value === "revision") {
        const requirements = projectRequirements(project);
        const result = await Swal.fire({
          title: "Requirement-specific revision",
          width: 680,
          html: `<div style="text-align:left"><p style="font-size:12px;color:#64748b">A revision cannot add new scope. Select original requirements and provide evidence.</p><div id="revision-requirements" style="max-height:180px;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;padding:10px">${requirements.map((item) => `<label style="display:flex;gap:8px;align-items:flex-start;padding:7px;font-size:12px;color:#334155"><input type="checkbox" value="${item.id}" style="margin-top:2px"><span>${escapeHtml(item.title)}</span></label>`).join("")}</div><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Problem<textarea id="revision-issue" rows="3" style="${fieldStyle}" placeholder="What does not satisfy the selected requirement?"></textarea></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Expected result<textarea id="revision-expected" rows="3" style="${fieldStyle}" placeholder="What exact result is required?"></textarea></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Evidence<textarea id="revision-evidence" rows="3" style="${fieldStyle}" placeholder="Test case, screenshot description, URL or reproducible steps"></textarea></label></div>`,
          showCancelButton: true,
          confirmButtonColor: "#0c3b32",
          preConfirm: () => {
            const requirementIds = [...document.querySelectorAll("#revision-requirements input:checked")].map((item) => Number(item.value));
            const issue = document.getElementById("revision-issue").value.trim();
            const expectedResult = document.getElementById("revision-expected").value.trim();
            const evidence = document.getElementById("revision-evidence").value.trim();
            if (!requirementIds.length || !issue || !expectedResult || !evidence) return Swal.showValidationMessage("Select requirements and complete all revision evidence fields.");
            return { requirementIds, issue, expectedResult, evidence };
          },
        });
        if (!result.isConfirmed) return;
        feedback = result.value;
      }
      if (decision.value === "approve") {
        const ratingResult = await Swal.fire({
          title: "Rate this freelancer",
          html: clientRatingForm(),
          width: 560,
          showCancelButton: true,
          confirmButtonText: "Approve & submit rating",
          cancelButtonText: "Approve without rating",
          confirmButtonColor: "#0c3b32",
          preConfirm: () => ({
            rating: document.getElementById("client-rating").value,
            reviewComment: document.getElementById("client-review-comment").value.trim(),
          }),
        });
        if (ratingResult.isConfirmed) clientReview = ratingResult.value;
      }
      await runAction(`/projects/${project.id}/submissions/${submission.id}/${decision.value}`, { method: "PATCH", body: JSON.stringify(decision.value === "revision" ? feedback : clientReview) }, decision.value === "approve" ? "Work approved and remaining payment released" : "Revision requested; the current version remains backed up");
    } catch (error) { Swal.fire({ title: "Submissions", text: error.message, icon: "error" }); }
  };
  const extend = async (project) => {
    const result = await Swal.fire({ title: "Extend deadline", html: `<input id="deadline" type="date" class="swal2-input"><textarea id="reason" class="swal2-textarea" placeholder="Reason for extension"></textarea>`, showCancelButton: true, confirmButtonColor: "#0c3b32", preConfirm: () => ({ deadline: document.getElementById("deadline").value, reason: document.getElementById("reason").value }) });
    if (result.isConfirmed) await runAction(`/projects/${project.id}/deadline`, { method: "PATCH", body: JSON.stringify(result.value) }, "Deadline extended");
  };
  const explain = (project) => runAction(`/projects/${project.id}/explanation`, { method: "POST", body: "{}" }, "Explanation requested");
  const refund = async (project) => {
    const result = await Swal.fire({ title: "Cancel and refund escrow?", text: "Automatic refund works only when no work has been submitted.", icon: "warning", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (result.isConfirmed) await runAction(`/projects/${project.id}/cancel-refund`, { method: "PATCH" }, "Project cancelled and escrow refunded");
  };
  const dispute = async (project) => {
    const result = await Swal.fire({ title: "Open dispute", input: "textarea", inputPlaceholder: "Describe the issue", showCancelButton: true, confirmButtonColor: "#0c3b32", inputValidator: (value) => !value.trim() ? "Provide a reason." : undefined });
    if (result.isConfirmed) await runAction(`/projects/${project.id}/disputes`, { method: "POST", body: JSON.stringify({ reason: result.value }) }, "Dispute opened for admin review");
  };
  const actions = { apply, fund, applicants, submit, report, download, delivery, review, extend, explain, refund, dispute };
  const submittedProjects = projects.filter((project) => project.latest_submission_id);
  const reviewCounts = {
    all: submittedProjects.length,
    needs_review: submittedProjects.filter(canClientReviewProject).length,
    waiting_revision: submittedProjects.filter((project) => project.status === "revision_required").length,
    completed: submittedProjects.filter((project) => project.status === "completed").length,
  };
  const displayedProjects = submittedProjects
    .filter((project) => reviewFilter === "all"
      || (reviewFilter === "needs_review" && canClientReviewProject(project))
      || (reviewFilter === "waiting_revision" && project.status === "revision_required")
      || (reviewFilter === "completed" && project.status === "completed"))
    .filter((project) => `${project.title} ${project.latest_freelancer_name || ""}`.toLowerCase().includes(reviewSearch.trim().toLowerCase()))
    .sort((left, right) => {
      if (reviewSort === "score_high") return Number(right.latest_evaluation_score || 0) - Number(left.latest_evaluation_score || 0);
      if (reviewSort === "newest") return Number(right.latest_submission_id || 0) - Number(left.latest_submission_id || 0);
      const leftDeadline = left.latest_review_deadline ? new Date(left.latest_review_deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDeadline = right.latest_review_deadline ? new Date(right.latest_review_deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDeadline - rightDeadline;
    });

  if (reviewInbox) return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-600">Client review queue</p><h1 className="mt-2 text-3xl font-bold text-forest">Submitted Work</h1><p className="mt-2 text-slate-500">Review multiple freelancers and projects without losing version history.</p></div>
      <div className="rounded-2xl bg-forest px-5 py-3 text-white"><p className="text-[11px] font-bold uppercase text-white/55">Needs your decision</p><p className="mt-1 text-2xl font-black text-emerald-300">{reviewCounts.needs_review}</p></div>
    </div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["needs_review", "Needs review", FiEye, "bg-amber-100 text-amber-700"], ["waiting_revision", "Waiting revision", FiClock, "bg-sky-100 text-sky-700"], ["completed", "Completed", FiCheckCircle, "bg-emerald-100 text-emerald-700"], ["all", "All submissions", FiFileText, "bg-violet-100 text-violet-700"]].map(([key, label, Icon, style]) => <button key={key} onClick={() => setReviewFilter(key)} className={`rounded-2xl border p-4 text-left shadow-sm transition ${reviewFilter === key ? "border-emerald-300 bg-white ring-2 ring-emerald-100" : "border-slate-100 bg-white hover:border-emerald-200"}`}><div className={`grid h-9 w-9 place-items-center rounded-xl ${style}`}><Icon /></div><p className="mt-3 text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-forest">{reviewCounts[key]}</p></button>)}
    </div>
    <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-card sm:flex-row">
      <label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-slate-400"><FiSearch /><input value={reviewSearch} onChange={(event) => setReviewSearch(event.target.value)} placeholder="Search project or freelancer..." className="w-full bg-transparent text-sm text-forest outline-none" /></label>
      <select value={reviewSort} onChange={(event) => setReviewSort(event.target.value)} className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-forest outline-none">
        <option value="urgent">Review deadline</option>
        <option value="newest">Newest submission</option>
        <option value="score_high">Highest AI score</option>
      </select>
    </div>
    {loading ? <p className="mt-8 text-slate-500">Loading submissions...</p> : displayedProjects.length ? <div className="mt-5 space-y-4">{displayedProjects.map((project) => <ReviewQueueCard key={project.id} project={project} actions={actions} />)}</div> : <EmptyState Icon={FiFileText} title={submittedProjects.length ? "No matching submissions" : "No submitted work yet"} text={submittedProjects.length ? "Change the filter or search term to see other submissions." : "When a freelancer submits a version, its AI report and review actions will appear here automatically."} />}
  </div>;

  if (freelancerWorkspace) {
    const hiredProjects = projects.filter((project) => project.application_status === "hired");
    const workCounts = {
      action_required: hiredProjects.filter((project) => ["revision_required", "overdue"].includes(project.status)).length,
      in_progress: hiredProjects.filter((project) => project.status === "in_progress").length,
      under_review: hiredProjects.filter((project) => project.status === "submitted").length,
      completed: hiredProjects.filter((project) => project.status === "completed").length,
      all: hiredProjects.length,
    };
    const workProjects = hiredProjects
      .filter((project) => workFilter === "all"
        || (workFilter === "action_required" && ["revision_required", "overdue"].includes(project.status))
        || (workFilter === "in_progress" && project.status === "in_progress")
        || (workFilter === "under_review" && project.status === "submitted")
        || (workFilter === "completed" && project.status === "completed"))
      .filter((project) => `${project.title} ${project.client_name || ""}`.toLowerCase().includes(workSearch.trim().toLowerCase()))
      .sort((left, right) => new Date(left.deadline).getTime() - new Date(right.deadline).getTime());
    return <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-600">Freelancer workspace</p><h1 className="mt-2 text-3xl font-bold text-forest">My Work</h1><p className="mt-2 text-slate-500">Submit deliverables, respond to revisions, track AI scores and keep every version backed up.</p></div>
        <div className="rounded-2xl bg-forest px-5 py-3 text-white"><p className="text-[11px] font-bold uppercase text-white/55">Action required</p><p className="mt-1 text-2xl font-black text-emerald-300">{workCounts.action_required}</p></div>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[["action_required", "Action required", FiZap, "bg-red-100 text-red-700"], ["in_progress", "In progress", FiBriefcase, "bg-sky-100 text-sky-700"], ["under_review", "Under review", FiClock, "bg-amber-100 text-amber-700"], ["completed", "Completed", FiCheckCircle, "bg-emerald-100 text-emerald-700"], ["all", "All hired work", FiFileText, "bg-violet-100 text-violet-700"]].map(([key, label, Icon, style]) => <button key={key} onClick={() => setWorkFilter(key)} className={`rounded-2xl border p-4 text-left shadow-sm transition ${workFilter === key ? "border-emerald-300 bg-white ring-2 ring-emerald-100" : "border-slate-100 bg-white hover:border-emerald-200"}`}><div className={`grid h-9 w-9 place-items-center rounded-xl ${style}`}><Icon /></div><p className="mt-3 text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-forest">{workCounts[key]}</p></button>)}
      </div>
      <label className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white px-4 py-3 text-slate-400 shadow-card"><FiSearch /><input value={workSearch} onChange={(event) => setWorkSearch(event.target.value)} placeholder="Search project or client..." className="w-full bg-transparent text-sm text-forest outline-none" /></label>
      {loading ? <p className="mt-8 text-slate-500">Loading your work...</p> : workProjects.length ? <div className="mt-5 space-y-4">{workProjects.map((project) => <FreelancerWorkCard key={project.id} project={project} actions={actions} />)}</div> : <EmptyState Icon={FiUploadCloud} title={hiredProjects.length ? "No work in this section" : "No hired projects yet"} text={hiredProjects.length ? "Choose another status tab or search term." : "After a client hires you, the project will appear here with submission and payment tracking."} />}
    </div>;
  }

  return <div><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "আপনার প্রজেক্টসমূহ", role === "client" ? "Your projects" : "Find projects")}</h1><p className="mt-2 text-slate-500">Manage applications, deadlines, submissions and escrow protection.</p></div>{role === "client" && <button onClick={createProject} className="flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-bold text-white"><FiPlus /> Create project</button>}</div>{loading ? <p className="mt-8 text-slate-500">Loading projects...</p> : projects.length ? <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <ManagedProjectCard key={project.id} project={project} role={role} actions={actions} />)}</div> : <EmptyState Icon={FiBriefcase} title="No projects yet" text="New projects and your active work will appear here." />}</div>;
}

function FreelancerWorkCard({ project, actions }) {
  const score = project.latest_evaluation_score == null ? null : Number(project.latest_evaluation_score);
  const deadline = new Date(project.deadline);
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  const status = project.status === "revision_required" ? ["Revision required", "bg-red-100 text-red-700"] : project.status === "submitted" ? ["Client review", "bg-amber-100 text-amber-700"] : project.status === "completed" ? ["Completed", "bg-emerald-100 text-emerald-700"] : project.status === "overdue" ? ["Overdue", "bg-red-100 text-red-700"] : ["In progress", "bg-sky-100 text-sky-700"];
  const paymentText = project.status === "completed" ? "Full escrow released" : score !== null && score > 70 ? "90% release eligible / processing" : score !== null && score > 50 ? "Passed to client review" : "Awaiting qualifying submission";
  return <article className={`rounded-[24px] border bg-white p-5 shadow-card ${["revision_required", "overdue"].includes(project.status) ? "border-red-200" : "border-slate-100"}`}>
    <div className="grid gap-5 xl:grid-cols-[1fr_170px_250px] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[11px] font-black ${status[1]}`}>{status[0]}</span><span className="text-xs font-bold text-slate-400">Project #{project.id}{project.latest_submission_version ? ` · Version ${project.latest_submission_version}` : ""}</span></div>
        <h2 className="mt-3 truncate text-xl font-black text-forest">{project.title}</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <span><strong className="text-slate-700">Client:</strong> {project.client_name || "Client"}</span>
          <span><strong className="text-slate-700">Budget:</strong> {formatCurrency(project.budget)}</span>
          <span><strong className="text-slate-700">Backups:</strong> {Number(project.submission_count || 0)} versions</span>
        </div>
        <p className={`mt-3 text-xs font-bold ${daysLeft < 0 ? "text-red-600" : daysLeft <= 2 ? "text-amber-700" : "text-slate-400"}`}>{daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`} · Deadline {deadline.toLocaleDateString()}</p>
        <p className="mt-2 text-xs font-semibold text-emerald-700">{paymentText}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latest AI match</p>
        <p className={`mt-2 text-3xl font-black ${score !== null && score > 50 ? "text-emerald-700" : "text-amber-700"}`}>{score === null ? "Not scored" : `${score}%`}</p>
        <p className="mt-1 text-[10px] text-slate-400">{score !== null && score > 70 ? "Payment threshold passed" : score !== null && score > 50 ? "Client threshold passed" : "Improve and resubmit"}</p>
      </div>
      <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
        {["in_progress", "overdue", "revision_required"].includes(project.status) && <button onClick={() => actions.submit(project)} className="rounded-full bg-forest px-4 py-2.5 text-xs font-black text-white">{project.status === "revision_required" ? "Submit revision" : "Submit work"}</button>}
        {project.latest_submission_id && <button onClick={() => actions.report(project)} className="rounded-full bg-violet-100 px-4 py-2.5 text-xs font-black text-violet-700">AI report</button>}
        {project.latest_submission_id && <button onClick={() => actions.download(project)} className="rounded-full bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700">My backups</button>}
        {["in_progress", "overdue", "submitted", "revision_required"].includes(project.status) && <button onClick={() => actions.dispute(project)} className="rounded-full border border-red-200 px-4 py-2.5 text-xs font-black text-red-600">Dispute</button>}
      </div>
    </div>
  </article>;
}

function ReviewQueueCard({ project, actions }) {
  const score = project.latest_evaluation_score == null ? null : Number(project.latest_evaluation_score);
  const canReview = canClientReviewProject(project);
  const deadline = project.latest_review_deadline ? new Date(project.latest_review_deadline) : null;
  const hoursLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 3600000) : null;
  const urgent = canReview && hoursLeft !== null && hoursLeft <= 48;
  const status = canReview ? ["Needs review", "bg-amber-100 text-amber-700"] : project.status === "revision_required" ? ["Waiting for revision", "bg-sky-100 text-sky-700"] : project.status === "completed" ? ["Completed", "bg-emerald-100 text-emerald-700"] : [project.status.replace(/_/g, " "), "bg-slate-100 text-slate-600"];
  return <article className={`rounded-[24px] border bg-white p-5 shadow-card ${urgent ? "border-amber-200" : "border-slate-100"}`}>
    <div className="grid gap-5 xl:grid-cols-[1fr_150px_220px] xl:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[11px] font-black ${status[1]}`}>{status[0]}</span><span className="text-xs font-bold text-slate-400">Project #{project.id} · Submission v{project.latest_submission_version}</span></div>
        <h2 className="mt-3 truncate text-xl font-black text-forest">{project.title}</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <span><strong className="text-slate-700">Freelancer:</strong> {project.latest_freelancer_name || "Assigned freelancer"}</span>
          <span><strong className="text-slate-700">Backups:</strong> {Number(project.submission_count || 1)} versions</span>
          <span><strong className="text-slate-700">Budget:</strong> {formatCurrency(project.budget)}</span>
        </div>
        {deadline && canReview && <p className={`mt-3 text-xs font-bold ${urgent ? "text-amber-700" : "text-slate-400"}`}>{hoursLeft <= 0 ? "Review deadline reached" : `${hoursLeft} hours left to review`} · {deadline.toLocaleString()}</p>}
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">AI match</p>
        <p className={`mt-2 text-3xl font-black ${score !== null && score > 50 ? "text-emerald-700" : "text-amber-700"}`}>{score === null ? "..." : `${score}%`}</p>
        <p className="mt-1 text-[10px] text-slate-400">{score !== null && score > 50 ? "Passed to client" : "Analysis status"}</p>
      </div>
      <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
        {canReview && <button onClick={() => actions.review(project)} className="rounded-full bg-forest px-4 py-2.5 text-xs font-black text-white">Review & decide</button>}
        <button onClick={() => actions.report(project)} className="rounded-full bg-violet-100 px-4 py-2.5 text-xs font-black text-violet-700">AI report</button>
        {project.status === "completed" && <button onClick={() => actions.delivery(project)} className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-4 py-2.5 text-xs font-black text-sky-700"><FiExternalLink /> Delivery links</button>}
        {project.status === "completed" && <button onClick={() => actions.download(project)} className="rounded-full bg-emerald-100 px-4 py-2.5 text-xs font-black text-emerald-700">Download versions</button>}
      </div>
    </div>
  </article>;
}

const applicantStatusStyle = {
  pending: "bg-indigo-50 text-indigo-700",
  shortlisted: "bg-emerald-100 text-emerald-700",
  hired: "bg-forest text-white",
  rejected: "bg-red-100 text-red-700",
};

function applicantSkills(applicant) {
  try { return typeof applicant.skills === "string" ? JSON.parse(applicant.skills || "[]") : applicant.skills || []; }
  catch { return []; }
}

function applicantAvatar(applicant, size = "h-14 w-14") {
  const avatarUrl = applicant.avatar_url?.startsWith("/uploads/") ? `${ASSET_URL}${applicant.avatar_url}` : applicant.avatar_url;
  const initials = String(applicant.name || "NA").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className={`${size} grid flex-none place-items-center overflow-hidden rounded-2xl bg-forest text-sm font-black text-emerald-200`}>{avatarUrl ? <Image src={avatarUrl} alt="" width={80} height={80} unoptimized className="h-full w-full object-cover" /> : initials}</div>;
}

function parseProfileLine(line) {
  const [title, url, description] = String(line || "").split("|").map((item) => item.trim());
  return { title, url, description };
}

function marketplaceStats(profile = {}, skills = []) {
  const score = Number(profile.verified_skill_score || profile.skillScore || 0);
  const profileRating = Number(profile.profile_rating || profile.profileRating || 0);
  const reviewCount = Number(profile.review_count || profile.reviewCount || 0);
  const rating = profileRating ? profileRating.toFixed(1) : "New";
  const success = score ? `${Math.min(100, Math.max(78, Math.round(score)))}%` : "Ready";
  const projects = Math.max(1, textToList(profile.portfolioText || profile.portfolio || "").length || Math.ceil(skills.length / 2));
  return { rating, success, projects, reviewCount };
}

function ApplicantsListPage({ project, applications, back, selectApplicant }) {
  if (!project) return <EmptyState Icon={FiBriefcase} title="Project not found" text="Go back to tasks and open applicants again." />;
  return <div>
    <button onClick={back} className="mb-5 text-sm font-bold text-emerald-700">Back to tasks</button>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-600">Applicants list</p><h1 className="mt-2 text-3xl font-bold text-forest">{project.title}</h1><p className="mt-2 text-sm text-slate-500">{applications.length} proposal{applications.length === 1 ? "" : "s"} received. Click a card to review full details.</p></div>
      <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-card">{project.status}</span>
    </div>
    <div className="mt-7 grid gap-4 xl:grid-cols-2">
      {applications.map((applicant) => {
        const skills = applicantSkills(applicant);
        const status = applicant.status || "pending";
        const stats = marketplaceStats(applicant, skills);
        return <button key={applicant.id} onClick={() => selectApplicant(applicant)} className="rounded-[22px] border border-slate-100 bg-white p-5 text-left shadow-card transition hover:-translate-y-1 hover:border-emerald-200">
          <div className="flex items-start gap-4">
            {applicantAvatar(applicant)}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="truncate text-lg font-black text-forest">{applicant.name}</h2><p className="mt-1 text-sm text-slate-500">{applicant.headline || "Freelancer"}</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${applicantStatusStyle[status] || applicantStatusStyle.pending}`}>{status}</span></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <Metric label="Bid" value={formatCurrency(applicant.proposed_budget)} />
                <Metric label="Delivery" value={applicant.estimated_delivery_date ? new Date(applicant.estimated_delivery_date).toLocaleDateString() : "Not provided"} />
                <Metric label="Rating" value={stats.rating} />
                <Metric label="Skill score" value={applicant.verified_skill_score ?? "No score"} />
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{applicant.cover_letter || applicant.bio || "Attached document only."}</p>
              <div className="mt-4 flex flex-wrap gap-2">{skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{skill}</span>)}</div>
            </div>
          </div>
        </button>;
      })}
    </div>
  </div>;
}

function Metric({ label, value }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] font-black text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-forest">{value}</p></div>;
}

function ApplicantDetailsPage({ project, applicant, back, runAction, openMessage, fundEscrow, rateFreelancer }) {
  const [verifiedBadges, setVerifiedBadges] = useState([]);
  useEffect(() => {
    if (!applicant?.freelancer_id) {
      setVerifiedBadges([]);
      return;
    }
    api(`/skills/badges/${applicant.freelancer_id}`)
      .then((data) => setVerifiedBadges(data.badges || []))
      .catch(() => setVerifiedBadges([]));
  }, [applicant?.freelancer_id]);
  if (!project || !applicant) return <EmptyState Icon={FiBriefcase} title="Applicant not found" text="Go back to applicants list and choose a freelancer." />;
  const status = applicant.status || "pending";
  const skills = applicantSkills(applicant);
  const attachmentUrl = applicant.attachment_url?.startsWith("/uploads/") ? `${ASSET_URL}${applicant.attachment_url}` : applicant.attachment_url;
  const canShortlist = status === "pending";
  const canHire = ["pending", "shortlisted"].includes(status);
  const canMessage = ["pending", "shortlisted", "hired"].includes(status);
  const escrowFunded = project.escrow_status === "funded";
  const stats = marketplaceStats(applicant, skills);
  const location = [applicant.city, applicant.country].filter(Boolean).join(", ") || "Remote";
  const skillScore = applicant.verified_skill_score ? `${applicant.verified_skill_score}%` : "Not verified";
  const packageBase = Number(applicant.proposed_budget || project.budget || 0);
  const packages = [
    ["Starter", "Scope check and quick fixes", Math.max(1, Math.round(packageBase * 0.35)), "2-3 days"],
    ["Standard", "Complete project delivery", packageBase, applicant.estimated_delivery_date ? new Date(applicant.estimated_delivery_date).toLocaleDateString() : "On schedule"],
    ["Premium", "Delivery plus polish and support", Math.round(packageBase * 1.35), "Priority"],
  ];
  return <ApplicantMarketplaceProfile project={project} applicant={applicant} back={back} runAction={runAction} openMessage={openMessage} fundEscrow={fundEscrow} rateFreelancer={rateFreelancer} status={status} skills={skills} verifiedBadges={verifiedBadges} attachmentUrl={attachmentUrl} canShortlist={canShortlist} canHire={canHire} canMessage={canMessage} escrowFunded={escrowFunded} stats={stats} location={location} skillScore={skillScore} packages={packages} />;
}
function ApplicantMarketplaceProfile({ project, applicant, back, runAction, openMessage, fundEscrow, rateFreelancer, status, skills, verifiedBadges = [], attachmentUrl, canShortlist, canHire, canMessage, escrowFunded, stats, location, skillScore, packages }) {
  const verifiedSkillLookup = badgesBySkill(verifiedBadges);
  return <div>
    <button onClick={back} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><FiArrowRight className="rotate-180" /> Back to applicants</button>
    <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
      <main className="overflow-hidden rounded-[26px] bg-white shadow-card">
        <section className="bg-[linear-gradient(135deg,#082f2a,#0f766e_48%,#f8fafc_48%)] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-5">
              <div className="rounded-[24px] bg-white/10 p-1 ring-1 ring-white/20">{applicantAvatar(applicant, "h-24 w-24 rounded-[20px]")}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${applicantStatusStyle[status] || applicantStatusStyle.pending}`}>{status}</span><span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-black text-emerald-100"><FiCheckCircle className="mr-1 inline" /> Identity checked</span></div>
                <h1 className="mt-4 text-3xl font-black leading-tight">{applicant.name}</h1>
                <p className="mt-2 max-w-2xl text-base font-semibold text-emerald-50">{applicant.headline || "Independent freelancer ready for this project"}</p>
                <p className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-white/70"><span><FiMapPin className="mr-1 inline" />{location}</span><span><FiClock className="mr-1 inline" />{applicant.availability || "Available for new work"}</span></p>
              </div>
            </div>
            <div className="grid min-w-[220px] grid-cols-3 gap-2 rounded-2xl bg-white/95 p-3 text-center text-forest shadow-lg">
              <div><p className="text-lg font-black"><FiStar className="mr-1 inline text-amber-500" />{stats.rating}</p><p className="text-[10px] font-black uppercase text-slate-400">{stats.reviewCount ? `${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"}` : "Rating"}</p></div>
              <div><p className="text-lg font-black">{stats.success}</p><p className="text-[10px] font-black uppercase text-slate-400">Success</p></div>
              <div><p className="text-lg font-black">{skillScore}</p><p className="text-[10px] font-black uppercase text-slate-400">Skill</p></div>
            </div>
          </div>
        </section>
        <section className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Fixed bid" value={formatCurrency(applicant.proposed_budget)} />
              <Metric label="Hourly rate" value={applicant.hourly_rate ? formatCurrency(applicant.hourly_rate) : "Not set"} />
              <Metric label="Delivery" value={applicant.estimated_delivery_date ? new Date(applicant.estimated_delivery_date).toLocaleDateString() : "Not provided"} />
            </div>
            <section className="mt-7 border-t border-slate-100 pt-6"><h2 className="text-xl font-black text-forest">About this freelancer</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{applicant.bio || "This freelancer has not added a full profile bio yet, but their proposal below explains their fit for this project."}</p></section>
            <section className="mt-7 border-t border-slate-100 pt-6"><h2 className="text-xl font-black text-forest">Proposal for this project</h2><p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">{applicant.cover_letter || "Attached document only."}</p>{attachmentUrl && /^https?:\/\//i.test(attachmentUrl) && <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-700"><FiExternalLink /> Open attached proposal</a>}</section>
            <section className="mt-7 border-t border-slate-100 pt-6"><h2 className="text-xl font-black text-forest">Skills and expertise</h2><div className="mt-4 flex flex-wrap gap-2">{skills.length ? skills.map((skill) => <SkillChip key={skill} skill={skill} badge={verifiedSkillLookup[normalizeSkillName(skill)]} className="text-xs" />) : <span className="text-sm text-slate-400">No skills listed</span>}</div></section>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><h2 className="font-black text-forest">Profile highlights</h2><div className="mt-4 space-y-3 text-sm text-slate-600"><p><FiAward className="mr-2 inline text-emerald-600" />AI verified skill score: <strong className="text-forest">{skillScore}</strong></p><p><FiBriefcase className="mr-2 inline text-emerald-600" />{stats.projects}+ portfolio-ready project{stats.projects === 1 ? "" : "s"}</p><p><FiGlobe className="mr-2 inline text-emerald-600" />Marketplace profile optimized</p></div></div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5"><h2 className="font-black text-forest">Service packages</h2><div className="mt-4 space-y-3">{packages.map(([name, text, price, delivery]) => <div key={name} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-forest">{name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div><strong className="text-sm text-emerald-700">{formatCurrency(price)}</strong></div><p className="mt-3 text-[11px] font-black uppercase text-slate-400">{delivery}</p></div>)}</div></div>
          </aside>
        </section>
      </main>
      <aside className="h-max rounded-[24px] border border-slate-100 bg-white p-5 shadow-card xl:sticky xl:top-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-400">Project</p><h2 className="mt-1 text-lg font-black text-forest">{project.title}</h2></div><FiBookmark className="text-xl text-emerald-600" /></div>
        <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Message first, clarify the scope, then hire when you are confident.</div>
        <div className="mt-5 grid gap-2">{!escrowFunded && <button onClick={() => fundEscrow(project)} className="rounded-full bg-amber-100 px-4 py-3 text-sm font-black text-amber-700">Fund escrow</button>}<button disabled={!canHire} onClick={() => runAction(applicant, "hire")} className="rounded-full bg-forest px-4 py-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-400">Hire freelancer</button><button disabled={!canMessage} onClick={() => openMessage(applicant)} className="flex items-center justify-center gap-2 rounded-full bg-sky-100 px-4 py-3 text-sm font-black text-sky-700 disabled:bg-slate-100 disabled:text-slate-400"><FiMessageCircle /> Message</button><button disabled={!canShortlist} onClick={() => runAction(applicant, "shortlist")} className="rounded-full border border-emerald-200 px-4 py-3 text-sm font-black text-emerald-700 disabled:border-slate-100 disabled:text-slate-400">Shortlist</button>{project.status === "completed" && status === "hired" ? <button onClick={() => rateFreelancer?.(applicant)} className="flex items-center justify-center gap-2 rounded-full bg-amber-100 px-4 py-3 text-sm font-black text-amber-700"><FiStar /> {applicant.profile_rating ? "Update rating" : "Rate freelancer"}</button> : <div className="rounded-2xl bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-500"><FiStar className="mr-1 inline text-amber-500" /> Rating opens after the project is completed.</div>}</div>
        <div className="mt-5 border-t border-slate-100 pt-5"><Metric label="Client budget" value={formatCurrency(project.budget)} /></div>
      </aside>
    </div>
  </div>;
}

function ManagedProjectCard({ project, role, actions }) {
  const skills = typeof project.skills === "string" ? JSON.parse(project.skills) : project.skills || [];
  const overdue = project.status === "overdue";
  const controls = [];
  const button = (label, action, style = "bg-forest text-white") => controls.push(<button key={label} onClick={() => action(project)} className={`rounded-full px-3 py-2 text-xs font-bold ${style}`}>{label}</button>);
  if (role === "freelancer" && project.status === "open" && !project.application_status) button("Apply now", actions.apply);
  if (role === "freelancer" && project.status === "open" && project.application_status) controls.push(<span key="applied" className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold capitalize text-emerald-700">{project.application_status === "pending" ? "Applied" : project.application_status}</span>);
  if (role === "client" && project.status === "open" && !project.escrow_status) button("Fund escrow", actions.fund, "bg-emerald-100 text-emerald-700");
  if (role === "client" && project.status === "open") button("Applicants", actions.applicants);
  if (role === "freelancer" && ["in_progress", "overdue", "revision_required"].includes(project.status)) button(project.status === "revision_required" ? "Submit revision" : "Submit work", actions.submit);
  if (role === "freelancer" && ["in_progress", "overdue", "submitted", "revision_required", "completed"].includes(project.status) && project.application_status === "hired") button("Version reports", actions.report, "bg-violet-100 text-violet-700");
  if (role === "client" && canClientReviewProject(project)) button("Review work", actions.review);
  if (role === "client" && (["submitted", "revision_required", "completed"].includes(project.status) || project.latest_submission_id)) button("Version reports", actions.report, "bg-violet-100 text-violet-700");
  if (role === "client" && project.status === "completed") button("Delivery links", actions.delivery, "bg-sky-100 text-sky-700");
  if (role === "client" && project.status === "completed") button("Download versions", actions.download, "bg-emerald-100 text-emerald-700");
  if (role === "freelancer" && ["in_progress", "overdue", "submitted", "revision_required", "completed"].includes(project.status) && project.application_status === "hired") button("My ZIP backups", actions.download, "bg-slate-100 text-slate-700");
  if (role === "client" && ["in_progress", "overdue"].includes(project.status)) button("Extend deadline", actions.extend, "bg-sky-100 text-sky-700");
  if (role === "client" && overdue) { button("Request explanation", actions.explain, "bg-amber-100 text-amber-700"); button("Cancel & refund", actions.refund, "bg-red-100 text-red-700"); }
  if (["client", "freelancer"].includes(role) && ["in_progress", "overdue", "submitted", "revision_required"].includes(project.status)) button("Open dispute", actions.dispute, "border border-red-200 text-red-600");
  return <article className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-card"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-emerald-600">{project.client_name || "Your project"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${overdue ? "bg-red-100 text-red-700" : project.status === "disputed" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{project.status}</span></div><h3 className="mt-3 font-bold leading-snug text-forest">{project.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{project.description}</p><p className={`mt-3 text-xs font-semibold ${overdue ? "text-red-600" : "text-slate-400"}`}>Deadline: {new Date(project.deadline).toLocaleDateString()}</p>{project.latest_submission_id && <div className={`mt-4 rounded-2xl p-3 ${project.status === "submitted" ? "bg-emerald-50" : "bg-violet-50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-forest">Submission v{project.latest_submission_version}</strong><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-violet-700">{String(project.latest_submission_status || "submitted").replace(/_/g, " ")}</span></div><p className="mt-2 text-xs text-slate-600">AI requirement match: <strong className="text-forest">{project.latest_evaluation_score == null ? "Analyzing" : `${Number(project.latest_evaluation_score)}%`}</strong> · {Number(project.submission_count || 1)} preserved version{Number(project.submission_count || 1) === 1 ? "" : "s"}</p>{project.status === "submitted" && <p className="mt-2 text-xs font-bold text-emerald-700">Action required: review, approve, or request a requirement-specific revision.</p>}</div>}<div className="mt-4 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{skill}</span>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4"><strong className="text-lg text-forest">{formatCurrency(project.budget)}</strong><div className="flex flex-wrap justify-end gap-2">{controls}</div></div></article>;
}

const verificationStatus = {
  pending: ["Queued", "bg-slate-100 text-slate-600"],
  processing: ["Analyzing", "bg-sky-100 text-sky-700"],
  review_ready: ["Ready for review", "bg-amber-100 text-amber-700"],
  verified: ["Verified", "bg-emerald-100 text-emerald-700"],
  rejected: ["Not verified", "bg-red-100 text-red-700"],
  failed: ["Analysis failed", "bg-red-100 text-red-700"],
};

const parseStoredJson = (value) => {
  if (!value || typeof value === "object") return value || {};
  try { return JSON.parse(value); } catch { return {}; }
};

const verificationQuestions = (verification) => {
  const task = parseStoredJson(verification.task_description);
  return Array.isArray(task.questions) ? task.questions : [];
};

const verificationInstructions = (verification) => {
  const task = parseStoredJson(verification.task_description);
  return task.instructions || verification.task_description;
};

const skillBadgeTier = (score) => {
  if (Number(score) >= 85) return "Elite Expert";
  if (Number(score) >= 70) return "Verified Pro";
  if (Number(score) >= 50) return "Rising Talent";
  return "Not verified";
};

const skillBadgeLabel = (verification) => verification.badge_reference || `${verification.skill_name} ${skillBadgeTier(verification.ai_score)}`;

const latestVerificationPerSkill = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.skill_name || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function VerificationCard({ verification, action, actionLabel, admin = false }) {
  const status = verificationStatus[verification.status] || [verification.status, "bg-slate-100 text-slate-600"];
  const report = parseStoredJson(verification.authenticity_report);
  const metadata = parseStoredJson(verification.media_metadata);
  const questions = verificationQuestions(verification);
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-bold text-forest">{verification.skill_name}</h3><p className="mt-1 text-xs text-slate-400">{admin && `${verification.freelancer_name} · `}Submission #{verification.id} · {new Date(verification.created_at).toLocaleString()}</p></div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status[1]}`}>{status[0]}</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{verificationInstructions(verification)}</p>
      {questions.length > 0 && <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Answered questions</p>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{questions.map((item) => <li key={item.id || item.question}><strong className="text-forest">{item.id || ""}.</strong> {item.question || item}</li>)}</ol>
      </div>}
      {verification.ai_score !== null && <div className="mt-4 flex items-center gap-3"><strong className="text-2xl text-forest">{Math.round(Number(verification.ai_score))}%</strong><span className="text-xs text-slate-400">preliminary skill score</span></div>}
      {(metadata.durationSeconds || report.transcriptWordCount !== undefined) && <p className="mt-3 text-xs text-slate-400">Duration: {Math.round(Number(metadata.durationSeconds || 0))}s · Transcript words: {report.transcriptWordCount || 0}</p>}
      {report.questionResults?.length > 0 && <div className="mt-3 grid gap-2">{report.questionResults.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-3 text-xs text-slate-500"><div className="flex justify-between gap-3"><strong className="text-forest">Q{item.id}</strong><strong className={item.score >= 60 ? "text-emerald-700" : item.score >= 30 ? "text-amber-700" : "text-red-600"}>{item.score}%</strong></div><p className="mt-1 capitalize">{item.status}</p></div>)}</div>}
      {report.issues?.length > 0 && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">{report.issues.join(" ")}</div>}
      {verification.analysis_error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-600">{verification.analysis_error}</div>}
      {Number(verification.ai_score || 0) >= 50 && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">Badge: {skillBadgeLabel(verification)}</p>}
      {verification.transcript && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer font-bold text-emerald-700">View transcript</summary><p className="mt-2 whitespace-pre-wrap leading-5">{verification.transcript}</p></details>}
      <div className="mt-4 flex flex-wrap gap-2">
        {admin && verification.video_url && <a href={`${ASSET_URL}${verification.video_url}`} target="_blank" rel="noreferrer" className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700">Open video</a>}
        {action && <button onClick={() => action(verification)} className="rounded-full bg-forest px-4 py-2 text-xs font-bold text-white">{actionLabel}</button>}
      </div>
    </article>
  );
}

const taskForSkill = (name) => {
  return { name, questions: [], taskDescription: "", questionSkillName: "" };
};

function SkillVerification({ alert, lang, token, changeTab }) {
  const [skillOptions, setSkillOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verifications, setVerifications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const currentSkillNames = new Set(skillOptions.map((item) => normalizeSkillName(item.name)));
  const latestVerifications = latestVerificationPerSkill(
    verifications.filter((item) => currentSkillNames.has(normalizeSkillName(item.skill_name)))
  );
  useEffect(() => {
    api("/profiles/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ profile }) => {
        const options = (profile.skills || []).map(taskForSkill);
        setSkillOptions(options);
        setSelected(options[0] || null);
      })
      .catch((error) => Swal.fire({ title: "Profile skills", text: error.message, icon: "error", confirmButtonColor: "#0c3b32" }))
      .finally(() => setLoadingSkills(false));
  }, [token]);
  const loadQuestions = useCallback((skill) => {
    if (!skill?.name) return;
    setLoadingQuestions(true);
    api(`/skills/questions?skillName=${encodeURIComponent(skill.name)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setSelected((current) => normalizeSkillName(current?.name) === normalizeSkillName(skill.name) ? { ...current, questions: data.questions || [], taskDescription: data.taskDescription || "", questionSkillName: skill.name } : current);
        setSkillOptions((items) => items.map((item) => normalizeSkillName(item.name) === normalizeSkillName(skill.name) ? { ...item, questions: data.questions || [], taskDescription: data.taskDescription || "", questionSkillName: skill.name } : item));
      })
      .catch((error) => Swal.fire({ title: "Verification questions", text: error.message, icon: "error", confirmButtonColor: "#0c3b32" }))
      .finally(() => setLoadingQuestions(false));
  }, [token]);
  useEffect(() => {
    if (selected && (!selected.questions?.length || normalizeSkillName(selected.questionSkillName) !== normalizeSkillName(selected.name))) loadQuestions(selected);
  }, [loadQuestions, selected]);
  const loadVerifications = useCallback(() => api("/skills/mine", { headers: { Authorization: `Bearer ${token}` } })
    .then((data) => setVerifications(data.verifications || []))
    .catch((error) => Swal.fire({ title: "Skill verification", text: error.message, icon: "error", confirmButtonColor: "#0c3b32" }))
    .finally(() => setLoadingHistory(false)), [token]);

  useEffect(() => {
    loadVerifications();
    const timer = setInterval(() => {
      if (verifications.some((item) => ["pending", "processing"].includes(item.status))) loadVerifications();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadVerifications, verifications]);

  const uploadVideo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected) return;
    if (!selected.taskDescription || selected.questions.length !== 3) return Swal.fire({ title: "Questions required", text: "Generate the three verification questions before uploading your answer video.", icon: "info", confirmButtonColor: "#0c3b32" });
    const body = new FormData();
    body.append("skillName", selected.name);
    body.append("taskDescription", selected.taskDescription);
    body.append("video", file);
    setUploading(true);
    setUploadProgress(0);
    try {
      await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", `${API_URL}/skills/upload`);
        request.setRequestHeader("Authorization", `Bearer ${token}`);
        request.upload.onprogress = ({ loaded, total }) => total && setUploadProgress(Math.round((loaded / total) * 100));
        request.onerror = () => reject(new Error("Video upload failed."));
        request.onload = () => {
          let data = {};
          try { data = JSON.parse(request.responseText || "{}"); } catch {}
          if (request.status < 200 || request.status >= 300) return reject(new Error(data.message || "Video upload failed."));
          resolve(data);
        };
        request.send(body);
      });
      await loadVerifications();
      alert("Video uploaded!", "AI analysis has started. You can check the result after review.");
    } catch (error) {
      Swal.fire({ title: "Skill verification", text: error.message, icon: "error", confirmButtonColor: "#0c3b32" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const retry = async (verification) => {
    try {
      await api(`/skills/${verification.id}/retry`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      await loadVerifications();
    } catch (error) {
      Swal.fire({ title: "Retry failed", text: error.message, icon: "error", confirmButtonColor: "#0c3b32" });
    }
  };

  if (loadingSkills) return <p className="text-sm text-slate-400">Loading profile skills...</p>;
  if (!selected) return <div className="mx-auto max-w-xl rounded-[26px] bg-white p-8 text-center shadow-card"><FiShield className="mx-auto text-4xl text-emerald-600" /><h1 className="mt-4 text-2xl font-bold text-forest">Add your skills first</h1><p className="mt-3 text-sm leading-6 text-slate-500">Verification skills come from your freelancer profile. Add one or more skills in Settings, then return here to submit a demo video.</p><button onClick={() => changeTab("settings")} className="mt-5 rounded-full bg-forest px-5 py-3 text-sm font-bold text-white">Open profile settings</button></div>;

  if (skillOptions) return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">AI-powered verification</p>
        <h1 className="font-bangla mt-3 text-3xl font-bold text-forest">Prove your skills</h1>
        <p className="font-bangla mx-auto mt-3 max-w-lg text-slate-500">Select a skill, answer the three random questions in one video, then AI will analyze your explanation.</p>
      </div>
      <div className="mt-8 rounded-[26px] bg-white p-6 shadow-card sm:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {skillOptions.map((item) => (
            <button key={item.name} type="button" onClick={() => { const next = taskForSkill(item.name); setSelected(next); loadQuestions(next); }} className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${selected.name === item.name ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-100 text-slate-500 hover:border-emerald-200"}`}>
              <FiCheckCircle className="mb-4 text-xl" />{item.name}
            </button>
          ))}
        </div>
        <div className="font-bangla mt-6 rounded-2xl bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Your questions</p>
            <button type="button" onClick={() => loadQuestions(selected)} disabled={loadingQuestions || uploading} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm disabled:opacity-60">Randomize</button>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Record one clear video answering all three questions. Mention the question number before each answer.</p>
          {loadingQuestions ? <p className="mt-4 text-sm text-slate-400">Generating questions...</p> : <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">{selected.questions.map((item) => <li key={item.id} className="rounded-xl bg-white p-3 shadow-sm"><strong className="text-forest">Q{item.id}.</strong> {item.question}</li>)}</ol>}
        </div>
        <label className={`mt-6 flex w-full cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-emerald-700 transition hover:bg-emerald-50 ${uploading ? "pointer-events-none opacity-70" : ""}`}>
          <FiUploadCloud className="text-4xl" />
          <strong className="mt-3">{uploading ? `Uploading... ${uploadProgress}%` : "Upload answer video"}</strong>
          <span className="mt-1 text-xs text-slate-400">MP4, MOV or WEBM · backend limit applies</span>
          <input onChange={uploadVideo} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" />
        </label>
      </div>
      <div className="mt-8 flex items-center justify-between"><h2 className="text-xl font-bold text-forest">My submissions</h2><button onClick={loadVerifications} className="text-xs font-bold text-emerald-700">Refresh status</button></div>
      {loadingHistory ? <p className="mt-4 text-sm text-slate-400">Loading submissions...</p> : latestVerifications.length ? <div className="mt-4 grid gap-4">{latestVerifications.map((verification) => <VerificationCard key={verification.id} verification={verification} action={verification.status === "failed" ? retry : null} actionLabel="Retry analysis" />)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">No skill verification submitted yet.</p>}
    </div>
  );
  return (
    <div className="mx-auto max-w-4xl"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">{tx(lang, "AI-চালিত ভেরিফিকেশন", "AI-powered verification")}</p><h1 className="font-bangla mt-3 text-3xl font-bold text-forest">{tx(lang, "আপনার দক্ষতা প্রমাণ করুন", "Prove your skills")}</h1><p className="font-bangla mx-auto mt-3 max-w-lg text-slate-500">{tx(lang, "একটি স্কিল এবং টাস্ক নির্বাচন করে ৫ মিনিটের মধ্যে ডেমো ভিডিও আপলোড করুন।", "Select a skill and task, then upload a demo video within 5 minutes.")}</p></div>
    <div className="mt-8 rounded-[26px] bg-white p-6 shadow-card sm:p-8"><div className="grid gap-4 sm:grid-cols-3">{(lang === "bn" ? ["UI/UX ডিজাইন", "ওয়েব ডেভেলপমেন্ট", "গ্রাফিক ডিজাইন"] : ["UI/UX Design", "Web Development", "Graphic Design"]).map((item, index) => <button key={item} className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${index === 0 ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-100 text-slate-500 hover:border-emerald-200"}`}><FiCheckCircle className="mb-4 text-xl" />{item}</button>)}</div>
    <div className="font-bangla mt-6 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold text-emerald-700">{tx(lang, "আপনার টাস্ক", "YOUR TASK")}</p><h3 className="mt-2 font-bold text-forest">{tx(lang, "একটি মোবাইল ব্যাংকিং অ্যাপের লেনদেনের ইতিহাস স্ক্রিন ডিজাইন করুন।", "Design a transaction history screen for a mobile banking app.")}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{tx(lang, "আপনার কাজের প্রক্রিয়া এবং গুরুত্বপূর্ণ ডিজাইন সিদ্ধান্তগুলো ব্যাখ্যা করুন।", "Explain your work process and important design decisions.")}</p></div>
    <button onClick={() => alert(tx(lang, "ভিডিও আপলোড হয়েছে!", "Video uploaded!"), tx(lang, "AI বিশ্লেষণ শুরু হয়েছে। শীঘ্রই আপনার স্কোর পাবেন।", "AI analysis has started. You will receive your score shortly."))} className="mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-emerald-700 transition hover:bg-emerald-50"><FiUploadCloud className="text-4xl" /><strong className="mt-3">{tx(lang, "ভিডিও আপলোড করতে ক্লিক করুন", "Click to upload video")}</strong><span className="mt-1 text-xs text-slate-400">{tx(lang, "MP4 অথবা MOV · সর্বোচ্চ ৫ মিনিট", "MP4 or MOV · Maximum 5 minutes")}</span></button></div></div>
  );
}

function ManagedPayments({ lang, token }) {
  const [payments, setPayments] = useState({ summary: {}, transactions: [], withdrawals: [] });
  const [loading, setLoading] = useState(true);
  const loadPayments = useCallback(() => {
    setLoading(true);
    return api("/payments/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setPayments(data))
      .catch((error) => Swal.fire({ title: "Payments", text: error.message, icon: "error" }))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { loadPayments(); }, [loadPayments]);
  const withdraw = async () => {
    const available = Number(payments.wallet?.available || 0);
    const result = await Swal.fire({
      title: "Withdraw wallet balance",
      width: 620,
      html: `<div style="text-align:left"><p style="font-size:13px;color:#64748b">Available: ${escapeHtml(formatCurrency(available))}</p><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Amount<input id="withdraw-amount" type="number" min="1" max="${available}" style="${fieldStyle}"></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Method<select id="withdraw-method" style="${fieldStyle}"><option value="bank">Bank account</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="paypal">PayPal</option><option value="wise">Wise</option></select></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Account name<input id="withdraw-name" style="${fieldStyle}"></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Account / mobile / email<input id="withdraw-account" style="${fieldStyle}"></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700;color:#123c35">Bank name <span style="color:#94a3b8">(bank only)</span><input id="withdraw-bank" style="${fieldStyle}"></label></div>`,
      showCancelButton: true,
      confirmButtonText: "Request withdrawal",
      confirmButtonColor: "#0c3b32",
      preConfirm: () => {
        const value = { amount: Number(document.getElementById("withdraw-amount").value), method: document.getElementById("withdraw-method").value, accountName: document.getElementById("withdraw-name").value.trim(), accountNumber: document.getElementById("withdraw-account").value.trim(), bankName: document.getElementById("withdraw-bank").value.trim() };
        if (!value.amount || value.amount <= 0 || value.amount > available || !value.accountName || !value.accountNumber) return Swal.showValidationMessage("Enter a valid amount and payout account details.");
        return value;
      },
    });
    if (!result.isConfirmed) return;
    try {
      await api("/payments/withdrawals", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(result.value) });
      await loadPayments();
      Swal.fire({ title: "Withdrawal requested", text: "The payout is reserved and awaiting processing.", icon: "success", confirmButtonColor: "#0c3b32" });
    } catch (error) { Swal.fire({ title: "Withdrawal failed", text: error.message, icon: "error" }); }
  };
  const summary = payments.summary || {};
  const wallet = payments.wallet;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "পেমেন্ট ও এসক্রো", "Payments and escrow")}</h1><p className="font-bangla mt-2 text-slate-500">{tx(lang, "আপনার আয় এবং নিরাপদ লেনদেনের বিস্তারিত দেখুন।", "View your earnings and protected transactions.")}</p></div>{wallet && <button disabled={Number(wallet.available) <= 0} onClick={withdraw} className="rounded-full bg-forest px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300">Withdraw funds</button>}</div><div className="mt-7 grid gap-4 sm:grid-cols-3">{[["Available wallet", formatCurrency(wallet?.available || 0), "text-emerald-700"], ["Released earnings", formatCurrency(wallet?.earned || summary.released || 0), "text-forest"], ["Protected escrow", formatCurrency(summary.inEscrow || 0), "text-amber-600"]].map(([label, value, style]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-card"><p className="text-xs font-semibold text-slate-400">{label}</p><p className={`mt-2 text-2xl font-bold ${style}`}>{value}</p></div>)}</div>{wallet && <div className="mt-6 rounded-2xl bg-white p-5 shadow-card"><h2 className="font-bold text-forest">Withdrawal requests</h2>{payments.withdrawals?.length ? payments.withdrawals.map((withdrawal) => <div key={withdrawal.id} className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><div><p className="text-sm font-semibold uppercase text-forest">{withdrawal.method}</p><p className="mt-1 text-xs capitalize text-slate-400">{withdrawal.status}{withdrawal.transaction_reference ? ` · ${withdrawal.transaction_reference}` : ""}</p></div><strong>{formatCurrency(withdrawal.amount)}</strong></div>) : <p className="mt-4 text-sm text-slate-400">No withdrawal requests.</p>}</div>}<div className="mt-6 rounded-2xl bg-white p-5 shadow-card"><h2 className="font-bold text-forest">Escrow transactions</h2>{loading ? <p className="mt-4 text-sm text-slate-400">Loading transactions...</p> : payments.transactions.length ? payments.transactions.map((transaction) => <div key={transaction.id} className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><div><p className="text-sm font-semibold text-forest">{transaction.title}</p><p className="mt-1 text-xs capitalize text-slate-400">{transaction.status.replace(/_/g, " ")} · released {formatCurrency(transaction.released_amount || 0)}</p></div><strong className={transaction.status === "released" ? "text-emerald-600" : transaction.status === "refunded" ? "text-red-600" : "text-amber-600"}>{formatCurrency(transaction.amount)}</strong></div>) : <p className="mt-4 text-sm text-slate-400">No escrow transactions yet.</p>}</div></div>;
}

function Payments({ lang }) {
  return (
    <div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "পেমেন্ট ও এসক্রো", "Payments and escrow")}</h1><p className="font-bangla mt-2 text-slate-500">{tx(lang, "আপনার আয় এবং নিরাপদ লেনদেনের বিস্তারিত দেখুন।", "View details of your earnings and secure transactions.")}</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-3">{(lang === "bn" ? [["বর্তমান ব্যালেন্স", "৳ ৪৮,৫০০", "text-emerald-700"], ["এসক্রোতে আছে", "৳ ৩৫,০০০", "text-amber-600"], ["মোট আয়", "৳ ২,৮৪,০০০", "text-forest"]] : [["Available", "৳ 48,500", "text-emerald-700"], ["In escrow", "৳ 35,000", "text-amber-600"], ["Total earned", "৳ 284,000", "text-forest"]]).map(([label, value, style]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-card"><p className="text-xs font-semibold text-slate-400">{label}</p><p className={`mt-2 text-2xl font-bold ${style}`}>{value}</p></div>)}</div>
    <div className="mt-6 rounded-2xl bg-white p-5 shadow-card"><h2 className="font-bold text-forest">{tx(lang, "সাম্প্রতিক লেনদেন", "Recent transactions")}</h2>{(lang === "bn" ? [["ই-কমার্স ওয়েবসাইট UI", "+ ৳ ২৫,০০০", "রিলিজ হয়েছে", true], ["React ল্যান্ডিং পেজ", "৳ ১৮,৫০০", "এসক্রোতে আছে", false], ["ব্র্যান্ড আইডেন্টিটি কিট", "+ ৳ ১২,০০০", "রিলিজ হয়েছে", true]] : [["E-commerce Website UI", "+ ৳ 25,000", "Released", true], ["React Landing Page", "৳ 18,500", "In escrow", false], ["Brand Identity Kit", "+ ৳ 12,000", "Released", true]]).map(([name, amount, status, released]) => <div key={name} className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><div><p className="text-sm font-semibold text-forest">{name}</p><p className="mt-1 text-xs text-slate-400">{status}</p></div><strong className={released ? "text-emerald-600" : "text-amber-600"}>{amount}</strong></div>)}</div></div>
  );
}

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  }
};
const textToList = (value, separator = /\r?\n/) => String(value || "").split(separator).map((item) => item.trim()).filter(Boolean);
const listToText = (value) => toArray(value).map((item) => typeof item === "string" ? item : [item.title, item.url, item.description].filter(Boolean).join(" | ")).join("\n");
const normalizeSkillName = (value) => String(value || "").trim().toLowerCase();
const badgesBySkill = (badges = []) => badges.reduce((lookup, badge) => {
  const key = normalizeSkillName(badge.skill_name);
  if (key && !lookup[key]) lookup[key] = badge;
  return lookup;
}, {});

function SkillChip({ skill, badge, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black ${badge ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-emerald-100 bg-emerald-50 text-emerald-700"} ${className}`}
      title={badge ? `${badge.badge_label || "Verified skill"} - ${Math.round(Number(badge.ai_score || 0))}%` : undefined}
    >
      {skill}
      {badge && <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-700 ring-1 ring-emerald-100"><FiAward /> Verified {Math.round(Number(badge.ai_score || 0))}%</span>}
    </span>
  );
}

function ProfileManager({ lang, session }) {
  const [profile, setProfile] = useState(null);
  const [verifiedBadges, setVerifiedBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = session.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  const isFreelancer = session.user.role === "freelancer";
  useEffect(() => {
    api("/profiles/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ profile: data }) => setProfile({
        ...data,
        skillsText: toArray(data.skills).join(", "),
        languagesText: toArray(data.languages).join(", "),
        experienceText: listToText(data.experience),
        educationText: listToText(data.education),
        portfolioText: listToText(data.portfolio),
        socialLinksText: toArray(data.social_links).join("\n"),
      }))
      .catch((error) => Swal.fire({ title: "Profile", text: error.message, icon: "error" }))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => {
    if (!isFreelancer || !profile?.id) return;
    api(`/skills/badges/${profile.id}`)
      .then((data) => setVerifiedBadges(data.badges || []))
      .catch(() => setVerifiedBadges([]));
  }, [isFreelancer, profile?.id]);
  const field = (name) => (event) => setProfile({ ...profile, [name]: event.target.value });
  const save = async () => {
    try {
      const result = await api("/profiles/me", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          ...profile,
          skills: textToList(profile.skillsText, ","),
          languages: textToList(profile.languagesText, ","),
          experience: textToList(profile.experienceText),
          education: textToList(profile.educationText),
          portfolio: textToList(profile.portfolioText),
          social_links: textToList(profile.socialLinksText),
        }),
      });
      if (isFreelancer && result.invalidatedVerifiedSkills?.length) {
        const invalidated = result.invalidatedVerifiedSkills.map(normalizeSkillName);
        setVerifiedBadges((badges) => badges.filter((badge) => !invalidated.includes(normalizeSkillName(badge.skill_name))));
      }
      Swal.fire({ title: "Profile updated", text: result.message, icon: "success", confirmButtonColor: "#0c3b32" });
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
        {isFreelancer && <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="space-y-4">
            <h3 className="text-lg font-black text-forest">Freelancer profile details</h3>
            <ProfileInput label="Languages (comma separated)" value={profile.languagesText || ""} onChange={field("languagesText")} placeholder="Bangla, English" />
            <ProfileTextarea label="Portfolio projects (one per line)" value={profile.portfolioText || ""} onChange={field("portfolioText")} placeholder="Responsive SaaS Dashboard | https://example.com | React, Node.js, MySQL" />
            <ProfileTextarea label="Work experience (one per line)" value={profile.experienceText || ""} onChange={field("experienceText")} placeholder="Frontend Developer at ABC Studio - built client dashboards" />
            <ProfileTextarea label="Education / certifications (one per line)" value={profile.educationText || ""} onChange={field("educationText")} placeholder="BSc in Software Engineering" />
            <ProfileTextarea label="Social / professional links (one per line)" value={profile.socialLinksText || ""} onChange={field("socialLinksText")} placeholder="https://github.com/username" />
          </section>
          <MarketplaceProfilePreview profile={profile} avatar={avatar} verifiedBadges={verifiedBadges} />
        </div>}
      </div>
    </div>
  );
}

function MarketplaceProfilePreview({ profile, avatar, verifiedBadges = [] }) {
  const skills = textToList(profile.skillsText, ",");
  const verifiedSkillLookup = badgesBySkill(verifiedBadges);
  const languages = textToList(profile.languagesText, ",");
  const portfolio = textToList(profile.portfolioText).map(parseProfileLine).filter((item) => item.title);
  const experience = textToList(profile.experienceText).slice(0, 3);
  const education = textToList(profile.educationText).slice(0, 3);
  const initials = String(profile.name || "NA").slice(0, 2).toUpperCase();
  return <aside className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-card">
    <div className="h-24 bg-[linear-gradient(135deg,#082f2a,#0f766e,#e2f5ef)]" />
    <div className="-mt-12 px-5 pb-5">
      <div className="flex items-end justify-between gap-3">
        <div className="relative h-24 w-24 overflow-hidden rounded-[22px] border-4 border-white bg-emerald-100 shadow-md">
          {avatar ? <Image src={avatar} alt={profile.name} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-2xl font-black text-emerald-700">{initials}</div>}
        </div>
        <span className="mb-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700"><FiCheckCircle className="mr-1 inline" /> Verified-ready</span>
      </div>
      <p className="mt-5 text-xs font-black uppercase text-emerald-600">Public marketplace preview</p>
      <h3 className="mt-2 text-2xl font-black leading-tight text-forest">{profile.headline || "Professional freelance specialist"}</h3>
      <p className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400"><span><FiMapPin className="mr-1 inline" />{[profile.city, profile.country].filter(Boolean).join(", ") || "Remote"}</span><span><FiClock className="mr-1 inline" />{profile.availability || "Availability not set"}</span></p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Metric label="Rating" value={<><FiStar className="mr-1 inline text-amber-500" />New</>} />
        <Metric label="Rate" value={profile.hourly_rate ? formatCurrency(profile.hourly_rate) : "Not set"} />
        <Metric label="Projects" value={`${portfolio.length} item${portfolio.length === 1 ? "" : "s"}`} />
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-600">{profile.bio || "Write a confident overview that explains your niche, process, and business results for clients."}</p>
      <div className="mt-5 flex flex-wrap gap-2">{skills.slice(0, 10).map((skill) => <SkillChip key={skill} skill={skill} badge={verifiedSkillLookup[normalizeSkillName(skill)]} />)}</div>
      <div className="mt-6 rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between gap-3"><h4 className="font-black text-forest">Portfolio</h4><FiExternalLink className="text-emerald-600" /></div>
        <div className="mt-3 space-y-3">{portfolio.length ? portfolio.slice(0, 3).map((item) => <div key={`${item.title}-${item.url}`} className="rounded-2xl bg-slate-50 p-3"><p className="text-sm font-black text-forest">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.description || item.url || "Case study summary pending"}</p></div>) : <p className="text-sm text-slate-400">Add portfolio projects to make this section look like a seller profile.</p>}</div>
      </div>
      <div className="mt-5 grid gap-3">
        <Metric label="Languages" value={languages.join(", ") || "Not set"} />
        <Metric label="Experience" value={experience[0] || "Add recent work history"} />
        <Metric label="Education / certifications" value={education[0] || "Add education or certificates"} />
      </div>
      <button type="button" className="mt-5 w-full rounded-full bg-forest px-4 py-3 text-sm font-black text-white">Contact freelancer</button>
    </div>
  </aside>;
}

function ProfileInput({ label, ...props }) {
  return <label className="text-xs font-bold text-slate-500">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-emerald-400" /></label>;
}

function ProfileTextarea({ label, ...props }) {
  return <label className="block text-xs font-bold text-slate-500">{label}<textarea {...props} rows={props.rows || 4} className="mt-2 w-full rounded-2xl border border-slate-200 p-4 text-sm font-normal outline-none focus:border-emerald-400" /></label>;
}

function AdminDashboard({ lang, token }) {
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [overview, setOverview] = useState({});
  const [pipeline, setPipeline] = useState({});
  const [error, setError] = useState("");
  const authHeaders = () => ({ Authorization: `Bearer ${token}` });
  const loadAdmin = useCallback(() => Promise.all([
    api("/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
    api("/admin/overview", { headers: { Authorization: `Bearer ${token}` } }),
    api("/admin/skill-verifications", { headers: { Authorization: `Bearer ${token}` } }),
    api("/skills/pipeline-health", { headers: { Authorization: `Bearer ${token}` } }),
    api("/admin/disputes", { headers: { Authorization: `Bearer ${token}` } }),
    api("/admin/withdrawals", { headers: { Authorization: `Bearer ${token}` } }),
  ]).then(([userData, overviewData, verificationData, pipelineData, disputeData, withdrawalData]) => {
    setUsers(userData.users || []);
    setOverview(overviewData);
    setVerifications(verificationData.verifications || []);
    setPipeline(pipelineData);
    setDisputes(disputeData.disputes || []);
    setWithdrawals(withdrawalData.withdrawals || []);
    setError("");
  }).catch((requestError) => setError(requestError.message)), [token]);
  useEffect(() => { loadAdmin(); }, [loadAdmin]);
  const analyze = async (verification) => {
    try {
      await api(`/skills/${verification.id}/analyze`, { method: "POST", headers: authHeaders() });
      await loadAdmin();
    } catch (requestError) {
      Swal.fire({ title: "Analysis restart failed", text: requestError.message, icon: "error" });
    }
  };
  const review = async (verification) => {
    const result = await Swal.fire({
      title: `Review ${verification.skill_name}`,
      text: "Enter the final score. Scores of 50 or above issue a verified badge and activate project applications.",
      input: "number",
      inputValue: Math.round(Number(verification.ai_score || 0)),
      inputAttributes: { min: 0, max: 100, step: 1 },
      showCancelButton: true,
      confirmButtonColor: "#0c3b32",
      inputValidator: (value) => value === "" || Number(value) < 0 || Number(value) > 100 ? "Enter a score between 0 and 100." : undefined,
    });
    if (!result.isConfirmed) return;
    try {
      await api(`/skills/${verification.id}/review`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ aiScore: result.value }) });
      await loadAdmin();
    } catch (requestError) {
      Swal.fire({ title: "Review failed", text: requestError.message, icon: "error" });
    }
  };
  const resolveDispute = async (dispute) => {
    const action = await Swal.fire({ title: `Resolve dispute #${dispute.id}`, text: dispute.reason, input: "select", inputOptions: { refund: "Refund escrow to client", release: "Release escrow to freelancer", resume: "Resume project" }, showCancelButton: true, confirmButtonColor: "#0c3b32" });
    if (!action.isConfirmed) return;
    const note = await Swal.fire({ title: "Resolution note", input: "textarea", inputPlaceholder: "Explain the decision", showCancelButton: true, confirmButtonColor: "#0c3b32", inputValidator: (value) => !value.trim() ? "Provide a resolution note." : undefined });
    if (!note.isConfirmed) return;
    try {
      await api(`/admin/disputes/${dispute.id}/resolve`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ action: action.value, resolution: note.value }) });
      await loadAdmin();
    } catch (requestError) {
      Swal.fire({ title: "Dispute resolution failed", text: requestError.message, icon: "error" });
    }
  };
  const processWithdrawal = async (withdrawal) => {
    const action = await Swal.fire({ title: `Withdrawal #${withdrawal.id}`, text: `${withdrawal.freelancer_name} requested ${formatCurrency(withdrawal.amount)} via ${withdrawal.method}.`, input: "select", inputOptions: { processing: "Mark processing", paid: "Mark paid", rejected: "Reject" }, showCancelButton: true, confirmButtonColor: "#0c3b32" });
    if (!action.isConfirmed) return;
    let transactionReference = "";
    let adminNote = "";
    if (action.value === "paid") {
      const reference = await Swal.fire({ title: "Payout reference", input: "text", inputPlaceholder: "Bank/gateway transaction reference", showCancelButton: true, confirmButtonColor: "#0c3b32", inputValidator: (value) => !value.trim() ? "Transaction reference is required." : undefined });
      if (!reference.isConfirmed) return;
      transactionReference = reference.value;
    }
    if (action.value === "rejected") {
      const note = await Swal.fire({ title: "Rejection reason", input: "textarea", showCancelButton: true, confirmButtonColor: "#0c3b32", inputValidator: (value) => !value.trim() ? "Provide a reason." : undefined });
      if (!note.isConfirmed) return;
      adminNote = note.value;
    }
    try {
      await api(`/admin/withdrawals/${withdrawal.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: action.value, transactionReference, adminNote }) });
      await loadAdmin();
    } catch (requestError) { Swal.fire({ title: "Withdrawal update failed", text: requestError.message, icon: "error" }); }
  };
  if (users) return <div>
    <h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "অ্যাডমিন ড্যাশবোর্ড", "Admin dashboard")}</h1>
    <p className="mt-2 text-slate-500">Monitor users, AI pipeline health and skill verification reviews.</p>
    {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Users", overview.users || 0], ["Projects", overview.projects || 0], ["Funded escrow", formatCurrency(overview.fundedEscrow)], ["Open skill reviews", overview.pendingSkillReviews || 0]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-card"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-forest">{value}</p></div>)}
    </div>
    <div className="mt-7 rounded-2xl bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-forest">AI pipeline</h2><button onClick={loadAdmin} className="text-xs font-bold text-emerald-700">Refresh dashboard</button></div>
      <div className="mt-4 flex flex-wrap gap-2">{[["FFmpeg", pipeline.ffmpeg], ["FFprobe", pipeline.ffprobe], ["Hugging Face token", pipeline.huggingFaceToken]].map(([label, available]) => <span key={label} className={`rounded-full px-3 py-1 text-xs font-bold ${available ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{label}: {available ? "ready" : "missing"}</span>)}</div>
      <p className="mt-3 text-xs text-slate-400">ASR model: {pipeline.asrModel || "not configured"}</p>
    </div>
    <div className="mt-7 flex items-center justify-between"><h2 className="text-xl font-bold text-forest">Skill verification reviews</h2><span className="text-xs text-slate-400">{verifications.length} submissions</span></div>
    <div className="mt-4 grid gap-4">{verifications.length ? verifications.map((verification) => <VerificationCard key={verification.id} admin verification={verification} action={verification.status === "review_ready" ? review : ["failed", "pending"].includes(verification.status) ? analyze : null} actionLabel={verification.status === "review_ready" ? "Submit final review" : "Run analysis"} />) : <p className="rounded-2xl bg-white p-5 text-sm text-slate-400 shadow-card">No skill submissions yet.</p>}</div>
    <div className="mt-8 flex items-center justify-between"><h2 className="text-xl font-bold text-forest">Project disputes</h2><span className="text-xs text-slate-400">{disputes.filter((item) => item.status === "open").length} open</span></div>
    <div className="mt-4 grid gap-3">{disputes.length ? disputes.map((dispute) => <div key={dispute.id} className="rounded-2xl bg-white p-5 shadow-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-forest">{dispute.title}</h3><p className="mt-1 text-xs text-slate-400">Dispute #{dispute.id} opened by {dispute.opened_by_name}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${dispute.status === "open" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{dispute.status}</span></div><p className="mt-3 text-sm text-slate-500">{dispute.reason}</p>{dispute.resolution && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{dispute.resolution}</p>}{dispute.status === "open" && <button onClick={() => resolveDispute(dispute)} className="mt-4 rounded-full bg-forest px-4 py-2 text-xs font-bold text-white">Resolve dispute</button>}</div>) : <p className="rounded-2xl bg-white p-5 text-sm text-slate-400 shadow-card">No project disputes.</p>}</div>
    <div className="mt-8 flex items-center justify-between"><h2 className="text-xl font-bold text-forest">Withdrawal processing</h2><span className="text-xs text-slate-400">{withdrawals.filter((item) => ["pending", "processing"].includes(item.status)).length} open</span></div>
    <div className="mt-4 grid gap-3">{withdrawals.length ? withdrawals.map((withdrawal) => <div key={withdrawal.id} className="rounded-2xl bg-white p-5 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-forest">{withdrawal.freelancer_name} · {formatCurrency(withdrawal.amount)}</p><p className="mt-1 text-xs uppercase text-slate-400">{withdrawal.method} · {withdrawal.status}</p><p className="mt-2 text-xs text-slate-500">{parseStoredJson(withdrawal.account_details).accountName} · {parseStoredJson(withdrawal.account_details).accountNumber}{parseStoredJson(withdrawal.account_details).bankName ? ` · ${parseStoredJson(withdrawal.account_details).bankName}` : ""}</p></div>{["pending", "processing"].includes(withdrawal.status) && <button onClick={() => processWithdrawal(withdrawal)} className="rounded-full bg-forest px-4 py-2 text-xs font-bold text-white">Process payout</button>}</div></div>) : <p className="rounded-2xl bg-white p-5 text-sm text-slate-400 shadow-card">No withdrawal requests.</p>}</div>
    <h2 className="mt-8 text-xl font-bold text-forest">Users</h2>
    <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-card">{users.map((user) => <div key={user.id} className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0"><div><p className="font-bold text-forest">{user.name}</p><p className="mt-1 text-xs text-slate-400">{user.email || user.mobile}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{user.role}</span></div>)}</div>
  </div>;
  return <div><h1 className="font-bangla text-3xl font-bold text-forest">{tx(lang, "অ্যাডমিন ড্যাশবোর্ড", "Admin dashboard")}</h1><p className="mt-2 text-slate-500">{tx(lang, "ব্যবহারকারী এবং তাদের ভূমিকা পর্যবেক্ষণ করুন।", "Monitor users and their roles.")}</p><div className="mt-7 overflow-hidden rounded-2xl bg-white shadow-card">{users.map((user) => <div key={user.id} className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0"><div><p className="font-bold text-forest">{user.name}</p><p className="mt-1 text-xs text-slate-400">{user.email || user.mobile}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{user.role}</span></div>)}</div></div>;
}

function AdminNidVerificationPage({ token }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const authHeaders = () => ({ Authorization: `Bearer ${token}` });
  const loadVerifications = useCallback(() => {
    setLoading(true);
    api("/admin/nid-verifications", { headers: authHeaders() })
      .then((data) => {
        setVerifications(data.verifications || []);
        setError("");
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => { loadVerifications(); }, [loadVerifications]);
  const reviewNid = async (verification, status) => {
    let reason = "";
    if (status === "rejected") {
      const result = await Swal.fire({ title: `Reject NID for ${verification.name}`, input: "textarea", inputPlaceholder: "Write the rejection reason", showCancelButton: true, confirmButtonColor: "#0c3b32", inputValidator: (value) => !value.trim() ? "Provide a rejection reason." : undefined });
      if (!result.isConfirmed) return;
      reason = result.value;
    } else {
      const result = await Swal.fire({ title: `Verify NID for ${verification.name}?`, text: "This user will be able to access the dashboard after approval.", icon: "question", showCancelButton: true, confirmButtonColor: "#0c3b32" });
      if (!result.isConfirmed) return;
    }
    try {
      await api(`/admin/nid-verifications/${verification.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status, reason }) });
      await loadVerifications();
      Swal.fire({ title: status === "verified" ? "NID verified" : "NID rejected", icon: "success", confirmButtonColor: "#0c3b32" });
    } catch (requestError) {
      Swal.fire({ title: "NID review failed", text: requestError.message, icon: "error" });
    }
  };
  const pendingCount = verifications.filter((item) => item.status === "pending").length;
  return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-forest">NID Verification</h1><p className="mt-2 text-sm text-slate-500">Review National ID submissions before users can access their accounts.</p></div><div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400">{pendingCount} pending</span><button onClick={loadVerifications} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm">Refresh</button></div></div>{error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div>}{loading ? <p className="mt-8 text-sm text-slate-400">Loading NID submissions...</p> : <div className="mt-6 grid gap-4">{verifications.length ? verifications.map((verification) => <div key={verification.id} className="rounded-2xl bg-white p-5 shadow-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-forest">{verification.name}</h3><p className="mt-1 text-xs text-slate-400">{verification.email || verification.mobile} · {verification.role} · NID #{verification.nid_number}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${verification.status === "verified" ? "bg-emerald-100 text-emerald-700" : verification.status === "rejected" ? "bg-red-100 text-red-700" : "bg-cyan-100 text-cyan-700"}`}>{verification.status}</span></div><div className="mt-4 flex flex-wrap gap-2"><a href={`${ASSET_URL}${verification.front_image_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700"><FiExternalLink /> Front side</a><a href={`${ASSET_URL}${verification.back_image_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700"><FiExternalLink /> Back side</a></div>{verification.rejection_reason && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">Reason: {verification.rejection_reason}</p>}{verification.status === "pending" && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => reviewNid(verification, "verified")} className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-xs font-bold text-white"><FiCheckCircle /> Verified</button><button onClick={() => reviewNid(verification, "rejected")} className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-xs font-bold text-red-700"><FiX /> Reject</button></div>}</div>) : <p className="rounded-2xl bg-white p-5 text-sm text-slate-400 shadow-card">No NID verification submissions yet.</p>}</div>}</div>;
}

function MessageCenter({ token, user, initialConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [actionMessageId, setActionMessageId] = useState(null);
  const fileInputRef = useRef(null);
  const selectedIdRef = useRef(null);
  const messageEndRef = useRef(null);
  const selected = conversations.find((item) => item.id === selectedId);
  const loadConversations = useCallback(() => api("/messages", { headers: { Authorization: `Bearer ${token}` } }).then(({ conversations: data }) => {
    setConversations(data || []);
    setSelectedId((current) => initialConversationId || current || data?.[0]?.id || null);
  }).catch((error) => Swal.fire({ title: "Messages", text: error.message, icon: "error" })), [initialConversationId, token]);
  const markRead = useCallback((conversationId, activeSocket) => {
    if (!conversationId) return;
    if (activeSocket?.connected) activeSocket.emit("message:read", { conversationId });
    else api(`/messages/${conversationId}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, unread_count: 0 } : item));
  }, [token]);
  const loadMessages = useCallback((conversationId, activeSocket) => {
    if (!conversationId) return setMessages([]);
    api(`/messages/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ messages: data }) => { setMessages(data || []); activeSocket?.emit("conversation:join", { conversationId }); markRead(conversationId, activeSocket); })
      .catch((error) => Swal.fire({ title: "Messages", text: error.message, icon: "error" }));
  }, [markRead, token]);
  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (initialConversationId) setSelectedId(Number(initialConversationId)); }, [initialConversationId]);
  useEffect(() => { selectedIdRef.current = selectedId; setTyping(false); }, [selectedId]);
  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => {
    const nextSocket = io(ASSET_URL, { auth: { token } });
    setSocket(nextSocket);
    nextSocket.on("connect", () => setConnected(true));
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("conversation:updated", loadConversations);
    nextSocket.on("message:new", (message) => {
      setMessages((items) => message.conversation_id === selectedIdRef.current && !items.some((item) => item.id === message.id) ? [...items, message] : items);
      loadConversations();
      if (message.conversation_id === selectedIdRef.current && message.sender_id !== user.id) markRead(selectedIdRef.current, nextSocket);
    });
    nextSocket.on("message:read", ({ conversationId, readerId }) => {
      if (conversationId === selectedIdRef.current && readerId !== user.id) setMessages((items) => items.map((item) => item.sender_id === user.id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
    });
    nextSocket.on("typing", ({ conversationId, userId, active }) => {
      if (conversationId === selectedIdRef.current && userId !== user.id) setTyping(active);
    });
    return () => nextSocket.disconnect();
  }, [loadConversations, markRead, token, user.id]);
  useEffect(() => { loadMessages(selectedId, socket); }, [loadMessages, selectedId, socket]);
  const uploadAttachment = async () => {
    if (!attachment || !selectedId) return null;
    const body = new FormData();
    body.append("attachment", attachment);
    const response = await fetch(`${API_URL}/messages/${selectedId}/attachments`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Attachment upload failed.");
    return data.attachment;
  };
  const send = async () => {
    const message = draft.trim();
    if ((!message && !attachment) || !selectedId || !socket?.connected || uploadingAttachment) return;
    try {
      setUploadingAttachment(Boolean(attachment));
      const uploaded = await uploadAttachment();
      socket.emit("message:send", { conversationId: selectedId, message, attachmentUrl: uploaded?.url }, (result) => {
        setUploadingAttachment(false);
        if (!result.ok) return Swal.fire({ title: "Message not sent", text: result.message, icon: "error" });
        setDraft("");
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    } catch (error) {
      setUploadingAttachment(false);
      Swal.fire({ title: "Attachment upload failed", text: error.message, icon: "error" });
    }
  };
  const chooseAttachment = (accept) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };
  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const sendDisabled = (!draft.trim() && !attachment) || !connected || uploadingAttachment;
  const renderAttachment = (message) => {
    if (!message.attachment_url) return null;
    const url = message.attachment_url.startsWith("/uploads/") ? `${ASSET_URL}${message.attachment_url}` : message.attachment_url;
    const filename = decodeURIComponent(url.split("/").pop() || "attachment");
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(filename);
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-2 block overflow-hidden rounded-2xl border ${message.sender_id === user.id ? "border-white/15 bg-white/10" : "border-slate-100 bg-slate-50"}`}>
        {isImage ? <Image src={url} alt={filename} width={420} height={280} unoptimized className="max-h-64 w-full object-cover" /> : <span className="flex items-center gap-3 p-3 text-xs font-bold"><FiFileText className="shrink-0 text-lg" /> <span className="truncate">{filename}</span></span>}
      </a>
    );
  };
  if (!conversations.length) return <EmptyState Icon={FiMessageCircle} title="No conversations yet" text="Open an applicant profile and start a message before hiring." />;
  return <div className="message-route"><div className="grid min-h-[68vh] overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-100/80 via-cyan-50 to-lime-50/90 shadow-card ring-1 ring-emerald-100/70 lg:grid-cols-[310px_1fr]"><aside className="border-b border-emerald-100/70 bg-gradient-to-b from-white/65 via-emerald-50/70 to-cyan-50/45 lg:border-b-0 lg:border-r"><div className="border-b border-emerald-100/70 bg-white/45 p-4 text-sm font-bold text-forest backdrop-blur">Conversations</div><div className="space-y-3 p-3">{conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`block w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedId === conversation.id ? "border-emerald-300 bg-white/85 ring-2 ring-emerald-100" : "border-emerald-100/70 bg-white/55 hover:border-emerald-200 hover:bg-white/80 hover:shadow-md"}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm text-forest">{conversation.other_user_name}</strong>{Number(conversation.unread_count) > 0 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unread_count}</span>}</div><p className="mt-1 truncate text-xs font-semibold text-emerald-700">{conversation.title}</p><p className="mt-2 truncate text-xs text-slate-400">{conversation.last_message || "Start the conversation"}</p></button>)}</div></aside><section className="flex min-h-[520px] flex-col"><header className="border-b border-emerald-100/70 bg-white/50 p-4 backdrop-blur"><h2 className="font-bold text-forest">{selected?.other_user_name}</h2><p className="mt-1 text-xs text-slate-400">{selected?.title}{typing && " · typing..."}</p></header><div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.95),rgba(240,249,255,0.92),rgba(247,254,231,0.82))] p-4">{messages.map((message) => { const mine = message.sender_id === user.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "rounded-br-sm bg-forest text-white" : "rounded-bl-sm bg-white text-slate-700"}`}><p className="whitespace-pre-wrap">{message.message}</p><p className={`mt-2 text-[10px] ${mine ? "text-white/55" : "text-slate-400"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && ` · ${message.read_at ? "Seen" : "Sent"}`}</p></div></div>; })}<div ref={messageEndRef} /></div><div className="flex gap-2 border-t border-slate-100 p-4"><input value={draft} onChange={(event) => { setDraft(event.target.value); socket?.emit("typing", { conversationId: selectedId, active: Boolean(event.target.value) }); }} onBlur={() => socket?.emit("typing", { conversationId: selectedId, active: false })} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Write a message..." className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" /><button onClick={send} disabled={!connected || !draft.trim()} className="rounded-full bg-forest px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Send</button></div></section></div></div>;
}

function EnhancedMessageCenter({ token, user, initialConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const fileInputRef = useRef(null);
  const selectedIdRef = useRef(null);
  const messageEndRef = useRef(null);
  const selected = conversations.find((item) => item.id === selectedId);

  const loadConversations = useCallback(() => api("/messages", { headers: { Authorization: `Bearer ${token}` } }).then(({ conversations: data }) => {
    setConversations(data || []);
    setSelectedId((current) => initialConversationId || current || data?.[0]?.id || null);
  }).catch((error) => Swal.fire({ title: "Messages", text: error.message, icon: "error" })), [initialConversationId, token]);
  const markRead = useCallback((conversationId, activeSocket) => {
    if (!conversationId) return;
    if (activeSocket?.connected) activeSocket.emit("message:read", { conversationId });
    else api(`/messages/${conversationId}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, unread_count: 0 } : item));
  }, [token]);
  const loadMessages = useCallback((conversationId, activeSocket) => {
    if (!conversationId) return setMessages([]);
    api(`/messages/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ messages: data }) => { setMessages(data || []); activeSocket?.emit("conversation:join", { conversationId }); markRead(conversationId, activeSocket); })
      .catch((error) => Swal.fire({ title: "Messages", text: error.message, icon: "error" }));
  }, [markRead, token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (initialConversationId) setSelectedId(Number(initialConversationId)); }, [initialConversationId]);
  useEffect(() => { selectedIdRef.current = selectedId; setTyping(false); }, [selectedId]);
  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => {
    const nextSocket = io(ASSET_URL, { auth: { token } });
    setSocket(nextSocket);
    nextSocket.on("connect", () => setConnected(true));
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("conversation:updated", loadConversations);
    nextSocket.on("message:new", (message) => {
      setMessages((items) => message.conversation_id === selectedIdRef.current && !items.some((item) => item.id === message.id) ? [...items, message] : items);
      loadConversations();
      if (message.conversation_id === selectedIdRef.current && message.sender_id !== user.id) markRead(selectedIdRef.current, nextSocket);
    });
    nextSocket.on("message:read", ({ conversationId, readerId }) => {
      if (conversationId === selectedIdRef.current && readerId !== user.id) setMessages((items) => items.map((item) => item.sender_id === user.id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
    });
    nextSocket.on("typing", ({ conversationId, userId, active }) => {
      if (conversationId === selectedIdRef.current && userId !== user.id) setTyping(active);
    });
    return () => nextSocket.disconnect();
  }, [loadConversations, markRead, token, user.id]);
  useEffect(() => { loadMessages(selectedId, socket); }, [loadMessages, selectedId, socket]);

  const chooseAttachment = (accept) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };
  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const uploadAttachment = async () => {
    if (!attachment || !selectedId) return null;
    const body = new FormData();
    body.append("attachment", attachment);
    const response = await fetch(`${API_URL}/messages/${selectedId}/attachments`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Attachment upload failed.");
    return data.attachment;
  };
  const send = async () => {
    const message = draft.trim();
    if ((!message && !attachment) || !selectedId || !socket?.connected || uploading) return;
    try {
      setUploading(Boolean(attachment));
      const uploaded = await uploadAttachment();
      socket.emit("message:send", { conversationId: selectedId, message, attachmentUrl: uploaded?.url }, (result) => {
        setUploading(false);
        if (!result.ok) return Swal.fire({ title: "Message not sent", text: result.message, icon: "error" });
        setDraft("");
        clearAttachment();
      });
    } catch (error) {
      setUploading(false);
      Swal.fire({ title: "Attachment upload failed", text: error.message, icon: "error" });
    }
  };
  const attachmentLink = (message) => {
    if (!message.attachment_url) return null;
    const url = message.attachment_url.startsWith("/uploads/") ? `${ASSET_URL}${message.attachment_url}` : message.attachment_url;
    const filename = decodeURIComponent(url.split("/").pop() || "attachment");
    const image = /\.(png|jpe?g|webp|gif)$/i.test(filename);
    return <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-2 block overflow-hidden rounded-2xl border ${message.sender_id === user.id ? "border-white/15 bg-white/10" : "border-slate-100 bg-slate-50"}`}>{image ? <Image src={url} alt={filename} width={420} height={280} unoptimized className="max-h-64 w-full object-cover" /> : <span className="flex items-center gap-3 p-3 text-xs font-bold"><FiFileText className="shrink-0 text-lg" /><span className="truncate">{filename}</span></span>}</a>;
  };
  const sendDisabled = (!draft.trim() && !attachment) || !connected || uploading;

  if (!conversations.length) return <EmptyState Icon={FiMessageCircle} title="No conversations yet" text="Open an applicant profile and start a message before hiring." />;
  return <div className="message-route"><div className="grid min-h-[68vh] overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-100/80 via-cyan-50 to-lime-50/90 shadow-card ring-1 ring-emerald-100/70 lg:grid-cols-[310px_1fr]"><aside className="border-b border-emerald-100/70 bg-gradient-to-b from-white/65 via-emerald-50/70 to-cyan-50/45 lg:border-b-0 lg:border-r"><div className="border-b border-emerald-100/70 bg-white/45 p-4 text-sm font-bold text-forest backdrop-blur">Conversations</div><div className="space-y-3 p-3">{conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`block w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedId === conversation.id ? "border-emerald-300 bg-white/85 ring-2 ring-emerald-100" : "border-emerald-100/70 bg-white/55 hover:border-emerald-200 hover:bg-white/80 hover:shadow-md"}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm text-forest">{conversation.other_user_name}</strong>{Number(conversation.unread_count) > 0 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unread_count}</span>}</div><p className="mt-1 truncate text-xs font-semibold text-emerald-700">{conversation.title}</p><p className="mt-2 truncate text-xs text-slate-400">{conversation.last_message || "Start the conversation"}</p></button>)}</div></aside><section className="flex min-h-[520px] flex-col"><header className="border-b border-emerald-100/70 bg-white/50 p-4 backdrop-blur"><h2 className="font-bold text-forest">{selected?.other_user_name}</h2><p className="mt-1 text-xs text-slate-400">{selected?.title}{typing && " . typing..."}</p></header><div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.95),rgba(240,249,255,0.92),rgba(247,254,231,0.82))] p-4">{messages.map((message) => { const mine = message.sender_id === user.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "rounded-br-sm bg-forest text-white" : "rounded-bl-sm bg-white text-slate-700"}`}>{message.message && <p className="whitespace-pre-wrap">{message.message}</p>}{attachmentLink(message)}<p className={`mt-2 text-[10px] ${mine ? "text-white/55" : "text-slate-400"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && ` . ${message.read_at ? "Seen" : "Sent"}`}</p></div></div>; })}<div ref={messageEndRef} /></div><div className="border-t border-emerald-100/70 bg-white/45 p-4 backdrop-blur">{attachment && <div className="mb-3 flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span className="flex min-w-0 items-center gap-2 font-bold"><FiPaperclip className="shrink-0" /><span className="truncate">{attachment.name}</span></span><button onClick={clearAttachment} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-emerald-100" aria-label="Remove attachment"><FiX /></button></div>}<div className="flex items-center gap-2"><input ref={fileInputRef} onChange={(event) => setAttachment(event.target.files?.[0] || null)} type="file" className="hidden" /><button onClick={() => chooseAttachment("image/png,image/jpeg,image/webp,image/gif")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700" title="Upload photo" aria-label="Upload photo"><FiImage /></button><button onClick={() => chooseAttachment(".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700" title="Upload document" aria-label="Upload document"><FiFileText /></button><button onClick={() => chooseAttachment(".zip,image/png,image/jpeg,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700" title="Upload file" aria-label="Upload file"><FiFile /></button><input value={draft} onChange={(event) => { setDraft(event.target.value); socket?.emit("typing", { conversationId: selectedId, active: Boolean(event.target.value) }); }} onBlur={() => socket?.emit("typing", { conversationId: selectedId, active: false })} onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && send()} placeholder="Write a message..." className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" /><button onClick={send} disabled={sendDisabled} className="rounded-full bg-forest px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{uploading ? "Uploading..." : "Send"}</button></div></div></section></div></div>;
}

function InteractiveMessageCenter({ token, user, initialConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [actionMessageId, setActionMessageId] = useState(null);
  const fileInputRef = useRef(null);
  const selectedIdRef = useRef(null);
  const messageEndRef = useRef(null);
  const selected = conversations.find((item) => item.id === selectedId);
  const reactionOptions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const mergeMessage = (updated) => setMessages((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
  useEffect(() => { setActionMessageId(null); }, [selectedId]);

  const loadConversations = useCallback(() => api("/messages", { headers: { Authorization: `Bearer ${token}` } }).then(({ conversations: data }) => {
    setConversations(data || []);
    setSelectedId((current) => initialConversationId || current || data?.[0]?.id || null);
  }).catch((error) => Swal.fire({ title: "Messages", text: error.message, icon: "error" })), [initialConversationId, token]);
  const markRead = useCallback((conversationId, activeSocket) => {
    if (!conversationId) return;
    if (activeSocket?.connected) activeSocket.emit("message:read", { conversationId });
    else api(`/messages/${conversationId}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, unread_count: 0 } : item));
  }, [token]);
  const loadMessages = useCallback((conversationId, activeSocket) => {
    if (!conversationId) return setMessages([]);
    api(`/messages/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ messages: data }) => { setMessages(data || []); activeSocket?.emit("conversation:join", { conversationId }); markRead(conversationId, activeSocket); })
      .catch((error) => Swal.fire({ title: "Messages", text: error.message, icon: "error" }));
  }, [markRead, token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (initialConversationId) setSelectedId(Number(initialConversationId)); }, [initialConversationId]);
  useEffect(() => { selectedIdRef.current = selectedId; setTyping(false); }, [selectedId]);
  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => {
    const nextSocket = io(ASSET_URL, { auth: { token } });
    setSocket(nextSocket);
    nextSocket.on("connect", () => setConnected(true));
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("conversation:updated", loadConversations);
    nextSocket.on("message:new", (message) => {
      setMessages((items) => message.conversation_id === selectedIdRef.current && !items.some((item) => item.id === message.id) ? [...items, message] : items);
      loadConversations();
      if (message.conversation_id === selectedIdRef.current && message.sender_id !== user.id) markRead(selectedIdRef.current, nextSocket);
    });
    nextSocket.on("message:updated", mergeMessage);
    nextSocket.on("message:read", ({ conversationId, readerId }) => {
      if (conversationId === selectedIdRef.current && readerId !== user.id) setMessages((items) => items.map((item) => item.sender_id === user.id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
    });
    nextSocket.on("typing", ({ conversationId, userId, active }) => {
      if (conversationId === selectedIdRef.current && userId !== user.id) setTyping(active);
    });
    return () => nextSocket.disconnect();
  }, [loadConversations, markRead, token, user.id]);
  useEffect(() => { loadMessages(selectedId, socket); }, [loadMessages, selectedId, socket]);

  const chooseAttachment = (accept) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };
  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const uploadAttachment = async () => {
    if (!attachment || !selectedId) return null;
    const body = new FormData();
    body.append("attachment", attachment);
    const response = await fetch(`${API_URL}/messages/${selectedId}/attachments`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Attachment upload failed.");
    return data.attachment;
  };
  const send = async () => {
    const message = draft.trim();
    if ((!message && !attachment) || !selectedId || !socket?.connected || uploading) return;
    try {
      setUploading(Boolean(attachment));
      const uploaded = await uploadAttachment();
      socket.emit("message:send", { conversationId: selectedId, message, attachmentUrl: uploaded?.url }, (result) => {
        setUploading(false);
        if (!result.ok) return Swal.fire({ title: "Message not sent", text: result.message, icon: "error" });
        setDraft("");
        clearAttachment();
      });
    } catch (error) {
      setUploading(false);
      Swal.fire({ title: "Attachment upload failed", text: error.message, icon: "error" });
    }
  };
  const updateRemoteMessage = async (messageId, options) => {
    const response = await fetch(`${API_URL}/messages/${selectedId}/messages/${messageId}${options.suffix || ""}`, {
      method: options.method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Message action failed.");
    if (data.message) mergeMessage(data.message);
  };
  const copyMessage = async (message) => {
    if (!message.message) return;
    await navigator.clipboard.writeText(message.message);
    Swal.fire({ title: "Copied", timer: 850, showConfirmButton: false, icon: "success" });
  };
  const editMessage = async (message) => {
    const result = await Swal.fire({ title: "Edit message", input: "textarea", inputValue: message.message, showCancelButton: true, confirmButtonColor: "#0c3b32", inputValidator: (value) => !value.trim() ? "Message cannot be empty." : undefined });
    if (!result.isConfirmed) return;
    await updateRemoteMessage(message.id, { method: "PATCH", body: { message: result.value } });
  };
  const unsendMessage = async (message) => {
    const result = await Swal.fire({ title: "Unsend this message?", text: "The message will be removed for everyone.", icon: "warning", showCancelButton: true, confirmButtonText: "Unsend", confirmButtonColor: "#dc2626" });
    if (result.isConfirmed) await updateRemoteMessage(message.id, { method: "DELETE" });
  };
  const reactMessage = (message, reaction) => updateRemoteMessage(message.id, { method: "POST", suffix: "/reactions", body: { reaction } }).catch((error) => Swal.fire({ title: "Reaction failed", text: error.message, icon: "error" }));
  const attachmentLink = (message) => {
    if (!message.attachment_url || message.deleted_at) return null;
    const url = message.attachment_url.startsWith("/uploads/") ? `${ASSET_URL}${message.attachment_url}` : message.attachment_url;
    const filename = decodeURIComponent(url.split("/").pop() || "attachment");
    const image = /\.(png|jpe?g|webp|gif)$/i.test(filename);
    return <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-2 block overflow-hidden rounded-2xl border ${message.sender_id === user.id ? "border-white/15 bg-white/10" : "border-slate-100 bg-slate-50"}`}>{image ? <Image src={url} alt={filename} width={420} height={280} unoptimized className="max-h-64 w-full object-cover" /> : <span className="flex items-center gap-3 p-3 text-xs font-bold"><FiFileText className="shrink-0 text-lg" /><span className="truncate">{filename}</span></span>}</a>;
  };
  const sendDisabled = (!draft.trim() && !attachment) || !connected || uploading;

  if (!conversations.length) return <EmptyState Icon={FiMessageCircle} title="No conversations yet" text="Open an applicant profile and start a message before hiring." />;
  return <div className="message-route"><div className="grid min-h-[68vh] overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-100/80 via-cyan-50 to-lime-50/90 shadow-card ring-1 ring-emerald-100/70 lg:grid-cols-[310px_1fr]"><aside className="border-b border-emerald-100/70 bg-gradient-to-b from-white/65 via-emerald-50/70 to-cyan-50/45 lg:border-b-0 lg:border-r"><div className="border-b border-emerald-100/70 bg-white/45 p-4 text-sm font-bold text-forest backdrop-blur">Conversations</div><div className="space-y-3 p-3">{conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`block w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedId === conversation.id ? "border-emerald-300 bg-white/85 ring-2 ring-emerald-100" : "border-emerald-100/70 bg-white/55 hover:border-emerald-200 hover:bg-white/80 hover:shadow-md"}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm text-forest">{conversation.other_user_name}</strong>{Number(conversation.unread_count) > 0 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unread_count}</span>}</div><p className="mt-1 truncate text-xs font-semibold text-emerald-700">{conversation.title}</p><p className="mt-2 truncate text-xs text-slate-400">{conversation.last_message || "Start the conversation"}</p></button>)}</div></aside><section className="flex min-h-[520px] flex-col"><header className="border-b border-emerald-100/70 bg-white/50 p-4 backdrop-blur"><h2 className="font-bold text-forest">{selected?.other_user_name}</h2><p className="mt-1 text-xs text-slate-400">{selected?.title}{typing && " . typing..."}</p></header><div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.95),rgba(240,249,255,0.92),rgba(247,254,231,0.82))] p-4">{messages.map((message) => { const mine = message.sender_id === user.id; const deleted = Boolean(message.deleted_at); const reactions = Object.entries(message.reactions || {}).filter(([, ids]) => ids?.length); return <div key={message.id} onDoubleClick={() => setActionMessageId(actionMessageId === message.id ? null : message.id)} className={`flex cursor-pointer ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "rounded-br-sm bg-forest text-white" : "rounded-bl-sm bg-white text-slate-700"}`}>{deleted ? <p className={`italic ${mine ? "text-white/55" : "text-slate-400"}`}>This message was unsent</p> : <>{message.message && <p className="whitespace-pre-wrap">{message.message}</p>}{attachmentLink(message)}</>} {reactions.length > 0 && <div className={`mt-2 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>{reactions.map(([reaction, ids]) => <button key={reaction} onClick={() => reactMessage(message, ids.map(Number).includes(Number(user.id)) ? null : reaction)} className="rounded-full bg-white/90 px-2 py-0.5 text-xs text-slate-700 shadow-sm">{reaction} {ids.length}</button>)}</div>}<div className={`mt-2 flex flex-wrap items-center gap-2 text-[10px] ${mine ? "justify-end text-white/55" : "text-slate-400"}`}><span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{message.edited_at && !deleted ? " . Edited" : ""}{mine && ` . ${message.read_at ? "Seen" : "Sent"}`}</span>{!deleted && actionMessageId === message.id && <span className="flex gap-1">{message.message && <button onClick={() => copyMessage(message)} className="font-bold underline">Copy</button>}{mine && message.message && <button onClick={() => editMessage(message)} className="font-bold underline">Edit</button>}{mine && <button onClick={() => unsendMessage(message)} className="font-bold underline">Unsend</button>}{reactionOptions.map((reaction) => <button key={reaction} onClick={() => reactMessage(message, reaction)} className="rounded-full px-1 hover:bg-white/20">{reaction}</button>)}</span>}</div></div></div>; })}<div ref={messageEndRef} /></div><div className="border-t border-emerald-100/70 bg-white/45 p-4 backdrop-blur">{attachment && <div className="mb-3 flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span className="flex min-w-0 items-center gap-2 font-bold"><FiPaperclip className="shrink-0" /><span className="truncate">{attachment.name}</span></span><button onClick={clearAttachment} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-emerald-100" aria-label="Remove attachment"><FiX /></button></div>}<div className="flex items-center gap-2"><input ref={fileInputRef} onChange={(event) => setAttachment(event.target.files?.[0] || null)} type="file" className="hidden" /><button onClick={() => chooseAttachment("image/png,image/jpeg,image/webp,image/gif")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700" title="Upload photo" aria-label="Upload photo"><FiImage /></button><button onClick={() => chooseAttachment(".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700" title="Upload document" aria-label="Upload document"><FiFileText /></button><button onClick={() => chooseAttachment(".zip,image/png,image/jpeg,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700" title="Upload file" aria-label="Upload file"><FiFile /></button><input value={draft} onChange={(event) => { setDraft(event.target.value); socket?.emit("typing", { conversationId: selectedId, active: Boolean(event.target.value) }); }} onBlur={() => socket?.emit("typing", { conversationId: selectedId, active: false })} onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && send()} placeholder="Write a message..." className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" /><button onClick={send} disabled={sendDisabled} className="rounded-full bg-forest px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{uploading ? "Uploading..." : "Send"}</button></div></div></section></div></div>;
}

function NotificationsPage({ token, openTab, onUnreadChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadNotifications = useCallback(() => {
    setLoading(true);
    api("/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setNotifications(data.notifications || []);
        onUnreadChange?.(Number(data.unreadCount || 0));
      })
      .catch((error) => Swal.fire({ title: "Notifications", text: error.message, icon: "error" }))
      .finally(() => setLoading(false));
  }, [onUnreadChange, token]);
  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  const markRead = async (notification) => {
    if (!notification.read_at) {
      await api(`/notifications/${notification.id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      onUnreadChange?.(Math.max(0, notifications.filter((item) => !item.read_at).length - 1));
    }
    const data = typeof notification.data === "string" ? JSON.parse(notification.data || "{}") : notification.data || {};
    await routeNotification(notification, data);
  };
  const routeNotification = async (notification, data) => {
    if (data.route) return openTab(data.route, data.routeData || {});
    const projectId = data.projectId || data.project_id;
    const conversationId = data.conversationId || data.conversation_id;
    if (conversationId) return openTab("messages", { conversationId });
    if (["skill_analysis_ready", "skill_reviewed"].includes(notification.type)) return openTab("verify");
    if (["payment_released"].includes(notification.type)) return openTab("payments");
    if (["application_received", "work_submitted"].includes(notification.type) && projectId) {
      try {
        const [projectData, applicationData] = await Promise.all([
          api("/projects/mine", { headers: { Authorization: `Bearer ${token}` } }),
          api(`/projects/${projectId}/applications`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const project = (projectData.projects || []).find((item) => Number(item.id) === Number(projectId)) || { id: projectId, title: notification.title };
        return openTab("applicants", { project, applications: applicationData.applications || [] });
      } catch {
        return openTab("projects");
      }
    }
    if (projectId) return openTab("projects", { projectId });
    return openTab("dashboard");
  };
  const markAllRead = async () => {
    await api("/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    const now = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || now })));
    onUnreadChange?.(0);
  };
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-forest">Notifications</h1><p className="mt-2 text-sm text-slate-500">All project, payment, message and skill updates.</p></div>{unreadCount > 0 && <button onClick={markAllRead} className="rounded-full bg-forest px-4 py-2 text-xs font-bold text-white">Mark all as read</button>}</div>{loading ? <p className="mt-8 text-sm text-slate-400">Loading notifications...</p> : notifications.length ? <div className="mt-7 grid gap-3">{notifications.map((notification) => { const unread = !notification.read_at; return <button key={notification.id} onClick={() => markRead(notification)} className={`w-full rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${unread ? "border-cyan-200 bg-cyan-50 text-forest ring-1 ring-cyan-100" : "border-slate-100 bg-white text-slate-600"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className={`text-sm font-black ${unread ? "text-cyan-800" : "text-forest"}`}>{notification.title}</p><p className="mt-2 text-sm leading-6">{notification.message}</p></div>{unread && <span className="rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-black text-forest">Unread</span>}</div><p className="mt-3 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></button>; })}</div> : <EmptyState Icon={FiBell} title="No notifications yet" text="Your updates will appear here." />}</div>;
}

function EmptyState({ Icon, title, text }) {
  return <div className="grid min-h-[65vh] place-items-center"><div className="max-w-md text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-100 text-3xl text-emerald-700"><Icon /></div><h1 className="mt-5 text-2xl font-bold text-forest">{title}</h1><p className="font-bangla mt-3 leading-7 text-slate-500">{text}</p></div></div>;
}

export default function Home() {
  const [lang, setLang] = useState("bn");
  const [auth, setAuth] = useState(false);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const skipLanguageSave = useRef(true);
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (["bn", "en"].includes(savedLanguage)) setLang(savedLanguage);
      const saved = localStorage.getItem("skillshurokkha_session");
      if (saved) setSession(JSON.parse(saved));
    } catch {
      localStorage.removeItem("skillshurokkha_session");
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    if (skipLanguageSave.current) {
      skipLanguageSave.current = false;
      document.documentElement.lang = lang;
      return;
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);
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

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-[#f6f8f4] text-forest"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl"><FiShield /></div><p className="mt-4 text-sm font-bold text-slate-500">Loading SkillShurokkha...</p></div></div>;
  }

  return (
    <>
      {session ? <Dashboard lang={lang} setLang={setLang} session={session} leave={leave} /> : <Landing lang={lang} setLang={setLang} onLogin={() => setAuth(true)} />}
      <AnimatePresence>{auth && <AuthModal lang={lang} close={() => setAuth(false)} enterDashboard={enterDashboard} />}</AnimatePresence>
    </>
  );
}
