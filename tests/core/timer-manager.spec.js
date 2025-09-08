/**
 * TimerManager 单元测试
 *
 * 测试覆盖：
 * 1. 计时器状态管理（启动、暂停、停止、完成）
 * 2. 倒计时逻辑和准确性
 * 3. 观察者模式事件通知
 * 4. 桌面通知功能
 * 5. 状态持久化和恢复
 * 6. 边界条件和错误处理
 * 7. 单例模式验证
 */

// Mock GM functions for testing
global.GM_setValue = jest.fn();
global.GM_getValue = jest.fn();

// Mock DOM functions and browser APIs
global.document = {
  createElement: jest.fn(() => ({
    _textContent: "",
    get textContent() {
      return this._textContent;
    },
    set textContent(value) {
      this._textContent = value;
    },
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
    },
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    parentNode: {
      removeChild: jest.fn(),
    },
  })),
  body: {
    appendChild: jest.fn(),
  },
};

// Mock Notification API
global.Notification = class MockNotification {
  constructor(title, options = {}) {
    this.title = title;
    this.options = options;
    this.onclick = null;
    this.closed = false;
  }

  close() {
    this.closed = true;
  }

  static permission = 'default';
  static requestPermission = jest.fn().mockResolvedValue('granted');
};

global.window = {
  Notification: global.Notification,
  focus: jest.fn(),
};

// Mock setInterval and clearInterval
global.setInterval = jest.fn();
global.clearInterval = jest.fn();
global.setTimeout = jest.fn((callback) => {
  callback();
});

// Mock Date.now for time-sensitive tests
const mockDateNow = jest.fn();
global.Date.now = mockDateNow;

// Import the actual source modules
const { StorageManager } = require("../../src/core/storage-manager.js");
const { TimerManager } = require("../../src/core/timer-manager.js");

