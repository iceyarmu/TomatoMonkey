/**
 * TaskManager 单元测试
 *
 * 测试覆盖：
 * 1. CRUD 操作
 * 2. 任务排序逻辑
 * 3. 数据持久化
 * 4. 边界条件和错误处理
 * 5. 观察者模式
 *
 * 修复 TEST-001: 导入实际的 src 模块而不是在测试中定义
 */

// Mock GM functions for testing
global.GM_setValue = jest.fn();
global.GM_getValue = jest.fn();

// Mock DOM functions for HTML escaping
global.document = {
  createElement: jest.fn(() => ({
    _textContent: "",
    get textContent() {
      return this._textContent;
    },
    set textContent(value) {
      this._textContent = value;
      // Simple HTML escaping for test
      this._innerHTML = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },
    get innerHTML() {
      return this._innerHTML || this._textContent;
    },
  })),
};

// Import the actual source modules - 修复 TEST-001
const { StorageManager } = require("../../src/core/storage-manager.js");
const { TaskManager } = require("../../src/core/task-manager.js");

describe("TaskManager", () => {
  let taskManager;
  let storageManager;
  let mockObserver;

  beforeEach(() => {
    // Reset singleton instance
    TaskManager.resetInstance();

    // Create fresh instances
    storageManager = new StorageManager();
    taskManager = new TaskManager();

    // Mock observer
    mockObserver = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();

    // Setup GM mocks with default behavior
    GM_getValue.mockReturnValue(null);
    GM_setValue.mockImplementation(() => {});
  });

  afterEach(() => {
    // Reset singleton instance
    TaskManager.resetInstance();
  });

  describe("Singleton Pattern", () => {
    test("should return the same instance", () => {
      const instance1 = TaskManager.getInstance();
      const instance2 = TaskManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    test("should reset instance correctly", () => {
      const instance1 = TaskManager.getInstance();
      TaskManager.resetInstance();
      const instance2 = TaskManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Initialization", () => {
    test("should initialize with empty tasks when no storage data", async () => {
      GM_getValue.mockReturnValue(null);

      await taskManager.initialize(storageManager);

      expect(taskManager.isInitialized).toBe(true);
      expect(taskManager.getAllTasks()).toEqual([]);
    });

    test("should initialize with stored tasks", async () => {
      const mockTasks = [
        {
          id: "task-1",
          title: "Test Task",
          isCompleted: false,
          createdAt: Date.now(),
          completedAt: null,
          pomodoroCount: 0,
        },
      ];

      const mockStorageData = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        tasks: mockTasks,
      });

      GM_getValue.mockReturnValue(mockStorageData);

      await taskManager.initialize(storageManager);

      expect(taskManager.getAllTasks()).toHaveLength(1);
      expect(taskManager.getAllTasks()[0].title).toBe("Test Task");
    });

    test("should not reinitialize if already initialized", async () => {
      await taskManager.initialize(storageManager);
      const firstTaskCount = taskManager.getAllTasks().length;
      const firstInitializedState = taskManager.isInitialized;

      // Try to initialize again
      await taskManager.initialize(storageManager);
      const secondTaskCount = taskManager.getAllTasks().length;
      const secondInitializedState = taskManager.isInitialized;

      expect(firstInitializedState).toBe(true);
      expect(secondInitializedState).toBe(true);
      expect(firstTaskCount).toBe(secondTaskCount);
    });
  });

  describe("Task Creation", () => {
    beforeEach(async () => {
      await taskManager.initialize(storageManager);
      taskManager.addObserver(mockObserver);
    });

    test("should create a new task successfully", async () => {
      const title = "New Test Task";
      const task = await taskManager.createTask(title);

      expect(task).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.stringContaining("New Test Task"),
          isCompleted: false,
          createdAt: expect.any(Number),
          completedAt: null,
          pomodoroCount: 0,
        }),
      );
    });

    test("should add task to tasks array", async () => {
      const title = "New Test Task";

      expect(taskManager.getAllTasks()).toHaveLength(0);

      await taskManager.createTask(title);

      expect(taskManager.getAllTasks()).toHaveLength(1);
      expect(taskManager.getAllTasks()[0].title).toContain("New Test Task");
    });

    test("should save task to storage", async () => {
      const title = "New Test Task";

      await taskManager.createTask(title);

      expect(GM_setValue).toHaveBeenCalledWith(
        "TOMATO_MONKEY_TASKS",
        expect.any(String),
      );
    });

    test("should notify observers", async () => {
      const title = "New Test Task";

      await taskManager.createTask(title);

      expect(mockObserver).toHaveBeenCalledWith(
        "taskCreated",
        expect.objectContaining({
          task: expect.any(Object),
        }),
        taskManager,
      );
    });

    test("should throw error for empty title", async () => {
      await expect(taskManager.createTask("")).rejects.toThrow(
        "Task title is required",
      );
      await expect(taskManager.createTask("   ")).rejects.toThrow(
        "Task title is required",
      );
      await expect(taskManager.createTask(null)).rejects.toThrow(
        "Task title is required",
      );
      await expect(taskManager.createTask(undefined)).rejects.toThrow(
        "Task title is required",
      );
    });

    test("should throw error for non-string title", async () => {
      await expect(taskManager.createTask(123)).rejects.toThrow(
        "Task title is required",
      );
      await expect(taskManager.createTask({})).rejects.toThrow(
        "Task title is required",
      );
      await expect(taskManager.createTask([])).rejects.toThrow(
        "Task title is required",
      );
    });

    test("should escape HTML in title", async () => {
      const maliciousTitle = '<script>alert("xss")</script>';
      const task = await taskManager.createTask(maliciousTitle);

      expect(task.title).not.toContain("<script>");
      expect(task.title).toContain("&lt;script&gt;");
      expect(task.title).toContain("&quot;xss&quot;");
    });

    test("should generate unique IDs", async () => {
      const task1 = await taskManager.createTask("Task 1");
      const task2 = await taskManager.createTask("Task 2");

      expect(task1.id).not.toBe(task2.id);
      expect(task1.id).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(task2.id).toMatch(/^task-\d+-[a-z0-9]+$/);
    });
  });

  describe("Task Retrieval", () => {
    beforeEach(async () => {
      await taskManager.initialize(storageManager);
    });

    test("should return all tasks", async () => {
      await taskManager.createTask("Task 1");
      await taskManager.createTask("Task 2");

      const tasks = taskManager.getAllTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toContain("Task 1");
      expect(tasks[1].title).toContain("Task 2");
    });

    test("should return a copy of tasks array", async () => {
      await taskManager.createTask("Task 1");

      const tasks1 = taskManager.getAllTasks();
      const tasks2 = taskManager.getAllTasks();

      expect(tasks1).not.toBe(tasks2); // Different array instances
      expect(tasks1).toEqual(tasks2); // Same content
    });

    test("should get task by ID", async () => {
      const task = await taskManager.createTask("Test Task");

      const foundTask = taskManager.getTaskById(task.id);

      expect(foundTask).toBe(task);
    });

    test("should return null for non-existent task ID", () => {
      const foundTask = taskManager.getTaskById("non-existent-id");

      expect(foundTask).toBeNull();
    });
  });

  describe("Task Completion Toggle", () => {
    let task;

    beforeEach(async () => {
      await taskManager.initialize(storageManager);
      taskManager.addObserver(mockObserver);
      task = await taskManager.createTask("Test Task");
      jest.clearAllMocks(); // Clear the creation call
    });

    test("should toggle task from incomplete to complete", async () => {
      expect(task.isCompleted).toBe(false);
      expect(task.completedAt).toBeNull();

      const result = await taskManager.toggleTaskCompletion(task.id);

      expect(result).toBe(true);
      expect(task.isCompleted).toBe(true);
      expect(task.completedAt).toBeGreaterThan(0);
    });

    test("should toggle task from complete to incomplete", async () => {
      // First complete the task
      await taskManager.toggleTaskCompletion(task.id);
      expect(task.isCompleted).toBe(true);

      // Then toggle back
      const result = await taskManager.toggleTaskCompletion(task.id);

      expect(result).toBe(true);
      expect(task.isCompleted).toBe(false);
      expect(task.completedAt).toBeNull();
    });

    test("should save tasks after toggle", async () => {
      await taskManager.toggleTaskCompletion(task.id);

      expect(GM_setValue).toHaveBeenCalledWith(
        "TOMATO_MONKEY_TASKS",
        expect.any(String),
      );
    });

    test("should notify observers", async () => {
      await taskManager.toggleTaskCompletion(task.id);

      expect(mockObserver).toHaveBeenCalledWith(
        "taskToggled",
        expect.objectContaining({
          task: task,
          wasCompleted: false,
        }),
        taskManager,
      );
    });

    test("should return false for non-existent task", async () => {
      const result = await taskManager.toggleTaskCompletion("non-existent-id");

      expect(result).toBe(false);
    });

    test("should sort tasks after toggle", async () => {
      const task2 = await taskManager.createTask("Task 2");

      // Complete first task
      await taskManager.toggleTaskCompletion(task.id);

      const tasks = taskManager.getAllTasks();

      // Completed task should be at the end
      expect(tasks[0].id).toBe(task2.id);
      expect(tasks[1].id).toBe(task.id);
    });
  });

  describe("Task Deletion", () => {
    let task;

    beforeEach(async () => {
      await taskManager.initialize(storageManager);
      taskManager.addObserver(mockObserver);
      task = await taskManager.createTask("Test Task");
      jest.clearAllMocks(); // Clear the creation call
    });

    test("should delete existing task", async () => {
      expect(taskManager.getAllTasks()).toHaveLength(1);

      const result = await taskManager.deleteTask(task.id);

      expect(result).toBe(true);
      expect(taskManager.getAllTasks()).toHaveLength(0);
    });

    test("should save tasks after deletion", async () => {
      await taskManager.deleteTask(task.id);

      expect(GM_setValue).toHaveBeenCalledWith(
        "TOMATO_MONKEY_TASKS",
        expect.any(String),
      );
    });

    test("should notify observers", async () => {
      await taskManager.deleteTask(task.id);

      expect(mockObserver).toHaveBeenCalledWith(
        "taskDeleted",
        expect.objectContaining({
          task: task,
        }),
        taskManager,
      );
    });

    test("should return false for non-existent task", async () => {
      const result = await taskManager.deleteTask("non-existent-id");

      expect(result).toBe(false);
    });
  });

  describe("Clear Completed Tasks", () => {
    beforeEach(async () => {
      await taskManager.initialize(storageManager);
      taskManager.addObserver(mockObserver);
    });

    test("should clear all completed tasks", async () => {
      const task1 = await taskManager.createTask("Task 1");
      const task2 = await taskManager.createTask("Task 2");
      const task3 = await taskManager.createTask("Task 3");

      // Complete two tasks
      await taskManager.toggleTaskCompletion(task1.id);
      await taskManager.toggleTaskCompletion(task3.id);

      jest.clearAllMocks(); // Clear previous calls

      const clearedCount = await taskManager.clearCompletedTasks();

      expect(clearedCount).toBe(2);
      expect(taskManager.getAllTasks()).toHaveLength(1);
      expect(taskManager.getAllTasks()[0].id).toBe(task2.id);
    });

    test("should return 0 when no completed tasks", async () => {
      await taskManager.createTask("Task 1");
      await taskManager.createTask("Task 2");

      const clearedCount = await taskManager.clearCompletedTasks();

      expect(clearedCount).toBe(0);
      expect(taskManager.getAllTasks()).toHaveLength(2);
    });

    test("should save tasks after clearing", async () => {
      const task = await taskManager.createTask("Task 1");
      await taskManager.toggleTaskCompletion(task.id);

      jest.clearAllMocks();

      await taskManager.clearCompletedTasks();

      expect(GM_setValue).toHaveBeenCalledWith(
        "TOMATO_MONKEY_TASKS",
        expect.any(String),
      );
    });

    test("should notify observers", async () => {
      const task = await taskManager.createTask("Task 1");
      await taskManager.toggleTaskCompletion(task.id);

      jest.clearAllMocks();

      await taskManager.clearCompletedTasks();

      expect(mockObserver).toHaveBeenCalledWith(
        "completedTasksCleared",
        expect.objectContaining({
          count: 1,
        }),
        taskManager,
      );
    });
  });

  describe("Task Sorting", () => {
    beforeEach(async () => {
      await taskManager.initialize(storageManager);
    });

    test("should sort incomplete tasks before completed tasks", async () => {
      const task1 = await taskManager.createTask("Task 1");
      const task2 = await taskManager.createTask("Task 2");

      // Complete first task
      await taskManager.toggleTaskCompletion(task1.id);

      const tasks = taskManager.getAllTasks();

      expect(tasks[0].id).toBe(task2.id); // Incomplete task first
      expect(tasks[1].id).toBe(task1.id); // Completed task last
    });

    test("should sort completed tasks by completion time (newest first)", async () => {
      const task1 = await taskManager.createTask("Task 1");
      const task2 = await taskManager.createTask("Task 2");
      const task3 = await taskManager.createTask("Task 3");

      // Complete tasks with some delay
      await taskManager.toggleTaskCompletion(task1.id);

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await taskManager.toggleTaskCompletion(task2.id);

      const tasks = taskManager.getAllTasks();

      expect(tasks[0].id).toBe(task3.id); // Incomplete task first
      expect(tasks[1].id).toBe(task2.id); // Most recently completed
      expect(tasks[2].id).toBe(task1.id); // Earlier completed
    });

    test("should sort incomplete tasks by creation time (oldest first)", async () => {
      const task1 = await taskManager.createTask("Task 1");

      // Wait to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const task2 = await taskManager.createTask("Task 2");

      const tasks = taskManager.getAllTasks();

      expect(tasks[0].id).toBe(task1.id); // Earlier created task first
      expect(tasks[1].id).toBe(task2.id); // Later created task second
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await taskManager.initialize(storageManager);
    });

    test("should return correct statistics for empty list", () => {
      const stats = taskManager.getStatistics();

      expect(stats).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0,
        totalPomodoros: 0,
        averagePomodoros: 0,
      });
    });

    test("should return correct statistics", async () => {
      const task1 = await taskManager.createTask("Task 1");
      const task2 = await taskManager.createTask("Task 2");
      const task3 = await taskManager.createTask("Task 3");

      // Complete one task
      await taskManager.toggleTaskCompletion(task2.id);

      const stats = taskManager.getStatistics();

      expect(stats).toEqual({
        total: 3,
        completed: 1,
        pending: 2,
        completionRate: "33.3",
        totalPomodoros: 0,
        averagePomodoros: "0.0",
      });
    });

    test("should calculate pomodoro statistics", async () => {
      const task1 = await taskManager.createTask("Task 1");
      const task2 = await taskManager.createTask("Task 2");

      // Manually set pomodoro counts (would normally be set by pomodoro timer)
      task1.pomodoroCount = 3;
      task2.pomodoroCount = 2;

      const stats = taskManager.getStatistics();

      expect(stats.totalPomodoros).toBe(5);
      expect(stats.averagePomodoros).toBe("2.5");
    });
  });

  describe("Observer Pattern", () => {
    let observer1, observer2;

    beforeEach(async () => {
      await taskManager.initialize(storageManager);
      observer1 = jest.fn();
      observer2 = jest.fn();
    });

    test("should add observers", () => {
      taskManager.addObserver(observer1);
      taskManager.addObserver(observer2);

      expect(taskManager.observers).toHaveLength(2);
    });

    test("should not add non-function observers", () => {
      taskManager.addObserver("not a function");
      taskManager.addObserver(123);
      taskManager.addObserver({});

      expect(taskManager.observers).toHaveLength(0);
    });

    test("should remove observers", () => {
      taskManager.addObserver(observer1);
      taskManager.addObserver(observer2);

      taskManager.removeObserver(observer1);

      expect(taskManager.observers).toHaveLength(1);
      expect(taskManager.observers).toContain(observer2);
    });

    test("should notify all observers", async () => {
      taskManager.addObserver(observer1);
      taskManager.addObserver(observer2);

      await taskManager.createTask("Test Task");

      expect(observer1).toHaveBeenCalledWith(
        "taskCreated",
        expect.any(Object),
        taskManager,
      );
      expect(observer2).toHaveBeenCalledWith(
        "taskCreated",
        expect.any(Object),
        taskManager,
      );
    });

    test("should handle observer errors gracefully", async () => {
      const errorObserver = jest.fn(() => {
        throw new Error("Observer error");
      });

      taskManager.addObserver(errorObserver);
      taskManager.addObserver(observer1);

      // Should not throw error
      await expect(taskManager.createTask("Test Task")).resolves.toBeDefined();

      expect(errorObserver).toHaveBeenCalled();
      expect(observer1).toHaveBeenCalled();
    });
  });

  describe("Data Persistence", () => {
    beforeEach(async () => {
      await taskManager.initialize(storageManager);
    });

    test("should save tasks when storage manager is available", async () => {
      const result = await taskManager.saveTasks();

      expect(result).toBe(true);
      expect(GM_setValue).toHaveBeenCalledWith(
        "TOMATO_MONKEY_TASKS",
        expect.any(String),
      );
    });

    test("should return false when storage manager is not available", async () => {
      taskManager.storageManager = null;

      const result = await taskManager.saveTasks();

      expect(result).toBe(false);
    });

    test("should handle storage errors gracefully", async () => {
      // Mock storage manager to throw error
      const errorStorageManager = {
        saveTasks: jest.fn().mockRejectedValue(new Error("Storage error")),
      };

      taskManager.storageManager = errorStorageManager;

      const result = await taskManager.saveTasks();

      expect(result).toBe(false);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    beforeEach(async () => {
      await taskManager.initialize(storageManager);
    });

    test("should handle initialization with corrupted storage data", async () => {
      GM_getValue.mockReturnValue("invalid json data");

      const newTaskManager = new TaskManager();
      TaskManager.resetInstance();

      await newTaskManager.initialize(storageManager);

      expect(newTaskManager.getAllTasks()).toEqual([]);
    });

    test("should handle very long task titles", async () => {
      const longTitle = "A".repeat(1000);

      const task = await taskManager.createTask(longTitle);

      expect(task.title).toContain("A".repeat(900)); // Will be HTML escaped
    });

    test("should handle special characters in task titles", async () => {
      const specialTitle = "特殊字符！@#$%^*()_+-=[]{}|;:,./";

      const task = await taskManager.createTask(specialTitle);

      expect(task.title).toBe(specialTitle);
    });

    test("should generate UUID correctly", () => {
      const uuid1 = taskManager.generateUUID();
      const uuid2 = taskManager.generateUUID();

      expect(uuid1).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(uuid2).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
