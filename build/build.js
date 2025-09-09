#!/usr/bin/env node

/**
 * Build script for TomatoMonkey
 * Combines all source files into a single Tampermonkey userscript
 */

const fs = require('fs');
const path = require('path');

// Project paths
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_FILE = path.join(ROOT_DIR, 'tomatomonkey.user.js');

/**
 * Scan directory for JS modules
 */
function scanDirectory(dirName) {
    const dirPath = path.join(SRC_DIR, dirName);
    if (!fs.existsSync(dirPath)) return [];
    
    return fs.readdirSync(dirPath)
        .filter(file => file.endsWith('.js'))
        .sort()
        .map(file => {
            const content = readFile(path.join(dirPath, file));
            const moduleInfo = extractModuleInfo(content, [dirName, file]);
            return moduleInfo;
        })
        .filter(Boolean);
}

/**
 * Auto-discover modules by scanning filesystem
 */
function discoverModules() {
    const modules = [
        ...scanDirectory('core'),
        ...scanDirectory('components')
    ];
    
    console.log(`📦 Discovered ${modules.length} modules automatically`);
    return modules;
}

/**
 * Extract module metadata from file content
 */
function extractModuleInfo(content, pathArray) {
    // Extract class name from content
    const classMatch = content.match(/class\s+(\w+)/);
    if (!classMatch) {
        console.warn(`⚠️  No class found in ${pathArray.join('/')}`);
        return null;
    }
    
    // Extract comment from file header
    const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
    const comment = commentMatch ? commentMatch[1] : `${classMatch[1]} - Auto-discovered module`;
    
    return {
        name: classMatch[1],
        path: pathArray,
        comment: comment
    };
}

/**
 * Scan directory for files with extension
 */
function scanAssets(dirName, extension) {
    const dirPath = path.join(SRC_DIR, dirName);
    if (!fs.existsSync(dirPath)) return [];
    
    return fs.readdirSync(dirPath)
        .filter(file => file.endsWith(extension))
        .sort()
        .map(file => [dirName, file]);
}

/**
 * Auto-discover CSS files
 */
function discoverCssFiles() {
    return scanAssets('styles', '.css');
}

/**
 * Extract metadata block from metadata.js
 */
function getMetadataBlock() {
    const metadataFile = readFile(path.join(SRC_DIR, 'metadata.js'));
    const match = metadataFile.match(/(\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==)/);
    if (!match) {
        console.error('💀 Fatal: Invalid metadata block in src/metadata.js');
        process.exit(1);
    }
    return match[1];
}

/**
 * Read file with fail-fast error handling
 */
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`💀 Fatal: Cannot read ${filePath}`);
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * Patterns to clean from module content
 */
const CLEANUP_PATTERNS = [
    /\/\/ 导出模块[\s\S]*$/m,
    /if\s*\(typeof module[\s\S]*?\}\s*else\s+if\s*\(typeof exports[\s\S]*?\}/gm,
    /module\.exports[\s\S]*?;/gm,
    /exports\.\w+[\s\S]*?;/gm,
    /^\/\*\*[\s\S]*?\*\/\n?/
];

/**
 * Clean module content - remove exports and header comments
 */
function cleanModuleContent(content) {
    return CLEANUP_PATTERNS
        .reduce((text, pattern) => text.replace(pattern, ''), content)
        .trim();
}

/**
 * Load and clean all modules
 */
function loadModules() {
    return discoverModules().map(module => ({
        ...module,
        content: cleanModuleContent(readFile(path.join(SRC_DIR, ...module.path)))
    }));
}

/**
 * Process CSS files into minified string
 */
function processCSS() {
    return discoverCssFiles()
        .map(cssFile => readFile(path.join(SRC_DIR, ...cssFile)))
        .join('\n\n')
        .replace(/`/g, '\\`')
        .replace(/\n\s*\/\*[\s\S]*?\*\//g, '')
        .replace(/\n\s+/g, '\n')
        .trim();
}

/**
 * Generate module sections for output
 */
function generateModuleSections(modules) {
    return modules
        .map(module => `    /**\n     * ${module.comment}\n     */\n    ${module.content}`)
        .join('\n\n');
}

/**
 * Process main template with CSS injection
 */
function processMainTemplate(css) {
    return readFile(path.join(SRC_DIR, 'main.js'))
        .replace('/* CSS_PLACEHOLDER */', css);
}

/**
 * Assemble final userscript
 */
function assembleUserscript(modulesSections, mainTemplate) {
    return `${getMetadataBlock()}

(function() {
    'use strict';

    // ========== 核心模块 ==========
    
${modulesSections}
    
    // ========== 应用程序主类 ==========
    
${mainTemplate}

})();
`;
}

/**
 * Write output and report results
 */
function writeOutput(userscript) {
    fs.writeFileSync(OUTPUT_FILE, userscript, 'utf8');
    
    const stats = fs.statSync(OUTPUT_FILE);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ Build successful!`);
    console.log(`   Output: ${OUTPUT_FILE}`);
    console.log(`   Size: ${fileSizeKB} KB`);
}

/**
 * Build the userscript - clean pipeline
 * Discover → Load → Process → Assemble → Write
 */
function build() {
    console.log('Building TomatoMonkey userscript...');
    
    try {
        const modules = loadModules();           // Discover & load modules
        const css = processCSS();               // Process CSS files
        const modulesSections = generateModuleSections(modules);  // Generate sections
        const mainTemplate = processMainTemplate(css);           // Process main template
        const userscript = assembleUserscript(modulesSections, mainTemplate); // Assemble output
        writeOutput(userscript);               // Write result
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

// Run the build
build();