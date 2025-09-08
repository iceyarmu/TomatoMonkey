// ==UserScript==
// @name         TomatoMonkey
// @namespace    https://github.com/your-username/tomatomonkey
// @version      1.0.0
// @description  专注时间管理工具：番茄钟技术与任务管理的结合
// @author       TomatoMonkey Team
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-end
// @updateURL    
// @downloadURL  
// ==/UserScript==

/**
 * TomatoMonkey - 专注时间管理工具
 * 
 * 主入口文件，负责：
 * 1. 初始化脚本环境
 * 2. 加载核心模块
 * 3. 启动应用程序
 */

(function() {
    'use strict';

    // ========== 核心模块 ==========
    
    /**
     * StorageManager - 数据持久化管理器
     */
    /**
 * 存储管理器类
 */
class StorageManager {
  constructor() {
    // 存储键值常量
    this.STORAGE_KEYS = {
      TASKS: "TOMATO_MONKEY_TASKS",
      SETTINGS: "TOMATO_MONKEY_SETTINGS",
      STATISTICS: "TOMATO_MONKEY_STATISTICS",
    };

    // 数据版本管理
    this.DATA_VERSION = 1;
  }

  /**
   * 保存任务列表到存储
   * @param {Array<Task>} tasks - 任务列表
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveTasks(tasks) {
    try {
      if (!Array.isArray(tasks)) {
        throw new Error("Tasks must be an array");
      }

      // 验证任务数据结构
      this.validateTasksData(tasks);

      // 创建存储数据对象
      const storageData = {
        version: this.DATA_VERSION,
        timestamp: Date.now(),
        tasks: tasks,
      };

      // 序列化并保存
      const serializedData = JSON.stringify(storageData);
      GM_setValue(this.STORAGE_KEYS.TASKS, serializedData);

      console.log(`[StorageManager] Saved ${tasks.length} tasks to storage`);
      return true;
    } catch (error) {
      console.error("[StorageManager] Failed to save tasks:", error);
      return false;
    }
  }

  /**
   * 从存储加载任务列表
   * @returns {Promise<Array<Task>>} 任务列表
   */
  async loadTasks() {
    try {
      const serializedData = GM_getValue(this.STORAGE_KEYS.TASKS, null);

      if (!serializedData) {
        console.log(
          "[StorageManager] No tasks found in storage, returning empty array",
        );
        return [];
      }

      // 解析存储数据
      const storageData = JSON.parse(serializedData);

      // 检查数据版本和格式
      if (!this.validateStorageData(storageData)) {
        console.warn(
          "[StorageManager] Invalid storage data format, returning empty array",
        );
        return [];
      }

      const tasks = storageData.tasks || [];

      // 验证任务数据结构
      this.validateTasksData(tasks);

      console.log(`[StorageManager] Loaded ${tasks.length} tasks from storage`);
      return tasks;
    } catch (error) {
      console.error("[StorageManager] Failed to load tasks:", error);
      return [];
    }
  }

  /**
   * 清除所有任务数据
   * @returns {Promise<boolean>} 清除是否成功
   */
  async clearTasks() {
    try {
      GM_setValue(this.STORAGE_KEYS.TASKS, null);
      console.log("[StorageManager] Cleared all tasks from storage");
      return true;
    } catch (error) {
      console.error("[StorageManager] Failed to clear tasks:", error);
      return false;
    }
  }

  /**
   * 获取存储统计信息
   * @returns {Object} 存储统计信息
   */
  async getStorageStats() {
    try {
      const tasks = await this.loadTasks();
      const serializedData = GM_getValue(this.STORAGE_KEYS.TASKS, "");

      return {
        taskCount: tasks.length,
        completedTasks: tasks.filter((task) => task.isCompleted).length,
        pendingTasks: tasks.filter((task) => !task.isCompleted).length,
        storageSize: new Blob([serializedData]).size,
        lastUpdated: this.getLastUpdateTime(),
      };
    } catch (error) {
      console.error("[StorageManager] Failed to get storage stats:", error);
      return null;
    }
  }

  /**
   * 获取最后更新时间
   * @returns {number|null} 时间戳
   */
  getLastUpdateTime() {
    try {
      const serializedData = GM_getValue(this.STORAGE_KEYS.TASKS, null);
      if (!serializedData) return null;

      const storageData = JSON.parse(serializedData);
      return storageData.timestamp || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 验证存储数据结构
   * @param {Object} storageData - 存储数据对象
   * @returns {boolean} 验证是否通过
   */
  validateStorageData(storageData) {
    if (!storageData || typeof storageData !== "object") {
      return false;
    }

    if (typeof storageData.version !== "number" || storageData.version < 1) {
      return false;
    }

    if (!Array.isArray(storageData.tasks)) {
      return false;
    }

    return true;
  }

  /**
   * 验证任务数据结构
   * @param {Array<Task>} tasks - 任务列表
   * @throws {Error} 如果数据结构无效
   */
  validateTasksData(tasks) {
    if (!Array.isArray(tasks)) {
      throw new Error("Tasks must be an array");
    }

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      if (!task || typeof task !== "object") {
        throw new Error(`Task at index ${i} is not a valid object`);
      }

      // 验证必需字段
      const requiredFields = [
        "id",
        "title",
        "isCompleted",
        "createdAt",
        "pomodoroCount",
      ];
      for (const field of requiredFields) {
        if (!(field in task)) {
          throw new Error(
            `Task at index ${i} is missing required field: ${field}`,
          );
        }
      }

      // 验证字段类型
      if (typeof task.id !== "string" || task.id.trim() === "") {
        throw new Error(`Task at index ${i} has invalid id`);
      }

      if (typeof task.title !== "string" || task.title.trim() === "") {
        throw new Error(`Task at index ${i} has invalid title`);
      }

      if (typeof task.isCompleted !== "boolean") {
        throw new Error(`Task at index ${i} has invalid isCompleted`);
      }

      if (typeof task.createdAt !== "number" || task.createdAt <= 0) {
        throw new Error(`Task at index ${i} has invalid createdAt`);
      }

      if (typeof task.pomodoroCount !== "number" || task.pomodoroCount < 0) {
        throw new Error(`Task at index ${i} has invalid pomodoroCount`);
      }

      // 验证可选字段
      if (
        task.completedAt !== undefined &&
        task.completedAt !== null &&
        (typeof task.completedAt !== "number" || task.completedAt <= 0)
      ) {
        throw new Error(`Task at index ${i} has invalid completedAt`);
      }
    }
  }

  /**
   * 数据迁移 (为未来版本升级预留)
   * @param {Object} storageData - 旧版本数据
   * @returns {Object} 迁移后的数据
   */
  migrateData(storageData) {
    // 当前版本为1，暂不需要迁移
    // 未来版本可以在此处添加数据迁移逻辑
    return storageData;
  }

  /**
   * 导出任务数据为JSON
   * @returns {Promise<string>} JSON字符串
   */
  async exportTasksAsJSON() {
    try {
      const tasks = await this.loadTasks();
      const exportData = {
        exportTime: Date.now(),
        version: this.DATA_VERSION,
        tasks: tasks,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("[StorageManager] Failed to export tasks:", error);
      throw error;
    }
  }

  /**
   * 从JSON导入任务数据
   * @param {string} jsonData - JSON字符串
   * @returns {Promise<boolean>} 导入是否成功
   */
  async importTasksFromJSON(jsonData) {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.tasks || !Array.isArray(importData.tasks)) {
        throw new Error("Invalid import data format");
      }

      this.validateTasksData(importData.tasks);
      return await this.saveTasks(importData.tasks);
    } catch (error) {
      console.error("[StorageManager] Failed to import tasks:", error);
      return false;
    }
  }
}

// 创建单例实例
const storageManager = new StorageManager();

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.StorageManager = StorageManager;
  window.storageManager = storageManager;
}
    
    /**
     * TaskManager - 任务管理器
     */
    /**
 * 任务管理器类 (单例模式)
 */
class TaskManager {
  constructor() {
    if (TaskManager.instance) {
      return TaskManager.instance;
    }

    this.tasks = [];
    this.storageManager = null;
    this.isInitialized = false;
    this.observers = []; // 观察者模式，用于UI更新

    TaskManager.instance = this;
    return this;
  }

  /**
   * 初始化任务管理器
   * @param {StorageManager} storageManager - 存储管理器实例
   */
  async initialize(storageManager) {
    if (this.isInitialized) {
      return;
    }

    this.storageManager = storageManager;

    try {
      // 从存储加载任务
      this.tasks = await this.storageManager.loadTasks();
      this.sortTasks();

      this.isInitialized = true;
      console.log(`[TaskManager] Initialized with ${this.tasks.length} tasks`);

      // 通知观察者
      this.notifyObservers("initialized");
    } catch (error) {
      console.error("[TaskManager] Failed to initialize:", error);
      this.tasks = [];
    }
  }

  /**
   * 创建新任务
   * @param {string} title - 任务标题
   * @returns {Promise<Task>} 创建的任务对象
   */
  async createTask(title) {
    if (!title || typeof title !== "string" || title.trim() === "") {
      throw new Error("Task title is required and must be a non-empty string");
    }

    // HTML 转义以防止 XSS
    const sanitizedTitle = this.escapeHtml(title.trim());

    const task = {
      id: this.generateUUID(),
      title: sanitizedTitle,
      isCompleted: false,
      createdAt: Date.now(),
      completedAt: null,
      pomodoroCount: 0,
    };

    this.tasks.push(task);
    this.sortTasks();

    // 保存到存储
    await this.saveTasks();

    console.log(`[TaskManager] Created task: ${task.title}`);

    // 通知观察者
    this.notifyObservers("taskCreated", { task });

    return task;
  }

  /**
   * 获取所有任务
   * @returns {Array<Task>} 任务列表
   */
  getAllTasks() {
    return [...this.tasks]; // 返回副本以防外部修改
  }

  /**
   * 根据ID获取任务
   * @param {string} taskId - 任务ID
   * @returns {Task|null} 任务对象或null
   */
  getTaskById(taskId) {
    return this.tasks.find((task) => task.id === taskId) || null;
  }

  /**
   * 获取待完成任务
   * @returns {Array<Task>} 待完成任务列表
   */
  getPendingTasks() {
    return this.tasks.filter((task) => !task.isCompleted);
  }

  /**
   * 获取已完成任务
   * @returns {Array<Task>} 已完成任务列表
   */
  getCompletedTasks() {
    return this.tasks.filter((task) => task.isCompleted);
  }

  /**
   * 更新任务标题
   * @param {string} taskId - 任务ID
   * @param {string} newTitle - 新标题
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateTaskTitle(taskId, newTitle) {
    const task = this.getTaskById(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return false;
    }

    if (!newTitle || typeof newTitle !== "string" || newTitle.trim() === "") {
      throw new Error("Task title is required and must be a non-empty string");
    }

    const oldTitle = task.title;
    task.title = this.escapeHtml(newTitle.trim());

    await this.saveTasks();

    console.log(
      `[TaskManager] Updated task title: "${oldTitle}" -> "${task.title}"`,
    );

    // 通知观察者
    this.notifyObservers("taskUpdated", {
      task,
      field: "title",
      oldValue: oldTitle,
    });

    return true;
  }

  /**
   * 切换任务完成状态
   * @param {string} taskId - 任务ID
   * @returns {Promise<boolean>} 切换是否成功
   */
  async toggleTaskCompletion(taskId) {
    const task = this.getTaskById(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return false;
    }

    const wasCompleted = task.isCompleted;
    task.isCompleted = !task.isCompleted;

    if (task.isCompleted && !task.completedAt) {
      task.completedAt = Date.now();
    } else if (!task.isCompleted) {
      task.completedAt = null;
    }

    this.sortTasks();
    await this.saveTasks();

    const action = task.isCompleted ? "completed" : "uncompleted";
    console.log(`[TaskManager] Task ${action}: ${task.title}`);

    // 通知观察者
    this.notifyObservers("taskToggled", { task, wasCompleted });

    return true;
  }

  /**
   * 删除任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteTask(taskId) {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return false;
    }

    const deletedTask = this.tasks.splice(taskIndex, 1)[0];
    await this.saveTasks();

    console.log(`[TaskManager] Deleted task: ${deletedTask.title}`);

    // 通知观察者
    this.notifyObservers("taskDeleted", { task: deletedTask });

    return true;
  }

  /**
   * 增加任务的番茄数
   * @param {string} taskId - 任务ID
   * @param {number} count - 增加的番茄数，默认为1
   * @returns {Promise<boolean>} 更新是否成功
   */
  async incrementPomodoroCount(taskId, count = 1) {
    const task = this.getTaskById(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return false;
    }

    const oldCount = task.pomodoroCount;
    task.pomodoroCount += count;

    await this.saveTasks();

    console.log(
      `[TaskManager] Updated pomodoro count for "${task.title}": ${oldCount} -> ${task.pomodoroCount}`,
    );

    // 通知观察者
    this.notifyObservers("pomodoroUpdated", { task, oldCount });

    return true;
  }

  /**
   * 清除所有已完成的任务
   * @returns {Promise<number>} 清除的任务数量
   */
  async clearCompletedTasks() {
    const completedTasks = this.getCompletedTasks();
    const clearedCount = completedTasks.length;

    this.tasks = this.tasks.filter((task) => !task.isCompleted);
    await this.saveTasks();

    console.log(`[TaskManager] Cleared ${clearedCount} completed tasks`);

    // 通知观察者
    this.notifyObservers("completedTasksCleared", { count: clearedCount });

    return clearedCount;
  }

  /**
   * 获取任务统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const total = this.tasks.length;
    const completed = this.getCompletedTasks().length;
    const pending = this.getPendingTasks().length;
    const totalPomodoros = this.tasks.reduce(
      (sum, task) => sum + task.pomodoroCount,
      0,
    );

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
      totalPomodoros,
      averagePomodoros: total > 0 ? (totalPomodoros / total).toFixed(1) : 0,
    };
  }

  /**
   * 排序任务列表
   * 规则：未完成的任务在前面，已完成的任务在后面，按完成时间倒序排列
   */
  sortTasks() {
    this.tasks.sort((a, b) => {
      // 首先按完成状态排序
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // 如果都是已完成任务，按完成时间倒序排列
      if (a.isCompleted && b.isCompleted) {
        return (b.completedAt || 0) - (a.completedAt || 0);
      }

      // 如果都是待完成任务，按创建时间正序排列
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 保存任务到存储
   */
  async saveTasks() {
    if (!this.storageManager) {
      console.error("[TaskManager] StorageManager not initialized");
      return false;
    }

    try {
      return await this.storageManager.saveTasks(this.tasks);
    } catch (error) {
      console.error("[TaskManager] Failed to save tasks:", error);
      return false;
    }
  }

  /**
   * 生成UUID
   * @returns {string} UUID字符串
   */
  generateUUID() {
    return "task-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * HTML转义函数，防止XSS
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 添加观察者
   * @param {Function} observer - 观察者函数
   */
  addObserver(observer) {
    if (typeof observer === "function") {
      this.observers.push(observer);
    }
  }

  /**
   * 移除观察者
   * @param {Function} observer - 观察者函数
   */
  removeObserver(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * 通知所有观察者
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  notifyObservers(event, data = {}) {
    this.observers.forEach((observer) => {
      try {
        observer(event, data, this);
      } catch (error) {
        console.error("[TaskManager] Observer error:", error);
      }
    });
  }

  /**
   * 获取任务管理器实例 (单例)
   * @returns {TaskManager} 任务管理器实例
   */
  static getInstance() {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  /**
   * 重置实例 (主要用于测试)
   */
  static resetInstance() {
    TaskManager.instance = null;
  }
}

// 创建单例实例
const taskManager = TaskManager.getInstance();

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.TaskManager = TaskManager;
  window.taskManager = taskManager;
}
    
    /**
     * SettingsPanel - 设置面板UI组件
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
    
    /**
     * TodoList - ToDo列表UI组件
     */
    /**
 * ToDo列表组件类
 */
class TodoList {
  constructor(container, taskManager) {
    this.container = container;
    this.taskManager = taskManager;
    this.isInitialized = false;

    // UI元素引用
    this.inputField = null;
    this.addButton = null;
    this.taskList = null;
    this.statsDisplay = null;
    this.clearCompletedButton = null;

    // 状态
    this.tasks = [];
    this.isLoading = false;

    this.initialize();
  }

  /**
   * 初始化组件
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.createUI();
      this.setupEventListeners();
      this.bindTaskManager();
      await this.loadTasks();

      this.isInitialized = true;
      console.log("[TodoList] Initialized successfully");
    } catch (error) {
      console.error("[TodoList] Failed to initialize:", error);
      this.showError("初始化失败，请刷新页面重试");
    }
  }

  /**
   * 创建UI界面
   */
  createUI() {
    this.container.innerHTML = `
            <div class="todo-input-section">
                <div class="input-group">
                    <input 
                        type="text" 
                        id="todo-input" 
                        class="todo-input" 
                        placeholder="输入新任务..." 
                        maxlength="200"
                        aria-label="新任务输入"
                    />
                    <button 
                        type="button" 
                        id="add-task-btn" 
                        class="add-task-button"
                        title="添加任务 (Enter)"
                        aria-label="添加新任务"
                    >
                        <span class="button-icon">+</span>
                        <span class="button-text">添加</span>
                    </button>
                </div>
                <div class="input-error-message hidden" id="input-error"></div>
            </div>
            
            <div class="todo-stats-section">
                <div class="stats-display" id="stats-display">
                    <span class="stats-item">
                        <span class="stats-label">总计:</span>
                        <span class="stats-value" id="total-count">0</span>
                    </span>
                    <span class="stats-item">
                        <span class="stats-label">待完成:</span>
                        <span class="stats-value" id="pending-count">0</span>
                    </span>
                    <span class="stats-item">
                        <span class="stats-label">已完成:</span>
                        <span class="stats-value" id="completed-count">0</span>
                    </span>
                </div>
                <button 
                    type="button" 
                    id="clear-completed-btn" 
                    class="clear-completed-button hidden"
                    title="清除所有已完成任务"
                >
                    清除已完成
                </button>
            </div>
            
            <div class="todo-list-section">
                <div class="loading-indicator hidden" id="loading-indicator">
                    <span class="loading-spinner"></span>
                    <span>加载中...</span>
                </div>
                <div class="empty-state hidden" id="empty-state">
                    <div class="empty-icon">📝</div>
                    <h4>暂无任务</h4>
                    <p>添加您的第一个任务来开始管理待办事项</p>
                </div>
                <ul class="task-list" id="task-list" role="list"></ul>
            </div>
        `;

    // 获取UI元素引用
    this.inputField = this.container.querySelector("#todo-input");
    this.addButton = this.container.querySelector("#add-task-btn");
    this.taskList = this.container.querySelector("#task-list");
    this.statsDisplay = this.container.querySelector("#stats-display");
    this.clearCompletedButton = this.container.querySelector(
      "#clear-completed-btn",
    );
    this.loadingIndicator = this.container.querySelector("#loading-indicator");
    this.emptyState = this.container.querySelector("#empty-state");
    this.inputError = this.container.querySelector("#input-error");

    // 统计元素
    this.totalCount = this.container.querySelector("#total-count");
    this.pendingCount = this.container.querySelector("#pending-count");
    this.completedCount = this.container.querySelector("#completed-count");
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 添加任务
    this.addButton.addEventListener("click", () => this.addTask());

    // 输入框回车添加任务
    this.inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.addTask();
      }
    });

    // 输入验证
    this.inputField.addEventListener("input", () => {
      this.validateInput();
      this.updateAddButtonState();
    });

    // 清除已完成任务
    this.clearCompletedButton.addEventListener("click", () => {
      this.clearCompletedTasks();
    });

    // 任务列表事件委托
    this.taskList.addEventListener("click", (e) => {
      this.handleTaskListClick(e);
    });

    // 任务列表键盘事件
    this.taskList.addEventListener("keydown", (e) => {
      this.handleTaskListKeydown(e);
    });
  }

  /**
   * 绑定TaskManager事件
   */
  bindTaskManager() {
    if (!this.taskManager) return;

    // 监听TaskManager事件
    this.taskManager.addObserver((event, data) => {
      this.handleTaskManagerEvent(event, data);
    });
  }

  /**
   * 处理TaskManager事件
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  handleTaskManagerEvent(event, data) {
    switch (event) {
      case "taskCreated":
      case "taskToggled":
      case "taskDeleted":
      case "completedTasksCleared":
        this.loadTasks();
        break;
    }
  }

  /**
   * 加载任务数据
   */
  async loadTasks() {
    if (!this.taskManager || this.isLoading) return;

    this.isLoading = true;
    this.showLoading(true);

    try {
      this.tasks = this.taskManager.getAllTasks();
      this.renderTaskList();
      this.updateStats();
      this.updateUI();
    } catch (error) {
      console.error("[TodoList] Failed to load tasks:", error);
      this.showError("加载任务失败");
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  /**
   * 添加新任务
   */
  async addTask() {
    const title = this.inputField.value.trim();

    if (!this.validateTaskTitle(title)) {
      return;
    }

    this.setButtonLoading(this.addButton, true);
    this.clearError();

    try {
      await this.taskManager.createTask(title);
      this.inputField.value = "";
      this.updateAddButtonState();
      this.inputField.focus();
    } catch (error) {
      console.error("[TodoList] Failed to add task:", error);
      this.showError("添加任务失败，请重试");
    } finally {
      this.setButtonLoading(this.addButton, false);
    }
  }

  /**
   * 切换任务完成状态
   * @param {string} taskId - 任务ID
   */
  async toggleTask(taskId) {
    try {
      await this.taskManager.toggleTaskCompletion(taskId);
    } catch (error) {
      console.error("[TodoList] Failed to toggle task:", error);
      this.showError("操作失败，请重试");
    }
  }

  /**
   * 删除任务
   * @param {string} taskId - 任务ID
   * @param {string} taskTitle - 任务标题（用于确认）
   */
  async deleteTask(taskId, taskTitle) {
    const confirmed = confirm(`确定要删除任务 "${taskTitle}" 吗？`);
    if (!confirmed) return;

    try {
      await this.taskManager.deleteTask(taskId);
    } catch (error) {
      console.error("[TodoList] Failed to delete task:", error);
      this.showError("删除失败，请重试");
    }
  }

  /**
   * 清除所有已完成任务
   */
  async clearCompletedTasks() {
    const completedCount = this.tasks.filter((task) => task.isCompleted).length;
    if (completedCount === 0) return;

    const confirmed = confirm(`确定要清除 ${completedCount} 个已完成任务吗？`);
    if (!confirmed) return;

    try {
      await this.taskManager.clearCompletedTasks();
    } catch (error) {
      console.error("[TodoList] Failed to clear completed tasks:", error);
      this.showError("清除失败，请重试");
    }
  }

  /**
   * 渲染任务列表
   */
  renderTaskList() {
    if (this.tasks.length === 0) {
      this.taskList.innerHTML = "";
      return;
    }

    const taskItems = this.tasks.map((task) => this.createTaskElement(task));
    this.taskList.innerHTML = taskItems.join("");
  }

  /**
   * 创建任务元素HTML
   * @param {Task} task - 任务对象
   * @returns {string} HTML字符串
   */
  createTaskElement(task) {
    const completedClass = task.isCompleted ? "completed" : "";
    const checkedAttr = task.isCompleted ? "checked" : "";
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    const completedDate = task.completedAt
      ? new Date(task.completedAt).toLocaleDateString()
      : "";

    return `
            <li class="task-item ${completedClass}" data-task-id="${task.id}" role="listitem">
                <div class="task-content">
                    <label class="task-checkbox-label">
                        <input 
                            type="checkbox" 
                            class="task-checkbox" 
                            ${checkedAttr}
                            aria-label="标记任务为${task.isCompleted ? "未完成" : "已完成"}"
                        />
                        <span class="checkbox-custom"></span>
                    </label>
                    
                    <div class="task-details">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            <span class="task-date">创建于 ${createdDate}</span>
                            ${task.isCompleted ? `<span class="task-completed-date">完成于 ${completedDate}</span>` : ""}
                            ${task.pomodoroCount > 0 ? `<span class="pomodoro-count">🍅 ${task.pomodoroCount}</span>` : ""}
                        </div>
                    </div>
                </div>
                
                <div class="task-actions">
                    <button 
                        type="button" 
                        class="delete-task-button" 
                        title="删除任务"
                        aria-label="删除任务: ${task.title}"
                    >
                        🗑️
                    </button>
                </div>
            </li>
        `;
  }

  /**
   * 处理任务列表点击事件
   * @param {Event} e - 点击事件
   */
  handleTaskListClick(e) {
    const taskItem = e.target.closest(".task-item");
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;

    // 复选框点击
    if (e.target.classList.contains("task-checkbox")) {
      this.toggleTask(taskId);
    }

    // 删除按钮点击
    else if (e.target.classList.contains("delete-task-button")) {
      const taskTitle = taskItem.querySelector(".task-title").textContent;
      this.deleteTask(taskId, taskTitle);
    }
  }

  /**
   * 处理任务列表键盘事件
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleTaskListKeydown(e) {
    const taskItem = e.target.closest(".task-item");
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;

    if (e.target.classList.contains("delete-task-button")) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const taskTitle = taskItem.querySelector(".task-title").textContent;
        this.deleteTask(taskId, taskTitle);
      }
    }
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    const stats = this.taskManager
      ? this.taskManager.getStatistics()
      : {
          total: 0,
          pending: 0,
          completed: 0,
        };

    this.totalCount.textContent = stats.total;
    this.pendingCount.textContent = stats.pending;
    this.completedCount.textContent = stats.completed;
  }

  /**
   * 更新UI状态
   */
  updateUI() {
    const hasCompletedTasks = this.tasks.some((task) => task.isCompleted);
    const hasTasks = this.tasks.length > 0;

    // 显示/隐藏清除已完成按钮
    this.clearCompletedButton.classList.toggle("hidden", !hasCompletedTasks);

    // 显示/隐藏空状态
    this.emptyState.classList.toggle("hidden", hasTasks);
    this.taskList.classList.toggle("hidden", !hasTasks);

    this.updateAddButtonState();
  }

  /**
   * 更新添加按钮状态
   */
  updateAddButtonState() {
    const hasText = this.inputField.value.trim().length > 0;
    this.addButton.disabled = !hasText;
  }

  /**
   * 验证任务标题
   * @param {string} title - 任务标题
   * @returns {boolean} 验证是否通过
   */
  validateTaskTitle(title) {
    if (!title || title.length === 0) {
      this.showError("请输入任务内容");
      this.inputField.focus();
      return false;
    }

    if (title.length > 200) {
      this.showError("任务内容不能超过200个字符");
      this.inputField.focus();
      return false;
    }

    return true;
  }

  /**
   * 验证输入
   */
  validateInput() {
    const value = this.inputField.value;

    if (value.length > 200) {
      this.showError("任务内容不能超过200个字符");
    } else {
      this.clearError();
    }
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   */
  showError(message) {
    this.inputError.textContent = message;
    this.inputError.classList.remove("hidden");
    this.inputField.classList.add("error");
  }

  /**
   * 清除错误信息
   */
  clearError() {
    this.inputError.classList.add("hidden");
    this.inputField.classList.remove("error");
  }

  /**
   * 显示/隐藏加载状态
   * @param {boolean} show - 是否显示
   */
  showLoading(show) {
    this.loadingIndicator.classList.toggle("hidden", !show);
  }

  /**
   * 设置按钮加载状态
   * @param {HTMLElement} button - 按钮元素
   * @param {boolean} loading - 是否加载中
   */
  setButtonLoading(button, loading) {
    button.disabled = loading;
    button.classList.toggle("loading", loading);

    if (loading) {
      button.querySelector(".button-text").textContent = "添加中...";
    } else {
      button.querySelector(".button-text").textContent = "添加";
    }
  }

  /**
   * 获取任务统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return this.taskManager ? this.taskManager.getStatistics() : null;
  }

  /**
   * 刷新组件
   */
  async refresh() {
    await this.loadTasks();
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.taskManager) {
      this.taskManager.removeObserver(this.handleTaskManagerEvent);
    }

    if (this.container) {
      this.container.innerHTML = "";
    }

    console.log("[TodoList] Destroyed");
  }
}

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.TodoList = TodoList;
}
    
    // ========== 应用程序主类 ==========
    
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
         * 加载CSS样式
         */
        loadStyles() {
            const styles = `/**
* TomatoMonkey - 主样式文件
* 
* 设计规范：
* - 主色: #D95550 (番茄红)
* - 辅助色: #70A85C (绿色) 
* - 中性色: #FFFFFF, #F5F5F5, #666666, #757575 (修复 A11Y-001: 原 #757575)
* - 错误色: #E53935
* - 字体: Inter, Lato, Helvetica Neue, Arial
* - H2: 18px, Body: 14px
* - 对比度: ≥4.5:1 (WCAG 2.1 AA)
*/
.tomato-monkey-panel *,
.tomato-monkey-panel *::before,
.tomato-monkey-panel *::after {
box-sizing: border-box;
}
.tomato-monkey-panel {
font-family: "Inter", "Lato", "Helvetica Neue", "Arial", sans-serif;
font-size: 14px;
line-height: 1.5;
color: #666666;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
}
.hidden {
display: none !important;
}
.tomato-monkey-panel .hidden {
display: none !important;
}
.tomato-monkey-panel .sr-only {
position: absolute;
width: 1px;
height: 1px;
padding: 0;
margin: -1px;
overflow: hidden;
clip: rect(0, 0, 0, 0);
white-space: nowrap;
border: 0;
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
background: #ffffff;
border-radius: 12px;
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
z-index: 10000;
display: flex;
flex-direction: column;
opacity: 0;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
overflow: hidden;
}
.tomato-monkey-settings-panel.show {
transform: translate(-50%, -50%) scale(1);
opacity: 1;
}
.settings-header {
display: flex;
align-items: center;
justify-content: space-between;
padding: 20px 24px;
background: #ffffff;
border-bottom: 1px solid #f5f5f5;
flex-shrink: 0;
}
.header-title {
display: flex;
align-items: center;
gap: 12px;
}
.header-icon {
font-size: 24px;
line-height: 1;
}
.header-title h2 {
margin: 0;
font-size: 18px;
font-weight: 600;
color: #666666;
}
.close-button {
background: none;
border: none;
font-size: 18px;
color: #757575;
cursor: pointer;
padding: 8px;
border-radius: 4px;
transition: all 0.2s ease;
line-height: 1;
}
.close-button:hover {
color: #d95550;
background: #f5f5f5;
}
.close-button:focus {
outline: 2px solid #d95550;
outline-offset: 2px;
}
.settings-body {
display: flex;
flex: 1;
overflow: hidden;
}
.settings-navigation {
width: 200px;
background: #f5f5f5;
border-right: 1px solid #757575;
flex-shrink: 0;
}
.tab-list {
list-style: none;
margin: 0;
padding: 16px 0;
}
.tab-item {
margin: 0;
}
.tab-button {
display: flex;
align-items: center;
gap: 12px;
width: 100%;
padding: 12px 20px;
background: none;
border: none;
color: #666666;
font-size: 14px;
text-align: left;
cursor: pointer;
transition: all 0.2s ease;
border-left: 3px solid transparent;
}
.tab-button:hover {
background: rgba(217, 85, 80, 0.1);
color: #d95550;
}
.tab-button.active {
background: #ffffff;
color: #d95550;
border-left-color: #d95550;
font-weight: 500;
}
.tab-button:focus {
outline: 2px solid #d95550;
outline-offset: -2px;
}
.tab-icon {
font-size: 16px;
line-height: 1;
}
.tab-name {
font-size: 14px;
}
.settings-content {
flex: 1;
background: #ffffff;
overflow-y: auto;
scroll-behavior: smooth;
}
.content-panel {
display: none;
padding: 24px;
height: 100%;
}
.content-panel.active {
display: block;
}
.panel-header {
margin-bottom: 24px;
padding-bottom: 16px;
border-bottom: 1px solid #f5f5f5;
}
.panel-header h3 {
margin: 0 0 8px 0;
font-size: 18px;
font-weight: 600;
color: #666666;
}
.panel-header p {
margin: 0;
color: #757575;
font-size: 14px;
}
.placeholder-content {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
height: 200px;
text-align: center;
}
.placeholder-icon {
font-size: 48px;
margin-bottom: 16px;
opacity: 0.5;
}
.todo-container {
display: flex;
flex-direction: column;
height: calc(100% - 80px);
}
.todo-input-section {
margin-bottom: 20px;
}
.input-group {
display: flex;
gap: 8px;
margin-bottom: 8px;
}
.todo-input {
flex: 1;
padding: 12px 16px;
border: 2px solid #f5f5f5;
border-radius: 8px;
font-size: 14px;
color: #666666;
transition: all 0.2s ease;
background: #ffffff;
}
.todo-input:focus {
outline: none;
border-color: #d95550;
box-shadow: 0 0 0 3px rgba(217, 85, 80, 0.1);
}
.todo-input.error {
border-color: #e53935;
}
.todo-input::placeholder {
color: #757575;
}
.add-task-button {
display: flex;
align-items: center;
gap: 6px;
padding: 12px 20px;
background: #d95550;
color: #ffffff;
border: none;
border-radius: 8px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: all 0.2s ease;
white-space: nowrap;
}
.add-task-button:hover:not(:disabled) {
background: #c94943;
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(217, 85, 80, 0.3);
}
.add-task-button:focus {
outline: 2px solid #d95550;
outline-offset: 2px;
}
.add-task-button:disabled {
background: #757575;
cursor: not-allowed;
transform: none;
box-shadow: none;
}
.add-task-button.loading {
opacity: 0.7;
}
.button-icon {
font-size: 16px;
font-weight: bold;
line-height: 1;
}
.input-error-message {
color: #e53935;
font-size: 12px;
margin-top: 4px;
padding-left: 4px;
}
.todo-stats-section {
display: flex;
align-items: center;
justify-content: space-between;
margin-bottom: 20px;
padding: 16px;
background: #f5f5f5;
border-radius: 8px;
}
.stats-display {
display: flex;
gap: 24px;
}
.stats-item {
display: flex;
align-items: center;
gap: 6px;
font-size: 13px;
}
.stats-label {
color: #757575;
font-weight: 400;
}
.stats-value {
color: #666666;
font-weight: 600;
font-size: 14px;
}
.clear-completed-button {
padding: 6px 12px;
background: #e53935;
color: #ffffff;
border: none;
border-radius: 6px;
font-size: 12px;
cursor: pointer;
transition: all 0.2s ease;
}
.clear-completed-button:hover {
background: #d32f2f;
transform: translateY(-1px);
}
.clear-completed-button:focus {
outline: 2px solid #e53935;
outline-offset: 2px;
}
.todo-list-section {
flex: 1;
overflow-y: auto;
}
.loading-indicator {
display: flex;
align-items: center;
justify-content: center;
gap: 12px;
padding: 40px;
color: #757575;
}
.loading-spinner {
width: 20px;
height: 20px;
border: 2px solid #f5f5f5;
border-top: 2px solid #d95550;
border-radius: 50%;
animation: spin 1s linear infinite;
}
@keyframes spin {
0% {
transform: rotate(0deg);
}
100% {
transform: rotate(360deg);
}
}
.empty-state {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 60px 40px;
text-align: center;
}
.empty-icon {
font-size: 48px;
margin-bottom: 16px;
opacity: 0.5;
}
.empty-state h4 {
margin: 0 0 8px 0;
font-size: 16px;
font-weight: 500;
color: #666666;
}
.empty-state p {
margin: 0;
color: #757575;
font-size: 14px;
}
.task-list {
list-style: none;
margin: 0;
padding: 0;
}
.task-item {
display: flex;
align-items: center;
justify-content: space-between;
padding: 16px;
border-bottom: 1px solid #f5f5f5;
transition: all 0.2s ease;
background: #ffffff;
}
.task-item:hover {
background: #fafafa;
}
.task-item.completed {
opacity: 0.7;
}
.task-content {
display: flex;
align-items: center;
gap: 12px;
flex: 1;
}
.task-checkbox-label {
display: flex;
align-items: center;
cursor: pointer;
user-select: none;
}
.task-checkbox {
position: absolute;
opacity: 0;
width: 1px;
height: 1px;
}
.checkbox-custom {
display: flex;
align-items: center;
justify-content: center;
width: 20px;
height: 20px;
border: 2px solid #757575;
border-radius: 4px;
background: #ffffff;
transition: all 0.2s ease;
position: relative;
}
.task-checkbox:checked + .checkbox-custom {
background: #70a85c;
border-color: #70a85c;
}
.task-checkbox:checked + .checkbox-custom::after {
content: "✓";
color: #ffffff;
font-size: 12px;
font-weight: bold;
}
.task-checkbox:focus + .checkbox-custom {
outline: 2px solid #d95550;
outline-offset: 2px;
}
.task-checkbox-label:hover .checkbox-custom {
border-color: #d95550;
}
.task-details {
flex: 1;
}
.task-title {
font-size: 14px;
color: #666666;
font-weight: 400;
margin-bottom: 4px;
word-wrap: break-word;
line-height: 1.4;
}
.task-item.completed .task-title {
text-decoration: line-through;
color: #757575;
}
.task-meta {
display: flex;
gap: 12px;
flex-wrap: wrap;
font-size: 12px;
color: #757575;
}
.task-date,
.task-completed-date,
.pomodoro-count {
display: inline-flex;
align-items: center;
gap: 4px;
}
.pomodoro-count {
color: #d95550;
font-weight: 500;
}
.task-actions {
display: flex;
align-items: center;
gap: 8px;
}
.delete-task-button {
display: flex;
align-items: center;
justify-content: center;
width: 32px;
height: 32px;
background: none;
border: none;
color: #757575;
cursor: pointer;
border-radius: 4px;
transition: all 0.2s ease;
font-size: 14px;
}
.delete-task-button:hover {
background: rgba(229, 57, 53, 0.1);
color: #e53935;
}
.delete-task-button:focus {
outline: 2px solid #e53935;
outline-offset: 2px;
}
@media (max-width: 768px) {
.tomato-monkey-settings-panel {
width: 95vw;
height: 90vh;
max-height: none;
}
.settings-body {
flex-direction: column;
}
.settings-navigation {
width: 100%;
max-height: 120px;
overflow-y: auto;
}
.tab-list {
display: flex;
padding: 8px;
}
.tab-item {
flex: 1;
}
.tab-button {
padding: 8px 12px;
border-left: none;
border-bottom: 3px solid transparent;
text-align: center;
flex-direction: column;
gap: 4px;
}
.tab-button.active {
border-left: none;
border-bottom-color: #d95550;
}
.tab-name {
font-size: 12px;
}
.content-panel {
padding: 16px;
}
.stats-display {
gap: 16px;
}
.stats-item {
flex-direction: column;
gap: 2px;
text-align: center;
}
.input-group {
flex-direction: column;
}
.add-task-button {
justify-content: center;
}
}
@media (max-width: 480px) {
.todo-stats-section {
flex-direction: column;
gap: 16px;
align-items: stretch;
}
.stats-display {
justify-content: space-around;
}
.task-item {
padding: 12px;
}
.task-meta {
flex-direction: column;
gap: 4px;
}
}
@media print {
.tomato-monkey-overlay,
.tomato-monkey-settings-panel {
display: none !important;
}
}
@media (prefers-contrast: high) {
.task-checkbox-label:hover .checkbox-custom {
border-color: #000000;
}
.tab-button:hover {
background: #000000;
color: #ffffff;
}
.add-task-button:hover:not(:disabled) {
background: #000000;
}
}
@media (prefers-reduced-motion: reduce) {
* {
animation-duration: 0.01ms !important;
animation-iteration-count: 1 !important;
transition-duration: 0.01ms !important;
scroll-behavior: auto !important;
}
.loading-spinner {
animation: none;
}
}`;
            GM_addStyle(styles);
        }

        /**
         * 初始化核心模块
         */
        async initializeCore() {
            // 初始化存储管理器
            this.storageManager = new StorageManager();
            
            // 初始化任务管理器
            this.taskManager = TaskManager.getInstance();
            await this.taskManager.initialize(this.storageManager);
            
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

})();
