import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// The faulty tool injected spaces exactly like `${ foo }` instead of `${foo}`.
c = c.replace(/\$\{\s+([\s\S]*?)\s+\}/g, '${$1}');

fs.writeFileSync('src/App.tsx', c);
console.log('Cleaned up template literal variables!');
