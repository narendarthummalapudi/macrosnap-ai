process.env.PORT = '10000';

function formatMem(usage) {
    return `RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB, HeapTotal: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB, HeapUsed: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB, External: ${(usage.external / 1024 / 1024).toFixed(2)} MB, ArrayBuffers: ${(usage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`;
}

console.log("Memory BEFORE startup:", formatMem(process.memoryUsage()));

// Boot backend
require('./lib/src/index.js');

setTimeout(() => {
    console.log("Memory AT startup:", formatMem(process.memoryUsage()));
}, 2000);

setTimeout(() => {
    console.log("Memory AFTER 30s:", formatMem(process.memoryUsage()));
    require('http').get('http://127.0.0.1:10000/api/health', (res) => {
        console.log('/api/health hit');
        setTimeout(() => {
            console.log("Memory AFTER /api/health:", formatMem(process.memoryUsage()));
        }, 1000);
    });
}, 30000);

setTimeout(() => {
    require('http').get('http://127.0.0.1:10000/', (res) => {
        console.log('/ hit');
        setTimeout(() => {
            console.log("Memory AFTER /:", formatMem(process.memoryUsage()));
            process.exit(0);
        }, 1000);
    });
}, 35000);
