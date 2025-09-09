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
            console.log('[TomatoMonkey] Initializing application...');
            
            // 加载样式
            this.loadStyles();
            
            // 初始化Application容器
            await this.app.initialize();
            
            // 设置UI
            this.setupUI();

            this.initialized = true;
            console.log('[TomatoMonkey] Application initialized successfully');
            
        } catch (error) {
            console.error('[TomatoMonkey] Failed to initialize application:', error);
        }
    }
    
    setupUI() {
        console.log('[TomatoMonkey] Setting up UI...');
        
        // 直接使用DI容器的服务（UIWidgets和TodoList已在Application中自动初始化）
        this.settingsPanel = this.app.settingsPanel;
        this.taskManager = this.app.taskService;
        
        console.log('[TomatoMonkey] UI setup complete');
    }

    loadStyles() {
        const styles = `/* CSS_PLACEHOLDER */`;
        GM_addStyle(styles);
    }
}

// 启动应用程序
const app = new TomatoMonkeyApp();
app.init();

// 将应用程序实例暴露到页面作用域以便调试
// 使用 unsafeWindow 确保测试页面可以访问
if (typeof unsafeWindow !== 'undefined') {
    unsafeWindow.TomatoMonkeyApp = app;
} else {
    window.TomatoMonkeyApp = app;
}