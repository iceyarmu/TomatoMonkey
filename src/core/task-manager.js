/**
 * TaskManager - Linus 式简洁实现，兼容原有API
 * 
 * Linus 原则:
 * 1. 数据结构决定一切 - 内部用Map，接口保持兼容
 * 2. Never break userspace - 保持所有现有API
 * 3. 失败就失败 - 不要假装能恢复
 * 4. 简单内核，兼容外壳
 */

class TaskManager {
  constructor() {
    if (TaskManager.instance) {
      return TaskManager.instance;
    }

    // 核心数据结构 - Linus方式
    this.tasks = new Map();
    this.observers = new Set(); // 观察者用Set，避免重复
    this.storageManager = null;
    this.isInitialized = false;

    TaskManager.instance = this;
    return this;
  }

  // === 兼容性API - 保持现有接口不变 ===

  async initialize(storageManager) {
    if (this.isInitialized) return;

    this.storageManager = storageManager;
    
    try {
      const data = await this.storageManager.loadTasks();
      // 内部用Map，但兼容数组输入
      this.tasks = new Map(data.map(t => [t.id, t]));
      
      this.isInitialized = true;
      console.log(`[TaskManager] Initialized with ${this.tasks.size} tasks`);
      this.notifyObservers("initialized");
    } catch (error) {
      console.error("[TaskManager] Failed to initialize:", error);
      this.tasks = new Map();
    }
  }

  async createTask(title) {
    if (!title?.trim()) {
      throw new Error("Task title is required and must be a non-empty string");
    }

    const task = {
      id: Date.now().toString(),
      title: title.trim(),
      isCompleted: false,
      createdAt: Date.now(),
      completedAt: null,
      pomodoroCount: 0,
    };
    
    this.tasks.set(task.id, task);
    await this.saveTasks();
    
    console.log(`[TaskManager] Created task: ${task.title}`);
    this.notifyObservers("taskCreated", { task });
    return task;
  }

  getAllTasks() {
    // 返回排序后的数组，保持兼容
    return Array.from(this.tasks.values()).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.isCompleted && b.isCompleted) {
        return (b.completedAt || 0) - (a.completedAt || 0);
      }
      return a.createdAt - b.createdAt;
    });
  }

  getTaskById(taskId) {
    return this.tasks.get(taskId) || null;
  }

  getPendingTasks() {
    return Array.from(this.tasks.values()).filter(task => !task.isCompleted);
  }

  getCompletedTasks() {
    return Array.from(this.tasks.values()).filter(task => task.isCompleted);
  }

  async updateTaskTitle(taskId, newTitle) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return false;
    }

    if (!newTitle?.trim()) {
      throw new Error("Task title is required and must be a non-empty string");
    }

    const oldTitle = task.title;
    task.title = newTitle.trim();
    await this.saveTasks();

    console.log(`[TaskManager] Updated task title: "${oldTitle}" -> "${task.title}"`);
    this.notifyObservers("taskUpdated", { task, field: "title", oldValue: oldTitle });
    return true;
  }

  async toggleTaskCompletion(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return false;
    }

    const wasCompleted = task.isCompleted;
    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? Date.now() : null;

    await this.saveTasks();

    const action = task.isCompleted ? "completed" : "uncompleted";
    console.log(`[TaskManager] Task ${action}: ${task.title}`);
    this.notifyObservers("taskToggled", { task, wasCompleted });
    return true;
  }

  async deleteTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return false;
    }

    this.tasks.delete(taskId);
    await this.saveTasks();

    console.log(`[TaskManager] Deleted task: ${task.title}`);
    this.notifyObservers("taskDeleted", { task });
    return true;
  }

  async incrementPomodoroCount(taskId, count = 1) {
    const task = this.tasks.get(taskId);
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
    this.notifyObservers("pomodoroUpdated", { task, oldCount });
    return true;
  }

  async clearCompletedTasks() {
    const completed = [];
    for (const [id, task] of this.tasks) {
      if (task.isCompleted) {
        this.tasks.delete(id);
        completed.push(task);
      }
    }

    if (completed.length > 0) {
      await this.saveTasks();
      console.log(`[TaskManager] Cleared ${completed.length} completed tasks`);
      this.notifyObservers("completedTasksCleared", { count: completed.length });
    }
    return completed.length;
  }

  getStatistics() {
    const total = this.tasks.size;
    const completed = this.getCompletedTasks().length;
    const pending = total - completed;
    const totalPomodoros = Array.from(this.tasks.values()).reduce(
      (sum, task) => sum + task.pomodoroCount, 0
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

  // === 观察者模式API - 完全兼容 ===

  addObserver(observer) {
    if (typeof observer === "function") {
      this.observers.add(observer);
    }
  }

  removeObserver(observer) {
    this.observers.delete(observer);
  }

  notifyObservers(event, data = {}) {
    for (const observer of this.observers) {
      try {
        observer(event, data, this);
      } catch (error) {
        console.error("[TaskManager] Observer error:", error);
      }
    }
  }

  // === 内部实现 - Linus式简洁 ===

  async saveTasks() {
    if (!this.storageManager) {
      console.error("[TaskManager] StorageManager not initialized");
      return false;
    }

    try {
      // 转换Map为Array只在保存时
      const data = Array.from(this.tasks.values());
      return await this.storageManager.saveTasks(data);
    } catch (error) {
      console.error("[TaskManager] Failed to save tasks:", error);
      return false;
    }
  }

  // === 单例模式API - 保持兼容 ===

  static getInstance() {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  static resetInstance() {
    TaskManager.instance = null;
  }
}

// 创建单例实例 - 保持完全兼容
const taskManager = TaskManager.getInstance();

// 浏览器环境兼容
if (typeof window !== "undefined") {
  window.TaskManager = TaskManager;
  window.taskManager = taskManager;
}

// 模块导出兼容
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TaskManager, taskManager };
} else if (typeof exports !== "undefined") {
  exports.TaskManager = TaskManager;
  exports.taskManager = taskManager;
}
