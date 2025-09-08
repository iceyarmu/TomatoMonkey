/**
 * TaskManager - 任务管理器
 * 
 * 负责：
 * 1. 任务的 CRUD 操作（创建、读取、更新、删除）
 * 2. 任务排序逻辑（已完成任务移至底部）
 * 3. 与 StorageManager 的集成
 * 4. 单例模式实现
 * 5. 任务状态管理和业务逻辑
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
            this.notifyObservers('initialized');
            
        } catch (error) {
            console.error('[TaskManager] Failed to initialize:', error);
            this.tasks = [];
        }
    }

    /**
     * 创建新任务
     * @param {string} title - 任务标题
     * @returns {Promise<Task>} 创建的任务对象
     */
    async createTask(title) {
        if (!title || typeof title !== 'string' || title.trim() === '') {
            throw new Error('Task title is required and must be a non-empty string');
        }

        // HTML 转义以防止 XSS
        const sanitizedTitle = this.escapeHtml(title.trim());

        const task = {
            id: this.generateUUID(),
            title: sanitizedTitle,
            isCompleted: false,
            createdAt: Date.now(),
            completedAt: null,
            pomodoroCount: 0
        };

        this.tasks.push(task);
        this.sortTasks();
        
        // 保存到存储
        await this.saveTasks();
        
        console.log(`[TaskManager] Created task: ${task.title}`);
        
        // 通知观察者
        this.notifyObservers('taskCreated', { task });
        
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
        return this.tasks.find(task => task.id === taskId) || null;
    }

    /**
     * 获取待完成任务
     * @returns {Array<Task>} 待完成任务列表
     */
    getPendingTasks() {
        return this.tasks.filter(task => !task.isCompleted);
    }

    /**
     * 获取已完成任务
     * @returns {Array<Task>} 已完成任务列表
     */
    getCompletedTasks() {
        return this.tasks.filter(task => task.isCompleted);
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

        if (!newTitle || typeof newTitle !== 'string' || newTitle.trim() === '') {
            throw new Error('Task title is required and must be a non-empty string');
        }

        const oldTitle = task.title;
        task.title = this.escapeHtml(newTitle.trim());
        
        await this.saveTasks();
        
        console.log(`[TaskManager] Updated task title: "${oldTitle}" -> "${task.title}"`);
        
        // 通知观察者
        this.notifyObservers('taskUpdated', { task, field: 'title', oldValue: oldTitle });
        
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
        
        const action = task.isCompleted ? 'completed' : 'uncompleted';
        console.log(`[TaskManager] Task ${action}: ${task.title}`);
        
        // 通知观察者
        this.notifyObservers('taskToggled', { task, wasCompleted });
        
        return true;
    }

    /**
     * 删除任务
     * @param {string} taskId - 任务ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    async deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            console.warn(`[TaskManager] Task not found: ${taskId}`);
            return false;
        }

        const deletedTask = this.tasks.splice(taskIndex, 1)[0];
        await this.saveTasks();
        
        console.log(`[TaskManager] Deleted task: ${deletedTask.title}`);
        
        // 通知观察者
        this.notifyObservers('taskDeleted', { task: deletedTask });
        
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
        
        console.log(`[TaskManager] Updated pomodoro count for "${task.title}": ${oldCount} -> ${task.pomodoroCount}`);
        
        // 通知观察者
        this.notifyObservers('pomodoroUpdated', { task, oldCount });
        
        return true;
    }

    /**
     * 清除所有已完成的任务
     * @returns {Promise<number>} 清除的任务数量
     */
    async clearCompletedTasks() {
        const completedTasks = this.getCompletedTasks();
        const clearedCount = completedTasks.length;
        
        this.tasks = this.tasks.filter(task => !task.isCompleted);
        await this.saveTasks();
        
        console.log(`[TaskManager] Cleared ${clearedCount} completed tasks`);
        
        // 通知观察者
        this.notifyObservers('completedTasksCleared', { count: clearedCount });
        
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
        const totalPomodoros = this.tasks.reduce((sum, task) => sum + task.pomodoroCount, 0);
        
        return {
            total,
            completed,
            pending,
            completionRate: total > 0 ? (completed / total * 100).toFixed(1) : 0,
            totalPomodoros,
            averagePomodoros: total > 0 ? (totalPomodoros / total).toFixed(1) : 0
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
            console.error('[TaskManager] StorageManager not initialized');
            return false;
        }

        try {
            return await this.storageManager.saveTasks(this.tasks);
        } catch (error) {
            console.error('[TaskManager] Failed to save tasks:', error);
            return false;
        }
    }

    /**
     * 生成UUID
     * @returns {string} UUID字符串
     */
    generateUUID() {
        return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * HTML转义函数，防止XSS
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 添加观察者
     * @param {Function} observer - 观察者函数
     */
    addObserver(observer) {
        if (typeof observer === 'function') {
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
        this.observers.forEach(observer => {
            try {
                observer(event, data, this);
            } catch (error) {
                console.error('[TaskManager] Observer error:', error);
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
if (typeof window !== 'undefined') {
    window.TaskManager = TaskManager;
    window.taskManager = taskManager;
}

// 导出模块 (支持 CommonJS 和 ES6 模块)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TaskManager, taskManager };
} else if (typeof exports !== 'undefined') {
    exports.TaskManager = TaskManager;
    exports.taskManager = taskManager;
}