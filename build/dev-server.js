#!/usr/bin/env node

/**
 * Development server for TomatoMonkey
 * Serves the userscript and test page for Tampermonkey debugging
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const PORT = process.env.PORT || 4005;
const HOST = '127.0.0.1';
const ROOT_DIR = path.join(__dirname, '..');
const USERSCRIPT_PATH = path.join(ROOT_DIR, 'tomatomonkey.user.js');
const TEST_PAGE_PATH = path.join(ROOT_DIR, 'test', 'index.html');

// Simple MIME types - no special cases
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json'
};

// Routes - constant, not created per request
const ROUTES = {
    '/': TEST_PAGE_PATH,
    '/test': TEST_PAGE_PATH,
    '/tomatomonkey.user.js': USERSCRIPT_PATH
};


/**
 * Open browser - simple cross-platform
 */
function openBrowser(url) {
    const cmd = process.platform === 'win32' ? 'start' : 'open';
    exec(`${cmd} "${url}"`, () => {});
}



/**
 * Static file server - one function, one purpose
 */
function createServer() {
    return http.createServer((req, res) => {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200);
            res.end();
            return;
        }
        
        const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
        const filePath = ROUTES[pathname] || path.join(ROOT_DIR, pathname);
        
        if (!filePath.startsWith(ROOT_DIR)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('404 Not Found');
                return;
            }
            
            const contentType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
            
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        });
    });
}

/**
 * Main - serve files, nothing else
 */
function main() {
    console.log('🍅 TomatoMonkey Development Server');
    
    // Build first
    console.log('Building...');
    exec('npm run build', { cwd: ROOT_DIR }, (error, _, stderr) => {
        if (error) {
            console.error('Build failed:', stderr);
            process.exit(1);
        }
        
        // Start watcher
        exec('npm run build:watch', { cwd: ROOT_DIR });
        
        // Create server
        const server = createServer();
        
        server.listen(PORT, HOST, () => {
            console.log(`\nRunning: http://${HOST}:${PORT}`);
            console.log(`Script:  http://${HOST}:${PORT}/tomatomonkey.user.js\n`);
            openBrowser(`http://${HOST}:${PORT}`);
        });
        
        server.on('error', () => {
            console.error(`Port ${PORT} in use`);
            process.exit(1);
        });
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down development server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

// Start the server
main();