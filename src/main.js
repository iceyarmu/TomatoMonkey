/**
 * TomatoMonkey Main Application Entry Point
 * 
 * 主入口文件，负责：
 * 1. 初始化脚本环境
 * 2. 加载核心模块
 * 3. 启动应用程序
 */


/**
 * PageInterceptor - 页面拦截逻辑
 * 职责：只负责判断是否应该拦截页面
 */
class PageInterceptor {
    constructor(storageManager, whitelistManager) {
        this.storage = storageManager;
        this.whitelist = whitelistManager;
    }
    
    shouldBlockPage(url = window.location.href) {
        const timerState = this.storage.getData("timerState");
        const blockerState = this.storage.getData("blockerState");
        
        // 三个条件，一个结果，没有特殊情况
        return timerState?.status === 'running' && 
               blockerState?.isActive !== false &&
               !this.whitelist.isDomainAllowed(url) && 
               !this.isSystemUrl(url);
    }
    
    isSystemUrl(url) {
        const systemPatterns = [
            'about:', 'chrome://', 'chrome-extension://', 'moz-extension://',
            'edge://', 'opera://', 'file://', 'data:', 'javascript:', 'blob:',
            'localhost', '127.0.0.1', '0.0.0.0'
        ];
        return systemPatterns.some(pattern => url.toLowerCase().startsWith(pattern));
    }
}

/**
 * UIController - 界面控制器
 * 职责：只管理UI创建和事件
 */
class UIController {
    constructor(settingsPanel, taskManager) {
        this.settingsPanel = settingsPanel;
        this.taskManager = taskManager;
    }
    
    setupUI() {
        this.createTriggerButton();
        this.setupKeyboardShortcuts();
        this.registerMenuCommands();
    }
    
    createTriggerButton() {
        const button = document.createElement('div');
        button.id = 'tomato-monkey-trigger';
        button.innerHTML = '🍅';
        button.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            width: 50px; height: 50px;
            background: #D95550; color: white;
            border: none; border-radius: 50%;
            cursor: pointer; z-index: 10001;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(217, 85, 80, 0.3);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 16px rgba(217, 85, 80, 0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(217, 85, 80, 0.3)';
        });
        
        button.addEventListener('click', () => this.settingsPanel?.toggle());
        document.body.appendChild(button);
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.settingsPanel?.toggle();
            }
        });
    }
    
    registerMenuCommands() {
        GM_registerMenuCommand('🍅 打开设置面板', () => {
            this.settingsPanel?.toggle();
        }, 'o');
        
        GM_registerMenuCommand('➕ 快速创建任务', () => {
            this.settingsPanel?.show();
            this.settingsPanel?.activateTab('todo');
        }, 'n');
    }
}

/**
 * TomatoMonkeyApp - Linus式应用程序控制器
 * 职责：协调各个组件，使用依赖注入容器
 */
class TomatoMonkeyApp {
    constructor() {
        // 使用Application依赖注入容器
        this.app = new Application();
        this.initialized = false;
        
        console.log('[TomatoMonkey] Created app with DI container');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('[TomatoMonkey] Initializing application with DI container...');
            
            // 等待DOM，一行搞定
            await this.waitForDOM();
            
            // 加载样式
            this.loadStyles();
            
            // 初始化Application容器
            await this.app.initialize();
            
            // 设置UI
            this.setupUI();
            
            // 检查拦截逻辑
            this.checkInterception();

            this.initialized = true;
            console.log('[TomatoMonkey] Application initialized successfully with DI');
            
        } catch (error) {
            console.error('[TomatoMonkey] Failed to initialize application:', error);
        }
    }
    
    async waitForDOM() {
        if (document.readyState !== 'loading') return;
        return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    
    // 原create方法已移至Application容器，此处保留兼容接口
    
    setupUI() {
        console.log('[TomatoMonkey] Setting up UI...');
        
        // 直接使用DI容器的服务
        this.settingsPanel = this.app.settingsPanel;
        this.taskManager = this.app.taskService;
        
        // 创建UI控制器
        const ui = new UIController(this.app.settingsPanel, this.app.taskService);
        ui.setupUI();
        
        // 创建TodoList组件
        this.setupTodoList();
        
        console.log('[TomatoMonkey] UI setup complete');
    }
    
    setupTodoList() {
        // 等待DOM元素创建
        setTimeout(() => {
            const todoContainer = document.getElementById('todo-container');
            if (todoContainer) {
                const todoList = this.app.createTodoList(todoContainer);
                this.app.settingsPanel.registerTabComponent('todo', todoList);
                console.log('[TomatoMonkey] TodoList component created');
            }
        }, 100);
    }
    
    checkInterception() {
        // 创建页面拦截器
        const interceptor = new PageInterceptor(this.app.storage, this.app.whitelistManager);
        if (interceptor.shouldBlockPage()) {
            this.app.blockerFeature.activateBlocking();
        }
    }

    loadStyles() {
        const styles = `/* CSS_PLACEHOLDER */`;
        GM_addStyle(styles);
    }
    
    // 向后兼容接口
    toggleSettingsPanel() {
        this.settingsPanel?.toggle();
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