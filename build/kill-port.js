#!/usr/bin/env node

/**
 * Kill process running on port 4005
 * Supports macOS, Linux, and Windows
 */

const { exec } = require('child_process');
const os = require('os');

const PORT = 4005;

function killPort(port) {
    const platform = os.platform();
    let command;
    
    switch (platform) {
        case 'darwin': // macOS
        case 'linux':
            // Find process using port and kill it
            command = `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`;
            break;
        case 'win32': // Windows
            // Find and kill process on Windows
            command = `FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port}') DO TaskKill /PID %P /F`;
            break;
        default:
            console.error(`❌ Unsupported platform: ${platform}`);
            process.exit(1);
    }
    
    console.log(`🔍 Looking for processes on port ${port}...`);
    
    exec(command, (error, stdout, stderr) => {
        if (error && error.code !== 1) { // Code 1 means no process found, which is OK
            console.error(`❌ Error killing process on port ${port}:`, error.message);
            
            // Fallback for macOS/Linux if lsof is not available
            if (platform === 'darwin' || platform === 'linux') {
                console.log('🔄 Trying alternative method...');
                const fallbackCommand = `kill -9 $(ps aux | grep 'node.*dev-server' | grep -v grep | awk '{print $2}') 2>/dev/null || true`;
                exec(fallbackCommand, (err) => {
                    if (!err) {
                        console.log(`✅ Successfully killed dev server process`);
                    } else {
                        console.log(`ℹ️  No process found on port ${port} or already killed`);
                    }
                });
            }
        } else {
            if (stdout || stderr) {
                console.log(`✅ Successfully killed process on port ${port}`);
            } else {
                console.log(`ℹ️  No process found on port ${port}`);
            }
        }
    });
}

// Kill processes on the default port
killPort(PORT);

// Also try to kill any node dev-server processes
if (os.platform() === 'darwin' || os.platform() === 'linux') {
    setTimeout(() => {
        exec("pkill -f 'node.*dev-server' 2>/dev/null || true", (error) => {
            if (!error) {
                console.log('✅ Cleaned up any remaining dev server processes');
            }
        });
    }, 100);
}