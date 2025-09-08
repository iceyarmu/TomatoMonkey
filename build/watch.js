#!/usr/bin/env node

/**
 * Watch script for TomatoMonkey
 * Monitors source files and rebuilds automatically
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Project paths
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Files to watch
const WATCH_PATTERNS = [
    path.join(SRC_DIR, '**', '*.js'),
    path.join(SRC_DIR, '**', '*.css')
];

// Watch options
const DEBOUNCE_DELAY = 500; // milliseconds
let debounceTimer = null;
let isBuilding = false;

/**
 * Run the build script
 */
function runBuild() {
    if (isBuilding) {
        return;
    }
    
    isBuilding = true;
    const startTime = Date.now();
    
    console.log(`[${new Date().toLocaleTimeString()}] Building...`);
    
    exec('node build/build.js', (error, stdout, stderr) => {
        const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (error) {
            console.error(`❌ Build failed in ${buildTime}s:`, error.message);
            if (stderr) console.error(stderr);
        } else {
            console.log(`✅ Build completed in ${buildTime}s`);
            if (stdout) console.log(stdout);
        }
        
        isBuilding = false;
    });
}

/**
 * Handle file change
 */
function handleChange(eventType, filename) {
    if (filename) {
        console.log(`[${new Date().toLocaleTimeString()}] File changed: ${filename}`);
    }
    
    // Debounce to avoid multiple rebuilds
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runBuild, DEBOUNCE_DELAY);
}

/**
 * Start watching files
 */
function startWatching() {
    console.log('🔍 Watching for file changes...');
    console.log(`   Source directory: ${SRC_DIR}`);
    console.log('   Press Ctrl+C to stop\n');
    
    // Initial build
    runBuild();
    
    // Watch directories
    const watchDirs = [
        path.join(SRC_DIR, 'core'),
        path.join(SRC_DIR, 'components'),
        path.join(SRC_DIR, 'styles'),
        path.join(SRC_DIR, 'utils')
    ];
    
    watchDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.watch(dir, { recursive: true }, handleChange);
            console.log(`   Watching: ${path.relative(ROOT_DIR, dir)}`);
        }
    });
    
    console.log('');
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Stopping watch mode...');
    process.exit(0);
});

// Start watching
startWatching();