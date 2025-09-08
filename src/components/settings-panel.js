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
  constructor() {
    this.isVisible = false;
    this.activeTab = "todo"; // 默认激活ToDo标签页
    this.panel = null;
    this.contentArea = null;
    this.tabs = new Map(); // 存储标签页组件

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
  initialize() {
    this.createPanelStructure();
    this.createNavigation();
    this.createContentArea();
    this.setupEventListeners();
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
                            <p>设置允许使用番茄钟的网站</p>
                        </div>
                        <div class="placeholder-content">
                            <div class="placeholder-icon">🌐</div>
                            <p>网站白名单功能即将上线</p>
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
   * 销毁设置面板
   */
  destroy() {
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
