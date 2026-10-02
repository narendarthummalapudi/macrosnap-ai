const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the template literals that got spaces
c = c.replace(/fetch\(`\$\{\s*API_BASE_URL\s*\}\s*\/api\/db\s*\/\s*meals\s*\/\s*\$\{\s*toDeleteId\s*\}\s*`,/g, 'fetch(`${API_BASE_URL}/api/db/meals/${toDeleteId}`,');
c = c.replace(/Authorization:\s*`Bearer\s*\$\{\s*token\s*\}\s*`/g, 'Authorization: `Bearer ${token}`');

fs.writeFileSync('src/App.tsx', c);
console.log('Cleaned App.tsx!');
