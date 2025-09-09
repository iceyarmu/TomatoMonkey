/**
 * TomatoMonkey Main Application Entry Point
 * 
 * 主入口文件，负责：
 * 1. 初始化脚本环境
 * 2. 加载核心模块
 * 3. 启动应用程序
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
        
        // 直接使用DI容器的服务（UIWidgets和TodoList已在Application中自动初始化）
        this.settingsPanel = this.app.settingsPanel;
        this.taskManager = this.app.taskService;
        
        console.log('[TomatoMonkey] UI setup complete');
    }
    

    checkInterception() {
        // Linus式简化：直接使用BlockerFeature判断
        if (this.app.blockerFeature.shouldBlockCurrentPage()) {
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