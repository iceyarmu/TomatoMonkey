/**
 * SettingsPanel - 设置面板UI组件
 *
 * 负责：
 * 1. 设置面板的整体布局和结构
 * 2. 左侧垂直导航标签页的实现
 * 3. 右侧内容区域的动态切换
 * 4. 面板的显示/隐藏控制
 * 5. 键盘快捷键和事件处理
 */

/**
 * 设置面板类
 */
class SettingsPanel {
  constructor(taskService = null) {
    this.isVisible = false;
    this.activeTab = "todo"; // 默认激活ToDo标签页
    this.panel = null;
    this.contentArea = null;
    this.tabs = new Map(); // 存储标签页组件

    // 依赖注入
    this.taskService = taskService;
    this.todoList = null; // TodoList组件实例

    // 白名单相关
    this.whitelistManager = null;
    this.whitelistElements = null;
    this.undoToast = null;
    this.undoTimeout = null;

    // 标签页配置
    this.tabConfig = [
      {
        id: "todo",
        name: "ToDo列表",
        icon: "✅",
        component: null, // 将在后续设置
      },
      {
        id: "whitelist",
        name: "网站白名单",
        icon: "🌐",
        component: null,
      },
      {
        id: "statistics",
        name: "效率统计",
        icon: "📊",
        component: null,
      },
    ];

    this.initialize();
  }

  /**
   * 初始化设置面板
   */
  async initialize() {
    this.createPanelStructure();
    this.createNavigation();
    this.createContentArea();
    this.setupEventListeners();
    await this.initializeWhitelist(); // 初始化白名单功能
    this.createTodoList(); // 创建TodoList组件
    this.activateTab(this.activeTab);

    console.log("[SettingsPanel] Initialized successfully");
  }

  /**
   * 创建面板基础结构
   */
  createPanelStructure() {
    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.id = "tomato-monkey-overlay";
    overlay.className = "tomato-monkey-overlay tomato-monkey-hidden";

    // 创建主面板
    this.panel = document.createElement("div");
    this.panel.id = "tomato-monkey-settings-panel";
    this.panel.className = "tomato-monkey-settings-panel tomato-monkey-hidden";

    // 设置基础样式
    this.applyBaseStyles();

    // 创建面板头部
    const header = document.createElement("div");
    header.className = "settings-header";
    header.innerHTML = `
            <div class="header-title">
                <span class="header-icon">🍅</span>
                <h2>TomatoMonkey 设置</h2>
            </div>
            <button class="close-button" type="button" title="关闭设置面板 (Ctrl+Shift+T)">
                ✕
            </button>
        `;

    // 创建面板主体
    const body = document.createElement("div");
    body.className = "settings-body";

    // 创建左侧导航区域
    const navigation = document.createElement("nav");
    navigation.className = "settings-navigation";

    // 创建右侧内容区域
    this.contentArea = document.createElement("main");
    this.contentArea.className = "settings-content";

    // 组装面板结构
    body.appendChild(navigation);
    body.appendChild(this.contentArea);
    this.panel.appendChild(header);
    this.panel.appendChild(body);

    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(this.panel);

    // 存储引用
    this.overlay = overlay;
    this.navigation = navigation;
    this.headerElement = header;
  }

