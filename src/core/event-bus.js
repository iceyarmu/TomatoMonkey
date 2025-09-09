/**
 * EventBus - Linus式事件总线
 * 
 * Linus 原则:
 * 1. 简单直接 - 基于Map的高性能实现
 * 2. 类型安全 - 明确的事件类型和数据结构
 * 3. 失败就失败 - 监听器错误不影响其他监听器
 * 4. 易于调试 - 清晰的日志和错误追踪
 */

class EventBus {
  constructor() {
    // 使用Map存储事件监听器 - O(1)查找
    this.listeners = new Map();
    
    // 事件统计 - 用于调试和监控
    this.stats = {
      emitted: 0,
      errors: 0,
      listeners: 0
    };
    
    console.log("[EventBus] Created");
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {Function} 取消订阅的函数
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new Error("[EventBus] Listener must be a function");
    }

    // 确保事件类型存在监听器集合
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event);
    eventListeners.add(listener);
    this.stats.listeners++;

    console.log(`[EventBus] Listener added for '${event}' (total: ${eventListeners.size})`);

    // 返回取消订阅函数
    return () => this.off(event, listener);
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  off(event, listener) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      console.warn(`[EventBus] No listeners found for '${event}'`);
      return;
    }

    if (eventListeners.delete(listener)) {
      this.stats.listeners--;
      console.log(`[EventBus] Listener removed for '${event}' (remaining: ${eventListeners.size})`);
      
      // 清理空的事件类型
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * 一次性监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {Function} 取消订阅的函数
   */
  once(event, listener) {
    const onceListener = (...args) => {
      // 执行后自动取消订阅
      this.off(event, onceListener);
      listener(...args);
    };

    return this.on(event, onceListener);
  }

  /**
   * 发射事件
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  emit(event, data = null) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) {
      console.log(`[EventBus] No listeners for '${event}'`);
      return;
    }

    this.stats.emitted++;
    let errorCount = 0;

    // 异步执行所有监听器，避免阻塞
    for (const listener of eventListeners) {
      try {
        // 使用 setTimeout 确保异步执行，避免监听器错误影响后续监听器
        setTimeout(() => {
          try {
            listener(event, data);
          } catch (error) {
            this.stats.errors++;
            console.error(`[EventBus] Listener error for '${event}':`, error);
          }
        }, 0);
      } catch (error) {
        errorCount++;
        this.stats.errors++;
        console.error(`[EventBus] Failed to schedule listener for '${event}':`, error);
      }
    }

    console.log(`[EventBus] Emitted '${event}' to ${eventListeners.size} listeners${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
  }

  /**
   * 清除所有监听器
   * @param {string} event - 可选：特定事件名称
   */
  clear(event = null) {
    if (event) {
      // 清除特定事件的监听器
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const count = eventListeners.size;
        this.listeners.delete(event);
        this.stats.listeners -= count;
        console.log(`[EventBus] Cleared ${count} listeners for '${event}'`);
      }
    } else {
      // 清除所有监听器
      const totalListeners = this.stats.listeners;
      this.listeners.clear();
      this.stats.listeners = 0;
      console.log(`[EventBus] Cleared all ${totalListeners} listeners`);
    }
  }

  /**
   * 获取事件总线状态
   * @returns {Object} 状态信息
   */
  getStats() {
    return {
      ...this.stats,
      eventTypes: this.listeners.size,
      events: Array.from(this.listeners.keys())
    };
  }

  /**
   * 检查是否有监听器
   * @param {string} event - 事件名称
   * @returns {boolean} 是否有监听器
   */
  hasListeners(event) {
    const eventListeners = this.listeners.get(event);
    return eventListeners && eventListeners.size > 0;
  }

  /**
   * 获取事件监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  getListenerCount(event) {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * 销毁事件总线
   */
  destroy() {
    this.clear();
    console.log("[EventBus] Destroyed");
  }
}

// 预定义事件类型 - 提供类型安全和文档
EventBus.EVENTS = {
  // 任务事件
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_COMPLETED: 'task:completed',
  
  // 计时器事件
  TIMER_STARTED: 'timer:started',
  TIMER_PAUSED: 'timer:paused',
  TIMER_RESUMED: 'timer:resumed',
  TIMER_STOPPED: 'timer:stopped',
  TIMER_COMPLETED: 'timer:completed',
  
  // 拦截器事件
  BLOCKER_ACTIVATED: 'blocker:activated',
  BLOCKER_DEACTIVATED: 'blocker:deactivated',
  
  // 应用事件
  APP_INITIALIZED: 'app:initialized',
  APP_DESTROYED: 'app:destroyed'
};

// 浏览器环境导出
if (typeof window !== "undefined") {
  window.EventBus = EventBus;
}

// 模块导出
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EventBus };
} else if (typeof exports !== "undefined") {
  exports.EventBus = EventBus;
}