const http = require('http');

async function testMemory() {
    console.log("Starting memory test...");

    // Launch the server programmatically or just start the compiled index
    const { execSync, spawn } = require('child_process');

    const serverProcess = spawn('node', ['lib/src/index.js'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PORT: '10000' }
    });

    serverProcess.stdout.on('data', (d) => console.log(`[SERVER] ${d.toString().trim()}`));
    serverProcess.stderr.on('data', (d) => console.error(`[SERVER_ERR] ${d.toString().trim()}`));

    // Function to get accurate process memory using process.memoryUsage() by executing a node script that connects to it, 
    // or we can just inject a memory route if we could. Let's just monitor external OS memory. 
    // Actually, wait: We can't use process.memoryUsage() of a child process easily without an IPC channel or route. 
    // Let me just create a dummy server wrapper that requires the index and prints memory!
}
testMemory();
