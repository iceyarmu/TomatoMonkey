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

// Tampermonkey metadata block
const METADATA_BLOCK = `// ==UserScript==
// @name         TomatoMonkey
// @namespace    https://github.com/your-username/tomatomonkey
// @version      1.0.0
// @description  专注时间管理工具：番茄钟技术与任务管理的结合
// @author       TomatoMonkey Team
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-end
// @updateURL    
// @downloadURL  
// ==/UserScript==`;

/**
 * Read file with error handling
 */
function readFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return '';
        }
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return '';
    }
}

/**
 * Extract the class content from a module file
 */
function extractModuleContent(content, className) {
    // Remove module exports - handle the complete if-else structure
    content = content.replace(/\/\/ 导出模块[\s\S]*?$/m, '');
    
    // Remove the entire if-else export block
    content = content.replace(/if\s*\(typeof module[\s\S]*?\}\s*else\s+if\s*\(typeof exports[\s\S]*?\}/gm, '');
    
    // Remove standalone module.exports and exports statements
    content = content.replace(/module\.exports[\s\S]*?;/gm, '');
    content = content.replace(/exports\.\w+[\s\S]*?;/gm, '');
    
    // Remove file header comments but keep class comments
    const lines = content.split('\n');
    let inHeaderComment = false;
    let filteredLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if we're in a file header comment
        if (i === 0 && line.startsWith('/**')) {
            inHeaderComment = true;
            continue;
        }
        
        if (inHeaderComment && line.includes('*/')) {
            inHeaderComment = false;
            continue;
        }
        
        if (!inHeaderComment) {
            filteredLines.push(line);
        }
    }
    
    return filteredLines.join('\n').trim();
}

/**
 * Build the userscript
 */
