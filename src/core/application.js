/**
 * Application - Linus式依赖注入容器
 * 
 * Linus 原则:
 * 1. 简单直接 - 不搞复杂的IoC框架
 * 2. 显式依赖 - 构造函数参数清楚表达依赖关系
 * 3. 单一职责 - 只负责创建和连接模块
 * 4. 失败就失败 - 不假装能处理所有错误
 */

class Application {
  constructor() {
    // 核心服务层
    this.storage = null;
    this.eventBus = null;
    
    // 业务服务层
    this.taskService = null;
    this.timerService = null;
    this.whitelistManager = null;
    
    // 功能层
    this.blockerFeature = null;
    
    // UI层
    this.settingsPanel = null;
    this.focusPage = null;
    this.uiWidgets = null;
    
    this.initialized = false;
    console.log("[Application] Created DI container");
  }

  /**
   * 初始化应用程序 - Linus式依赖创建
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log("[Application] Initializing dependency injection container...");
      
      // 第一层：核心服务（无依赖）
      this.createCoreServices();
      
      // 第二层：业务服务（依赖核心服务）
      this.createBusinessServices();
      
      // 第三层：功能模块（依赖业务服务）
      this.createFeatures();
      
      // 第四层：UI组件（依赖功能模块）
      this.createUIComponents();
      
      // 初始化所有服务
      await this.initializeServices();
      
      this.initialized = true;
      console.log("[Application] DI container initialized successfully");
      
    } catch (error) {
      console.error("[Application] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * 创建核心服务层 - 无依赖
   */
  createCoreServices() {
    console.log("[Application] Creating core services...");
    
    // Storage - 数据持久化服务
    this.storage = new Storage();
    
    // EventBus - 事件总线
    this.eventBus = new EventBus();
    
    console.log("[Application] Core services created");
  }

  /**
   * 创建业务服务层 - 依赖核心服务
   */
  createBusinessServices() {
    console.log("[Application] Creating business services...");
    
    // TaskService - 任务管理服务
    this.taskService = new TaskService(this.storage);
    
    // TimerService - 计时器服务
    this.timerService = new TimerService(this.storage);
    
    // WhitelistManager - 白名单管理（暂时保持原样）
    this.whitelistManager = new WhitelistManager();
    
    console.log("[Application] Business services created");
  }

  /**
   * 创建功能层 - 依赖业务服务
   */
  createFeatures() {
    console.log("[Application] Creating feature modules...");
    
    // FocusPage - 专注页面组件
    this.focusPage = new FocusPage();
    
    // BlockerFeature - 拦截功能
    this.blockerFeature = new BlockerFeature(
      this.timerService,
      this.whitelistManager, 
      this.focusPage,
      this.storage
    );
    
    console.log("[Application] Feature modules created");
  }

  /**
   * 创建UI组件层 - 依赖功能模块和业务服务
   */
  createUIComponents() {
    console.log("[Application] Creating UI components...");
    
    // SettingsPanel - 设置面板（传入taskService依赖）
    this.settingsPanel = new SettingsPanel(this.taskService);
    
    // UIWidgets - 全局UI小部件
    this.uiWidgets = new UIWidgets();
    
    // 注意：TodoList现在由SettingsPanel管理
    
    console.log("[Application] UI components created");
  }

  /**
   * 初始化所有服务 - 按依赖顺序
   */
  async initializeServices() {
    console.log("[Application] Initializing services in dependency order...");
    
    // 初始化核心服务
    // Storage 无需初始化
    
    // 初始化业务服务
    await this.taskService.initialize();
    await this.timerService.initialize();
    await this.whitelistManager.initialize(this.storage);
    
    // 初始化功能层
    this.focusPage.initialize(this.timerService, this.taskService);
    await this.blockerFeature.initialize();
    
    // 初始化UI层
    this.uiWidgets.initialize(this.settingsPanel);
    
    console.log("[Application] All services initialized");
  }

  /**
   * 获取服务实例 - 简单的服务定位器
   */
  getService(name) {
    const service = this[name];
    if (!service) {
      throw new Error(`[Application] Service '${name}' not found`);
    }
    return service;
  }

  /**
   * 销毁应用程序
   */
  destroy() {
    console.log("[Application] Destroying DI container...");
    
    // 销毁顺序与创建顺序相反
    if (this.uiWidgets) this.uiWidgets.destroy();
    if (this.settingsPanel) this.settingsPanel.destroy();
    
    if (this.blockerFeature) this.blockerFeature.destroy();
    if (this.focusPage) this.focusPage.destroy();
    
    if (this.timerService) this.timerService.destroy();
    // TaskService 和 Storage 无需特殊销毁
    
    this.initialized = false;
    console.log("[Application] DI container destroyed");
  }

}

// 浏览器环境导出
if (typeof window !== "undefined") {
  window.Application = Application;
}

// 模块导出
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Application };
} else if (typeof exports !== "undefined") {
  exports.Application = Application;
}