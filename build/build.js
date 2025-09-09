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
 * Auto-discover modules by scanning filesystem
 * File system IS the configuration - no hardcoded lists
 */
function discoverModules() {
    const modules = [];
    
    // Scan core modules - load order matters, core first
    const coreDir = path.join(SRC_DIR, 'core');
    if (fs.existsSync(coreDir)) {
        const coreFiles = fs.readdirSync(coreDir)
            .filter(file => file.endsWith('.js'))
            .sort(); // Alphabetical order for consistency
            
        for (const file of coreFiles) {
            const filePath = path.join(coreDir, file);
            const content = readFile(filePath);
            const moduleInfo = extractModuleInfo(content, ['core', file]);
            if (moduleInfo) modules.push(moduleInfo);
        }
    }
    
    // Scan component modules
    const componentsDir = path.join(SRC_DIR, 'components');
    if (fs.existsSync(componentsDir)) {
        const componentFiles = fs.readdirSync(componentsDir)
            .filter(file => file.endsWith('.js'))
            .sort();
            
        for (const file of componentFiles) {
            const filePath = path.join(componentsDir, file);
            const content = readFile(filePath);
            const moduleInfo = extractModuleInfo(content, ['components', file]);
            if (moduleInfo) modules.push(moduleInfo);
        }
    }
    
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
 * Auto-discover CSS files
 */
function discoverCssFiles() {
    const stylesDir = path.join(SRC_DIR, 'styles');
    if (!fs.existsSync(stylesDir)) return [];
    
    return fs.readdirSync(stylesDir)
        .filter(file => file.endsWith('.css'))
        .sort()
        .map(file => ['styles', file]);
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
 * Clean module content - remove exports and header comments
 */
function cleanModuleContent(content) {
    return content
        // Remove all export patterns - one regex to rule them all
        .replace(/\/\/ 导出模块[\s\S]*$/m, '')
        .replace(/if\s*\(typeof module[\s\S]*?\}\s*else\s+if\s*\(typeof exports[\s\S]*?\}/gm, '')
        .replace(/module\.exports[\s\S]*?;/gm, '')
        .replace(/exports\.\w+[\s\S]*?;/gm, '')
        // Remove file header comment block
        .replace(/^\/\*\*[\s\S]*?\*\/\n?/, '')
        .trim();
}

/**
 * Build the userscript
 */
function build() {
    console.log('Building TomatoMonkey userscript...');
    
    try {
        // Auto-discover and load modules - filesystem IS the configuration
        const modules = discoverModules().map(module => ({
            ...module,
            content: cleanModuleContent(readFile(path.join(SRC_DIR, ...module.path)))
        }));
        
        // Auto-discover and process CSS - escape backticks and minimize
        const cssFiles = discoverCssFiles();
        const processedCSS = cssFiles
            .map(cssFile => readFile(path.join(SRC_DIR, ...cssFile)))
            .join('\n\n')
            .replace(/`/g, '\\`')
            .replace(/\n\s*\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\n\s+/g, '\n') // Remove extra indentation
            .trim();
        
        // Generate module sections - data drives template
        const modulesSections = modules
            .map(module => `    /**\n     * ${module.comment}\n     */\n    ${module.content}`)
            .join('\n\n');
        
        // Load and process main application template
        const mainTemplate = readFile(path.join(SRC_DIR, 'main.js'))
            .replace('/* CSS_PLACEHOLDER */', processedCSS);
        
        // Build the complete userscript - clean separation of concerns
        const userscript = `${getMetadataBlock()}

(function() {
    'use strict';

    // ========== 核心模块 ==========
    
${modulesSections}
    
    // ========== 应用程序主类 ==========
    
${mainTemplate}

})();
`;

        // Write the output file
        fs.writeFileSync(OUTPUT_FILE, userscript, 'utf8');
        
        // Get file size
        const stats = fs.statSync(OUTPUT_FILE);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        
        console.log(`✅ Build successful!`);
        console.log(`   Output: ${OUTPUT_FILE}`);
        console.log(`   Size: ${fileSizeKB} KB`);
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

// Run the build
build();