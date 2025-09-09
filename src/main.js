/**
 * TomatoMonkey Main Application Entry Point
 * 
 * 主入口文件，负责：
 * 1. 初始化脚本环境
 * 2. 加载核心模块
 * 3. 启动应用程序
 */

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
            
            // 🚨 早期拦截检查 (document-start phase)
            await this.earlyInterceptionCheck();
            
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
     * 早期拦截检查 (在document-start阶段执行)
     */
    async earlyInterceptionCheck() {
        const currentUrl = window.location.href;
        console.log('[EarlyCheck] Starting early interception check for URL:', currentUrl);
        
        // 快速初始化存储管理器
        const tempStorageManager = new StorageManager();
        
        // 添加小延迟以允许跨标签页状态更新传播
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 检查计时器状态
        let timerState = tempStorageManager.getData("timerState");
        console.log('[EarlyCheck] Retrieved timerState (first read):', timerState);
        
        // 双重检查：如果状态可能过时，再次读取
        if (timerState && timerState.timestamp) {
            const stateAge = Date.now() - timerState.timestamp;
            if (stateAge > 1000) { // 如果状态超过1秒钟
                console.log('[EarlyCheck] State seems old (' + stateAge + 'ms), re-reading...');
                await new Promise(resolve => setTimeout(resolve, 100));
                timerState = tempStorageManager.getData("timerState");
                console.log('[EarlyCheck] Retrieved timerState (second read):', timerState);
            }
        }
        
        // 额外检查：查看拦截器状态
        const blockerState = tempStorageManager.getData("blockerState");
        console.log('[EarlyCheck] Retrieved blockerState:', blockerState);
        
        // 如果拦截器明确标记为非活动状态，不应该拦截
        if (blockerState && blockerState.isActive === false) {
            console.log('[EarlyCheck] PASS DECISION: BlockerState indicates blocking is inactive');
            return;
        }
        
        if (timerState && timerState.status === 'running') {
            console.log('[EarlyCheck] Timer is running, checking whitelist for URL:', currentUrl);
            
            // 快速初始化白名单管理器
            const tempWhitelistManager = new WhitelistManager();
            await tempWhitelistManager.initialize(tempStorageManager);
            
            // 检查当前URL是否需要拦截
            const shouldBlock = !tempWhitelistManager.isDomainAllowed(currentUrl);
            console.log('[EarlyCheck] Whitelist check result - shouldBlock:', shouldBlock);
            
            const isExempt = this.isExemptUrl(currentUrl);
            console.log('[EarlyCheck] URL exemption check - isExempt:', isExempt);
            
            if (shouldBlock && !isExempt) {
                console.log('[EarlyCheck] BLOCKING DECISION: Page will be blocked');
                console.log('[EarlyCheck] Timer status:', timerState.status, 'shouldBlock:', shouldBlock, 'isExempt:', isExempt);
                // 标记需要拦截，等待完全初始化后显示拦截界面
                this.pendingBlocking = true;
            } else {
                console.log('[EarlyCheck] PASS DECISION: Page will NOT be blocked');
                console.log('[EarlyCheck] Reason - shouldBlock:', shouldBlock, 'isExempt:', isExempt);
            }
        } else {
            const status = timerState ? timerState.status : 'no-timer-state';
            console.log('[EarlyCheck] PASS DECISION: Timer not running (status: ' + status + '), page will NOT be blocked');
        }
    }

    /**
     * 检查URL是否为豁免页面
     */
    isExemptUrl(url) {
        const exemptPatterns = [
            'about:', 'chrome://', 'chrome-extension://', 'moz-extension://',
            'edge://', 'opera://', 'file://', 'data:', 'javascript:', 'blob:',
            'localhost', '127.0.0.1', '0.0.0.0'
        ];
        const lowerUrl = url.toLowerCase();
        return exemptPatterns.some(pattern => lowerUrl.startsWith(pattern));
    }

    /**
     * 加载CSS样式
     */
    loadStyles() {
        const styles = `/* CSS_PLACEHOLDER */`;
        GM_addStyle(styles);
    }

    /**
     * 初始化核心模块
     */
    async initializeCore() {
        // 初始化存储管理器
        this.storageManager = new StorageManager();
        
        // 初始化白名单管理器
        this.whitelistManager = new WhitelistManager();
        await this.whitelistManager.initialize(this.storageManager);
        
        // 初始化任务管理器
        this.taskManager = TaskManager.getInstance();
        await this.taskManager.initialize(this.storageManager);
        
        // 初始化计时器管理器
        this.timerManager = TimerManager.getInstance();
        await this.timerManager.initialize(this.storageManager);
        
        // 初始化专注页面
        this.focusPage = new FocusPage();
        this.focusPage.initialize(this.timerManager, this.taskManager);
        
        // 初始化拦截器管理器
        this.blockerManager = BlockerManager.getInstance();
        await this.blockerManager.initialize(this.timerManager, this.whitelistManager, this.focusPage, this.storageManager);
        
        // 处理早期拦截检查的结果
        if (this.pendingBlocking) {
            console.log('[TomatoMonkey] Applying pending blocking from early interception check');
            this.blockerManager.activateBlocking();
        }
        
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
        triggerButton.style.cssText = `
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
        `;
        
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