function build() {
    console.log('Building TomatoMonkey userscript...');
    
    try {
        // Read source files
        const storageManager = readFile(path.join(SRC_DIR, 'core', 'storage-manager.js'));
        const taskManager = readFile(path.join(SRC_DIR, 'core', 'task-manager.js'));
        const settingsPanel = readFile(path.join(SRC_DIR, 'components', 'settings-panel.js'));
        const todoList = readFile(path.join(SRC_DIR, 'components', 'todo-list.js'));
        const mainCSS = readFile(path.join(SRC_DIR, 'styles', 'main.css'));
        
        // Extract module content
        const storageManagerContent = extractModuleContent(storageManager, 'StorageManager');
        const taskManagerContent = extractModuleContent(taskManager, 'TaskManager');
        const settingsPanelContent = extractModuleContent(settingsPanel, 'SettingsPanel');
        const todoListContent = extractModuleContent(todoList, 'TodoList');
        
        // Process CSS - escape backticks and minimize
        const processedCSS = mainCSS
            .replace(/`/g, '\\`')
            .replace(/\n\s*\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\n\s+/g, '\n') // Remove extra indentation
            .trim();
        
        // Build the complete userscript
        const userscript = `${METADATA_BLOCK}

/**
 * TomatoMonkey - 专注时间管理工具
 * 
 * 主入口文件，负责：
 * 1. 初始化脚本环境
 * 2. 加载核心模块
 * 3. 启动应用程序
 */

(function() {
    'use strict';

    // ========== 核心模块 ==========
    
    /**
     * StorageManager - 数据持久化管理器
     */
    ${storageManagerContent}
    
    /**
     * TaskManager - 任务管理器
     */
    ${taskManagerContent}
    
    /**
     * SettingsPanel - 设置面板UI组件
     */
    ${settingsPanelContent}
    
    /**
     * TodoList - ToDo列表UI组件
     */
    ${todoListContent}
    
    // ========== 应用程序主类 ==========
    
    /**
     * TomatoMonkeyApp - 应用程序主类
     */
    class TomatoMonkeyApp {
        constructor() {
            this.isInitialized = false;
            this.modules = {};
        }

        /**
         * 初始化应用程序
         */
        async init() {
            if (this.isInitialized) {
                return;
            }

            try {
                console.log('[TomatoMonkey] Initializing application...');
                
                // 等待DOM加载完成
                if (document.readyState === 'loading') {
                    await new Promise(resolve => {
                        document.addEventListener('DOMContentLoaded', resolve);
                    });
                }

                // 加载样式
                this.loadStyles();
                
                // 初始化核心模块
                await this.initializeCore();
                
                // 初始化设置面板
                this.initializeSettingsPanel();
                
                // 设置键盘快捷键
                this.setupKeyboardShortcuts();
                
                // 注册 Tampermonkey 菜单命令
                this.registerMenuCommands();

                this.isInitialized = true;
                console.log('[TomatoMonkey] Application initialized successfully');
                
            } catch (error) {
                console.error('[TomatoMonkey] Failed to initialize application:', error);
            }
        }

        /**
         * 加载CSS样式
         */
        loadStyles() {
            const styles = \`${processedCSS}\`;
            GM_addStyle(styles);
        }

        /**
         * 初始化核心模块
         */
        async initializeCore() {
            // 初始化存储管理器
            this.storageManager = new StorageManager();
            
            // 初始化任务管理器
            this.taskManager = TaskManager.getInstance();
            await this.taskManager.initialize(this.storageManager);
            
            console.log('[TomatoMonkey] Core modules initialized');
        }

        /**
         * 初始化设置面板
         */
        initializeSettingsPanel() {
            // 创建设置面板触发按钮
            this.createTriggerButton();
            
            // 创建设置面板
            this.settingsPanel = new SettingsPanel();
            
            // 初始化 ToDo 列表组件
            this.initializeTodoList();
        }

        /**
         * 初始化 ToDo 列表组件
         */
        initializeTodoList() {
            // 获取 ToDo 容器
            const todoContainer = document.getElementById('todo-container');
            if (!todoContainer) {
                console.error('[TomatoMonkey] Todo container not found');
                return;
            }
            
            // 创建 ToDo 列表组件
            this.todoList = new TodoList(todoContainer, this.taskManager);
            
            // 注册组件到设置面板
            this.settingsPanel.registerTabComponent('todo', this.todoList);
            
            console.log('[TomatoMonkey] Todo list initialized');
        }

        /**
         * 创建触发设置面板的按钮
         */
        createTriggerButton() {
            const triggerButton = document.createElement('div');
            triggerButton.id = 'tomato-monkey-trigger';
            triggerButton.innerHTML = '🍅';
            triggerButton.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: #D95550;
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 12px rgba(217, 85, 80, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            \`;
            
            triggerButton.addEventListener('mouseenter', () => {
                triggerButton.style.transform = 'scale(1.1)';
                triggerButton.style.boxShadow = '0 6px 16px rgba(217, 85, 80, 0.4)';
            });
            
            triggerButton.addEventListener('mouseleave', () => {
                triggerButton.style.transform = 'scale(1)';
                triggerButton.style.boxShadow = '0 4px 12px rgba(217, 85, 80, 0.3)';
            });
            
            triggerButton.addEventListener('click', () => {
                this.toggleSettingsPanel();
            });

            document.body.appendChild(triggerButton);
        }

        /**
         * 切换设置面板显示状态
         */
        toggleSettingsPanel() {
            if (this.settingsPanel) {
                this.settingsPanel.toggle();
            } else {
                console.log('[TomatoMonkey] Settings panel not initialized yet');
            }
        }

        /**
         * 设置键盘快捷键
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + Shift + T 打开/关闭设置面板
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    this.toggleSettingsPanel();
                }
            });
        }

        /**
         * 注册 Tampermonkey 菜单命令
         */
        registerMenuCommands() {
            // 注册打开设置面板的菜单命令
            GM_registerMenuCommand('🍅 打开设置面板', () => {
                this.toggleSettingsPanel();
            }, 'o');
            
            // 注册快速创建任务的菜单命令
            GM_registerMenuCommand('➕ 快速创建任务', () => {
                if (this.settingsPanel) {
                    this.settingsPanel.show();
                    this.settingsPanel.activateTab('todo');
                }
            }, 'n');
            
            console.log('[TomatoMonkey] Menu commands registered');
        }

        /**
         * 获取应用程序实例
         */
        static getInstance() {
            if (!TomatoMonkeyApp.instance) {
                TomatoMonkeyApp.instance = new TomatoMonkeyApp();
            }
            return TomatoMonkeyApp.instance;
        }
    }

    // 启动应用程序
    const app = TomatoMonkeyApp.getInstance();
    app.init();

    // 将应用程序实例暴露到页面作用域以便调试
    // 使用 unsafeWindow 确保测试页面可以访问
    if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.TomatoMonkeyApp = app;
    } else {
        window.TomatoMonkeyApp = app;
    }

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