import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/fetch\("\/api\//g, 'fetch((import.meta.env.VITE_API_BASE_URL || "") + "/api/');
c = c.replace(/fetch\(`\/api\//g, 'fetch((import.meta.env.VITE_API_BASE_URL || "") + `/api/');

fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx nicely updated with VITE_API_BASE_URL!');