  /**
   * 创建导航标签页
   */
  createNavigation() {
    const tabList = document.createElement("ul");
    tabList.className = "tab-list";
    tabList.setAttribute("role", "tablist");

    this.tabConfig.forEach((tab, index) => {
      const tabItem = document.createElement("li");
      tabItem.className = "tab-item";

      const tabButton = document.createElement("button");
      tabButton.type = "button";
      tabButton.className = `tab-button ${tab.id === this.activeTab ? "active" : ""}`;
      tabButton.setAttribute("role", "tab");
      tabButton.setAttribute("aria-controls", `${tab.id}-panel`);
      tabButton.setAttribute(
        "aria-selected",
        tab.id === this.activeTab ? "true" : "false",
      );
      tabButton.setAttribute(
        "tabindex",
        tab.id === this.activeTab ? "0" : "-1",
      );
      tabButton.dataset.tabId = tab.id;

      tabButton.innerHTML = `
                <span class="tab-icon">${tab.icon}</span>
                <span class="tab-name">${tab.name}</span>
            `;

      // 添加事件监听
      tabButton.addEventListener("click", (e) => {
        this.activateTab(tab.id);
      });

      // 键盘导航支持
      tabButton.addEventListener("keydown", (e) => {
        this.handleTabKeydown(e, index);
      });

      tabItem.appendChild(tabButton);
      tabList.appendChild(tabItem);
    });

    this.navigation.appendChild(tabList);
    this.tabButtons = this.navigation.querySelectorAll(".tab-button");
  }

