import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Undo bad replace
c = c.replace(/fetch\(`\$\{API_BASE_URL\}\/api\/([^`]+)`/g, 'fetch("/api/$1"');
c = c.replace(/fetch\(`\$\{API_BASE_URL\}\/api([^"]+)",/g, 'fetch("/api$1",');
c = c.replace(/fetch\(`\$\{API_BASE_URL\}\/api\/(.*?)`/g, 'fetch("/api/$1"');
c = c.replace(/fetch\(`\$\{API_BASE_URL\}\/api/g, 'fetch("/api');
c = c.replace(/fetch\(`\(\{API_BASE_URL\}\/api/g, 'fetch("/api');

// Safe replace without nested backticks
c = c.replace(/fetch\("\/api\//g, 'fetch(API_BASE_URL + "/api/');
c = c.replace(/fetch\(`\/api\//g, 'fetch(API_BASE_URL + `/api/');

fs.writeFileSync('src/App.tsx', c);
console.log('Reverted and safely replaced App.tsx!');
