/**
 * BlockerManager - 网站拦截逻辑管理器
 *
 * 负责：
 * 1. 网站拦截逻辑的核心处理
 * 2. 与WhitelistManager集成的URL匹配检查
 * 3. 与TimerManager的状态同步和监听
 * 4. 与FocusPage的显示控制集成
 * 5. 跨标签页拦截状态同步
 * 6. 页面加载拦截的生命周期管理
 * 7. 修复TimerManager跨标签页同步缺陷的工作方案
 */

class BlockerManager {
  constructor() {
    // 单例模式
    if (BlockerManager.instance) {
      return BlockerManager.instance;
    }
    BlockerManager.instance = this;

    // 拦截器状态
    this.isActive = false;
    this.isCurrentPageBlocked = false;

    // 管理器引用
    this.timerManager = null;
    this.whitelistManager = null;
    this.focusPage = null;
    this.storageManager = null;

    // 观察者回调绑定
    this.boundTimerObserver = this.handleTimerEvent.bind(this);

    // 初始化状态
    this.initialized = false;

    // 缓存机制
    this.urlMatchCache = new Map();
    this.cacheExpiryTime = 5 * 60 * 1000; // 5分钟缓存过期

    console.log("[BlockerManager] Created");
  }

  /**
   * 初始化拦截器管理器
   * @param {TimerManager} timerManager - 计时器管理器实例
   * @param {WhitelistManager} whitelistManager - 白名单管理器实例
   * @param {FocusPage} focusPage - 专注页面组件实例
   * @param {StorageManager} storageManager - 存储管理器实例
   */
  async initialize(timerManager, whitelistManager, focusPage, storageManager) {
    if (this.initialized) {
      return;
    }

    this.timerManager = timerManager;
    this.whitelistManager = whitelistManager;
    this.focusPage = focusPage;
    this.storageManager = storageManager;

    // 监听计时器状态变化
    this.bindTimerManager();

    // 检查当前页面是否需要拦截
    await this.checkCurrentPageBlocking();

    // 设置跨标签页状态同步监听
    this.setupCrossTabSync();

    this.initialized = true;
    console.log("[BlockerManager] Initialized successfully");
  }

  /**
   * 绑定计时器管理器事件
   */
  bindTimerManager() {
    if (!this.timerManager) return;
    this.timerManager.addObserver(this.boundTimerObserver);
  }

  /**
   * 解绑计时器管理器事件
   */
  unbindTimerManager() {
    if (!this.timerManager) return;
    this.timerManager.removeObserver(this.boundTimerObserver);
  }

  /**
   * 处理计时器事件
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  handleTimerEvent(event, data) {
    switch (event) {
      case "timerStarted":
        this.activateBlocking(true); // 新的计时器会话开始
        break;
      case "timerStopped":
        this.deactivateBlocking();
        break;
      case "timerCompleted":
        this.deactivateBlocking();
        break;
    }
  }

  /**
   * 激活拦截器
   * @param {boolean} newSession - 是否为新的计时器会话（默认false）
   */
  async activateBlocking(newSession = false) {
    this.isActive = true;
    console.log(`[BlockerManager] Blocking activated (newSession: ${newSession})`);

    // 只有在新计时器会话开始时才清除临时跳过域名列表
    if (newSession) {
      this.temporarySkipDomains = new Set();
      console.log("[BlockerManager] Temporary skip domains cleared for new session");
    } else {
      // 保持现有的临时跳过域名列表
      if (!this.temporarySkipDomains) {
        this.temporarySkipDomains = new Set();
      }
      console.log(`[BlockerManager] Maintaining temporary skip domains: ${Array.from(this.temporarySkipDomains).join(', ')}`);
    }

    // 检查当前页面是否需要拦截
    await this.checkCurrentPageBlocking();

    // 保存拦截器状态
    this.saveBlockerState();
  }

  /**
   * 停用拦截器
   */
  deactivateBlocking() {
    const wasActive = this.isActive;
    const wasCurrentPageBlocked = this.isCurrentPageBlocked;
    const focusPageWasVisible = this.focusPage && this.focusPage.isPageVisible();
    
    this.isActive = false;
    this.isCurrentPageBlocked = false;
    console.log(`🛑 [DeactivateBlocking] Blocking deactivated - wasActive: ${wasActive}, wasCurrentPageBlocked: ${wasCurrentPageBlocked}`);

    // 清除临时跳过域名列表（计时器会话结束）
    if (this.temporarySkipDomains) {
      const skipDomainsCount = this.temporarySkipDomains.size;
      this.temporarySkipDomains.clear();
      console.log(`🛑 [DeactivateBlocking] Cleared ${skipDomainsCount} temporary skip domains`);
    }

    // 隐藏专注页面
    if (this.focusPage && focusPageWasVisible) {
      this.focusPage.hide();
      console.log(`🛑 [DeactivateBlocking] Focus page hidden`);
    } else {
      console.log(`🛑 [DeactivateBlocking] Focus page not visible or not available`);
    }

    // 保存拦截器状态
    this.saveBlockerState();
    console.log(`🛑 [DeactivateBlocking] Deactivation complete`);
  }