  /**
   * 创建内容区域
   */
  createContentArea() {
    // 为每个标签页创建内容面板
    this.tabConfig.forEach((tab) => {
      const contentPanel = document.createElement("div");
      contentPanel.id = `${tab.id}-panel`;
      contentPanel.className = `content-panel ${tab.id === this.activeTab ? "active" : "hidden"}`;
      contentPanel.setAttribute("role", "tabpanel");
      contentPanel.setAttribute("aria-labelledby", `${tab.id}-tab`);

      // 根据标签页类型创建不同的内容
      switch (tab.id) {
        case "todo":
          contentPanel.innerHTML = `
                        <div class="panel-header">
                            <h3>任务管理</h3>
                            <p>管理您的待办事项列表</p>
                        </div>
                        <div id="todo-container" class="todo-container">
                            <!-- ToDo List组件将插入这里 -->
                        </div>
                    `;
          break;

        case "whitelist":
          contentPanel.innerHTML = `
                        <div class="panel-header">
                            <h3>网站白名单</h3>
                            <p>设置专注期间允许访问的网站（使用包含匹配）</p>
                        </div>
                        <div class="whitelist-container">
                            <div class="whitelist-input-section">
                                <div class="input-group">
                                    <input 
                                        type="text" 
                                        id="whitelist-domain-input" 
                                        class="domain-input" 
                                        placeholder="输入域名，如：google.com"
                                        aria-label="域名输入"
                                    />
                                    <button 
                                        type="button" 
                                        id="whitelist-add-button" 
                                        class="add-domain-button"
                                        aria-label="添加域名到白名单"
                                    >
                                        添加域名
                                    </button>
                                </div>
                                <div class="input-feedback" id="whitelist-input-feedback" role="alert" aria-live="polite"></div>
                            </div>
                            <div class="whitelist-list-section">
                                <div class="list-header">
                                    <h4>已添加的域名</h4>
                                    <span class="domain-count" id="whitelist-domain-count">0 个域名</span>
                                </div>
                                <div class="domain-list" id="whitelist-domain-list" role="list">
                                    <div class="empty-state" id="whitelist-empty-state">
                                        <div class="empty-icon">🌐</div>
                                        <p>暂无白名单域名</p>
                                        <small>添加域名后，专注期间将允许访问包含这些域名的网站</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
          break;

        case "statistics":
          contentPanel.innerHTML = `
                        <div class="panel-header">
                            <h3>效率统计</h3>
                            <p>查看您的专注时间和任务完成统计</p>
                        </div>
                        <div class="placeholder-content">
                            <div class="placeholder-icon">📊</div>
                            <p>统计功能即将上线</p>
                        </div>
                    `;
          break;
      }

      this.contentArea.appendChild(contentPanel);
      this.tabs.set(tab.id, contentPanel);
    });
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 关闭按钮
    const closeButton = this.headerElement.querySelector(".close-button");
    closeButton.addEventListener("click", () => this.hide());

    // 遮罩层点击关闭
    this.overlay.addEventListener("click", () => this.hide());

    // ESC键关闭
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    });

    // 防止面板内点击冒泡到遮罩层
    this.panel.addEventListener("click", (e) => e.stopPropagation());
  }

  /**
   * 处理标签页键盘导航
   * @param {KeyboardEvent} e - 键盘事件
   * @param {number} currentIndex - 当前标签页索引
   */
  handleTabKeydown(e, currentIndex) {
    let targetIndex = currentIndex;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        targetIndex =
          currentIndex > 0 ? currentIndex - 1 : this.tabConfig.length - 1;
        e.preventDefault();
        break;

      case "ArrowRight":
      case "ArrowDown":
        targetIndex =
          currentIndex < this.tabConfig.length - 1 ? currentIndex + 1 : 0;
        e.preventDefault();
        break;

      case "Home":
        targetIndex = 0;
        e.preventDefault();
        break;

      case "End":
        targetIndex = this.tabConfig.length - 1;
        e.preventDefault();
        break;

      case "Enter":
      case " ":
        this.activateTab(this.tabConfig[currentIndex].id);
        e.preventDefault();
        break;
    }

    if (targetIndex !== currentIndex) {
      this.tabButtons[targetIndex].focus();
    }
  }

  /**
   * 激活指定标签页
   * @param {string} tabId - 标签页ID
   */
  activateTab(tabId) {
    if (!this.tabs.has(tabId)) {
      console.warn(`[SettingsPanel] Tab not found: ${tabId}`);
      return;
    }

    const previousTab = this.activeTab;
    this.activeTab = tabId;

    // 更新标签页按钮状态
    this.tabButtons.forEach((button) => {
      const isActive = button.dataset.tabId === tabId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    // 更新内容面板显示
    this.tabs.forEach((panel, id) => {
      const isActive = id === tabId;
      panel.classList.toggle("active", isActive);
      panel.classList.toggle("hidden", !isActive);
    });

    console.log(`[SettingsPanel] Activated tab: ${tabId}`);

    // 触发标签页切换事件
    this.dispatchEvent("tabChanged", {
      activeTab: tabId,
      previousTab,
      panel: this.tabs.get(tabId),
    });
  }

  /**
   * 显示设置面板
   */
  show() {
    if (this.isVisible) return;

    this.overlay.classList.remove("tomato-monkey-hidden");
    this.panel.classList.remove("tomato-monkey-hidden");

    // 添加显示动画类
    setTimeout(() => {
      this.overlay.classList.add("show");
      this.panel.classList.add("show");
    }, 10);

    // 聚焦到活动标签页
    const activeTabButton = this.navigation.querySelector(".tab-button.active");
    if (activeTabButton) {
      activeTabButton.focus();
    }

    this.isVisible = true;
    console.log("[SettingsPanel] Panel shown");

    this.dispatchEvent("panelShown");
  }

  /**
   * 隐藏设置面板
   */
  hide() {
    if (!this.isVisible) return;

    this.overlay.classList.remove("show");
    this.panel.classList.remove("show");

    // 等待动画结束后完全隐藏
    setTimeout(() => {
      this.overlay.classList.add("tomato-monkey-hidden");
      this.panel.classList.add("tomato-monkey-hidden");
    }, 300);

    this.isVisible = false;
    console.log("[SettingsPanel] Panel hidden");

    this.dispatchEvent("panelHidden");
  }

  /**
   * 切换设置面板显示状态
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 获取指定标签页的容器元素
   * @param {string} tabId - 标签页ID
   * @returns {HTMLElement|null} 容器元素
   */
  getTabContainer(tabId) {
    return this.tabs.get(tabId) || null;
  }

  /**
   * 注册标签页组件
   * @param {string} tabId - 标签页ID
   * @param {Object} component - 组件实例
   */
  registerTabComponent(tabId, component) {
    const tabConfig = this.tabConfig.find((tab) => tab.id === tabId);
    if (tabConfig) {
      tabConfig.component = component;
      console.log(`[SettingsPanel] Registered component for tab: ${tabId}`);
    }
  }

  /**
   * 初始化白名单功能
   */
  async initializeWhitelist() {
    try {
      // 初始化 WhitelistManager（需要确保 WhitelistManager 和 StorageManager 已加载）
      if (
        typeof window.whitelistManager !== "undefined" &&
        typeof window.storageManager !== "undefined"
      ) {
        this.whitelistManager = window.whitelistManager;
        await this.whitelistManager.initialize(window.storageManager);

        // 设置DOM元素引用
        this.setupWhitelistElements();

        // 绑定事件处理器
        this.setupWhitelistEventListeners();

        // 加载并显示现有域名
        await this.refreshWhitelistUI();

        console.log("[SettingsPanel] Whitelist initialized successfully");
      } else {
        console.warn(
          "[SettingsPanel] WhitelistManager or StorageManager not available",
        );
      }
    } catch (error) {
      console.error("[SettingsPanel] Failed to initialize whitelist:", error);
    }
  }

  /**
   * 设置白名单DOM元素引用
   */
  setupWhitelistElements() {
    const whitelistPanel = this.tabs.get("whitelist");
    if (!whitelistPanel) return;

    this.whitelistElements = {
      input: whitelistPanel.querySelector("#whitelist-domain-input"),
      addButton: whitelistPanel.querySelector("#whitelist-add-button"),
      feedback: whitelistPanel.querySelector("#whitelist-input-feedback"),
      domainList: whitelistPanel.querySelector("#whitelist-domain-list"),
      domainCount: whitelistPanel.querySelector("#whitelist-domain-count"),
      emptyState: whitelistPanel.querySelector("#whitelist-empty-state"),
    };
  }

  /**
   * 设置白名单事件监听器
   */
  setupWhitelistEventListeners() {
    if (!this.whitelistElements) return;

    const { input, addButton } = this.whitelistElements;

    // 添加域名按钮点击事件
    addButton.addEventListener("click", () => this.handleAddDomain());

    // 输入框回车事件
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleAddDomain();
      }
    });

    // 输入实时验证
    input.addEventListener("input", () => this.validateDomainInput());

    // 监听白名单变更事件
    document.addEventListener("tomato-monkey-whitelist-domainAdded", () =>
      this.refreshWhitelistUI(),
    );
    document.addEventListener("tomato-monkey-whitelist-domainRemoved", () =>
      this.refreshWhitelistUI(),
    );
    document.addEventListener("tomato-monkey-whitelist-domainsCleared", () =>
      this.refreshWhitelistUI(),
    );
  }

  /**
   * 处理添加域名操作
   */
  async handleAddDomain() {
    if (!this.whitelistManager || !this.whitelistElements) return;

    const { input, addButton, feedback } = this.whitelistElements;
    const domain = input.value.trim();

    if (!domain) {
      this.showFeedback("请输入域名", "error");
      return;
    }

    // 禁用按钮防止重复提交
    addButton.disabled = true;
    addButton.classList.add("loading");

    try {
      const success = await this.whitelistManager.addDomain(domain);

      if (success) {
        input.value = "";
        this.showFeedback("域名添加成功", "success");
        input.focus();
      } else {
        this.showFeedback("域名格式无效或已存在", "error");
      }
    } catch (error) {
      console.error("[SettingsPanel] Failed to add domain:", error);
      this.showFeedback("添加失败，请重试", "error");
    } finally {
      addButton.disabled = false;
      addButton.classList.remove("loading");
    }
  }

  /**
   * 处理删除域名操作（带撤销确认）
   */
  async handleRemoveDomain(domain) {
    if (!this.whitelistManager) return;

    try {
      const success = await this.whitelistManager.removeDomain(domain);

      if (success) {
        this.showUndoToast(domain);
      } else {
        this.showFeedback("删除失败，请重试", "error");
      }
    } catch (error) {
      console.error("[SettingsPanel] Failed to remove domain:", error);
      this.showFeedback("删除失败，请重试", "error");
    }
  }

  /**
   * 显示撤销Toast
   */
  showUndoToast(deletedDomain) {
    // 清除现有的撤销Toast和定时器
    this.hideUndoToast();

    // 创建Toast元素
    this.undoToast = document.createElement("div");
    this.undoToast.className = "undo-toast";
    this.undoToast.setAttribute("role", "alert");
    this.undoToast.setAttribute("aria-live", "polite");

    this.undoToast.innerHTML = `
      <div class="undo-toast-content">
        <span class="undo-message">已删除域名: ${this.escapeHtml(deletedDomain)}</span>
        <button type="button" class="undo-button" aria-label="撤销删除域名 ${this.escapeHtml(deletedDomain)}">
          撤销
        </button>
        <button type="button" class="toast-close-button" aria-label="关闭撤销提示">
          ✕
        </button>
      </div>
      <div class="undo-progress" aria-hidden="true"></div>
    `;

    // 添加到页面
    document.body.appendChild(this.undoToast);

    // 绑定撤销按钮事件
    const undoButton = this.undoToast.querySelector(".undo-button");
    const closeButton = this.undoToast.querySelector(".toast-close-button");

    undoButton.addEventListener("click", () =>
      this.handleUndoDelete(deletedDomain),
    );
    closeButton.addEventListener("click", () => this.hideUndoToast());

    // 键盘支持
    this.undoToast.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideUndoToast();
      }
    });

    // 聚焦到撤销按钮以便键盘导航
    setTimeout(() => undoButton.focus(), 100);

    // 显示动画
    setTimeout(() => {
      this.undoToast.classList.add("show");
    }, 10);

    // 5秒后自动隐藏
    this.undoTimeout = setTimeout(() => {
      this.hideUndoToast();
    }, 5000);
  }

  /**
   * 处理撤销删除操作
   */
  async handleUndoDelete(domain) {
    if (!this.whitelistManager) return;

    try {
      const success = await this.whitelistManager.addDomain(domain);

      if (success) {
        this.showFeedback(`已恢复域名: ${domain}`, "success");
        this.hideUndoToast();
      } else {
        this.showFeedback("恢复失败，请重试", "error");
      }
    } catch (error) {
      console.error("[SettingsPanel] Failed to undo delete:", error);
      this.showFeedback("恢复失败，请重试", "error");
    }
  }

  /**
   * 隐藏撤销Toast
   */
  hideUndoToast() {
    if (this.undoTimeout) {
      clearTimeout(this.undoTimeout);
      this.undoTimeout = null;
    }

    if (this.undoToast) {
      this.undoToast.classList.remove("show");

      setTimeout(() => {
        if (this.undoToast && this.undoToast.parentNode) {
          this.undoToast.parentNode.removeChild(this.undoToast);
        }
        this.undoToast = null;
      }, 300);
    }
  }

  /**
   * 验证域名输入
   */
  validateDomainInput() {
    if (!this.whitelistManager || !this.whitelistElements) return;

    const { input } = this.whitelistElements;
    const domain = input.value.trim();

    if (!domain) {
      this.showFeedback("", "");
      return;
    }

    const cleanDomain = this.whitelistManager.validateAndCleanDomain(domain);
    if (cleanDomain) {
      this.showFeedback("域名格式有效", "success");
    } else {
      this.showFeedback("域名格式无效", "error");
    }
  }

  /**
   * 显示反馈信息
   */
  showFeedback(message, type = "") {
    if (!this.whitelistElements) return;

    const { feedback } = this.whitelistElements;
    feedback.textContent = message;
    feedback.className = `input-feedback ${type}`;

    // 自动清除成功信息
    if (type === "success") {
      setTimeout(() => {
        if (feedback.textContent === message) {
          feedback.textContent = "";
          feedback.className = "input-feedback";
        }
      }, 3000);
    }
  }

  /**
   * 刷新白名单UI显示
   */
  async refreshWhitelistUI() {
    if (!this.whitelistManager || !this.whitelistElements) return;

    try {
      const domains = this.whitelistManager.getDomains();
      const { domainList, domainCount, emptyState } = this.whitelistElements;

      // 更新域名数量
      domainCount.textContent = `${domains.length} 个域名`;

      // 清空列表
      domainList.innerHTML = "";

      if (domains.length === 0) {
        // 显示空状态
        domainList.appendChild(emptyState);
      } else {
        // 显示域名列表
        domains.forEach((domain) => {
          const domainItem = this.createDomainItem(domain);
          domainList.appendChild(domainItem);
        });
      }
    } catch (error) {
      console.error("[SettingsPanel] Failed to refresh whitelist UI:", error);
    }
  }

  /**
   * 创建域名列表项
   */
  createDomainItem(domain) {
    const item = document.createElement("div");
    item.className = "domain-item";
    item.setAttribute("role", "listitem");

    item.innerHTML = `
      <span class="domain-text">${this.escapeHtml(domain)}</span>
      <div class="domain-actions">
        <button 
          type="button" 
          class="remove-domain-button" 
          data-domain="${this.escapeHtml(domain)}"
          aria-label="删除域名 ${this.escapeHtml(domain)}"
        >
          删除
        </button>
      </div>
    `;

    // 绑定删除事件
    const removeButton = item.querySelector(".remove-domain-button");
    removeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const domainToRemove = removeButton.dataset.domain;
      this.handleRemoveDomain(domainToRemove);
    });

    return item;
  }

  /**
   * HTML转义函数
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 应用基础样式
   */
  applyBaseStyles() {
    const styles = `
            .tomato-monkey-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .tomato-monkey-overlay.show {
                opacity: 1;
            }
            
            .tomato-monkey-settings-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                width: 90vw;
                max-width: 800px;
                height: 80vh;
                max-height: 600px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            .tomato-monkey-settings-panel.show {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            
            .tomato-monkey-hidden {
                display: none !important;
            }
        `;

    GM_addStyle(styles);
  }

  /**
   * 触发自定义事件
   * @param {string} eventType - 事件类型
   * @param {Object} detail - 事件详情
   */
  dispatchEvent(eventType, detail = {}) {
    const event = new CustomEvent(`tomato-monkey-${eventType}`, {
      detail,
      bubbles: false,
      cancelable: false,
    });

    document.dispatchEvent(event);
  }

  /**
   * 创建TodoList组件 - Linus式直接方式
   */
  createTodoList() {
    // 如果没有taskService，无法创建TodoList
    if (!this.taskService) {
      console.warn("[SettingsPanel] TaskService not available, skipping TodoList creation");
      return;
    }

    // 直接获取容器，不使用setTimeout
    const todoContainer = document.getElementById('todo-container');
    if (!todoContainer) {
      console.warn("[SettingsPanel] Todo container not found, TodoList creation skipped");
      return;
    }

    try {
      // 创建TodoList实例
      this.todoList = new TodoList(todoContainer, this.taskService);
      
      // 注册到tabConfig
      const todoTab = this.tabConfig.find(tab => tab.id === 'todo');
      if (todoTab) {
        todoTab.component = this.todoList;
      }

      console.log("[SettingsPanel] TodoList created and registered");
    } catch (error) {
      console.error("[SettingsPanel] Failed to create TodoList:", error);
    }
  }

  /**
   * 销毁设置面板
   */
  destroy() {
    // 清理撤销Toast
    this.hideUndoToast();

    // 销毁TodoList组件
    if (this.todoList) {
      this.todoList.destroy();
      this.todoList = null;
    }

    if (this.panel) {
      this.panel.remove();
    }
    if (this.overlay) {
      this.overlay.remove();
    }

    this.tabs.clear();
    console.log("[SettingsPanel] Destroyed");
  }
}

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.SettingsPanel = SettingsPanel;
}

// 导出模块
if (typeof module !== "undefined" && module.exports) {
  module.exports = SettingsPanel;
} else if (typeof exports !== "undefined") {
  exports.SettingsPanel = SettingsPanel;
}
