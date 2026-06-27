const fs = require('fs');
const file = 'g:/3rd Year/2nd Semester/Software Engineering/SkillSurokkha/frontend/app/page.js';
let content = fs.readFileSync(file, 'utf8');

// We just need to change the #jobs ThemeBackground back to section and remove dark={true} props from that section.
// This section is exactly after the features section.
// Let's find the lines that correspond to the jobs section.

let lines = content.split('\n');
let jobsStartIndex = lines.findIndex(l => l.includes('<ThemeBackground id="jobs"'));

if (jobsStartIndex !== -1) {
  // 1. Revert opening tag
  lines[jobsStartIndex] = '      <section id="jobs" className="bg-[#f6f8f4] px-5 py-24 lg:px-8">';
  
  // 2. Revert SectionTitle dark={true}
  let titleIndex = lines.findIndex((l, i) => i > jobsStartIndex && l.includes('<SectionTitle dark={true} kicker={tx(lang, "নতুন সুযোগ"'));
  if (titleIndex !== -1) {
    lines[titleIndex] = lines[titleIndex].replace('dark={true} ', '');
  }
  
  // 3. Revert pulse skeletons
  let skeletonIndex = lines.findIndex((l, i) => i > jobsStartIndex && l.includes('bg-white/5 shadow-card'));
  if (skeletonIndex !== -1) {
    lines[skeletonIndex] = lines[skeletonIndex].replace('bg-white/5 shadow-card', 'bg-white shadow-card');
  }
  
  // 4. Revert JobCard dark={true}
  let jobCardIndex = skeletonIndex !== -1 ? skeletonIndex : lines.findIndex((l, i) => i > jobsStartIndex && l.includes('<JobCard dark={true}'));
  if (jobCardIndex !== -1) {
    lines[jobCardIndex] = lines[jobCardIndex].replace('<JobCard dark={true} ', '<JobCard ');
  }
  
  // 5. Revert closing tag
  let jobsEndIndex = lines.findIndex((l, i) => i > jobsStartIndex && l.includes('</ThemeBackground>'));
  if (jobsEndIndex !== -1) {
    lines[jobsEndIndex] = '      </section>';
  }

  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Successfully reverted #jobs section to white!');
} else {
  console.log('Could not find #jobs ThemeBackground tag.');
}