  /**
   * 检查当前页面是否需要拦截
   */
  async checkCurrentPageBlocking() {
    if (!this.isActive) {
      this.isCurrentPageBlocked = false;
      return;
    }

    const currentUrl = window.location.href;
    const shouldBlock = await this.shouldBlockUrl(currentUrl);

    if (shouldBlock && !this.isCurrentPageBlocked) {
      this.blockCurrentPage();
    } else if (!shouldBlock && this.isCurrentPageBlocked) {
      this.unblockCurrentPage();
    }
  }

  /**
   * 拦截当前页面
   */
  blockCurrentPage() {
    this.isCurrentPageBlocked = true;
    console.log(`[BlockerManager] Blocking current page: ${window.location.href}`);

    // 🚨 关键修复：直接调用FocusPage.show()绕过TimerManager同步缺陷
    if (this.focusPage) {
      // 确保FocusPage知道当前是拦截场景
      this.setupBlockingContext();
      this.focusPage.show();
    }
  }

  /**
   * 解除当前页面拦截
   */
  unblockCurrentPage() {
    this.isCurrentPageBlocked = false;
    console.log(`[BlockerManager] Unblocking current page: ${window.location.href}`);

    if (this.focusPage && this.focusPage.isPageVisible()) {
      this.focusPage.hide();
    }
  }

  /**
   * 设置拦截上下文信息
   */
  setupBlockingContext() {
    // 向FocusPage传递拦截上下文（通过DOM属性）
    if (this.focusPage && this.focusPage.container) {
      this.focusPage.container.setAttribute('data-blocking-mode', 'true');
      
      // 更新状态文本为拦截提示
      if (this.focusPage.statusElement) {
        this.focusPage.statusElement.textContent = "网站已被拦截";
        this.focusPage.statusElement.className = "focus-status blocked";
      }

      // 调整按钮显示（隐藏计时控制按钮）
      this.adjustButtonsForBlockingMode();
    }
  }

  /**
   * 调整拦截模式下的按钮显示
   */
  adjustButtonsForBlockingMode() {
    if (!this.focusPage || !this.focusPage.container) return;

    const container = this.focusPage.container;
    
    // 防御性检查：确保container有必要的方法
    if (typeof container.querySelectorAll !== 'function' || typeof container.querySelector !== 'function') {
      console.warn("[BlockerManager] Container missing required DOM methods");
      return;
    }
    
    // 隐藏计时控制按钮
    const timerButtons = container.querySelectorAll("#pause-btn, #resume-btn, #modify-time-btn, #stop-btn");
    timerButtons.forEach(btn => btn.classList.add("hidden"));

    // 隐藏完成和取消按钮
    const completeBtn = container.querySelector("#complete-btn");
    const cancelBtn = container.querySelector("#cancel-complete-btn");
    
    if (completeBtn) completeBtn.classList.add("hidden");
    if (cancelBtn) cancelBtn.classList.add("hidden");
    
    // 显示跳过按钮和结束专注按钮
    const skipBtn = container.querySelector("#skip-btn");
    const endFocusBtn = container.querySelector("#end-focus-btn");
    
    if (skipBtn) skipBtn.classList.remove("hidden");
    if (endFocusBtn) endFocusBtn.classList.remove("hidden");
  }

