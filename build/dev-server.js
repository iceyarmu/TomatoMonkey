#!/usr/bin/env node

/**
 * Development server for TomatoMonkey
 * Serves the userscript and test page for Tampermonkey debugging
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// Configuration
const PORT = 4005;
const HOST = '127.0.0.1';
const ROOT_DIR = path.join(__dirname, '..');
const USERSCRIPT_PATH = path.join(ROOT_DIR, 'tomatomonkey.user.js');
const TEST_PAGE_PATH = path.join(ROOT_DIR, 'test', 'index.html');

// MIME types
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json',
    '.user.js': 'text/javascript; charset=UTF-8'
};

/**
 * Get local IP address
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return HOST;
}

/**
 * Open URL in default browser
 */
function openBrowser(url) {
    const platform = os.platform();
    let command;
    
    switch (platform) {
        case 'darwin':
            command = `open "${url}"`;
            break;
        case 'win32':
            command = `start "${url}"`;
            break;
        default:
            command = `xdg-open "${url}"`;
    }
    
    exec(command, (error) => {
        if (error) {
            console.log(`  ⚠️  Could not auto-open browser. Please open manually.`);
        }
    });
}

/**
 * Build the userscript before starting server
 */
function buildUserscript() {
    return new Promise((resolve, reject) => {
        console.log('Building userscript...');
        exec('npm run build', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            if (error) {
                console.error('Build failed:', stderr);
                reject(error);
            } else {
                console.log('✅ Build completed successfully');
                resolve();
            }
        });
    });
}

/**
 * Watch for file changes and rebuild
 */
function startWatcher() {
    console.log('Starting file watcher...');
    exec('npm run build:watch', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
        if (error) {
            console.error('Watch mode failed:', stderr);
        }
    });
}

/**
 * Create the development server
 */
