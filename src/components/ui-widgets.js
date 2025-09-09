/**
 * UIWidgets - 全局UI小部件管理器
 *
 * 负责：
 * 1. 触发按钮的创建和事件处理
 * 2. 全局键盘快捷键设置
 * 3. GM菜单命令注册
 * 4. UI小部件的生命周期管理
 */

class UIWidgets {
  constructor() {
    this.triggerButton = null;
    this.settingsPanel = null;
    this.initialized = false;
    
    console.log("[UIWidgets] Created");
  }

  /**
   * 初始化UI小部件
   * @param {SettingsPanel} settingsPanel - 设置面板实例
   */
  initialize(settingsPanel) {
    if (this.initialized) {
      return;
    }

    this.settingsPanel = settingsPanel;

    // 创建所有UI小部件
    this.createTriggerButton();
    this.setupKeyboardShortcuts();
    this.registerMenuCommands();

    this.initialized = true;
    console.log("[UIWidgets] Initialized successfully");
  }

  /**
   * 创建触发按钮
   */
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
    
    this.triggerButton = button;
    console.log("[UIWidgets] Trigger button created");
  }

  /**
   * 设置键盘快捷键
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.settingsPanel?.toggle();
      }
    });
    
    console.log("[UIWidgets] Keyboard shortcuts configured");
  }

  /**
   * 注册GM菜单命令
   */
  registerMenuCommands() {
    GM_registerMenuCommand('🍅 打开设置面板', () => {
      this.settingsPanel?.toggle();
    }, 'o');
    
    GM_registerMenuCommand('➕ 快速创建任务', () => {
      this.settingsPanel?.show();
      this.settingsPanel?.activateTab('todo');
    }, 'n');
    
    console.log("[UIWidgets] GM menu commands registered");
  }

  /**
   * 销毁UI小部件
   */
  destroy() {
    if (this.triggerButton) {
      this.triggerButton.remove();
      this.triggerButton = null;
    }
    
    this.initialized = false;
    console.log("[UIWidgets] Destroyed");
  }
}

