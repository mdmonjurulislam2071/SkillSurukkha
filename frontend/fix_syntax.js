const fs = require('fs');
const file = 'g:/3rd Year/2nd Semester/Software Engineering/SkillSurokkha/frontend/app/page.js';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

// Verify that the lines match what we expect before splicing
if (lines[741].includes('<ThemeBackground id="features"') && 
    lines[759].includes('<ThemeBackground id="features"')) {
  
  // Remove 18 lines starting from index 741
  lines.splice(741, 18);
  
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Successfully removed the broken duplicate block!');
} else {
  console.log('Line mismatch. Safety abort.');
  console.log('Line 741:', lines[741]);
  console.log('Line 759:', lines[759]);
}
