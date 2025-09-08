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

    // 默认设置
    this.DEFAULT_SETTINGS = {
      pomodoroDuration: 25, // 默认番茄钟时长（分钟）
      whitelist: [], // 默认空白名单
    };
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
   * 保存设置到存储
   * @param {Object} settings - 设置对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSettings(settings) {
    try {
      if (!settings || typeof settings !== "object") {
        throw new Error("Settings must be an object");
      }

      // 验证设置数据结构
      this.validateSettingsData(settings);

      // 创建存储数据对象
      const storageData = {
        version: this.DATA_VERSION,
        timestamp: Date.now(),
        settings: settings,
      };

      // 序列化并保存
      const serializedData = JSON.stringify(storageData);
      GM_setValue(this.STORAGE_KEYS.SETTINGS, serializedData);

      console.log("[StorageManager] Settings saved to storage");
      return true;
    } catch (error) {
      console.error("[StorageManager] Failed to save settings:", error);
      return false;
    }
  }

  /**
   * 从存储加载设置
   * @returns {Promise<Object>} 设置对象
   */
  async loadSettings() {
    try {
      const serializedData = GM_getValue(this.STORAGE_KEYS.SETTINGS, null);

      if (!serializedData) {
        console.log(
          "[StorageManager] No settings found in storage, returning defaults",
        );
        return { ...this.DEFAULT_SETTINGS };
      }

      // 解析存储数据
      const storageData = JSON.parse(serializedData);

      // 检查数据版本和格式（使用设置专用的验证器）
      if (!this.validateSettingsStorageData(storageData)) {
        console.warn(
          "[StorageManager] Invalid settings storage data, returning defaults",
        );
        return { ...this.DEFAULT_SETTINGS };
      }

      // 合并默认设置和存储的设置（确保新增字段有默认值）
      const settings = {
        ...this.DEFAULT_SETTINGS,
        ...storageData.settings,
      };

      // 验证设置数据结构
      this.validateSettingsData(settings);

      console.log("[StorageManager] Settings loaded from storage");
      return settings;
    } catch (error) {
      console.error("[StorageManager] Failed to load settings:", error);
      return { ...this.DEFAULT_SETTINGS };
    }
  }

  /**
   * 重置设置为默认值
   * @returns {Promise<boolean>} 重置是否成功
   */
  async resetSettings() {
    try {
      const success = await this.saveSettings({ ...this.DEFAULT_SETTINGS });
      if (success) {
        console.log("[StorageManager] Settings reset to defaults");
      }
      return success;
    } catch (error) {
      console.error("[StorageManager] Failed to reset settings:", error);
      return false;
    }
  }

  /**
   * 通用方法：保存数据到存储
   * @param {string} key - 存储键
   * @param {any} value - 要保存的值
   * @returns {boolean} 保存是否成功
   */
  setData(key, value) {
    try {
      const serializedData = JSON.stringify(value);
      GM_setValue(key, serializedData);
      return true;
    } catch (error) {
      console.error(`[StorageManager] Failed to set data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 通用方法：从存储获取数据
   * @param {string} key - 存储键
   * @param {any} defaultValue - 默认值
   * @returns {any} 存储的值或默认值
   */
  getData(key, defaultValue = null) {
    try {
      const serializedData = GM_getValue(key, null);
      if (serializedData === null || serializedData === undefined) {
        return defaultValue;
      }
      return JSON.parse(serializedData);
    } catch (error) {
      console.error(`[StorageManager] Failed to get data for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * 通用方法：从存储删除数据
   * @param {string} key - 存储键
   * @returns {boolean} 删除是否成功
   */
  removeData(key) {
    try {
      GM_setValue(key, undefined);
      return true;
    } catch (error) {
      console.error(`[StorageManager] Failed to remove data for key ${key}:`, error);
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
   * 验证存储数据结构（用于任务数据）
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
   * 验证设置存储数据结构
   * @param {Object} storageData - 设置存储数据对象
   * @returns {boolean} 验证是否通过
   */
  validateSettingsStorageData(storageData) {
    if (!storageData || typeof storageData !== "object") {
      return false;
    }

    if (typeof storageData.version !== "number" || storageData.version < 1) {
      return false;
    }

    if (!storageData.settings || typeof storageData.settings !== "object") {
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
   * 验证设置数据结构
   * @param {Object} settings - 设置对象
   * @throws {Error} 如果数据结构无效
   */
  validateSettingsData(settings) {
    if (!settings || typeof settings !== "object") {
      throw new Error("Settings must be an object");
    }

    // 验证必需字段
    const requiredFields = ["pomodoroDuration", "whitelist"];
    for (const field of requiredFields) {
      if (!(field in settings)) {
        throw new Error(`Settings is missing required field: ${field}`);
      }
    }

    // 验证 pomodoroDuration
    if (
      typeof settings.pomodoroDuration !== "number" ||
      settings.pomodoroDuration <= 0 ||
      settings.pomodoroDuration > 120
    ) {
      throw new Error(
        "Settings has invalid pomodoroDuration (must be number between 1-120)",
      );
    }

    // 验证 whitelist
    if (!Array.isArray(settings.whitelist)) {
      throw new Error("Settings whitelist must be an array");
    }

    // 验证白名单中的每个域名
    for (let i = 0; i < settings.whitelist.length; i++) {
      const domain = settings.whitelist[i];
      if (typeof domain !== "string" || domain.trim() === "") {
        throw new Error(
          `Whitelist domain at index ${i} must be a non-empty string`,
        );
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
     * WhitelistManager - 网站白名单管理器
     */
    /**
 * 网站白名单管理器类（单例模式）
 */
class WhitelistManager {
  constructor() {
    if (WhitelistManager.instance) {
      return WhitelistManager.instance;
    }

    this.domains = new Set(); // 使用 Set 避免重复
    this.storageManager = null; // 延迟初始化

    WhitelistManager.instance = this;
  }

  /**
   * 初始化白名单管理器
   * @param {StorageManager} storageManager - 存储管理器实例
   */
  async initialize(storageManager) {
    this.storageManager = storageManager;

    try {
      // 从存储加载白名单数据
      const settings = await this.storageManager.loadSettings();
      if (settings && Array.isArray(settings.whitelist)) {
        this.domains = new Set(settings.whitelist);
        console.log(
          `[WhitelistManager] Loaded ${this.domains.size} domains from storage`,
        );
      }
    } catch (error) {
      console.error("[WhitelistManager] Failed to initialize:", error);
    }
  }

  /**
   * 添加域名到白名单
   * @param {string} domain - 要添加的域名
   * @returns {boolean} 添加是否成功
   */
  async addDomain(domain) {
    try {
      // 验证域名格式
      const cleanDomain = this.validateAndCleanDomain(domain);
      if (!cleanDomain) {
        console.warn("[WhitelistManager] Invalid domain format:", domain);
        return false;
      }

      // 检查是否已存在
      if (this.domains.has(cleanDomain)) {
        console.warn("[WhitelistManager] Domain already exists:", cleanDomain);
        return false;
      }

      // 添加到内存
      this.domains.add(cleanDomain);

      // 持久化到存储
      const success = await this.saveToStorage();
      if (success) {
        console.log("[WhitelistManager] Domain added:", cleanDomain);
        this.dispatchChangeEvent("domainAdded", { domain: cleanDomain });
        return true;
      } else {
        // 如果保存失败，从内存中移除
        this.domains.delete(cleanDomain);
        return false;
      }
    } catch (error) {
      console.error("[WhitelistManager] Failed to add domain:", error);
      return false;
    }
  }

  /**
   * 从白名单移除域名
   * @param {string} domain - 要移除的域名
   * @returns {boolean} 移除是否成功
   */
  async removeDomain(domain) {
    try {
      const cleanDomain = this.validateAndCleanDomain(domain);
      if (!cleanDomain || !this.domains.has(cleanDomain)) {
        console.warn("[WhitelistManager] Domain not found:", domain);
        return false;
      }

      // 从内存移除
      this.domains.delete(cleanDomain);

      // 持久化到存储
      const success = await this.saveToStorage();
      if (success) {
        console.log("[WhitelistManager] Domain removed:", cleanDomain);
        this.dispatchChangeEvent("domainRemoved", { domain: cleanDomain });
        return true;
      } else {
        // 如果保存失败，重新添加到内存
        this.domains.add(cleanDomain);
        return false;
      }
    } catch (error) {
      console.error("[WhitelistManager] Failed to remove domain:", error);
      return false;
    }
  }

  /**
   * 检查URL对应的域名是否在白名单中
   * @param {string} url - 要检查的URL
   * @returns {boolean} 域名是否被允许
   */
  isDomainAllowed(url) {
    try {
      const domain = this.extractDomainFromURL(url);
      if (!domain) {
        return false;
      }

      // 使用包含匹配逻辑
      for (const whitelistDomain of this.domains) {
        if (domain.includes(whitelistDomain)) {
          console.log(
            `[WhitelistManager] Domain allowed: ${domain} (matched: ${whitelistDomain})`,
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("[WhitelistManager] Failed to check domain:", error);
      return false;
    }
  }

  /**
   * 获取所有白名单域名
   * @returns {Array<string>} 域名数组
   */
  getDomains() {
    return Array.from(this.domains).sort();
  }

  /**
   * 清空所有白名单域名
   * @returns {boolean} 清空是否成功
   */
  async clearDomains() {
    try {
      this.domains.clear();
      const success = await this.saveToStorage();

      if (success) {
        console.log("[WhitelistManager] All domains cleared");
        this.dispatchChangeEvent("domainsCleared");
        return true;
      }

      return false;
    } catch (error) {
      console.error("[WhitelistManager] Failed to clear domains:", error);
      return false;
    }
  }

  /**
   * 验证并清理域名格式
   * @param {string} domain - 原始域名
   * @returns {string|null} 清理后的域名，无效时返回null
   */
  validateAndCleanDomain(domain) {
    if (typeof domain !== "string") {
      return null;
    }

    // 清理空白字符和转换为小写
    const cleaned = domain.trim().toLowerCase();

    if (cleaned === "") {
      return null;
    }

    // 移除协议前缀
    const withoutProtocol = cleaned.replace(/^https?:\/\//, "");

    // 移除路径、查询参数和片段
    const domainOnly = withoutProtocol
      .split("/")[0]
      .split("?")[0]
      .split("#")[0];

    // 移除端口号
    const withoutPort = domainOnly.split(":")[0];

    // 基础域名格式验证
    if (!this.isValidDomainFormat(withoutPort)) {
      return null;
    }

    return withoutPort;
  }

  /**
   * 检查域名格式是否有效
   * @param {string} domain - 域名
   * @returns {boolean} 格式是否有效
   */
  isValidDomainFormat(domain) {
    // 空字符串检查
    if (!domain || domain.length === 0) {
      return false;
    }

    // 长度检查
    if (domain.length > 253) {
      return false;
    }

    // 基础字符检查：只允许字母、数字、点号和连字符
    const domainRegex = /^[a-z0-9.-]+$/;
    if (!domainRegex.test(domain)) {
      return false;
    }

    // 检查是否以点号开始或结束
    if (domain.startsWith(".") || domain.endsWith(".")) {
      return false;
    }

    // 检查是否包含连续的点号
    if (domain.includes("..")) {
      return false;
    }

    // 检查各部分长度（每个标签不能超过63个字符）
    const labels = domain.split(".");
    for (const label of labels) {
      if (label.length === 0 || label.length > 63) {
        return false;
      }

      // 标签不能以连字符开始或结束
      if (label.startsWith("-") || label.endsWith("-")) {
        return false;
      }

      // 检查标签是否只包含连字符（无效）
      if (label === "-") {
        return false;
      }
    }

    // 至少要有一个点号（排除纯localhost等）
    if (!domain.includes(".")) {
      return false;
    }

    return true;
  }

  /**
   * 从URL提取域名
   * @param {string} url - URL字符串
   * @returns {string|null} 域名，提取失败返回null
   */
  extractDomainFromURL(url) {
    try {
      // 如果不是完整URL，假设是域名
      if (!url.includes("://")) {
        return this.validateAndCleanDomain(url);
      }

      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch (error) {
      // URL构造失败，尝试手动解析
      const cleaned = url.replace(/^https?:\/\//, "");
      const domain = cleaned.split("/")[0].split("?")[0].split("#")[0];
      return this.validateAndCleanDomain(domain);
    }
  }

  /**
   * 保存白名单数据到存储
   * @returns {boolean} 保存是否成功
   * @private
   */
  async saveToStorage() {
    if (!this.storageManager) {
      console.error("[WhitelistManager] StorageManager not initialized");
      return false;
    }

    try {
      // 获取当前设置
      const settings = await this.storageManager.loadSettings();

      // 更新白名单
      settings.whitelist = Array.from(this.domains);

      // 保存设置
      return await this.storageManager.saveSettings(settings);
    } catch (error) {
      console.error("[WhitelistManager] Failed to save to storage:", error);
      return false;
    }
  }

  /**
   * 触发白名单变更事件
   * @param {string} eventType - 事件类型
   * @param {Object} detail - 事件详情
   * @private
   */
  dispatchChangeEvent(eventType, detail = {}) {
    // 检查是否在浏览器环境中
    if (
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      typeof CustomEvent !== "undefined"
    ) {
      try {
        const event = new CustomEvent(`tomato-monkey-whitelist-${eventType}`, {
          detail: {
            ...detail,
            domains: this.getDomains(),
            timestamp: Date.now(),
          },
          bubbles: false,
          cancelable: false,
        });

        document.dispatchEvent(event);
      } catch (error) {
        console.warn("[WhitelistManager] Failed to dispatch event:", error);
      }
    }
  }

  /**
   * 获取白名单统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalDomains: this.domains.size,
      domains: this.getDomains(),
      lastModified: Date.now(),
    };
  }
}

// 创建单例实例
const whitelistManager = new WhitelistManager();

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.WhitelistManager = WhitelistManager;
  window.whitelistManager = whitelistManager;
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
     * TimerManager - 计时器管理器
     */
    class TimerManager {
  constructor() {
    // 单例模式
    if (TimerManager.instance) {
      return TimerManager.instance;
    }
    TimerManager.instance = this;

    // 计时器状态
    this.status = "idle"; // idle, running, paused, completed
    this.taskId = null;
    this.taskTitle = null;
    this.startTime = null;
    this.remainingSeconds = 0;
    this.totalSeconds = 1500; // 默认25分钟
    this.intervalId = null;

    // 观察者列表
    this.observers = [];

    // 存储管理器引用
    this.storageManager = null;

    // 通知权限状态
    this.notificationPermission = null;

    // 完成任务缓存
    this.lastCompletedTask = {
      taskId: null,
      taskTitle: null,
      completedAt: null
    };

    this.initialized = false;

    console.log("[TimerManager] Created");
  }

  /**
   * 初始化计时器管理器
   * @param {StorageManager} storageManager - 存储管理器实例
   */
  async initialize(storageManager) {
    if (this.initialized) {
      return;
    }

    this.storageManager = storageManager;
    
    // 初始化通知权限状态（不请求权限）
    this.initializeNotificationStatus();
    
    // 恢复计时器状态
    await this.restoreTimerState();

    this.initialized = true;
    console.log("[TimerManager] Initialized successfully");
  }

  /**
   * 初始化通知权限状态（不请求权限）
   */
  initializeNotificationStatus() {
    // 更健壮的 Notification API 检测
    const NotificationAPI = (typeof window !== 'undefined' && window.Notification) 
      ? window.Notification 
      : (typeof Notification !== 'undefined' ? Notification : null);
    
    if (!NotificationAPI) {
      this.notificationPermission = "unsupported";
      console.warn("[TimerManager] Browser does not support notifications");
    } else {
      this.notificationPermission = NotificationAPI.permission;
      console.log(`[TimerManager] Initial notification permission: ${this.notificationPermission}`);
    }
  }

  /**
   * 检查并请求通知权限（延迟加载，仅在需要时请求）
   */
  async checkNotificationPermission() {
    // 更健壮的 Notification API 检测
    const NotificationAPI = (typeof window !== 'undefined' && window.Notification) 
      ? window.Notification 
      : (typeof Notification !== 'undefined' ? Notification : null);
    
    if (!NotificationAPI) {
      this.notificationPermission = "unsupported";
      console.warn("[TimerManager] Browser does not support notifications");
      return;
    }

    // 更新当前权限状态
    this.notificationPermission = NotificationAPI.permission;
    
    // 仅在权限为 default 时请求权限
    if (this.notificationPermission === "default") {
      try {
        console.log("[TimerManager] Requesting notification permission for focus session");
        const permission = await NotificationAPI.requestPermission();
        this.notificationPermission = permission;
        console.log(`[TimerManager] Notification permission result: ${permission}`);
      } catch (error) {
        console.error("[TimerManager] Failed to request notification permission:", error);
        this.notificationPermission = "denied";
      }
    } else {
      console.log(`[TimerManager] Using existing notification permission: ${this.notificationPermission}`);
    }
  }

  /**
   * 启动计时器
   * @param {string} taskId - 任务ID
   * @param {string} taskTitle - 任务标题
   * @param {number} duration - 计时时长（秒），默认25分钟
   */
  async startTimer(taskId, taskTitle, duration = 1500) {
    if (this.status === "running") {
      console.warn("[TimerManager] Timer is already running");
      return false;
    }

    // 在启动计时器前检查和请求通知权限
    await this.checkNotificationPermission();

    this.taskId = taskId;
    this.taskTitle = taskTitle;
    this.totalSeconds = duration;
    this.remainingSeconds = duration;
    this.startTime = Date.now();
    this.status = "running";

    this.startCountdown();
    this.saveTimerState();
    this.notifyObservers("timerStarted", {
      taskId: this.taskId,
      taskTitle: this.taskTitle,
      totalSeconds: this.totalSeconds,
      remainingSeconds: this.remainingSeconds,
    });

    console.log(`[TimerManager] Timer started for task: ${taskTitle} (${duration}s)`);
    return true;
  }

  /**
   * 暂停计时器
   */
  pauseTimer() {
    if (this.status !== "running") {
      console.warn("[TimerManager] Timer is not running");
      return false;
    }

    this.status = "paused";
    this.clearCountdown();
    this.saveTimerState();
    this.notifyObservers("timerPaused", {
      remainingSeconds: this.remainingSeconds,
    });

    console.log("[TimerManager] Timer paused");
    return true;
  }

  /**
   * 恢复计时器
   */
  resumeTimer() {
    if (this.status !== "paused") {
      console.warn("[TimerManager] Timer is not paused");
      return false;
    }

    this.status = "running";
    this.startTime = Date.now() - (this.totalSeconds - this.remainingSeconds) * 1000;
    this.startCountdown();
    this.saveTimerState();
    this.notifyObservers("timerResumed", {
      remainingSeconds: this.remainingSeconds,
    });

    console.log("[TimerManager] Timer resumed");
    return true;
  }

  /**
   * 停止计时器
   */
  stopTimer(donotNotify) {
    if (this.status === "idle") {
      console.warn("[TimerManager] Timer is already idle");
      return false;
    }

    this.clearCountdown();
    this.resetTimer();
    this.clearTimerState();
    if (!donotNotify) {
      this.notifyObservers("timerStopped", {});
    }

    console.log("[TimerManager] Timer stopped");
    return true;
  }

  /**
   * 修改计时器时长
   * @param {number} newDuration - 新的计时时长（秒）
   * @returns {boolean} 修改是否成功
   */
  modifyTimer(newDuration) {
    if (this.status !== "running" && this.status !== "paused") {
      console.warn("[TimerManager] Cannot modify timer when not running or paused");
      return false;
    }

    // 验证新时长
    if (!Number.isInteger(newDuration) || newDuration <= 0 || newDuration > 7200) {
      console.error("[TimerManager] Invalid duration. Must be between 1 and 7200 seconds");
      return false;
    }

    const wasRunning = this.status === "running";
    
    // 如果正在运行，先停止倒计时
    if (wasRunning) {
      this.clearCountdown();
    }

    // 更新时长
    const oldDuration = this.totalSeconds;
    this.totalSeconds = newDuration;
    this.remainingSeconds = newDuration;
    this.startTime = Date.now();

    // 如果之前是运行状态，重新开始倒计时
    if (wasRunning) {
      this.startCountdown();
    }

    // 保存状态
    this.saveTimerState();

    // 通知观察者
    this.notifyObservers("timerModified", {
      taskId: this.taskId,
      taskTitle: this.taskTitle,
      oldDuration: oldDuration,
      newDuration: newDuration,
      totalSeconds: this.totalSeconds,
      remainingSeconds: this.remainingSeconds,
    });

    console.log(`[TimerManager] Timer duration modified from ${oldDuration}s to ${newDuration}s`);
    return true;
  }

  /**
   * 开始倒计时
   */
  startCountdown() {
    this.clearCountdown(); // 清除可能存在的计时器
    
    this.intervalId = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  /**
   * 更新倒计时
   */
  updateCountdown() {
    if (this.status !== "running") {
      return;
    }

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.remainingSeconds = Math.max(0, this.totalSeconds - elapsed);

    // 通知观察者
    this.notifyObservers("timerTick", {
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      progress: (this.totalSeconds - this.remainingSeconds) / this.totalSeconds,
    });

    // 保存状态
    this.saveTimerState();

    // 检查是否完成
    if (this.remainingSeconds <= 0) {
      this.completeTimer();
    }
  }

  /**
   * 完成计时器
   */
  completeTimer() {
    this.clearCountdown();
    this.status = "completed";
    
    // 发送桌面通知
    this.sendNotification();

    // 通知观察者
    this.notifyObservers("timerCompleted", {
      taskId: this.taskId,
      taskTitle: this.taskTitle,
    });

    // 保存完成的任务信息到缓存（在重置前保存）
    this.lastCompletedTask = {
      taskId: this.taskId,
      taskTitle: this.taskTitle,
      completedAt: Date.now()
    };

    // 重置计时器状态
    setTimeout(() => {
      this.resetTimer();
      this.clearTimerState();
    }, 1000); // 给UI足够时间处理完成事件

    console.log(`[TimerManager] Timer completed for task: ${this.taskTitle}`);
  }

  /**
   * 发送桌面通知
   */
  sendNotification() {
    const title = "专注时间结束 🍅";
    const message = this.taskTitle 
      ? `任务「${this.taskTitle}」的专注时间已完成`
      : "专注时间已完成";

    if (this.notificationPermission === "granted") {
      try {
        // 更健壮的 Notification API 检测
        const NotificationAPI = (typeof window !== 'undefined' && window.Notification) 
          ? window.Notification 
          : (typeof Notification !== 'undefined' ? Notification : null);
        
        if (!NotificationAPI) {
          this.showFallbackNotification(title, message);
          return;
        }

        const notification = new NotificationAPI(title, {
          body: message,
          icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRDk1NTUwIi8+Cjwvc3ZnPgo=",
          requireInteraction: false,
          silent: false,
        });

        // 自动关闭通知
        setTimeout(() => {
          notification.close();
        }, 5000);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

      } catch (error) {
        console.error("[TimerManager] Failed to send notification:", error);
        this.showFallbackNotification(title, message);
      }
    } else {
      console.warn(`[TimerManager] Notification permission: ${this.notificationPermission}`);
      this.showFallbackNotification(title, message);
    }
  }

  /**
   * 显示降级通知（页面内提示）
   * @param {string} title - 通知标题
   * @param {string} message - 通知消息
   */
  showFallbackNotification(title, message) {
    // 创建页面内通知
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 300px;
      padding: 16px;
      background: #D95550;
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(217, 85, 80, 0.3);
      z-index: 10002;
      font-family: Inter, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    // 使用DOM操作创建内容（防止XSS）
    const titleDiv = document.createElement("div");
    titleDiv.style.cssText = "font-weight: 600; margin-bottom: 4px;";
    titleDiv.textContent = title;
    notification.appendChild(titleDiv);
    
    const messageDiv = document.createElement("div");
    messageDiv.textContent = message;
    notification.appendChild(messageDiv);

    document.body.appendChild(notification);

    // 自动移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * 清除倒计时间隔
   */
  clearCountdown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 重置计时器状态
   */
  resetTimer() {
    this.status = "idle";
    this.taskId = null;
    this.taskTitle = null;
    this.startTime = null;
    this.remainingSeconds = 0;
    this.totalSeconds = 1500;
  }

  /**
   * 保存计时器状态
   */
  saveTimerState() {
    if (!this.storageManager) return;

    const state = {
      status: this.status,
      taskId: this.taskId,
      taskTitle: this.taskTitle,
      startTime: this.startTime,
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      timestamp: Date.now(),
    };

    this.storageManager.setData("timerState", state);
  }

  /**
   * 恢复计时器状态
   */
  async restoreTimerState() {
    if (!this.storageManager) return;

    try {
      const state = this.storageManager.getData("timerState");
      if (!state || state.status === "idle") {
        return;
      }

      const now = Date.now();
      const timeDiff = Math.floor((now - state.timestamp) / 1000);

      // 如果状态是运行中，需要计算实际剩余时间
      if (state.status === "running") {
        const elapsed = Math.floor((now - state.startTime) / 1000);
        const remaining = Math.max(0, state.totalSeconds - elapsed);

        if (remaining > 0) {
          this.taskId = state.taskId;
          this.taskTitle = state.taskTitle;
          this.startTime = state.startTime;
          this.remainingSeconds = remaining;
          this.totalSeconds = state.totalSeconds;
          this.status = "running";

          this.startCountdown();
          console.log("[TimerManager] Timer state restored and resumed");
        } else {
          // 计时器应该已经完成了
          this.completeTimer();
          console.log("[TimerManager] Timer completed while away");
        }
      } else if (state.status === "paused") {
        this.taskId = state.taskId;
        this.taskTitle = state.taskTitle;
        this.remainingSeconds = state.remainingSeconds;
        this.totalSeconds = state.totalSeconds;
        this.status = "paused";
        console.log("[TimerManager] Timer state restored (paused)");
      }

    } catch (error) {
      console.error("[TimerManager] Failed to restore timer state:", error);
    }
  }

  /**
   * 清除保存的计时器状态
   */
  clearTimerState() {
    if (!this.storageManager) return;
    this.storageManager.removeData("timerState");
  }

  /**
   * 添加观察者
   * @param {Function} observer - 观察者回调函数
   */
  addObserver(observer) {
    if (typeof observer === "function" && !this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  /**
   * 移除观察者
   * @param {Function} observer - 观察者回调函数
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
  notifyObservers(event, data) {
    this.observers.forEach((observer) => {
      try {
        observer(event, data);
      } catch (error) {
        console.error("[TimerManager] Observer error:", error);
      }
    });
  }

  /**
   * 获取计时器当前状态
   * @returns {Object} 计时器状态
   */
  getTimerState() {
    return {
      status: this.status,
      taskId: this.taskId,
      taskTitle: this.taskTitle,
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      progress: this.totalSeconds > 0 ? (this.totalSeconds - this.remainingSeconds) / this.totalSeconds : 0,
    };
  }

  /**
   * 获取任务信息（优先返回当前任务，如果没有则返回缓存的完成任务）
   * @returns {Object|null} 任务信息 {taskId, taskTitle} 或 null
   */
  getTaskInfo() {
    // 优先返回当前任务
    if (this.taskId) {
      return {
        taskId: this.taskId,
        taskTitle: this.taskTitle
      };
    }
    
    // 如果没有当前任务，返回缓存的完成任务
    if (this.lastCompletedTask.taskId) {
      return {
        taskId: this.lastCompletedTask.taskId,
        taskTitle: this.lastCompletedTask.taskTitle
      };
    }
    
    // 都没有则返回 null
    return null;
  }

  /**
   * 格式化时间显示
   * @param {number} seconds - 秒数
   * @returns {string} 格式化的时间 (MM:SS)
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 获取单例实例
   * @returns {TimerManager} 计时器管理器实例
   */
  static getInstance() {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * 销毁计时器管理器
   */
  destroy() {
    this.clearCountdown();
    this.clearTimerState();
    this.observers = [];
    console.log("[TimerManager] Destroyed");
  }
}

// 创建单例实例
const timerManager = new TimerManager();

// 全局对象暴露
if (typeof window !== "undefined") {
  window.TimerManager = TimerManager;
  window.timerManager = timerManager;
}

// 模块导出 (支持 CommonJS 和 ES6)
    
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
   * 销毁设置面板
   */
  destroy() {
    // 清理撤销Toast
    this.hideUndoToast();

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
   * 开始专注会话
   * @param {string} taskId - 任务ID
   * @param {string} taskTitle - 任务标题
   */
  async startFocusSession(taskId, taskTitle) {
    try {
      // 获取TimerManager实例
      const timerManager = window.TimerManager ? window.TimerManager.getInstance() : null;
      
      if (!timerManager) {
        this.showError("计时器模块未就绪，请刷新页面重试");
        console.error("[TodoList] TimerManager not available");
        return;
      }

      // 检查是否已有计时器在运行
      const timerState = timerManager.getTimerState();
      if (timerState.status === "running") {
        const confirmed = confirm("已有计时器在运行中，是否要停止当前计时器并开始新的专注会话？");
        if (!confirmed) return;
        
        timerManager.stopTimer(true);
      }

      // 启动计时器 (默认25分钟) - 现在是异步调用，会在此时请求通知权限
      const started = await timerManager.startTimer(taskId, taskTitle, 1500);
      
      if (started) {
        console.log(`[TodoList] Started focus session for task: ${taskTitle}`);
      } else {
        this.showError("无法启动专注会话，请重试");
        console.error("[TodoList] Failed to start timer");
      }

    } catch (error) {
      console.error("[TodoList] Failed to start focus session:", error);
      this.showError("启动专注会话失败，请重试");
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
                    ${!task.isCompleted ? `
                        <button 
                            type="button" 
                            class="start-focus-button" 
                            title="开始专注"
                            aria-label="开始专注: ${task.title}"
                        >
                            🍅
                        </button>
                    ` : ""}
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

    // 开始专注按钮点击
    else if (e.target.classList.contains("start-focus-button")) {
      const taskTitle = taskItem.querySelector(".task-title").textContent;
      this.startFocusSession(taskId, taskTitle);
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
    
    /**
     * FocusPage - 专注页面UI组件
     */
    class FocusPage {
  constructor() {
    this.container = null;
    this.isInitialized = false;
    this.isVisible = false;
    
    // UI元素引用
    this.taskTitleElement = null;
    this.countdownElement = null;
    this.statusElement = null;
    this.progressElement = null;
    
    // 计时器管理器引用
    this.timerManager = null;
    
    // 观察者回调绑定
    this.boundObserverCallback = this.handleTimerEvent.bind(this);
    
    console.log("[FocusPage] Created");
  }

  /**
   * 初始化专注页面
   * @param {TimerManager} timerManager - 计时器管理器实例
   * @param {TaskManager} taskManager - 任务管理器实例
   */
  initialize(timerManager, taskManager) {
    if (this.isInitialized) {
      return;
    }

    this.timerManager = timerManager;
    this.taskManager = taskManager;
    this.createPageStructure();
    this.bindTimerManager();

    this.isInitialized = true;
    console.log("[FocusPage] Initialized successfully");
  }

  /**
   * 创建专注页面的DOM结构
   */
  createPageStructure() {
    // 创建专注页面容器
    this.container = document.createElement("div");
    this.container.id = "tomato-monkey-focus-page";
    this.container.className = "focus-page-container hidden";
    
    this.container.innerHTML = `
      <div class="focus-page-overlay"></div>
      <div class="focus-page-content">
        <div class="focus-header">
          <div class="focus-task-title" id="focus-task-title">
            准备开始专注...
          </div>
          <div class="focus-status" id="focus-status">
            就绪
          </div>
        </div>
        
        <div class="focus-timer">
          <div class="countdown-display" id="countdown-display">
            25:00
          </div>
          <div class="countdown-progress" id="countdown-progress">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
        </div>
        
        <div class="focus-info">
          <div class="focus-hint">
            保持专注，距离完成还有一段时间
          </div>
        </div>
        
        <div class="focus-actions">
          <button type="button" class="focus-action-btn pause-btn hidden" id="pause-btn">
            暂停
          </button>
          <button type="button" class="focus-action-btn resume-btn hidden" id="resume-btn">
            继续
          </button>
          <button type="button" class="focus-action-btn modify-time-btn hidden" id="modify-time-btn">
            修改时间
          </button>
          <button type="button" class="focus-action-btn stop-btn hidden" id="stop-btn">
            结束专注
          </button>
          
          <!-- 倒计时完成后的操作按钮 -->
          <button type="button" class="focus-action-btn complete-btn hidden" id="complete-btn">
            ✅ 任务完成
          </button>
          <button type="button" class="focus-action-btn cancel-complete-btn hidden" id="cancel-complete-btn">
            ❌ 取消
          </button>
          <button type="button" class="focus-action-btn extend-time-btn hidden" id="extend-time-btn">
            ⏰ 增加时间
          </button>
        </div>
      </div>
      
      <!-- Time Modification Modal -->
      <div class="time-modify-modal hidden" id="time-modify-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>设置专注时间</h3>
          </div>
          <div class="modal-body">
            <div class="time-input-group">
              <label for="time-input">专注时长 (分钟)</label>
              <input type="number" id="time-input" class="time-input" 
                     min="0.1" max="120" step="0.1" placeholder="输入分钟数 (如: 25 或 1.5)">
            </div>
            <div class="time-presets">
              <button type="button" class="preset-btn" data-minutes="25">25分钟</button>
              <button type="button" class="preset-btn" data-minutes="30">30分钟</button>
              <button type="button" class="preset-btn" data-minutes="45">45分钟</button>
              <button type="button" class="preset-btn" data-minutes="60">60分钟</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-btn cancel-btn" id="cancel-time-btn">取消</button>
            <button type="button" class="modal-btn confirm-btn" id="confirm-time-btn">确定</button>
          </div>
        </div>
      </div>
      
      <!-- Extend Time Modal -->
      <div class="time-modify-modal hidden" id="extend-time-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>增加专注时间</h3>
          </div>
          <div class="modal-body">
            <div class="time-input-group">
              <label for="extend-time-input">增加时长 (分钟)</label>
              <input type="number" id="extend-time-input" class="time-input" 
                     min="0.1" max="60" step="0.1" value="5" placeholder="输入分钟数 (如: 5 或 2.5)">
            </div>
            <div class="time-presets">
              <button type="button" class="preset-btn" data-minutes="5">5分钟</button>
              <button type="button" class="preset-btn" data-minutes="10">10分钟</button>
              <button type="button" class="preset-btn selected" data-minutes="15">15分钟</button>
              <button type="button" class="preset-btn" data-minutes="30">30分钟</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-btn cancel-btn" id="cancel-extend-btn">取消</button>
            <button type="button" class="modal-btn confirm-btn" id="confirm-extend-btn">确认</button>
          </div>
        </div>
      </div>
    `;

    // 添加到页面
    document.body.appendChild(this.container);

    // 获取UI元素引用
    this.taskTitleElement = this.container.querySelector("#focus-task-title");
    this.countdownElement = this.container.querySelector("#countdown-display");
    this.statusElement = this.container.querySelector("#focus-status");
    this.progressElement = this.container.querySelector("#progress-bar");
    
    // 绑定事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 暂停按钮
    const pauseBtn = this.container.querySelector("#pause-btn");
    pauseBtn.addEventListener("click", () => {
      if (this.timerManager) {
        this.timerManager.pauseTimer();
      }
    });

    // 继续按钮
    const resumeBtn = this.container.querySelector("#resume-btn");
    resumeBtn.addEventListener("click", () => {
      if (this.timerManager) {
        this.timerManager.resumeTimer();
      }
    });

    // 停止按钮
    const stopBtn = this.container.querySelector("#stop-btn");
    stopBtn.addEventListener("click", () => {
      this.showStopConfirmation();
    });

    // 修改时间按钮
    const modifyTimeBtn = this.container.querySelector("#modify-time-btn");
    modifyTimeBtn.addEventListener("click", () => {
      this.showTimeModificationModal();
    });

    // 完成按钮
    const completeBtn = this.container.querySelector("#complete-btn");
    if (completeBtn) {
      completeBtn.addEventListener("click", () => this.handleTaskComplete());
    }

    // 取消按钮
    const cancelCompleteBtn = this.container.querySelector("#cancel-complete-btn");
    if (cancelCompleteBtn) {
      cancelCompleteBtn.addEventListener("click", () => this.hide());
    }

    // 增加时间按钮
    const extendTimeBtn = this.container.querySelector("#extend-time-btn");
    if (extendTimeBtn) {
      extendTimeBtn.addEventListener("click", () => this.handleExtendTime());
    }

    // 时间修改模态框事件
    this.setupModalEventListeners();

    // 增加时间模态框事件
    this.setupExtendTimeModalEventListeners();

    // 点击遮罩层不做任何操作（避免意外关闭）
    this.container.querySelector(".focus-page-overlay").addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // ESC键处理
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        // 如果模态框打开，先关闭模态框
        if (this.isTimeModalVisible()) {
          this.hideTimeModificationModal();
        } else if (this.isExtendTimeModalVisible()) {
          this.hideExtendTimeModal();
        } else {
          this.showStopConfirmation();
        }
      }
    });
  }

  /**
   * 显示停止确认对话框
   */
  showStopConfirmation() {
    const confirmed = confirm("确定要结束当前的专注时间吗？\n\n这将停止计时器并返回任务列表。");
    if (confirmed && this.timerManager) {
      this.timerManager.stopTimer();
    }
  }

  /**
   * 设置模态框事件监听器
   */
  setupModalEventListeners() {
    const modal = this.container.querySelector("#time-modify-modal");
    const cancelBtn = this.container.querySelector("#cancel-time-btn");
    const confirmBtn = this.container.querySelector("#confirm-time-btn");
    const timeInput = this.container.querySelector("#time-input");
    const presetBtns = this.container.querySelectorAll(".preset-btn");
    const modalOverlay = this.container.querySelector(".modal-overlay");

    // 取消按钮
    cancelBtn.addEventListener("click", () => {
      this.hideTimeModificationModal();
    });

    // 确认按钮
    confirmBtn.addEventListener("click", () => {
      this.handleTimeModification();
    });

    // 点击遮罩层关闭模态框
    modalOverlay.addEventListener("click", () => {
      this.hideTimeModificationModal();
    });

    // 预设按钮
    presetBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        // 移除其他按钮的选中状态
        presetBtns.forEach(b => b.classList.remove("selected"));
        // 选中当前按钮
        btn.classList.add("selected");
        // 设置输入值
        const minutes = parseFloat(btn.dataset.minutes);
        timeInput.value = minutes;
      });
    });

    // 输入框变化时取消预设选择
    timeInput.addEventListener("input", () => {
      presetBtns.forEach(btn => btn.classList.remove("selected"));
    });

    // 回车键确认
    timeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.handleTimeModification();
      }
    });
  }

  /**
   * 设置增加时间模态框事件监听器
   */
  setupExtendTimeModalEventListeners() {
    const modal = this.container.querySelector("#extend-time-modal");
    const cancelBtn = this.container.querySelector("#cancel-extend-btn");
    const confirmBtn = this.container.querySelector("#confirm-extend-btn");
    const timeInput = this.container.querySelector("#extend-time-input");
    const presetBtns = modal.querySelectorAll(".preset-btn");
    const modalOverlay = modal.querySelector(".modal-overlay");

    // 取消按钮
    cancelBtn.addEventListener("click", () => {
      this.hideExtendTimeModal();
    });

    // 确认按钮
    confirmBtn.addEventListener("click", () => {
      this.confirmExtendTime();
    });

    // 点击遮罩层关闭模态框
    modalOverlay.addEventListener("click", () => {
      this.hideExtendTimeModal();
    });

    // 预设按钮
    presetBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        // 移除其他按钮的选中状态
        presetBtns.forEach(b => b.classList.remove("selected"));
        // 选中当前按钮
        btn.classList.add("selected");
        // 设置输入值
        const minutes = parseFloat(btn.dataset.minutes);
        timeInput.value = minutes;
      });
    });

    // 输入框变化时取消预设选择
    timeInput.addEventListener("input", () => {
      presetBtns.forEach(btn => btn.classList.remove("selected"));
      // 找到匹配的预设按钮并选中
      const value = parseFloat(timeInput.value);
      const matchingBtn = Array.from(presetBtns).find(btn => parseFloat(btn.dataset.minutes) === value);
      if (matchingBtn) {
        matchingBtn.classList.add("selected");
      }
    });

    // 回车键确认
    timeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.confirmExtendTime();
      }
    });
  }

  /**
   * 显示时间修改模态框
   */
  showTimeModificationModal() {
    const modal = this.container.querySelector("#time-modify-modal");
    const timeInput = this.container.querySelector("#time-input");
    const presetBtns = this.container.querySelectorAll(".preset-btn");
    
    if (!this.timerManager) return;

    // 设置当前时间为默认值
    const currentMinutes = Math.ceil(this.timerManager.totalSeconds / 60);
    timeInput.value = currentMinutes;

    // 检查是否有匹配的预设按钮
    presetBtns.forEach(btn => {
      btn.classList.remove("selected");
      if (parseInt(btn.dataset.minutes) === currentMinutes) {
        btn.classList.add("selected");
      }
    });

    // 显示模态框
    modal.classList.remove("hidden");
    
    // 聚焦输入框
    setTimeout(() => {
      timeInput.focus();
      timeInput.select();
    }, 100);
  }

  /**
   * 隐藏时间修改模态框
   */
  hideTimeModificationModal() {
    const modal = this.container.querySelector("#time-modify-modal");
    modal.classList.add("hidden");
  }

  /**
   * 检查时间修改模态框是否可见
   */
  isTimeModalVisible() {
    const modal = this.container.querySelector("#time-modify-modal");
    return modal && !modal.classList.contains("hidden");
  }

  /**
   * 处理时间修改
   */
  handleTimeModification() {
    const timeInput = this.container.querySelector("#time-input");
    const minutes = parseFloat(timeInput.value);

    // 验证输入
    if (isNaN(minutes) || minutes < 0.1 || minutes > 120) {
      alert("请输入有效的时间（0.1-120分钟）");
      timeInput.focus();
      return;
    }

    // 转换为秒并向上取整
    const seconds = Math.ceil(minutes * 60);

    // 调用TimerManager修改时间
    if (this.timerManager && this.timerManager.modifyTimer(seconds)) {
      this.hideTimeModificationModal();
      console.log(`[FocusPage] Timer modified to ${minutes} minutes`);
    } else {
      alert("修改时间失败，请重试");
    }
  }

  /**
   * 绑定计时器管理器事件
   */
  bindTimerManager() {
    if (!this.timerManager) return;

    this.timerManager.addObserver(this.boundObserverCallback);
  }

  /**
   * 解绑计时器管理器事件
   */
  unbindTimerManager() {
    if (!this.timerManager) return;

    this.timerManager.removeObserver(this.boundObserverCallback);
  }

  /**
   * 处理计时器事件
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  handleTimerEvent(event, data) {
    switch (event) {
      case "timerStarted":
        this.onTimerStarted(data);
        break;
      case "timerTick":
        this.onTimerTick(data);
        break;
      case "timerPaused":
        this.onTimerPaused(data);
        break;
      case "timerResumed":
        this.onTimerResumed(data);
        break;
      case "timerCompleted":
        this.onTimerCompleted(data);
        break;
      case "timerStopped":
        this.onTimerStopped(data);
        break;
      case "timerModified":
        this.onTimerModified(data);
        break;
    }
  }

  /**
   * 处理计时器开始事件
   * @param {Object} data - 事件数据
   */
  onTimerStarted(data) {
    this.updateTaskInfo(data.taskTitle);
    this.updateCountdown(data.remainingSeconds, data.totalSeconds);
    this.updateStatus("专注中", "running");
    this.updateProgress(0);
    this.show();
    this.showActionButtons(true);
    
    // 确保完成按钮在计时器开始时被隐藏
    this.hideCompletionButtons();
    
    console.log("[FocusPage] Timer started, showing focus page");
  }

  /**
   * 处理计时器更新事件
   * @param {Object} data - 事件数据
   */
  onTimerTick(data) {
    this.updateCountdown(data.remainingSeconds, data.totalSeconds);
    this.updateProgress(data.progress);
    this.updateHint(data.remainingSeconds);
  }

  /**
   * 处理计时器暂停事件
   * @param {Object} data - 事件数据
   */
  onTimerPaused(data) {
    this.updateStatus("已暂停", "paused");
    this.updateActionButtons("paused");
  }

  /**
   * 处理计时器恢复事件
   * @param {Object} data - 事件数据
   */
  onTimerResumed(data) {
    this.updateStatus("专注中", "running");
    this.updateActionButtons("running");
  }

  /**
   * 处理计时器完成事件
   * @param {Object} data - 事件数据
   */
  onTimerCompleted(data) {
    this.updateStatus("已完成 🎉", "completed");
    this.updateHint(0);
    this.showCompletionMessage(data.taskTitle);
    
    // 显示完成后的操作按钮
    this.showCompletionButtons();
    
    console.log("[FocusPage] Timer completed, showing completion buttons");
  }

  /**
   * 处理计时器停止事件
   * @param {Object} data - 事件数据
   */
  onTimerStopped(data) {
    this.hide();
    console.log("[FocusPage] Timer stopped, hiding focus page");
  }

  /**
   * 处理计时器修改事件
   * @param {Object} data - 事件数据
   */
  onTimerModified(data) {
    this.updateCountdown(data.remainingSeconds, data.totalSeconds);
    this.updateProgress(0); // 重置进度条
    this.updateHint(data.remainingSeconds);
    
    console.log(`[FocusPage] Timer modified from ${data.oldDuration}s to ${data.newDuration}s`);
  }

  /**
   * 更新任务信息
   * @param {string} taskTitle - 任务标题
   */
  updateTaskInfo(taskTitle) {
    if (this.taskTitleElement) {
      this.taskTitleElement.textContent = taskTitle || "未知任务";
    }
  }

  /**
   * 更新倒计时显示
   * @param {number} remainingSeconds - 剩余秒数
   * @param {number} totalSeconds - 总秒数
   */
  updateCountdown(remainingSeconds, totalSeconds = null) {
    if (!this.countdownElement) return;

    const timeStr = this.formatTime(remainingSeconds);
    this.countdownElement.textContent = timeStr;

    // 添加时间警告样式
    if (remainingSeconds <= 300) { // 最后5分钟
      this.countdownElement.classList.add("warning");
    } else {
      this.countdownElement.classList.remove("warning");
    }

    if (remainingSeconds <= 60) { // 最后1分钟
      this.countdownElement.classList.add("urgent");
    } else {
      this.countdownElement.classList.remove("urgent");
    }
  }

  /**
   * 更新状态显示
   * @param {string} statusText - 状态文本
   * @param {string} statusClass - 状态样式类
   */
  updateStatus(statusText, statusClass) {
    if (!this.statusElement) return;

    this.statusElement.textContent = statusText;
    this.statusElement.className = `focus-status ${statusClass}`;
  }

  /**
   * 更新进度条
   * @param {number} progress - 进度（0-1）
   */
  updateProgress(progress) {
    if (!this.progressElement) return;

    const percentage = Math.min(100, Math.max(0, progress * 100));
    this.progressElement.style.width = `${percentage}%`;
  }

  /**
   * 更新提示信息
   * @param {number} remainingSeconds - 剩余秒数
   */
  updateHint(remainingSeconds) {
    const hintElement = this.container.querySelector(".focus-hint");
    if (!hintElement) return;

    let hintText = "保持专注，距离完成还有一段时间";

    if (remainingSeconds <= 0) {
      hintText = "恭喜！本次专注时间已完成 🎉";
    } else if (remainingSeconds <= 60) {
      hintText = "最后冲刺！还有不到1分钟";
    } else if (remainingSeconds <= 300) {
      hintText = "进入最后阶段，坚持住！";
    } else if (remainingSeconds <= 900) {
      hintText = "已经过半，继续保持专注";
    }

    hintElement.textContent = hintText;
  }

  /**
   * 显示完成消息
   * @param {string} taskTitle - 任务标题
   */
  showCompletionMessage(taskTitle) {
    const messageElement = this.container.querySelector(".focus-hint");
    if (messageElement) {
      // 清空现有内容
      messageElement.innerHTML = '';
      
      // 创建完成消息容器
      const completionDiv = document.createElement('div');
      completionDiv.className = 'completion-message';
      
      // 创建图标元素
      const iconDiv = document.createElement('div');
      iconDiv.className = 'completion-icon';
      iconDiv.textContent = '🍅';
      completionDiv.appendChild(iconDiv);
      
      // 创建文本元素
      const textDiv = document.createElement('div');
      textDiv.className = 'completion-text';
      textDiv.textContent = '专注时间完成！';
      completionDiv.appendChild(textDiv);
      
      // 创建任务标题元素（使用textContent防止XSS）
      const taskDiv = document.createElement('div');
      taskDiv.className = 'completion-task';
      taskDiv.textContent = taskTitle || '';
      completionDiv.appendChild(taskDiv);
      
      messageElement.appendChild(completionDiv);
    }
  }

  /**
   * 显示/隐藏操作按钮
   * @param {boolean} show - 是否显示
   */
  showActionButtons(show) {
    // 只选择常规操作按钮，排除完成后的操作按钮
    const regularButtons = this.container.querySelectorAll("#pause-btn, #resume-btn, #modify-time-btn, #stop-btn");
    regularButtons.forEach(btn => {
      btn.classList.toggle("hidden", !show);
    });

    if (show) {
      this.updateActionButtons("running");
    }
  }

  /**
   * 更新操作按钮状态
   * @param {string} status - 计时器状态
   */
  updateActionButtons(status) {
    const pauseBtn = this.container.querySelector("#pause-btn");
    const resumeBtn = this.container.querySelector("#resume-btn");
    const modifyTimeBtn = this.container.querySelector("#modify-time-btn");
    const stopBtn = this.container.querySelector("#stop-btn");

    switch (status) {
      case "running":
        pauseBtn.classList.remove("hidden");
        resumeBtn.classList.add("hidden");
        modifyTimeBtn.classList.remove("hidden");
        stopBtn.classList.remove("hidden");
        break;
      case "paused":
        pauseBtn.classList.add("hidden");
        resumeBtn.classList.remove("hidden");
        modifyTimeBtn.classList.remove("hidden");
        stopBtn.classList.remove("hidden");
        break;
      default:
        pauseBtn.classList.add("hidden");
        resumeBtn.classList.add("hidden");
        modifyTimeBtn.classList.add("hidden");
        stopBtn.classList.add("hidden");
    }
  }

  /**
   * 显示专注页面
   */
  show() {
    if (!this.container) return;

    this.container.classList.remove("hidden");
    this.isVisible = true;

    // 添加显示动画
    setTimeout(() => {
      this.container.classList.add("show");
    }, 10);

    // 阻止页面滚动
    document.body.style.overflow = "hidden";
  }

  /**
   * 隐藏专注页面
   */
  hide() {
    if (!this.container) return;

    this.container.classList.remove("show");
    this.isVisible = false;

    // 动画完成后隐藏
    setTimeout(() => {
      this.container.classList.add("hidden");
      document.body.style.overflow = "";
      this.reset();
    }, 300);
  }

  /**
   * 重置页面状态
   */
  reset() {
    this.updateTaskInfo("准备开始专注...");
    this.updateCountdown(1500); // 重置为25分钟
    this.updateStatus("就绪", "idle");
    this.updateProgress(0);
    this.showActionButtons(false);
    
    // 确保完成按钮也被隐藏
    this.hideCompletionButtons();
    
    // 重置提示
    const hintElement = this.container.querySelector(".focus-hint");
    if (hintElement) {
      hintElement.textContent = "保持专注，距离完成还有一段时间";
    }
  }

  /**
   * 格式化时间显示
   * @param {number} seconds - 秒数
   * @returns {string} 格式化的时间 (MM:SS)
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 检查页面是否可见
   * @returns {boolean} 是否可见
   */
  isPageVisible() {
    return this.isVisible;
  }

  /**
   * 显示完成后的操作按钮
   */
  showCompletionButtons() {
    const completeBtn = this.container.querySelector("#complete-btn");
    const cancelBtn = this.container.querySelector("#cancel-complete-btn");
    const extendBtn = this.container.querySelector("#extend-time-btn");
    
    // 隐藏其他按钮
    this.showActionButtons(false);
    
    // 显示完成操作按钮
    completeBtn.classList.remove("hidden");
    cancelBtn.classList.remove("hidden");
    extendBtn.classList.remove("hidden");
  }

  /**
   * 隐藏完成后的操作按钮
   */
  hideCompletionButtons() {
    const completeBtn = this.container.querySelector("#complete-btn");
    const cancelBtn = this.container.querySelector("#cancel-complete-btn");
    const extendBtn = this.container.querySelector("#extend-time-btn");
    
    completeBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");
    extendBtn.classList.add("hidden");
  }

  /**
   * 处理任务完成
   */
  async handleTaskComplete() {
    const taskInfo = this.timerManager.getTaskInfo();
    if (this.taskManager && taskInfo && taskInfo.taskId) {
      try {
        const taskId = taskInfo.taskId;
        // 标记任务为完成
        await this.taskManager.toggleTaskCompletion(taskId);
        // 增加番茄钟计数
        await this.taskManager.incrementPomodoroCount(taskId);
        console.log(`[FocusPage] Task marked as completed`);
        
        // 显示成功提示
        this.updateStatus("任务已标记完成 ✅", "completed");
        
        // 1秒后隐藏页面
        setTimeout(() => {
          this.hide();
        }, 1000);
      } catch (error) {
        console.error("[FocusPage] Failed to complete task:", error);
      }
    }
  }

  /**
   * 处理增加时间
   */
  handleExtendTime() {
    const modal = this.container.querySelector("#extend-time-modal");
    const input = this.container.querySelector("#extend-time-input");
    input.value = 15; // 默认15分钟
    modal.classList.remove("hidden");
    
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
  }

  /**
   * 隐藏增加时间模态框
   */
  hideExtendTimeModal() {
    const modal = this.container.querySelector("#extend-time-modal");
    modal.classList.add("hidden");
  }

  /**
   * 确认增加时间
   */
  async confirmExtendTime() {
    const input = this.container.querySelector("#extend-time-input");
    const minutes = parseFloat(input.value);
    
    if (isNaN(minutes) || minutes < 0.1 || minutes > 60) {
      alert("请输入有效的时间（0.1-60分钟）");
      input.focus();
      return;
    }
    
    const seconds = Math.ceil(minutes * 60);
    
    // 使用 TimerManager 重新启动计时器
    const taskInfo = this.timerManager.getTaskInfo();
    if (this.timerManager && taskInfo) {
      const taskId = taskInfo.taskId;
      const taskTitle = taskInfo.taskTitle;
      
      // 重新启动计时器
      await this.timerManager.startTimer(taskId, taskTitle, seconds);
      
      // 隐藏modal和完成按钮
      this.hideExtendTimeModal();
      this.hideCompletionButtons();
      
      console.log(`[FocusPage] Extended timer by ${minutes} minutes`);
    }
  }

  /**
   * 检查增加时间模态框是否可见
   * @returns {boolean} 是否可见
   */
  isExtendTimeModalVisible() {
    const modal = this.container.querySelector("#extend-time-modal");
    return modal && !modal.classList.contains("hidden");
  }

  /**
   * 销毁专注页面
   */
  destroy() {
    this.unbindTimerManager();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // 恢复页面滚动
    document.body.style.overflow = "";

    this.container = null;
    this.isInitialized = false;
    this.isVisible = false;

    console.log("[FocusPage] Destroyed");
  }
}

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.FocusPage = FocusPage;
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
.start-focus-button {
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
font-size: 14px;
transition: all 0.2s ease;
margin-right: 4px;
}
.start-focus-button:hover {
background: rgba(217, 85, 80, 0.1);
color: #D95550;
transform: scale(1.05);
}
.start-focus-button:focus {
outline: 2px solid #D95550;
outline-offset: 2px;
}
.start-focus-button:active {
transform: scale(0.95);
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
.whitelist-container {
display: flex;
flex-direction: column;
gap: 24px;
padding: 20px;
}
.whitelist-input-section {
display: flex;
flex-direction: column;
gap: 8px;
}
.input-group {
display: flex;
gap: 12px;
align-items: stretch;
}
.domain-input {
flex: 1;
padding: 12px 16px;
border: 2px solid #e0e0e0;
border-radius: 8px;
font-size: 14px;
font-family: inherit;
background: #ffffff;
color: #666666;
transition:
border-color 0.2s ease,
box-shadow 0.2s ease;
}
.domain-input::placeholder {
color: #999999;
}
.domain-input:focus {
outline: none;
border-color: #d95550;
box-shadow: 0 0 0 3px rgba(217, 85, 80, 0.1);
}
.domain-input:invalid {
border-color: #e53935;
}
.domain-input:invalid:focus {
box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
}
.add-domain-button {
padding: 12px 24px;
background: #d95550;
color: #ffffff;
border: none;
border-radius: 8px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: all 0.2s ease;
white-space: nowrap;
min-width: 100px;
}
.add-domain-button:hover:not(:disabled) {
background: #c94943;
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(217, 85, 80, 0.3);
}
.add-domain-button:focus {
outline: 2px solid #d95550;
outline-offset: 2px;
}
.add-domain-button:disabled {
background: #757575;
cursor: not-allowed;
transform: none;
box-shadow: none;
}
.add-domain-button.loading {
opacity: 0.7;
}
.input-feedback {
min-height: 16px;
font-size: 12px;
padding-left: 4px;
transition: color 0.2s ease;
}
.input-feedback.success {
color: #70a85c;
}
.input-feedback.error {
color: #e53935;
}
.input-feedback.info {
color: #666666;
}
.whitelist-list-section {
display: flex;
flex-direction: column;
gap: 12px;
}
.list-header {
display: flex;
justify-content: space-between;
align-items: center;
padding-bottom: 8px;
border-bottom: 1px solid #e0e0e0;
}
.list-header h4 {
margin: 0;
font-size: 16px;
font-weight: 500;
color: #666666;
}
.domain-count {
font-size: 12px;
color: #999999;
background: #f5f5f5;
padding: 4px 8px;
border-radius: 12px;
}
.domain-list {
display: flex;
flex-direction: column;
gap: 8px;
max-height: 300px;
overflow-y: auto;
}
.domain-item {
display: flex;
justify-content: space-between;
align-items: center;
padding: 12px 16px;
background: #f9f9f9;
border: 1px solid #e0e0e0;
border-radius: 8px;
transition: all 0.2s ease;
role: listitem;
}
.domain-item:hover {
background: #f0f0f0;
border-color: #d0d0d0;
}
.domain-item.removing {
opacity: 0.5;
transform: translateX(-8px);
}
.domain-text {
font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
font-size: 13px;
color: #666666;
flex: 1;
margin-right: 12px;
word-break: break-all;
}
.domain-actions {
display: flex;
gap: 8px;
align-items: center;
}
.remove-domain-button {
padding: 6px 12px;
background: #ffffff;
color: #e53935;
border: 1px solid #e53935;
border-radius: 6px;
font-size: 12px;
cursor: pointer;
transition: all 0.2s ease;
}
.remove-domain-button:hover:not(:disabled) {
background: #e53935;
color: #ffffff;
}
.remove-domain-button:focus {
outline: 2px solid #e53935;
outline-offset: 2px;
}
.remove-domain-button:disabled {
opacity: 0.5;
cursor: not-allowed;
}
.empty-state {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 40px 20px;
text-align: center;
color: #999999;
}
.empty-icon {
font-size: 48px;
margin-bottom: 16px;
opacity: 0.6;
}
.empty-state p {
font-size: 14px;
margin: 0 0 8px 0;
color: #666666;
}
.empty-state small {
font-size: 12px;
line-height: 1.4;
color: #999999;
max-width: 280px;
}
@media (max-width: 600px) {
.whitelist-container {
padding: 16px;
gap: 20px;
}
.input-group {
flex-direction: column;
gap: 8px;
}
.add-domain-button {
min-width: auto;
}
.list-header {
flex-direction: column;
align-items: flex-start;
gap: 4px;
}
.domain-item {
padding: 10px 12px;
}
.domain-text {
font-size: 12px;
margin-right: 8px;
}
.remove-domain-button {
padding: 4px 8px;
font-size: 11px;
}
}
@media (prefers-color-scheme: dark) {
.domain-input {
background: #2a2a2a;
color: #ffffff;
border-color: #404040;
}
.domain-input::placeholder {
color: #999999;
}
.domain-item {
background: #2a2a2a;
border-color: #404040;
color: #ffffff;
}
.domain-item:hover {
background: #333333;
border-color: #555555;
}
.domain-text {
color: #ffffff;
}
.remove-domain-button {
background: #2a2a2a;
color: #ff6b6b;
border-color: #ff6b6b;
}
.remove-domain-button:hover:not(:disabled) {
background: #ff6b6b;
color: #ffffff;
}
.empty-state p {
color: #cccccc;
}
.list-header h4 {
color: #ffffff;
}
}
.undo-toast {
position: fixed;
bottom: 20px;
left: 50%;
transform: translateX(-50%) translateY(100px);
background: #2c2c2c;
color: #ffffff;
border-radius: 8px;
box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
z-index: 10001;
opacity: 0;
transition: all 0.3s ease;
max-width: 400px;
min-width: 300px;
}
.undo-toast.show {
transform: translateX(-50%) translateY(0);
opacity: 1;
}
.undo-toast-content {
display: flex;
align-items: center;
gap: 12px;
padding: 12px 16px;
}
.undo-message {
flex: 1;
font-size: 14px;
line-height: 1.4;
}
.undo-button {
padding: 6px 12px;
background: #70a85c;
color: #ffffff;
border: none;
border-radius: 4px;
font-size: 12px;
font-weight: 500;
cursor: pointer;
transition: all 0.2s ease;
white-space: nowrap;
}
.undo-button:hover {
background: #5f8f4e;
}
.undo-button:focus {
outline: 2px solid #70a85c;
outline-offset: 2px;
}
.toast-close-button {
padding: 4px;
background: transparent;
color: #cccccc;
border: none;
border-radius: 4px;
font-size: 14px;
cursor: pointer;
transition: color 0.2s ease;
line-height: 1;
}
.toast-close-button:hover {
color: #ffffff;
}
.toast-close-button:focus {
outline: 2px solid #cccccc;
outline-offset: 2px;
}
.undo-progress {
height: 2px;
background: rgba(112, 168, 92, 0.3);
border-radius: 0 0 8px 8px;
position: relative;
overflow: hidden;
}
.undo-progress::after {
content: "";
position: absolute;
top: 0;
left: 0;
height: 100%;
background: #70a85c;
width: 100%;
animation: progressCountdown 5s linear forwards;
}
@keyframes progressCountdown {
from {
width: 100%;
}
to {
width: 0%;
}
}
@media (max-width: 600px) {
.undo-toast {
left: 10px;
right: 10px;
max-width: none;
min-width: auto;
transform: translateY(100px);
}
.undo-toast.show {
transform: translateY(0);
}
.undo-toast-content {
flex-direction: column;
align-items: stretch;
gap: 8px;
}
.undo-button {
text-align: center;
}
.toast-close-button {
position: absolute;
top: 8px;
right: 8px;
}
}
@media (prefers-contrast: high) {
.undo-toast {
background: #000000;
border: 1px solid #ffffff;
}
.undo-button {
border: 1px solid #70a85c;
}
.toast-close-button {
border: 1px solid #cccccc;
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
}
.focus-page-container {
position: fixed;
top: 0;
left: 0;
width: 100vw;
height: 100vh;
z-index: 20000;
display: flex;
align-items: center;
justify-content: center;
font-family: "Inter", "Lato", "Helvetica Neue", "Arial", sans-serif;
opacity: 0;
visibility: hidden;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.focus-page-container.show {
opacity: 1;
visibility: visible;
}
.focus-page-overlay {
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: rgba(255, 255, 255, 0.98);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
}
.focus-page-content {
position: relative;
z-index: 1;
text-align: center;
max-width: 600px;
width: 90%;
padding: 40px 20px;
background: rgba(255, 255, 255, 0.9);
border-radius: 20px;
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.3);
}
.focus-header {
margin-bottom: 40px;
}
.focus-task-title {
font-size: 24px;
font-weight: 600;
color: #666666;
margin-bottom: 12px;
line-height: 1.3;
word-break: break-word;
max-width: 100%;
}
.focus-status {
font-size: 16px;
font-weight: 500;
color: #757575;
margin-bottom: 8px;
opacity: 0.8;
}
.focus-status.running {
color: #D95550;
}
.focus-status.paused {
color: #FF9800;
}
.focus-status.completed {
color: #70A85C;
}
.focus-timer {
margin-bottom: 40px;
}
.countdown-display {
font-size: 72px;
font-weight: 700;
color: #D95550;
margin-bottom: 20px;
line-height: 1;
font-variant-numeric: tabular-nums;
letter-spacing: -0.02em;
text-shadow: 0 2px 10px rgba(217, 85, 80, 0.2);
transition: all 0.3s ease;
}
.countdown-display.warning {
color: #FF9800;
animation: pulse-warning 2s infinite;
}
.countdown-display.urgent {
color: #E53935;
animation: pulse-urgent 1s infinite;
}
@keyframes pulse-warning {
0%, 100% { transform: scale(1); }
50% { transform: scale(1.02); }
}
@keyframes pulse-urgent {
0%, 100% { transform: scale(1); }
50% { transform: scale(1.05); }
}
.countdown-progress {
width: 100%;
height: 6px;
background: rgba(217, 85, 80, 0.1);
border-radius: 3px;
overflow: hidden;
margin-bottom: 20px;
}
.progress-bar {
height: 100%;
background: linear-gradient(90deg, #D95550, #E06B66);
border-radius: 3px;
transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
width: 0%;
box-shadow: 0 1px 3px rgba(217, 85, 80, 0.3);
}
.focus-actions {
margin-bottom: 30px;
display: flex;
justify-content: center;
gap: 16px;
flex-wrap: wrap;
}
.focus-action-btn {
background: #ffffff;
border: 2px solid #D95550;
color: #D95550;
font-size: 16px;
font-weight: 500;
padding: 12px 24px;
border-radius: 8px;
cursor: pointer;
transition: all 0.2s ease;
outline: none;
font-family: inherit;
min-width: 100px;
}
.focus-action-btn:hover {
background: #D95550;
color: #ffffff;
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(217, 85, 80, 0.3);
}
.focus-action-btn:active {
transform: translateY(0);
box-shadow: 0 2px 6px rgba(217, 85, 80, 0.3);
}
.pause-btn {
border-color: #FF9800;
color: #FF9800;
}
.pause-btn:hover {
background: #FF9800;
color: #ffffff;
box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}
.resume-btn {
border-color: #70A85C;
color: #70A85C;
}
.resume-btn:hover {
background: #70A85C;
color: #ffffff;
box-shadow: 0 4px 12px rgba(112, 168, 92, 0.3);
}
.modify-time-btn {
border-color: #E67E22;
color: #E67E22;
}
.modify-time-btn:hover {
background: #E67E22;
color: #ffffff;
box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3);
}
.complete-btn {
border-color: #70A85C;
color: #70A85C;
}
.complete-btn:hover {
background: #70A85C;
color: #ffffff;
box-shadow: 0 4px 12px rgba(112, 168, 92, 0.3);
}
.cancel-complete-btn {
border-color: #999999;
color: #999999;
}
.cancel-complete-btn:hover {
background: #999999;
color: #ffffff;
box-shadow: 0 4px 12px rgba(153, 153, 153, 0.3);
}
.extend-time-btn {
border-color: #3498db;
color: #3498db;
}
.extend-time-btn:hover {
background: #3498db;
color: #ffffff;
box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}
.focus-info {
margin-bottom: 20px;
}
.focus-hint {
font-size: 16px;
color: #757575;
opacity: 0.8;
line-height: 1.5;
}
.completion-message {
text-align: center;
}
.completion-icon {
font-size: 48px;
margin-bottom: 16px;
}
.completion-text {
font-size: 24px;
font-weight: 600;
color: #70A85C;
margin-bottom: 12px;
}
.completion-task {
font-size: 18px;
color: #666666;
opacity: 0.8;
}
.time-modify-modal {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
z-index: 10003;
display: flex;
align-items: center;
justify-content: center;
}
.time-modify-modal.hidden {
display: none;
}
.modal-overlay {
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: rgba(0, 0, 0, 0.5);
backdrop-filter: blur(4px);
}
.modal-content {
position: relative;
background: #ffffff;
border-radius: 16px;
padding: 0;
width: 420px;
max-width: 90vw;
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
animation: modalSlideIn 0.3s ease-out;
}
@keyframes modalSlideIn {
from {
opacity: 0;
transform: translateY(-20px) scale(0.95);
}
to {
opacity: 1;
transform: translateY(0) scale(1);
}
}
.modal-header {
padding: 24px 24px 16px 24px;
border-bottom: 1px solid #f0f0f0;
}
.modal-header h3 {
margin: 0;
font-size: 20px;
font-weight: 600;
color: #333333;
}
.modal-body {
padding: 20px 24px;
}
.time-input-group {
margin-bottom: 20px;
}
.time-input-group label {
display: block;
margin-bottom: 8px;
font-size: 14px;
font-weight: 500;
color: #555555;
}
.time-input {
width: 100%;
padding: 12px 16px;
border: 2px solid #e0e0e0;
border-radius: 8px;
font-size: 16px;
transition: border-color 0.2s ease;
box-sizing: border-box;
}
.time-input:focus {
outline: none;
border-color: #D95550;
box-shadow: 0 0 0 3px rgba(217, 85, 80, 0.1);
}
.time-presets {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 8px;
margin-top: 16px;
}
.preset-btn {
padding: 10px 16px;
border: 2px solid #e0e0e0;
background: #ffffff;
color: #666666;
border-radius: 6px;
font-size: 14px;
cursor: pointer;
transition: all 0.2s ease;
}
.preset-btn:hover {
border-color: #D95550;
color: #D95550;
}
.preset-btn.selected {
border-color: #D95550;
background: #D95550;
color: #ffffff;
}
.modal-actions {
padding: 16px 24px 24px 24px;
display: flex;
gap: 12px;
justify-content: flex-end;
}
.modal-btn {
padding: 10px 24px;
border: none;
border-radius: 6px;
font-size: 14px;
font-weight: 500;
cursor: pointer;
transition: all 0.2s ease;
min-width: 80px;
}
.cancel-btn {
background: #f5f5f5;
color: #666666;
}
.cancel-btn:hover {
background: #e8e8e8;
}
.confirm-btn {
background: #D95550;
color: #ffffff;
}
.confirm-btn:hover {
background: #c44540;
box-shadow: 0 2px 8px rgba(217, 85, 80, 0.3);
}
.confirm-btn:disabled {
background: #cccccc;
cursor: not-allowed;
}
@media (max-width: 768px) {
.focus-page-content {
width: 95%;
padding: 30px 16px;
}
.countdown-display {
font-size: 64px;
}
.focus-task-title {
font-size: 20px;
}
.focus-actions {
gap: 12px;
}
.focus-action-btn {
font-size: 14px;
padding: 10px 20px;
min-width: 80px;
}
}
@media (max-width: 480px) {
.focus-page-content {
width: 95%;
padding: 24px 12px;
margin: 20px 0;
border-radius: 16px;
}
.focus-header {
margin-bottom: 30px;
}
.countdown-display {
font-size: 56px;
margin-bottom: 16px;
}
.focus-task-title {
font-size: 18px;
margin-bottom: 8px;
}
.focus-status {
font-size: 14px;
}
.countdown-progress {
height: 4px;
margin-bottom: 16px;
}
.focus-timer {
margin-bottom: 30px;
}
.focus-actions {
flex-direction: column;
align-items: center;
gap: 8px;
}
.focus-action-btn {
font-size: 14px;
padding: 10px 20px;
width: 140px;
}
.focus-hint {
font-size: 14px;
}
.completion-icon {
font-size: 40px;
margin-bottom: 12px;
}
.completion-text {
font-size: 20px;
margin-bottom: 8px;
}
.completion-task {
font-size: 16px;
}
.modal-content {
width: 360px;
margin: 16px;
}
.modal-header {
padding: 20px 20px 12px 20px;
}
.modal-header h3 {
font-size: 18px;
}
.modal-body {
padding: 16px 20px;
}
.time-presets {
grid-template-columns: 1fr 1fr;
gap: 6px;
}
.preset-btn {
padding: 8px 12px;
font-size: 13px;
}
.modal-actions {
padding: 12px 20px 20px 20px;
}
}
@media (max-width: 360px) {
.countdown-display {
font-size: 48px;
}
.focus-task-title {
font-size: 16px;
}
.focus-action-btn {
width: 120px;
}
}
@media (min-width: 1200px) {
.focus-page-content {
max-width: 700px;
padding: 60px 40px;
}
.countdown-display {
font-size: 84px;
}
.focus-task-title {
font-size: 28px;
}
.focus-status {
font-size: 18px;
}
.focus-hint {
font-size: 18px;
}
.modal-content {
width: calc(100vw - 32px);
margin: 16px;
}
.modal-header {
padding: 16px 16px 8px 16px;
}
.modal-body {
padding: 12px 16px;
}
.time-presets {
grid-template-columns: 1fr;
gap: 8px;
}
.modal-actions {
padding: 8px 16px 16px 16px;
flex-direction: column;
}
.modal-btn {
width: 100%;
margin-bottom: 8px;
}
.modal-btn:last-child {
margin-bottom: 0;
}
}
@media (prefers-contrast: high) {
.focus-page-overlay {
background: rgba(255, 255, 255, 0.99);
}
.focus-page-content {
background: #ffffff;
border: 2px solid #000000;
}
.countdown-display {
text-shadow: none;
}
.focus-action-btn {
border-width: 3px;
}
}
@media (prefers-reduced-motion: reduce) {
.focus-page-container,
.countdown-display,
.progress-bar,
.focus-action-btn {
transition: none;
}
.countdown-display.warning,
.countdown-display.urgent {
animation: none;
}
}
@media (prefers-color-scheme: dark) {
.focus-page-overlay {
background: rgba(30, 30, 30, 0.98);
}
.focus-page-content {
background: rgba(40, 40, 40, 0.95);
border-color: rgba(255, 255, 255, 0.1);
}
.focus-task-title {
color: #e0e0e0;
}
.focus-status {
color: #b0b0b0;
}
.focus-hint {
color: #a0a0a0;
}
.focus-action-btn {
background: rgba(60, 60, 60, 0.8);
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
            
            // 初始化计时器管理器
            this.timerManager = TimerManager.getInstance();
            await this.timerManager.initialize(this.storageManager);
            
            // 初始化专注页面
            this.focusPage = new FocusPage();
            this.focusPage.initialize(this.timerManager, this.taskManager);
            
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
