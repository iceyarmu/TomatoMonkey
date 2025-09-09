/**
 * TimerManager - 计时器管理器
 *
 * 负责：
 * 1. 番茄钟计时器的核心逻辑
 * 2. 计时器状态管理（idle, running, paused, completed）
 * 3. 倒计时逻辑和实时更新
 * 4. 观察者模式事件通知
 * 5. 桌面通知集成
 * 6. 计时器状态持久化
 * 7. 跨标签页同步处理
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
    // 🚨 关键修复：保存idle状态到存储，而不是删除timerState
    // 这样其他标签页的GM_addValueChangeListener能收到状态变化通知
    this.saveTimerState();
    if (!donotNotify) {
      this.notifyObservers("timerStopped", {});
    }

    console.log("[TimerManager] Timer stopped, state saved as idle");
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
      // 🚨 关键修复：保存idle状态到存储，而不是删除timerState
      // 这样其他标签页的GM_addValueChangeListener能收到状态变化通知
      this.saveTimerState();
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
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TimerManager, timerManager };
} else if (typeof exports !== "undefined") {
  exports.TimerManager = TimerManager;
  exports.timerManager = timerManager;
}