describe("TimerManager", () => {
  let timerManager;
  let storageManager;
  let mockObserver;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(1000000);

    // Reset TimerManager singleton
    TimerManager.instance = null;

    // Create fresh instances
    storageManager = new StorageManager();
    timerManager = new TimerManager();
    mockObserver = jest.fn();

    // Mock storage manager methods
    storageManager.setData = jest.fn();
    storageManager.getData = jest.fn();
    storageManager.removeData = jest.fn();
  });

  afterEach(() => {
    if (timerManager) {
      timerManager.destroy();
    }
  });

  describe("单例模式", () => {
    test("应该返回相同的实例", () => {
      const instance1 = TimerManager.getInstance();
      const instance2 = TimerManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    test("构造函数应该返回现有实例", () => {
      const instance1 = new TimerManager();
      const instance2 = new TimerManager();
      expect(instance1).toBe(instance2);
    });
  });

  describe("初始化", () => {
    test("应该正确初始化", async () => {
      await timerManager.initialize(storageManager);
      
      expect(timerManager.initialized).toBe(true);
      expect(timerManager.storageManager).toBe(storageManager);
      expect(timerManager.status).toBe("idle");
    });

    test("重复初始化应该被忽略", async () => {
      await timerManager.initialize(storageManager);
      const firstInit = timerManager.initialized;
      
      await timerManager.initialize(storageManager);
      expect(timerManager.initialized).toBe(firstInit);
    });
  });

  describe("通知权限检查", () => {
    test("应该检查并请求通知权限", async () => {
      global.Notification.permission = 'default';
      await timerManager.checkNotificationPermission();
      
      expect(global.Notification.requestPermission).toHaveBeenCalled();
      expect(timerManager.notificationPermission).toBe('granted');
    });

    test("应该处理不支持通知的浏览器", async () => {
      const originalNotification = global.Notification;
      delete global.Notification;
      
      await timerManager.checkNotificationPermission();
      
      expect(timerManager.notificationPermission).toBe('unsupported');
      
      global.Notification = originalNotification;
    });
  });

  describe("计时器操作", () => {
    beforeEach(async () => {
      await timerManager.initialize(storageManager);
    });

    test("应该能启动计时器", () => {
      const result = timerManager.startTimer("task-1", "测试任务", 1500);
      
      expect(result).toBe(true);
      expect(timerManager.status).toBe("running");
      expect(timerManager.taskId).toBe("task-1");
      expect(timerManager.taskTitle).toBe("测试任务");
      expect(timerManager.totalSeconds).toBe(1500);
      expect(timerManager.remainingSeconds).toBe(1500);
      expect(global.setInterval).toHaveBeenCalled();
    });

    test("运行中的计时器不应该被重新启动", () => {
      timerManager.startTimer("task-1", "测试任务", 1500);
      const result = timerManager.startTimer("task-2", "另一个任务", 1500);
      
      expect(result).toBe(false);
      expect(timerManager.taskId).toBe("task-1"); // 应该保持原来的任务
    });

    test("应该能暂停运行中的计时器", () => {
      timerManager.startTimer("task-1", "测试任务", 1500);
      const result = timerManager.pauseTimer();
      
      expect(result).toBe(true);
      expect(timerManager.status).toBe("paused");
      expect(global.clearInterval).toHaveBeenCalled();
    });

    test("非运行状态的计时器不应该被暂停", () => {
      const result = timerManager.pauseTimer();
      
      expect(result).toBe(false);
      expect(timerManager.status).toBe("idle");
    });

    test("应该能恢复暂停的计时器", () => {
      timerManager.startTimer("task-1", "测试任务", 1500);
      timerManager.pauseTimer();
      
      const result = timerManager.resumeTimer();
      
      expect(result).toBe(true);
      expect(timerManager.status).toBe("running");
      expect(global.setInterval).toHaveBeenCalledTimes(2); // 启动时一次，恢复时一次
    });

    test("非暂停状态的计时器不应该被恢复", () => {
      const result = timerManager.resumeTimer();
      
      expect(result).toBe(false);
      expect(timerManager.status).toBe("idle");
    });

    test("应该能停止计时器", () => {
      timerManager.startTimer("task-1", "测试任务", 1500);
      const result = timerManager.stopTimer();
      
      expect(result).toBe(true);
      expect(timerManager.status).toBe("idle");
      expect(timerManager.taskId).toBe(null);
      expect(timerManager.taskTitle).toBe(null);
      expect(global.clearInterval).toHaveBeenCalled();
    });
  });

  describe("倒计时逻辑", () => {
    beforeEach(async () => {
      await timerManager.initialize(storageManager);
    });

    test("应该正确计算剩余时间", () => {
      mockDateNow.mockReturnValue(1000000);
      timerManager.startTimer("task-1", "测试任务", 1500);
      
      // 模拟5秒后
      mockDateNow.mockReturnValue(1005000);
      timerManager.updateCountdown();
      
      expect(timerManager.remainingSeconds).toBe(1495);
    });

    test("倒计时结束时应该完成计时器", () => {
      mockDateNow.mockReturnValue(1000000);
      timerManager.startTimer("task-1", "测试任务", 5);
      
      // 模拟6秒后（超过计时器时长）
      mockDateNow.mockReturnValue(1006000);
      
      const completeSpy = jest.spyOn(timerManager, 'completeTimer');
      timerManager.updateCountdown();
      
      expect(timerManager.remainingSeconds).toBe(0);
      expect(completeSpy).toHaveBeenCalled();
    });

    test("计时器完成时应该发送通知", () => {
      const notificationSpy = jest.spyOn(timerManager, 'sendNotification');
      
      timerManager.status = "running";
      timerManager.taskTitle = "测试任务";
      timerManager.completeTimer();
      
      expect(notificationSpy).toHaveBeenCalled();
      expect(timerManager.status).toBe("completed");
    });
  });

  describe("观察者模式", () => {
    beforeEach(async () => {
      await timerManager.initialize(storageManager);
      timerManager.addObserver(mockObserver);
    });

    test("应该能添加观察者", () => {
      expect(timerManager.observers).toContain(mockObserver);
    });

    test("应该能移除观察者", () => {
      timerManager.removeObserver(mockObserver);
      expect(timerManager.observers).not.toContain(mockObserver);
    });

    test("重复添加相同观察者应该被忽略", () => {
      timerManager.addObserver(mockObserver);
      const observerCount = timerManager.observers.filter(obs => obs === mockObserver).length;
      expect(observerCount).toBe(1);
    });

    test("启动计时器时应该通知观察者", () => {
      timerManager.startTimer("task-1", "测试任务", 1500);
      
      expect(mockObserver).toHaveBeenCalledWith("timerStarted", {
        taskId: "task-1",
        taskTitle: "测试任务",
        totalSeconds: 1500,
        remainingSeconds: 1500,
      });
    });

    test("暂停计时器时应该通知观察者", () => {
      timerManager.startTimer("task-1", "测试任务", 1500);
      mockObserver.mockClear();
      
      timerManager.pauseTimer();
      
      expect(mockObserver).toHaveBeenCalledWith("timerPaused", {
        remainingSeconds: 1500,
      });
    });

    test("计时器更新时应该通知观察者", () => {
      mockDateNow.mockReturnValue(1000000);
      timerManager.startTimer("task-1", "测试任务", 1500);
      mockObserver.mockClear();
      
      // 模拟1秒后
      mockDateNow.mockReturnValue(1001000);
      timerManager.updateCountdown();
      
      expect(mockObserver).toHaveBeenCalledWith("timerTick", {
        remainingSeconds: 1499,
        totalSeconds: 1500,
        progress: 1/1500,
      });
    });

    test("计时器完成时应该通知观察者", () => {
      timerManager.taskId = "task-1";
      timerManager.taskTitle = "测试任务";
      timerManager.status = "running";
      
      timerManager.completeTimer();
      
      expect(mockObserver).toHaveBeenCalledWith("timerCompleted", {
        taskId: "task-1",
        taskTitle: "测试任务",
      });
    });

    test("观察者错误不应该影响其他观察者", () => {
      const errorObserver = jest.fn().mockImplementation(() => {
        throw new Error("Observer error");
      });
      const normalObserver = jest.fn();
      
      timerManager.addObserver(errorObserver);
      timerManager.addObserver(normalObserver);
      
      timerManager.notifyObservers("test", {});
      
      expect(errorObserver).toHaveBeenCalled();
      expect(normalObserver).toHaveBeenCalled();
    });
  });

  describe("桌面通知", () => {
    beforeEach(async () => {
      await timerManager.initialize(storageManager);
    });

    test("权限允许时应该发送桌面通知", () => {
      timerManager.notificationPermission = "granted";
      timerManager.taskTitle = "测试任务";
      
      timerManager.sendNotification();
      
      expect(global.Notification).toHaveBeenCalledWith(
        "专注时间结束 🍅",
        expect.objectContaining({
          body: "任务「测试任务」的专注时间已完成",
        })
      );
    });

    test("权限拒绝时应该显示降级通知", () => {
      timerManager.notificationPermission = "denied";
      const fallbackSpy = jest.spyOn(timerManager, 'showFallbackNotification');
      
      timerManager.sendNotification();
      
      expect(fallbackSpy).toHaveBeenCalled();
    });

    test("应该创建降级通知元素", () => {
      timerManager.showFallbackNotification("测试标题", "测试消息");
      
      expect(global.document.createElement).toHaveBeenCalledWith("div");
      expect(global.document.body.appendChild).toHaveBeenCalled();
    });
  });

  describe("状态持久化", () => {
    beforeEach(async () => {
      await timerManager.initialize(storageManager);
    });

    test("应该保存计时器状态", () => {
      mockDateNow.mockReturnValue(1000000);
      timerManager.startTimer("task-1", "测试任务", 1500);
      
      expect(storageManager.setData).toHaveBeenCalledWith("timerState", {
        status: "running",
        taskId: "task-1",
        taskTitle: "测试任务",
        startTime: 1000000,
        remainingSeconds: 1500,
        totalSeconds: 1500,
        timestamp: 1000000,
      });
    });

    test("应该恢复运行中的计时器状态", async () => {
      const savedState = {
        status: "running",
        taskId: "task-1",
        taskTitle: "测试任务",
        startTime: 1000000,
        remainingSeconds: 1500,
        totalSeconds: 1500,
        timestamp: 1000000,
      };
      
      storageManager.getData.mockReturnValue(savedState);
      mockDateNow.mockReturnValue(1005000); // 5秒后
      
      await timerManager.restoreTimerState();
      
      expect(timerManager.status).toBe("running");
      expect(timerManager.taskId).toBe("task-1");
      expect(timerManager.remainingSeconds).toBe(1495); // 1500 - 5秒
    });

    test("应该恢复暂停的计时器状态", async () => {
      const savedState = {
        status: "paused",
        taskId: "task-1",
        taskTitle: "测试任务",
        remainingSeconds: 1200,
        totalSeconds: 1500,
        timestamp: 1000000,
      };
      
      storageManager.getData.mockReturnValue(savedState);
      
      await timerManager.restoreTimerState();
      
      expect(timerManager.status).toBe("paused");
      expect(timerManager.remainingSeconds).toBe(1200);
    });

    test("过期的计时器应该被标记为完成", async () => {
      const savedState = {
        status: "running",
        taskId: "task-1",
        taskTitle: "测试任务",
        startTime: 1000000,
        remainingSeconds: 1500,
        totalSeconds: 1500,
        timestamp: 1000000,
      };
      
      storageManager.getData.mockReturnValue(savedState);
      mockDateNow.mockReturnValue(1002000000); // 远超过计时器时长
      
      const completeSpy = jest.spyOn(timerManager, 'completeTimer');
      await timerManager.restoreTimerState();
      
      expect(completeSpy).toHaveBeenCalled();
    });

    test("应该清除计时器状态", () => {
      timerManager.clearTimerState();
      expect(storageManager.removeData).toHaveBeenCalledWith("timerState");
    });
  });

  describe("工具方法", () => {
    test("应该正确格式化时间", () => {
      expect(timerManager.formatTime(0)).toBe("00:00");
      expect(timerManager.formatTime(59)).toBe("00:59");
      expect(timerManager.formatTime(60)).toBe("01:00");
      expect(timerManager.formatTime(1500)).toBe("25:00");
      expect(timerManager.formatTime(3661)).toBe("61:01");
    });

    test("应该返回当前计时器状态", () => {
      timerManager.status = "running";
      timerManager.taskId = "task-1";
      timerManager.taskTitle = "测试任务";
      timerManager.remainingSeconds = 1200;
      timerManager.totalSeconds = 1500;
      
      const state = timerManager.getTimerState();
      
      expect(state).toEqual({
        status: "running",
        taskId: "task-1",
        taskTitle: "测试任务",
        remainingSeconds: 1200,
        totalSeconds: 1500,
        progress: 300/1500,
      });
    });
  });

  describe("边界条件", () => {
    beforeEach(async () => {
      await timerManager.initialize(storageManager);
    });

    test("应该处理0秒的计时器", () => {
      const result = timerManager.startTimer("task-1", "测试任务", 0);
      expect(result).toBe(true);
      expect(timerManager.remainingSeconds).toBe(0);
    });

    test("应该处理负数时长", () => {
      const result = timerManager.startTimer("task-1", "测试任务", -100);
      expect(result).toBe(true);
      expect(timerManager.totalSeconds).toBe(-100);
    });

    test("更新倒计时时剩余时间不应该小于0", () => {
      mockDateNow.mockReturnValue(1000000);
      timerManager.startTimer("task-1", "测试任务", 5);
      
      // 模拟很久以后
      mockDateNow.mockReturnValue(2000000);
      timerManager.updateCountdown();
      
      expect(timerManager.remainingSeconds).toBe(0);
    });

    test("空任务标题应该被正确处理", () => {
      timerManager.startTimer("task-1", "", 1500);
      expect(timerManager.taskTitle).toBe("");
    });

    test("null任务标题应该被正确处理", () => {
      timerManager.startTimer("task-1", null, 1500);
      expect(timerManager.taskTitle).toBe(null);
    });
  });

  describe("销毁和清理", () => {
    test("销毁时应该清理所有资源", async () => {
      await timerManager.initialize(storageManager);
      timerManager.startTimer("task-1", "测试任务", 1500);
      timerManager.addObserver(mockObserver);
      
      timerManager.destroy();
      
      expect(global.clearInterval).toHaveBeenCalled();
      expect(timerManager.observers).toEqual([]);
      expect(storageManager.removeData).toHaveBeenCalledWith("timerState");
    });
  });
});