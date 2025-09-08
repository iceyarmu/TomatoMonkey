/**
 * FocusPage - 专注页面UI组件
 *
 * 负责：
 * 1. 专注页面的UI渲染和布局
 * 2. 倒计时的实时显示更新
 * 3. 当前任务标题的展示
 * 4. 订阅TimerManager的状态变化
 * 5. 极简无干扰的用户界面
 * 6. 页面生命周期管理
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
   */
  initialize(timerManager) {
    if (this.isInitialized) {
      return;
    }

    this.timerManager = timerManager;
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
        
        <div class="focus-actions">
          <button type="button" class="focus-action-btn pause-btn hidden" id="pause-btn">
            暂停
          </button>
          <button type="button" class="focus-action-btn resume-btn hidden" id="resume-btn">
            继续
          </button>
          <button type="button" class="focus-action-btn stop-btn hidden" id="stop-btn">
            结束专注
          </button>
        </div>
        
        <div class="focus-info">
          <div class="focus-hint">
            保持专注，距离完成还有一段时间
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

    // 点击遮罩层不做任何操作（避免意外关闭）
    this.container.querySelector(".focus-page-overlay").addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // ESC键退出确认
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        this.showStopConfirmation();
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
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.hide();
    }, 3000);
    
    console.log("[FocusPage] Timer completed, hiding focus page");
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
    const buttons = this.container.querySelectorAll(".focus-action-btn");
    buttons.forEach(btn => {
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
    const stopBtn = this.container.querySelector("#stop-btn");

    switch (status) {
      case "running":
        pauseBtn.classList.remove("hidden");
        resumeBtn.classList.add("hidden");
        stopBtn.classList.remove("hidden");
        break;
      case "paused":
        pauseBtn.classList.add("hidden");
        resumeBtn.classList.remove("hidden");
        stopBtn.classList.remove("hidden");
        break;
      default:
        pauseBtn.classList.add("hidden");
        resumeBtn.classList.add("hidden");
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

// 导出模块
if (typeof module !== "undefined" && module.exports) {
  module.exports = FocusPage;
} else if (typeof exports !== "undefined") {
  exports.FocusPage = FocusPage;
}