const fs = require('fs');
const file = 'g:/3rd Year/2nd Semester/Software Engineering/SkillSurokkha/frontend/app/page.js';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
const lineIndex = lines.findIndex(l => l.includes('{tx(lang, "লগ আউট", "Log out")}</button>'));

if (lineIndex !== -1) {
  // Replace the classes on that specific line
  let targetLine = lines[lineIndex];
  
  targetLine = targetLine.replace(
    'className="flex w-full items-center gap-3 rounded-2xl border border-rose-300/35 bg-rose-600 px-4 py-3 text-left text-sm font-bold text-white shadow-sm shadow-rose-950/20 transition hover:bg-rose-500"',
    'className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left text-sm font-bold text-white/70 transition hover:bg-rose-600 hover:text-white hover:border-rose-500"'
  );
  
  targetLine = targetLine.replace(
    '<FiLogOut className="shrink-0 text-rose-100" />',
    '<FiLogOut className="shrink-0 text-xl" />'
  );

  lines[lineIndex] = targetLine;
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Successfully updated logout button color!');
} else {
  console.log('Could not find logout button line.');
}
