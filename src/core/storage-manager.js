/**
 * StorageManager - 数据持久化管理器
 * 
 * 负责：
 * 1. 封装 Tampermonkey 的 GM_setValue/GM_getValue API
 * 2. 处理任务数据的序列化和反序列化
 * 3. 提供错误处理和数据验证
 * 4. 管理存储键值和数据格式
 */

/**
 * 存储管理器类
 */
class StorageManager {
    constructor() {
        // 存储键值常量
        this.STORAGE_KEYS = {
            TASKS: 'TOMATO_MONKEY_TASKS',
            SETTINGS: 'TOMATO_MONKEY_SETTINGS',
            STATISTICS: 'TOMATO_MONKEY_STATISTICS'
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
                throw new Error('Tasks must be an array');
            }

            // 验证任务数据结构
            this.validateTasksData(tasks);

            // 创建存储数据对象
            const storageData = {
                version: this.DATA_VERSION,
                timestamp: Date.now(),
                tasks: tasks
            };

            // 序列化并保存
            const serializedData = JSON.stringify(storageData);
            GM_setValue(this.STORAGE_KEYS.TASKS, serializedData);
            
            console.log(`[StorageManager] Saved ${tasks.length} tasks to storage`);
            return true;
            
        } catch (error) {
            console.error('[StorageManager] Failed to save tasks:', error);
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
                console.log('[StorageManager] No tasks found in storage, returning empty array');
                return [];
            }

            // 解析存储数据
            const storageData = JSON.parse(serializedData);
            
            // 检查数据版本和格式
            if (!this.validateStorageData(storageData)) {
                console.warn('[StorageManager] Invalid storage data format, returning empty array');
                return [];
            }

            const tasks = storageData.tasks || [];
            
            // 验证任务数据结构
            this.validateTasksData(tasks);
            
            console.log(`[StorageManager] Loaded ${tasks.length} tasks from storage`);
            return tasks;
            
        } catch (error) {
            console.error('[StorageManager] Failed to load tasks:', error);
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
            console.log('[StorageManager] Cleared all tasks from storage');
            return true;
        } catch (error) {
            console.error('[StorageManager] Failed to clear tasks:', error);
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
            const serializedData = GM_getValue(this.STORAGE_KEYS.TASKS, '');
            
            return {
                taskCount: tasks.length,
                completedTasks: tasks.filter(task => task.isCompleted).length,
                pendingTasks: tasks.filter(task => !task.isCompleted).length,
                storageSize: new Blob([serializedData]).size,
                lastUpdated: this.getLastUpdateTime()
            };
        } catch (error) {
            console.error('[StorageManager] Failed to get storage stats:', error);
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
        if (!storageData || typeof storageData !== 'object') {
            return false;
        }

        if (typeof storageData.version !== 'number' || storageData.version < 1) {
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
            throw new Error('Tasks must be an array');
        }

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            
            if (!task || typeof task !== 'object') {
                throw new Error(`Task at index ${i} is not a valid object`);
            }

            // 验证必需字段
            const requiredFields = ['id', 'title', 'isCompleted', 'createdAt', 'pomodoroCount'];
            for (const field of requiredFields) {
                if (!(field in task)) {
                    throw new Error(`Task at index ${i} is missing required field: ${field}`);
                }
            }

            // 验证字段类型
            if (typeof task.id !== 'string' || task.id.trim() === '') {
                throw new Error(`Task at index ${i} has invalid id`);
            }

            if (typeof task.title !== 'string' || task.title.trim() === '') {
                throw new Error(`Task at index ${i} has invalid title`);
            }

            if (typeof task.isCompleted !== 'boolean') {
                throw new Error(`Task at index ${i} has invalid isCompleted`);
            }

            if (typeof task.createdAt !== 'number' || task.createdAt <= 0) {
                throw new Error(`Task at index ${i} has invalid createdAt`);
            }

            if (typeof task.pomodoroCount !== 'number' || task.pomodoroCount < 0) {
                throw new Error(`Task at index ${i} has invalid pomodoroCount`);
            }

            // 验证可选字段
            if (task.completedAt !== undefined && 
                (typeof task.completedAt !== 'number' || task.completedAt <= 0)) {
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
                tasks: tasks
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('[StorageManager] Failed to export tasks:', error);
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
                throw new Error('Invalid import data format');
            }

            this.validateTasksData(importData.tasks);
            return await this.saveTasks(importData.tasks);
            
        } catch (error) {
            console.error('[StorageManager] Failed to import tasks:', error);
            return false;
        }
    }
}

// 创建单例实例
const storageManager = new StorageManager();

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
    window.storageManager = storageManager;
}

// 导出模块 (支持 CommonJS 和 ES6 模块)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManager, storageManager };
} else if (typeof exports !== 'undefined') {
    exports.StorageManager = StorageManager;
    exports.storageManager = storageManager;
}