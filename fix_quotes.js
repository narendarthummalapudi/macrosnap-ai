import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/fetch\(`\$\{API_BASE_URL\}\/api\/([^"]+)",/g, 'fetch(`${API_BASE_URL}/api/$1`,');
c = c.replace(/fetch\(`\$\{API_BASE_URL\}\/api\/([a-zA-Z0-9\-\/]+)"\)/g, 'fetch(`${API_BASE_URL}/api/$1`)'); // For fetch("/api/project-files")

// Handle the template literal spaces
c = c.replace(/`\$\{ API_BASE_URL \} \/api\/db \/ meals \/ \$\{ toDeleteId \} `/g, '`${API_BASE_URL}/api/db/meals/${toDeleteId}`');
c = c.replace(/`Bearer \$\{ token \} `/g, '`Bearer ${token}`');

fs.writeFileSync('src/App.tsx', c);
console.log('Fixed quotes in App.tsx (ESM)!');
