process.env.PORT = '10000';
require('./lib/src/index.js');
setTimeout(() => {
    console.log(JSON.stringify(process.memoryUsage()));
    process.exit(0);
}, 10000);