function createServer() {
    const server = http.createServer((req, res) => {
        // Set CORS headers for development
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle OPTIONS request
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // Parse URL
        const url = new URL(req.url, `http://${req.headers.host}`);
        let filePath;
        
        // Route handling
        switch (url.pathname) {
            case '/':
            case '/test':
                filePath = TEST_PAGE_PATH;
                break;
            case '/tomatomonkey.user.js':
                filePath = USERSCRIPT_PATH;
                break;
            default:
                // Try to serve file from project root
                filePath = path.join(ROOT_DIR, url.pathname);
        }
        
        // Security check - prevent directory traversal
        if (!filePath.startsWith(ROOT_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
        }
        
        // Check if file exists
        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }
            
            // Determine content type
            const ext = path.extname(filePath);
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            
            // Read and serve file
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                    return;
                }
                
                res.writeHead(200, { 
                    'Content-Type': contentType,
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(data);
                
                // Log request
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] ${req.method} ${url.pathname} - 200`);
            });
        });
    });
    
    return server;
}

/**
 * Main function
 */
async function main() {
    console.log('🍅 TomatoMonkey Development Server\n');
    
    try {
        // Build userscript first
        await buildUserscript();
        
        // Create test page if it doesn't exist
        const testDir = path.join(ROOT_DIR, 'test');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        if (!fs.existsSync(TEST_PAGE_PATH)) {
            console.log('Creating test page...');
            const testPageContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TomatoMonkey 测试页面</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #D95550;
            margin-bottom: 10px;
        }
        .emoji {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .info {
            background: #fef5e7;
            border-left: 4px solid #D95550;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info h3 {
            margin-top: 0;
            color: #D95550;
        }
        .steps {
            background: #f0f7ff;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .steps ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 10px 0;
            line-height: 1.6;
        }
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            color: #d14;
        }
        .status {
            padding: 15px;
            background: #f0f0f0;
            border-radius: 8px;
            margin-top: 20px;
        }
        .status-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .status-indicator.active {
            background: #4CAF50;
            animation: pulse 2s infinite;
        }
        .status-indicator.inactive {
            background: #999;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background: #D95550;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 10px 10px 0;
            transition: background 0.2s;
        }
        .button:hover {
            background: #c94943;
        }
        .test-section {
            margin-top: 30px;
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
        }
        .test-section h3 {
            color: #666;
            margin-top: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🍅</div>
        <h1>TomatoMonkey 测试页面</h1>
        <p>欢迎使用 TomatoMonkey 开发调试环境！</p>
        
        <div class="info">
            <h3>📌 当前状态</h3>
            <div class="status">
                <div class="status-item">
                    <span class="status-indicator active"></span>
                    <span>开发服务器运行中 (端口: ${PORT})</span>
                </div>
                <div class="status-item">
                    <span class="status-indicator" id="script-status"></span>
                    <span id="script-text">检测 Tampermonkey 脚本...</span>
                </div>
            </div>
        </div>
        
        <div class="steps">
            <h3>🚀 如何调试 TomatoMonkey</h3>
            <ol>
                <li>确保浏览器已安装 <strong>Tampermonkey</strong> 扩展</li>
                <li>点击下方按钮安装/更新用户脚本：<br>
                    <a href="http://${HOST}:${PORT}/tomatomonkey.user.js" class="button">安装 TomatoMonkey 脚本</a>
                </li>
                <li>刷新本页面，脚本将自动加载</li>
                <li>使用快捷键 <code>Ctrl+Shift+T</code> 或点击右上角的 🍅 按钮打开设置面板</li>
                <li>或者通过 Tampermonkey 菜单访问设置</li>
            </ol>
        </div>
        
        <div class="test-section">
            <h3>🧪 测试区域</h3>
            <p>这是一个测试区域，您可以在这里测试 TomatoMonkey 的各种功能。</p>
            <p>脚本会在所有网站上运行，但在这个测试页面上您可以安全地进行调试。</p>
            
            <div style="margin-top: 20px;">
                <button onclick="testNotification()" class="button" style="background: #4CAF50;">测试通知</button>
                <button onclick="checkScriptStatus()" class="button" style="background: #2196F3;">检查脚本状态</button>
            </div>
        </div>
    </div>
    
    <script>
        // 检查脚本是否加载
        function checkScriptStatus() {
            const indicator = document.getElementById('script-status');
            const text = document.getElementById('script-text');
            
            if (typeof window.TomatoMonkeyApp !== 'undefined') {
                indicator.classList.add('active');
                text.textContent = 'TomatoMonkey 脚本已加载 ✅';
                console.log('TomatoMonkey App:', window.TomatoMonkeyApp);
            } else {
                indicator.classList.add('inactive');
                text.textContent = 'TomatoMonkey 脚本未检测到 ❌';
            }
        }
        
        // 测试通知
        function testNotification() {
            if (typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: 'TomatoMonkey',
                    text: '通知功能正常工作！',
                    timeout: 3000
                });
            } else {
                alert('GM_notification 不可用，请确保脚本已正确加载');
            }
        }
        
        // 页面加载后检查状态
        window.addEventListener('load', () => {
            setTimeout(checkScriptStatus, 1000);
        });
        
        // 监听脚本加载事件
        document.addEventListener('tomato-monkey-initialized', () => {
            checkScriptStatus();
        });
    </script>
</body>
</html>`;
            fs.writeFileSync(TEST_PAGE_PATH, testPageContent);
            console.log('✅ Test page created');
        }
        
        // Start file watcher
        startWatcher();
        
        // Create and start server
        const server = createServer();
        const localIP = getLocalIP();
        
        server.listen(PORT, HOST, () => {
            console.log('\n✨ Server is running!\n');
            console.log(`  Local:    http://${HOST}:${PORT}`);
            if (localIP !== HOST) {
                console.log(`  Network:  http://${localIP}:${PORT}`);
            }
            console.log(`  Script:   http://${HOST}:${PORT}/tomatomonkey.user.js`);
            console.log('\n📝 Instructions:');
            console.log('  1. Install the userscript in Tampermonkey');
            console.log('  2. Visit the test page to debug');
            console.log('  3. Files will auto-rebuild on changes');
            console.log('\nPress Ctrl+C to stop the server\n');
            
            // Open browser
            setTimeout(() => {
                openBrowser(`http://${HOST}:${PORT}`);
            }, 1000);
        });
        
        // Handle server errors
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                console.log('Please stop the other process or use a different port');
            } else {
                console.error('Server error:', err);
            }
            process.exit(1);
        });
        
    } catch (error) {
        console.error('Failed to start development server:', error);
        process.exit(1);
    }
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