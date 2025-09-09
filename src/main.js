/**
 * TomatoMonkey Main Application Entry Point
 * 
 * 主入口文件，负责：
 * 1. 初始化脚本环境
 * 2. 加载核心模块
 * 3. 启动应用程序
 */

/**
 * AppCore - 模块生命周期管理器
 * 职责：只管理模块注册和初始化，不管其他任何事
 */
class AppCore {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
    }
    
    register(name, module) {
        this.modules.set(name, module);
        return this;
    }
    
    get(name) {
        return this.modules.get(name);
    }
    
    async initialize() {
        for (const [name, module] of this.modules) {
            if (typeof module.initialize === 'function') {
                await module.initialize();
            }
        }
        this.initialized = true;
    }
}

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
 * TomatoMonkeyApp - 轻量级应用程序控制器
 * 职责：协调各个组件，保持向后兼容
 */
class TomatoMonkeyApp {
    constructor() {
        this.core = new AppCore();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('[TomatoMonkey] Initializing application...');
            
            // 等待DOM，一行搞定
            await this.waitForDOM();
            
            // 加载样式
            this.loadStyles();
            
            // 声明式模块注册，顺序即依赖
            this.registerModules();
            
            // 初始化所有模块
            await this.core.initialize();
            
            // 设置UI
            this.setupUI();
            
            // 检查拦截逻辑
            this.checkInterception();

            this.initialized = true;
            console.log('[TomatoMonkey] Application initialized successfully');
            
        } catch (error) {
            console.error('[TomatoMonkey] Failed to initialize application:', error);
        }
    }
    
    async waitForDOM() {
        if (document.readyState !== 'loading') return;
        return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    registerModules() {
        // 模块定义表：[名称, 类, 依赖]
        const modules = [
            ['storage', new StorageManager()],
            ['whitelist', this.createWhitelistManager()],
            ['task', this.createTaskManager()],
            ['timer', this.createTimerManager()],
            ['focus', this.createFocusPage()],
            ['blocker', this.createBlockerManager()],
            ['interceptor', this.createPageInterceptor()],
            ['settings', this.createSettingsPanel()],
            ['ui', this.createUIController()]
        ];
        
        modules.forEach(([name, instance]) => {
            this.core.register(name, instance);
        });
    }
    
    createWhitelistManager() {
        const manager = new WhitelistManager();
        const storage = this.core.get('storage');
        manager.initialize = async () => await manager.initialize(storage);
        return manager;
    }
    
    createTaskManager() {
        const manager = TaskManager.getInstance();
        const storage = this.core.get('storage');
        manager.initialize = async () => await manager.initialize(storage);
        return manager;
    }
    
    createTimerManager() {
        const manager = TimerManager.getInstance();
        const storage = this.core.get('storage');
        manager.initialize = async () => await manager.initialize(storage);
        return manager;
    }
    
    createFocusPage() {
        const focus = new FocusPage();
        focus.initialize = async () => {
            const timer = this.core.get('timer');
            const task = this.core.get('task');
            focus.initialize(timer, task);
        };
        return focus;
    }
    
    createBlockerManager() {
        const blocker = BlockerManager.getInstance();
        blocker.initialize = async () => {
            const timer = this.core.get('timer');
            const whitelist = this.core.get('whitelist');
            const focus = this.core.get('focus');
            const storage = this.core.get('storage');
            await blocker.initialize(timer, whitelist, focus, storage);
        };
        return blocker;
    }
    
    createPageInterceptor() {
        const storage = this.core.get('storage');
        const whitelist = this.core.get('whitelist');
        return new PageInterceptor(storage, whitelist);
    }
    
    createSettingsPanel() {
        return new SettingsPanel();
    }
    
    createUIController() {
        const ui = new UIController();
        ui.initialize = async () => {
            const settings = this.core.get('settings');
            const task = this.core.get('task');
            ui.settingsPanel = settings;
            ui.taskManager = task;
            ui.setupUI();
            
            // 初始化TodoList
            const todoContainer = document.getElementById('todo-container');
            if (todoContainer) {
                ui.todoList = new TodoList(todoContainer, task);
                settings.registerTabComponent('todo', ui.todoList);
            }
        };
        return ui;
    }
    
    setupUI() {
        // 由UIController处理，保持接口兼容
        this.settingsPanel = this.core.get('settings');
        this.taskManager = this.core.get('task');
    }
    
    checkInterception() {
        const interceptor = this.core.get('interceptor');
        if (interceptor.shouldBlockPage()) {
            const blocker = this.core.get('blocker');
            blocker.activateBlocking();
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