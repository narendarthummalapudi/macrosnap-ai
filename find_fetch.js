const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
code.split('\n').forEach((l, i) => {
    if (l.includes('fetch')) console.log(`${i + 1}: ${l}`);
});
