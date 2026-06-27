const fs = require('fs');
const file = 'g:/3rd Year/2nd Semester/Software Engineering/SkillSurokkha/frontend/app/page.js';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

for(let i=786; i<=795; i++) {
  // line 787 in output is index 786
  if(lines[i].includes('<section id="jobs"')) {
    lines[i] = '      <ThemeBackground id="jobs" className="px-5 py-24 lg:px-8">';
  }
  if(lines[i].includes('<SectionTitle')) {
    lines[i] = lines[i].replace('<SectionTitle', '<SectionTitle dark={true}');
  }
  if(lines[i].includes('bg-white shadow-card')) {
    lines[i] = lines[i].replace('bg-white shadow-card', 'bg-white/5 shadow-card');
  }
  if(lines[i].includes('<JobCard ')) {
    lines[i] = lines[i].replace('<JobCard ', '<JobCard dark={true} ');
  }
}

// Now the missing tags: we need to insert `</div></div></ThemeBackground><footer className="bg-ink px-5 py-10 text-white lg:px-8">`
// before line 792 (which is index 791). 
// Wait, looking at the snippet, index 791 has `<div className="mx-auto flex max-w-7xl...`.
// So we insert right before that.

let footerIndex = lines.findIndex((l, i) => i > 780 && l.includes('<div className="mx-auto flex max-w-7xl flex-col justify-between'));

if(footerIndex !== -1) {
  lines.splice(footerIndex, 0, 
    '          </div>',
    '        </div>',
    '      </ThemeBackground>',
    '      <footer className="bg-ink px-5 py-10 text-white lg:px-8">'
  );
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Successfully fixed file!');
} else {
  console.log('Could not find footer div.');
}
