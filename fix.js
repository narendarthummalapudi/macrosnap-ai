const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/fetch\(`\$\{API_BASE_URL\}\/api/g, 'fetch(API_BASE_URL + "/api');

const addString = `
// Constants for App
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
`;

if (!c.includes('VITE_API_BASE_URL')) {
    c = c.replace('// Enum for operation types for error handling', addString + '\n// Enum for operation types for error handling');
}

fs.writeFileSync('src/App.tsx', c);
console.log('Fixed App.tsx successfully!');
