/**
 * TodoList - ToDo列表UI组件
 *
 * 负责：
 * 1. 任务输入界面（输入框和添加按钮）
 * 2. 任务列表的渲染和更新
 * 3. 任务操作的用户界面（完成、删除）
 * 4. 与TaskManager的集成和数据同步
 * 5. 用户交互和视觉反馈
 */

/**
 * ToDo列表组件类
 */
class TodoList {
  constructor(container, taskManager) {
    this.container = container;
    this.taskManager = taskManager;
    this.isInitialized = false;

    // UI元素引用
    this.inputField = null;
    this.addButton = null;
    this.taskList = null;
    this.statsDisplay = null;
    this.clearCompletedButton = null;

    // 状态
    this.tasks = [];
    this.isLoading = false;

    this.initialize();
  }

  /**
   * 初始化组件
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.createUI();
      this.setupEventListeners();
      this.bindTaskManager();
      await this.loadTasks();

      this.isInitialized = true;
      console.log("[TodoList] Initialized successfully");
    } catch (error) {
      console.error("[TodoList] Failed to initialize:", error);
      this.showError("初始化失败，请刷新页面重试");
    }
  }

  /**
   * 创建UI界面
   */
  createUI() {
    this.container.innerHTML = `
            <div class="todo-input-section">
                <div class="input-group">
                    <input 
                        type="text" 
                        id="todo-input" 
                        class="todo-input" 
                        placeholder="输入新任务..." 
                        maxlength="200"
                        aria-label="新任务输入"
                    />
                    <button 
                        type="button" 
                        id="add-task-btn" 
                        class="add-task-button"
                        title="添加任务 (Enter)"
                        aria-label="添加新任务"
                    >
                        <span class="button-icon">+</span>
                        <span class="button-text">添加</span>
                    </button>
                </div>
                <div class="input-error-message hidden" id="input-error"></div>
            </div>
            
            <div class="todo-stats-section">
                <div class="stats-display" id="stats-display">
                    <span class="stats-item">
                        <span class="stats-label">总计:</span>
                        <span class="stats-value" id="total-count">0</span>
                    </span>
                    <span class="stats-item">
                        <span class="stats-label">待完成:</span>
                        <span class="stats-value" id="pending-count">0</span>
                    </span>
                    <span class="stats-item">
                        <span class="stats-label">已完成:</span>
                        <span class="stats-value" id="completed-count">0</span>
                    </span>
                </div>
                <button 
                    type="button" 
                    id="clear-completed-btn" 
                    class="clear-completed-button hidden"
                    title="清除所有已完成任务"
                >
                    清除已完成
                </button>
            </div>
            
            <div class="todo-list-section">
                <div class="loading-indicator hidden" id="loading-indicator">
                    <span class="loading-spinner"></span>
                    <span>加载中...</span>
                </div>
                <div class="empty-state hidden" id="empty-state">
                    <div class="empty-icon">📝</div>
                    <h4>暂无任务</h4>
                    <p>添加您的第一个任务来开始管理待办事项</p>
                </div>
                <ul class="task-list" id="task-list" role="list"></ul>
            </div>
        `;

    // 获取UI元素引用
    this.inputField = this.container.querySelector("#todo-input");
    this.addButton = this.container.querySelector("#add-task-btn");
    this.taskList = this.container.querySelector("#task-list");
    this.statsDisplay = this.container.querySelector("#stats-display");
    this.clearCompletedButton = this.container.querySelector(
      "#clear-completed-btn",
    );
    this.loadingIndicator = this.container.querySelector("#loading-indicator");
    this.emptyState = this.container.querySelector("#empty-state");
    this.inputError = this.container.querySelector("#input-error");

    // 统计元素
    this.totalCount = this.container.querySelector("#total-count");
    this.pendingCount = this.container.querySelector("#pending-count");
    this.completedCount = this.container.querySelector("#completed-count");
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 添加任务
    this.addButton.addEventListener("click", () => this.addTask());

    // 输入框回车添加任务
    this.inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.addTask();
      }
    });

    // 输入验证
    this.inputField.addEventListener("input", () => {
      this.validateInput();
      this.updateAddButtonState();
    });

    // 清除已完成任务
    this.clearCompletedButton.addEventListener("click", () => {
      this.clearCompletedTasks();
    });

    // 任务列表事件委托
    this.taskList.addEventListener("click", (e) => {
      this.handleTaskListClick(e);
    });

    // 任务列表键盘事件
    this.taskList.addEventListener("keydown", (e) => {
      this.handleTaskListKeydown(e);
    });
  }

  /**
   * 绑定TaskManager事件
   */
  bindTaskManager() {
    if (!this.taskManager) return;

    // 监听TaskManager事件
    this.taskManager.addObserver((event, data) => {
      this.handleTaskManagerEvent(event, data);
    });
  }

  /**
   * 处理TaskManager事件
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  handleTaskManagerEvent(event, data) {
    switch (event) {
      case "taskCreated":
      case "taskToggled":
      case "taskDeleted":
      case "completedTasksCleared":
        this.loadTasks();
        break;
    }
  }

  /**
   * 加载任务数据
   */
  async loadTasks() {
    if (!this.taskManager || this.isLoading) return;

    this.isLoading = true;
    this.showLoading(true);

    try {
      this.tasks = this.taskManager.getAllTasks();
      this.renderTaskList();
      this.updateStats();
      this.updateUI();
    } catch (error) {
      console.error("[TodoList] Failed to load tasks:", error);
      this.showError("加载任务失败");
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  /**
   * 添加新任务
   */
  async addTask() {
    const title = this.inputField.value.trim();

    if (!this.validateTaskTitle(title)) {
      return;
    }

    this.setButtonLoading(this.addButton, true);
    this.clearError();

    try {
      await this.taskManager.createTask(title);
      this.inputField.value = "";
      this.updateAddButtonState();
      this.inputField.focus();
    } catch (error) {
      console.error("[TodoList] Failed to add task:", error);
      this.showError("添加任务失败，请重试");
    } finally {
      this.setButtonLoading(this.addButton, false);
    }
  }

  /**
   * 切换任务完成状态
   * @param {string} taskId - 任务ID
   */
  async toggleTask(taskId) {
    try {
      await this.taskManager.toggleTaskCompletion(taskId);
    } catch (error) {
      console.error("[TodoList] Failed to toggle task:", error);
      this.showError("操作失败，请重试");
    }
  }

  /**
   * 删除任务
   * @param {string} taskId - 任务ID
   * @param {string} taskTitle - 任务标题（用于确认）
   */
  async deleteTask(taskId, taskTitle) {
    const confirmed = confirm(`确定要删除任务 "${taskTitle}" 吗？`);
    if (!confirmed) return;

    try {
      await this.taskManager.deleteTask(taskId);
    } catch (error) {
      console.error("[TodoList] Failed to delete task:", error);
      this.showError("删除失败，请重试");
    }
  }

  /**
   * 开始专注会话
   * @param {string} taskId - 任务ID
   * @param {string} taskTitle - 任务标题
   */
  startFocusSession(taskId, taskTitle) {
    try {
      // 获取TimerManager实例
      const timerManager = window.TimerManager ? window.TimerManager.getInstance() : null;
      
      if (!timerManager) {
        this.showError("计时器模块未就绪，请刷新页面重试");
        console.error("[TodoList] TimerManager not available");
        return;
      }

      // 检查是否已有计时器在运行
      const timerState = timerManager.getTimerState();
      if (timerState.status === "running") {
        const confirmed = confirm("已有计时器在运行中，是否要停止当前计时器并开始新的专注会话？");
        if (!confirmed) return;
        
        timerManager.stopTimer();
      }

      // 启动计时器 (默认25分钟)
      const started = timerManager.startTimer(taskId, taskTitle, 1500);
      
      if (started) {
        console.log(`[TodoList] Started focus session for task: ${taskTitle}`);
      } else {
        this.showError("无法启动专注会话，请重试");
        console.error("[TodoList] Failed to start timer");
      }

    } catch (error) {
      console.error("[TodoList] Failed to start focus session:", error);
      this.showError("启动专注会话失败，请重试");
    }
  }

  /**
   * 清除所有已完成任务
   */
  async clearCompletedTasks() {
    const completedCount = this.tasks.filter((task) => task.isCompleted).length;
    if (completedCount === 0) return;

    const confirmed = confirm(`确定要清除 ${completedCount} 个已完成任务吗？`);
    if (!confirmed) return;

    try {
      await this.taskManager.clearCompletedTasks();
    } catch (error) {
      console.error("[TodoList] Failed to clear completed tasks:", error);
      this.showError("清除失败，请重试");
    }
  }

  /**
   * 渲染任务列表
   */
  renderTaskList() {
    if (this.tasks.length === 0) {
      this.taskList.innerHTML = "";
      return;
    }

    const taskItems = this.tasks.map((task) => this.createTaskElement(task));
    this.taskList.innerHTML = taskItems.join("");
  }

  /**
   * 创建任务元素HTML
   * @param {Task} task - 任务对象
   * @returns {string} HTML字符串
   */
  createTaskElement(task) {
    const completedClass = task.isCompleted ? "completed" : "";
    const checkedAttr = task.isCompleted ? "checked" : "";
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    const completedDate = task.completedAt
      ? new Date(task.completedAt).toLocaleDateString()
      : "";

    return `
            <li class="task-item ${completedClass}" data-task-id="${task.id}" role="listitem">
                <div class="task-content">
                    <label class="task-checkbox-label">
                        <input 
                            type="checkbox" 
                            class="task-checkbox" 
                            ${checkedAttr}
                            aria-label="标记任务为${task.isCompleted ? "未完成" : "已完成"}"
                        />
                        <span class="checkbox-custom"></span>
                    </label>
                    
                    <div class="task-details">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            <span class="task-date">创建于 ${createdDate}</span>
                            ${task.isCompleted ? `<span class="task-completed-date">完成于 ${completedDate}</span>` : ""}
                            ${task.pomodoroCount > 0 ? `<span class="pomodoro-count">🍅 ${task.pomodoroCount}</span>` : ""}
                        </div>
                    </div>
                </div>
                
                <div class="task-actions">
                    ${!task.isCompleted ? `
                        <button 
                            type="button" 
                            class="start-focus-button" 
                            title="开始专注"
                            aria-label="开始专注: ${task.title}"
                        >
                            🍅
                        </button>
                    ` : ""}
                    <button 
                        type="button" 
                        class="delete-task-button" 
                        title="删除任务"
                        aria-label="删除任务: ${task.title}"
                    >
                        🗑️
                    </button>
                </div>
            </li>
        `;
  }

  /**
   * 处理任务列表点击事件
   * @param {Event} e - 点击事件
   */
  handleTaskListClick(e) {
    const taskItem = e.target.closest(".task-item");
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;

    // 复选框点击
    if (e.target.classList.contains("task-checkbox")) {
      this.toggleTask(taskId);
    }

    // 开始专注按钮点击
    else if (e.target.classList.contains("start-focus-button")) {
      const taskTitle = taskItem.querySelector(".task-title").textContent;
      this.startFocusSession(taskId, taskTitle);
    }

    // 删除按钮点击
    else if (e.target.classList.contains("delete-task-button")) {
      const taskTitle = taskItem.querySelector(".task-title").textContent;
      this.deleteTask(taskId, taskTitle);
    }
  }

  /**
   * 处理任务列表键盘事件
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleTaskListKeydown(e) {
    const taskItem = e.target.closest(".task-item");
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;

    if (e.target.classList.contains("delete-task-button")) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const taskTitle = taskItem.querySelector(".task-title").textContent;
        this.deleteTask(taskId, taskTitle);
      }
    }
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    const stats = this.taskManager
      ? this.taskManager.getStatistics()
      : {
          total: 0,
          pending: 0,
          completed: 0,
        };

    this.totalCount.textContent = stats.total;
    this.pendingCount.textContent = stats.pending;
    this.completedCount.textContent = stats.completed;
  }

  /**
   * 更新UI状态
   */
  updateUI() {
    const hasCompletedTasks = this.tasks.some((task) => task.isCompleted);
    const hasTasks = this.tasks.length > 0;

    // 显示/隐藏清除已完成按钮
    this.clearCompletedButton.classList.toggle("hidden", !hasCompletedTasks);

    // 显示/隐藏空状态
    this.emptyState.classList.toggle("hidden", hasTasks);
    this.taskList.classList.toggle("hidden", !hasTasks);

    this.updateAddButtonState();
  }

  /**
   * 更新添加按钮状态
   */
  updateAddButtonState() {
    const hasText = this.inputField.value.trim().length > 0;
    this.addButton.disabled = !hasText;
  }

  /**
   * 验证任务标题
   * @param {string} title - 任务标题
   * @returns {boolean} 验证是否通过
   */
  validateTaskTitle(title) {
    if (!title || title.length === 0) {
      this.showError("请输入任务内容");
      this.inputField.focus();
      return false;
    }

    if (title.length > 200) {
      this.showError("任务内容不能超过200个字符");
      this.inputField.focus();
      return false;
    }

    return true;
  }

  /**
   * 验证输入
   */
  validateInput() {
    const value = this.inputField.value;

    if (value.length > 200) {
      this.showError("任务内容不能超过200个字符");
    } else {
      this.clearError();
    }
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   */
  showError(message) {
    this.inputError.textContent = message;
    this.inputError.classList.remove("hidden");
    this.inputField.classList.add("error");
  }

  /**
   * 清除错误信息
   */
  clearError() {
    this.inputError.classList.add("hidden");
    this.inputField.classList.remove("error");
  }

  /**
   * 显示/隐藏加载状态
   * @param {boolean} show - 是否显示
   */
  showLoading(show) {
    this.loadingIndicator.classList.toggle("hidden", !show);
  }

  /**
   * 设置按钮加载状态
   * @param {HTMLElement} button - 按钮元素
   * @param {boolean} loading - 是否加载中
   */
  setButtonLoading(button, loading) {
    button.disabled = loading;
    button.classList.toggle("loading", loading);

    if (loading) {
      button.querySelector(".button-text").textContent = "添加中...";
    } else {
      button.querySelector(".button-text").textContent = "添加";
    }
  }

  /**
   * 获取任务统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return this.taskManager ? this.taskManager.getStatistics() : null;
  }

  /**
   * 刷新组件
   */
  async refresh() {
    await this.loadTasks();
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.taskManager) {
      this.taskManager.removeObserver(this.handleTaskManagerEvent);
    }

    if (this.container) {
      this.container.innerHTML = "";
    }

    console.log("[TodoList] Destroyed");
  }
}

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.TodoList = TodoList;
}

// 导出模块
if (typeof module !== "undefined" && module.exports) {
  module.exports = TodoList;
} else if (typeof exports !== "undefined") {
  exports.TodoList = TodoList;
}
