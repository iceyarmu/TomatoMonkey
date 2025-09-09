/**
 * TaskService - Linus 式依赖注入任务服务
 * 
 * Linus 原则:
 * 1. 数据结构决定一切 - 内部用Map，接口保持兼容
 * 2. Never break userspace - 保持所有现有API
 * 3. 失败就失败 - 不要假装能恢复
 * 4. 显式依赖，简洁内核
 */

class TaskService {
  constructor(storage) {
    // 依赖注入 - 显式优于隐式
    this.storage = storage;
    
    // 核心数据结构 - Linus方式
    this.tasks = new Map();
    this.observers = new Set(); // 观察者用Set，避免重复
    this.isInitialized = false;
  }

  // === 兼容性API - 保持现有接口不变 ===

  async initialize(storageManager = null) {
    if (this.isInitialized) return;

    // 兼容旧API：如果传入storageManager，使用它；否则使用注入的storage
    if (storageManager) {
      this.storage = storageManager;
    }
    
    try {
      const data = await this.storage.loadTasks();
      // 内部用Map，但兼容数组输入
      this.tasks = new Map(data.map(t => [t.id, t]));
      
      this.isInitialized = true;
      console.log(`[TaskService] Initialized with ${this.tasks.size} tasks`);
      this.notifyObservers("initialized");
    } catch (error) {
      console.error("[TaskService] Failed to initialize:", error);
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


  // === 内部实现辅助方法 ===

  async saveTasks() {
    if (!this.storage) {
      console.error("[TaskService] Storage not initialized");
      return false;
    }

    try {
      // 转换Map为Array只在保存时
      const data = Array.from(this.tasks.values());
      return await this.storage.saveTasks(data);
    } catch (error) {
      console.error("[TaskService] Failed to save tasks:", error);
      return false;
    }
  }
}

