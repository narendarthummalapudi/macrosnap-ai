import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/fetch\(`\$\{\s*API_BASE_URL\s*\}\s*\/api\/([^"]+)",/g, 'fetch(API_BASE_URL + "/api/$1",');

fs.writeFileSync('src/App.tsx', c);
console.log('Fixed spacing issues in App.tsx');
