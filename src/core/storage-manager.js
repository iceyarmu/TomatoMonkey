/**
 * Storage - Linus式数据持久化服务
 *
 * 职责：
 * 1. 封装 Tampermonkey 的 GM_setValue/GM_getValue API
 * 2. 数据序列化和反序列化（JSON）
 * 3. 数据验证（失败就失败）
 * 4. 简单直接的存储接口
 */

class Storage {
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

      console.log(`[Storage] Saved ${tasks.length} tasks to storage`);
      return true;
    } catch (error) {
      console.error("[Storage] Failed to save tasks:", error);
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
          "[Storage] No tasks found in storage, returning empty array",
        );
        return [];
      }

      // 解析存储数据
      const storageData = JSON.parse(serializedData);

      // 检查数据版本和格式
      if (!this.validateStorageData(storageData)) {
        console.warn(
          "[Storage] Invalid storage data format, returning empty array",
        );
        return [];
      }

      const tasks = storageData.tasks || [];

      // 验证任务数据结构
      this.validateTasksData(tasks);

      console.log(`[Storage] Loaded ${tasks.length} tasks from storage`);
      return tasks;
    } catch (error) {
      console.error("[Storage] Failed to load tasks:", error);
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
      console.log("[Storage] Cleared all tasks from storage");
      return true;
    } catch (error) {
      console.error("[Storage] Failed to clear tasks:", error);
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

      console.log("[Storage] Settings saved to storage");
      return true;
    } catch (error) {
      console.error("[Storage] Failed to save settings:", error);
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
          "[Storage] No settings found in storage, returning defaults",
        );
        return { ...this.DEFAULT_SETTINGS };
      }

      // 解析存储数据
      const storageData = JSON.parse(serializedData);

      // 检查数据版本和格式（使用设置专用的验证器）
      if (!this.validateSettingsStorageData(storageData)) {
        console.warn(
          "[Storage] Invalid settings storage data, returning defaults",
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

      console.log("[Storage] Settings loaded from storage");
      return settings;
    } catch (error) {
      console.error("[Storage] Failed to load settings:", error);
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
        console.log("[Storage] Settings reset to defaults");
      }
      return success;
    } catch (error) {
      console.error("[Storage] Failed to reset settings:", error);
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
      console.error(`[Storage] Failed to set data for key ${key}:`, error);
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
      console.error(`[Storage] Failed to get data for key ${key}:`, error);
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
      console.error(`[Storage] Failed to remove data for key ${key}:`, error);
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
      console.error("[Storage] Failed to get storage stats:", error);
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
      console.error("[Storage] Failed to export tasks:", error);
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
      console.error("[Storage] Failed to import tasks:", error);
      return false;
    }
  }
}

