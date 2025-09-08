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
   * @param {TaskManager} taskManager - 任务管理器实例
   */
  initialize(timerManager, taskManager) {
    if (this.isInitialized) {
      return;
    }

    this.timerManager = timerManager;
    this.taskManager = taskManager;
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
        
        <div class="focus-info">
          <div class="focus-hint">
            保持专注，距离完成还有一段时间
          </div>
        </div>
        
        <div class="focus-actions">
          <button type="button" class="focus-action-btn pause-btn hidden" id="pause-btn">
            暂停
          </button>
          <button type="button" class="focus-action-btn resume-btn hidden" id="resume-btn">
            继续
          </button>
          <button type="button" class="focus-action-btn modify-time-btn hidden" id="modify-time-btn">
            修改时间
          </button>
          <button type="button" class="focus-action-btn stop-btn hidden" id="stop-btn">
            结束专注
          </button>
          
          <!-- 倒计时完成后的操作按钮 -->
          <button type="button" class="focus-action-btn complete-btn hidden" id="complete-btn">
            ✅ 任务完成
          </button>
          <button type="button" class="focus-action-btn cancel-complete-btn hidden" id="cancel-complete-btn">
            ❌ 取消
          </button>
          <button type="button" class="focus-action-btn extend-time-btn hidden" id="extend-time-btn">
            ⏰ 增加时间
          </button>
        </div>
      </div>
      
      <!-- Time Modification Modal -->
      <div class="time-modify-modal hidden" id="time-modify-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>设置专注时间</h3>
          </div>
          <div class="modal-body">
            <div class="time-input-group">
              <label for="time-input">专注时长 (分钟)</label>
              <input type="number" id="time-input" class="time-input" 
                     min="0.1" max="120" step="0.1" placeholder="输入分钟数 (如: 25 或 1.5)">
            </div>
            <div class="time-presets">
              <button type="button" class="preset-btn" data-minutes="25">25分钟</button>
              <button type="button" class="preset-btn" data-minutes="30">30分钟</button>
              <button type="button" class="preset-btn" data-minutes="45">45分钟</button>
              <button type="button" class="preset-btn" data-minutes="60">60分钟</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-btn cancel-btn" id="cancel-time-btn">取消</button>
            <button type="button" class="modal-btn confirm-btn" id="confirm-time-btn">确定</button>
          </div>
        </div>
      </div>
      
      <!-- Extend Time Modal -->
      <div class="time-modify-modal hidden" id="extend-time-modal">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>增加专注时间</h3>
          </div>
          <div class="modal-body">
            <div class="time-input-group">
              <label for="extend-time-input">增加时长 (分钟)</label>
              <input type="number" id="extend-time-input" class="time-input" 
                     min="0.1" max="60" step="0.1" value="5" placeholder="输入分钟数 (如: 5 或 2.5)">
            </div>
            <div class="time-presets">
              <button type="button" class="preset-btn" data-minutes="5">5分钟</button>
              <button type="button" class="preset-btn" data-minutes="10">10分钟</button>
              <button type="button" class="preset-btn selected" data-minutes="15">15分钟</button>
              <button type="button" class="preset-btn" data-minutes="30">30分钟</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="modal-btn cancel-btn" id="cancel-extend-btn">取消</button>
            <button type="button" class="modal-btn confirm-btn" id="confirm-extend-btn">确认</button>
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

    // 修改时间按钮
    const modifyTimeBtn = this.container.querySelector("#modify-time-btn");
    modifyTimeBtn.addEventListener("click", () => {
      this.showTimeModificationModal();
    });

    // 完成按钮
    const completeBtn = this.container.querySelector("#complete-btn");
    if (completeBtn) {
      completeBtn.addEventListener("click", () => this.handleTaskComplete());
    }

    // 取消按钮
    const cancelCompleteBtn = this.container.querySelector("#cancel-complete-btn");
    if (cancelCompleteBtn) {
      cancelCompleteBtn.addEventListener("click", () => this.hide());
    }

    // 增加时间按钮
    const extendTimeBtn = this.container.querySelector("#extend-time-btn");
    if (extendTimeBtn) {
      extendTimeBtn.addEventListener("click", () => this.handleExtendTime());
    }

    // 时间修改模态框事件
    this.setupModalEventListeners();

    // 增加时间模态框事件
    this.setupExtendTimeModalEventListeners();

    // 点击遮罩层不做任何操作（避免意外关闭）
    this.container.querySelector(".focus-page-overlay").addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // ESC键处理
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        // 如果模态框打开，先关闭模态框
        if (this.isTimeModalVisible()) {
          this.hideTimeModificationModal();
        } else if (this.isExtendTimeModalVisible()) {
          this.hideExtendTimeModal();
        } else {
          this.showStopConfirmation();
        }
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
   * 设置模态框事件监听器
   */
  setupModalEventListeners() {
    const modal = this.container.querySelector("#time-modify-modal");
    const cancelBtn = this.container.querySelector("#cancel-time-btn");
    const confirmBtn = this.container.querySelector("#confirm-time-btn");
    const timeInput = this.container.querySelector("#time-input");
    const presetBtns = this.container.querySelectorAll(".preset-btn");
    const modalOverlay = this.container.querySelector(".modal-overlay");

    // 取消按钮
    cancelBtn.addEventListener("click", () => {
      this.hideTimeModificationModal();
    });

    // 确认按钮
    confirmBtn.addEventListener("click", () => {
      this.handleTimeModification();
    });

    // 点击遮罩层关闭模态框
    modalOverlay.addEventListener("click", () => {
      this.hideTimeModificationModal();
    });

    // 预设按钮
    presetBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        // 移除其他按钮的选中状态
        presetBtns.forEach(b => b.classList.remove("selected"));
        // 选中当前按钮
        btn.classList.add("selected");
        // 设置输入值
        const minutes = parseFloat(btn.dataset.minutes);
        timeInput.value = minutes;
      });
    });

    // 输入框变化时取消预设选择
    timeInput.addEventListener("input", () => {
      presetBtns.forEach(btn => btn.classList.remove("selected"));
    });

    // 回车键确认
    timeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.handleTimeModification();
      }
    });
  }

  /**
   * 设置增加时间模态框事件监听器
   */
  setupExtendTimeModalEventListeners() {
    const modal = this.container.querySelector("#extend-time-modal");
    const cancelBtn = this.container.querySelector("#cancel-extend-btn");
    const confirmBtn = this.container.querySelector("#confirm-extend-btn");
    const timeInput = this.container.querySelector("#extend-time-input");
    const presetBtns = modal.querySelectorAll(".preset-btn");
    const modalOverlay = modal.querySelector(".modal-overlay");

    // 取消按钮
    cancelBtn.addEventListener("click", () => {
      this.hideExtendTimeModal();
    });

    // 确认按钮
    confirmBtn.addEventListener("click", () => {
      this.confirmExtendTime();
    });

    // 点击遮罩层关闭模态框
    modalOverlay.addEventListener("click", () => {
      this.hideExtendTimeModal();
    });

    // 预设按钮
    presetBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        // 移除其他按钮的选中状态
        presetBtns.forEach(b => b.classList.remove("selected"));
        // 选中当前按钮
        btn.classList.add("selected");
        // 设置输入值
        const minutes = parseFloat(btn.dataset.minutes);
        timeInput.value = minutes;
      });
    });

    // 输入框变化时取消预设选择
    timeInput.addEventListener("input", () => {
      presetBtns.forEach(btn => btn.classList.remove("selected"));
      // 找到匹配的预设按钮并选中
      const value = parseFloat(timeInput.value);
      const matchingBtn = Array.from(presetBtns).find(btn => parseFloat(btn.dataset.minutes) === value);
      if (matchingBtn) {
        matchingBtn.classList.add("selected");
      }
    });

    // 回车键确认
    timeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.confirmExtendTime();
      }
    });
  }

  /**
   * 显示时间修改模态框
   */
  showTimeModificationModal() {
    const modal = this.container.querySelector("#time-modify-modal");
    const timeInput = this.container.querySelector("#time-input");
    const presetBtns = this.container.querySelectorAll(".preset-btn");
    
    if (!this.timerManager) return;

    // 设置当前时间为默认值
    const currentMinutes = Math.ceil(this.timerManager.totalSeconds / 60);
    timeInput.value = currentMinutes;

    // 检查是否有匹配的预设按钮
    presetBtns.forEach(btn => {
      btn.classList.remove("selected");
      if (parseInt(btn.dataset.minutes) === currentMinutes) {
        btn.classList.add("selected");
      }
    });

    // 显示模态框
    modal.classList.remove("hidden");
    
    // 聚焦输入框
    setTimeout(() => {
      timeInput.focus();
      timeInput.select();
    }, 100);
  }

  /**
   * 隐藏时间修改模态框
   */
  hideTimeModificationModal() {
    const modal = this.container.querySelector("#time-modify-modal");
    modal.classList.add("hidden");
  }

  /**
   * 检查时间修改模态框是否可见
   */
  isTimeModalVisible() {
    const modal = this.container.querySelector("#time-modify-modal");
    return modal && !modal.classList.contains("hidden");
  }

  /**
   * 处理时间修改
   */
  handleTimeModification() {
    const timeInput = this.container.querySelector("#time-input");
    const minutes = parseFloat(timeInput.value);

    // 验证输入
    if (isNaN(minutes) || minutes < 0.1 || minutes > 120) {
      alert("请输入有效的时间（0.1-120分钟）");
      timeInput.focus();
      return;
    }

    // 转换为秒并向上取整
    const seconds = Math.ceil(minutes * 60);

    // 调用TimerManager修改时间
    if (this.timerManager && this.timerManager.modifyTimer(seconds)) {
      this.hideTimeModificationModal();
      console.log(`[FocusPage] Timer modified to ${minutes} minutes`);
    } else {
      alert("修改时间失败，请重试");
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
      case "timerModified":
        this.onTimerModified(data);
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
    
    // 确保完成按钮在计时器开始时被隐藏
    this.hideCompletionButtons();
    
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
    
    // 显示完成后的操作按钮
    this.showCompletionButtons();
    
    console.log("[FocusPage] Timer completed, showing completion buttons");
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
   * 处理计时器修改事件
   * @param {Object} data - 事件数据
   */
  onTimerModified(data) {
    this.updateCountdown(data.remainingSeconds, data.totalSeconds);
    this.updateProgress(0); // 重置进度条
    this.updateHint(data.remainingSeconds);
    
    console.log(`[FocusPage] Timer modified from ${data.oldDuration}s to ${data.newDuration}s`);
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
    // 只选择常规操作按钮，排除完成后的操作按钮
    const regularButtons = this.container.querySelectorAll("#pause-btn, #resume-btn, #modify-time-btn, #stop-btn");
    regularButtons.forEach(btn => {
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
    const modifyTimeBtn = this.container.querySelector("#modify-time-btn");
    const stopBtn = this.container.querySelector("#stop-btn");

    switch (status) {
      case "running":
        pauseBtn.classList.remove("hidden");
        resumeBtn.classList.add("hidden");
        modifyTimeBtn.classList.remove("hidden");
        stopBtn.classList.remove("hidden");
        break;
      case "paused":
        pauseBtn.classList.add("hidden");
        resumeBtn.classList.remove("hidden");
        modifyTimeBtn.classList.remove("hidden");
        stopBtn.classList.remove("hidden");
        break;
      default:
        pauseBtn.classList.add("hidden");
        resumeBtn.classList.add("hidden");
        modifyTimeBtn.classList.add("hidden");
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
    
    // 确保完成按钮也被隐藏
    this.hideCompletionButtons();
    
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
   * 显示完成后的操作按钮
   */
  showCompletionButtons() {
    const completeBtn = this.container.querySelector("#complete-btn");
    const cancelBtn = this.container.querySelector("#cancel-complete-btn");
    const extendBtn = this.container.querySelector("#extend-time-btn");
    
    // 隐藏其他按钮
    this.showActionButtons(false);
    
    // 显示完成操作按钮
    completeBtn.classList.remove("hidden");
    cancelBtn.classList.remove("hidden");
    extendBtn.classList.remove("hidden");
  }

  /**
   * 隐藏完成后的操作按钮
   */
  hideCompletionButtons() {
    const completeBtn = this.container.querySelector("#complete-btn");
    const cancelBtn = this.container.querySelector("#cancel-complete-btn");
    const extendBtn = this.container.querySelector("#extend-time-btn");
    
    completeBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");
    extendBtn.classList.add("hidden");
  }

  /**
   * 处理任务完成
   */
  async handleTaskComplete() {
    const taskInfo = this.timerManager.getTaskInfo();
    if (this.taskManager && taskInfo && taskInfo.taskId) {
      try {
        const taskId = taskInfo.taskId;
        // 标记任务为完成
        await this.taskManager.toggleTaskCompletion(taskId);
        // 增加番茄钟计数
        await this.taskManager.incrementPomodoroCount(taskId);
        console.log(`[FocusPage] Task marked as completed`);
        
        // 显示成功提示
        this.updateStatus("任务已标记完成 ✅", "completed");
        
        // 1秒后隐藏页面
        setTimeout(() => {
          this.hide();
        }, 1000);
      } catch (error) {
        console.error("[FocusPage] Failed to complete task:", error);
      }
    }
  }

  /**
   * 处理增加时间
   */
  handleExtendTime() {
    const modal = this.container.querySelector("#extend-time-modal");
    const input = this.container.querySelector("#extend-time-input");
    input.value = 15; // 默认15分钟
    modal.classList.remove("hidden");
    
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
  }

  /**
   * 隐藏增加时间模态框
   */
  hideExtendTimeModal() {
    const modal = this.container.querySelector("#extend-time-modal");
    modal.classList.add("hidden");
  }

  /**
   * 确认增加时间
   */
  async confirmExtendTime() {
    const input = this.container.querySelector("#extend-time-input");
    const minutes = parseFloat(input.value);
    
    if (isNaN(minutes) || minutes < 0.1 || minutes > 60) {
      alert("请输入有效的时间（0.1-60分钟）");
      input.focus();
      return;
    }
    
    const seconds = Math.ceil(minutes * 60);
    
    // 使用 TimerManager 重新启动计时器
    const taskInfo = this.timerManager.getTaskInfo();
    if (this.timerManager && taskInfo) {
      const taskId = taskInfo.taskId;
      const taskTitle = taskInfo.taskTitle;
      
      // 重新启动计时器
      await this.timerManager.startTimer(taskId, taskTitle, seconds);
      
      // 隐藏modal和完成按钮
      this.hideExtendTimeModal();
      this.hideCompletionButtons();
      
      console.log(`[FocusPage] Extended timer by ${minutes} minutes`);
    }
  }

  /**
   * 检查增加时间模态框是否可见
   * @returns {boolean} 是否可见
   */
  isExtendTimeModalVisible() {
    const modal = this.container.querySelector("#extend-time-modal");
    return modal && !modal.classList.contains("hidden");
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