  /**
   * 判断URL是否应该被拦截
   * @param {string} url - 要检查的URL
   * @returns {boolean} 是否应该拦截
   */
  async shouldBlockUrl(url) {
    try {
      // 如果拦截器未激活，不拦截任何页面
      if (!this.isActive) {
        return false;
      }

      // 检查缓存
      const cacheKey = url;
      const cached = this.urlMatchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiryTime) {
        return cached.shouldBlock;
      }

      // 特殊页面豁免
      if (this.isExemptUrl(url)) {
        this.urlMatchCache.set(cacheKey, {
          shouldBlock: false,
          timestamp: Date.now()
        });
        return false;
      }

      // 检查临时跳过的域名
      if (this.temporarySkipDomains && this.temporarySkipDomains.size > 0) {
        try {
          const urlObj = new URL(url);
          if (this.temporarySkipDomains.has(urlObj.hostname)) {
            this.urlMatchCache.set(cacheKey, {
              shouldBlock: false,
              timestamp: Date.now()
            });
            return false;
          }
        } catch (error) {
          console.warn("[BlockerManager] Invalid URL for skip domain check:", url);
        }
      }

      // 检查白名单
      const isAllowed = this.whitelistManager ? 
        this.whitelistManager.isDomainAllowed(url) : false;

      const shouldBlock = !isAllowed;

      // 缓存结果
      this.urlMatchCache.set(cacheKey, {
        shouldBlock,
        timestamp: Date.now()
      });

      return shouldBlock;

    } catch (error) {
      console.error("[BlockerManager] Error checking URL blocking:", error);
      return false; // 出错时不拦截
    }
  }

  /**
   * 检查URL是否为豁免页面
   * @param {string} url - 要检查的URL
   * @returns {boolean} 是否为豁免页面
   */
  isExemptUrl(url) {
    const protocolExemptPatterns = [
      'about:',
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'edge://',
      'opera://',
      'file://',
      'data:',
      'javascript:',
      'blob:'
    ];

    const hostExemptPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0'
    ];

    const lowerUrl = url.toLowerCase();
    
    // 检查协议豁免
    if (protocolExemptPatterns.some(pattern => lowerUrl.startsWith(pattern))) {
      return true;
    }

    // 检查主机豁免
    if (hostExemptPatterns.some(host => lowerUrl.includes(host))) {
      return true;
    }

    return false;
  }

  /**
   * 保存拦截器状态
   */
  saveBlockerState() {
    if (!this.storageManager) return;

    const state = {
      isActive: this.isActive,
      timestamp: Date.now()
    };

    this.storageManager.setData("blockerState", state);
  }

  /**
   * 恢复拦截器状态
   */
  async restoreBlockerState() {
    if (!this.storageManager) return;

    try {
      const state = this.storageManager.getData("blockerState");
      if (state && typeof state.isActive === 'boolean') {
        this.isActive = state.isActive;
        
        if (this.isActive) {
          await this.checkCurrentPageBlocking();
        }
        
        console.log(`[BlockerManager] State restored: active=${this.isActive}`);
      }
    } catch (error) {
      console.error("[BlockerManager] Failed to restore blocker state:", error);
    }
  }

  /**
   * 设置跨标签页状态同步
   */
  setupCrossTabSync() {
    // 监听存储变化（如果支持GM_addValueChangeListener）
    if (typeof GM_addValueChangeListener === 'function') {
      console.log('🎧 [Listener] Setting up GM_addValueChangeListener for timerState');
      GM_addValueChangeListener('timerState', (name, old_value, new_value, remote) => {
        console.log(`🎧 [Listener] GM_addValueChangeListener triggered:`, {
          name,
          old_value,
          new_value,
          remote,
          isRemote: remote
        });
        
        if (remote) {
          console.log('🎧 [Listener] Remote change detected, calling handleRemoteTimerStateChange');
          this.handleRemoteTimerStateChange(new_value);
        } else {
          console.log('🎧 [Listener] Local change detected, ignoring');
        }
      });
      console.log('🎧 [Listener] GM_addValueChangeListener setup complete');
    } else {
      console.warn('🎧 [Listener] GM_addValueChangeListener not available!');
    }

    // 备用方案：使用window事件
    window.addEventListener('focus', () => {
      this.handleWindowFocus();
    });
  }

  /**
   * 处理远程计时器状态变化
   * @param {Object} newState - 新的计时器状态
   */
  async handleRemoteTimerStateChange(newState) {
    try {
      console.log('🔄 [RemoteStateChange] Received timer state change:', newState);
      
      if (newState && typeof newState === 'string') {
        newState = JSON.parse(newState);
        console.log('🔄 [RemoteStateChange] Parsed state:', newState);
      }

      if (newState && newState.status === 'running') {
        console.log('🔄 [RemoteStateChange] Timer running - activating blocking');
        // 远程计时器开始运行，激活本标签页的拦截器（非新会话）
        if (!this.isActive) {
          this.activateBlocking(false); // 跨标签页同步，保持临时跳过域名
        } else {
          // 已经激活，只需检查当前页面
          await this.checkCurrentPageBlocking();
        }
      } else if (newState && (newState.status === 'idle' || newState.status === 'completed')) {
        console.log(`🔄 [RemoteStateChange] Timer stopped (${newState.status}) - deactivating blocking`);
        // 远程计时器停止，停用本标签页的拦截器
        this.deactivateBlocking();
      } else {
        console.log('🔄 [RemoteStateChange] No action needed for state:', newState);
      }
    } catch (error) {
      console.error("[BlockerManager] Error handling remote timer state change:", error);
    }
  }

  /**
   * 处理窗口获得焦点事件
   */
  async handleWindowFocus() {
    // 当标签页获得焦点时，检查拦截状态
    if (this.timerManager) {
      const timerState = this.timerManager.getTimerState();
      if (timerState.status === 'running' && !this.isActive) {
        this.activateBlocking(false); // 窗口焦点激活，保持临时跳过域名
      } else if (timerState.status !== 'running' && this.isActive) {
        this.deactivateBlocking();
      }
    }
  }

  /**
   * 清除URL匹配缓存
   */
  clearCache() {
    this.urlMatchCache.clear();
    console.log("[BlockerManager] URL match cache cleared");
  }

  /**
   * 手动添加当前域名到白名单
   */
  async addCurrentDomainToWhitelist() {
    if (!this.whitelistManager) {
      console.warn("[BlockerManager] WhitelistManager not available");
      return false;
    }

    try {
      const currentDomain = window.location.hostname;
      const success = await this.whitelistManager.addDomain(currentDomain);
      
      if (success) {
        console.log(`[BlockerManager] Added ${currentDomain} to whitelist`);
        
        // 清除缓存并重新检查当前页面
        this.clearCache();
        await this.checkCurrentPageBlocking();
        
        return true;
      } else {
        console.warn(`[BlockerManager] Failed to add ${currentDomain} to whitelist`);
        return false;
      }
    } catch (error) {
      console.error("[BlockerManager] Error adding domain to whitelist:", error);
      return false;
    }
  }

  /**
   * 处理跳过拦截功能
   * @param {string} url - 可选的URL参数，如果未提供则使用当前页面URL
   */
  handleSkipBlocking(url) {
    if (!this.isCurrentPageBlocked) {
      console.warn("[BlockerManager] Current page is not blocked, skip ignored");
      return;
    }

    // 使用提供的URL或当前页面URL
    const targetUrl = url || window.location.href;
    let currentDomain;
    
    try {
      const urlObj = new URL(targetUrl);
      currentDomain = urlObj.hostname;
    } catch (error) {
      console.warn("[BlockerManager] Invalid URL for skip blocking:", targetUrl);
      currentDomain = window.location.hostname;
    }
    
    console.log(`[BlockerManager] Skipping blocking for page: ${targetUrl}`);
    
    // 临时将当前域名添加到跳过列表 (仅当前计时器会话有效)
    if (!this.temporarySkipDomains) {
      this.temporarySkipDomains = new Set();
    }
    this.temporarySkipDomains.add(currentDomain);
    
    // 清除当前域名的缓存
    const currentUrl = targetUrl;
    this.urlMatchCache.delete(currentUrl);
    
    // 解除当前页面拦截
    this.unblockCurrentPage();
    
    console.log(`[BlockerManager] Temporarily skipped blocking for domain: ${currentDomain}`);
  }

  /**
   * 获取拦截器状态
   * @returns {Object} 拦截器状态信息
   */
  getBlockerState() {
    return {
      isActive: this.isActive,
      isCurrentPageBlocked: this.isCurrentPageBlocked,
      currentUrl: window.location.href,
      initialized: this.initialized,
      cacheSize: this.urlMatchCache.size
    };
  }

  /**
   * 获取单例实例
   * @returns {BlockerManager} 拦截器管理器实例
   */
  static getInstance() {
    if (!BlockerManager.instance) {
      BlockerManager.instance = new BlockerManager();
    }
    return BlockerManager.instance;
  }

  /**
   * 销毁拦截器管理器
   */
  destroy() {
    this.unbindTimerManager();
    this.deactivateBlocking();
    this.clearCache();
    
    this.timerManager = null;
    this.whitelistManager = null;
    this.focusPage = null;
    this.storageManager = null;
    
    console.log("[BlockerManager] Destroyed");
  }
}

// 创建单例实例
const blockerManager = new BlockerManager();

// 全局对象暴露
if (typeof window !== "undefined") {
  window.BlockerManager = BlockerManager;
  window.blockerManager = blockerManager;
}

// 模块导出 (支持 CommonJS 和 ES6)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BlockerManager, blockerManager };
} else if (typeof exports !== "undefined") {
  exports.BlockerManager = BlockerManager;
  exports.blockerManager = blockerManager;
}