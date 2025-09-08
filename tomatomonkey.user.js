// ==UserScript==
// @name         TomatoMonkey
// @namespace    https://github.com/your-username/tomatomonkey
// @version      1.0.0
// @description  专注时间管理工具：番茄钟技术与任务管理的结合
// @author       TomatoMonkey Team
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_notification
// @run-at       document-end
// @updateURL    
// @downloadURL  
// ==/UserScript==

/**
 * TomatoMonkey - 专注时间管理工具
 * 
 * 主入口文件，负责：
 * 1. 初始化脚本环境
 * 2. 加载核心模块
 * 3. 启动应用程序
 */

(function() {
    'use strict';

    // ========== 核心模块代码 ==========
    // 在生产环境中，这些模块将通过构建工具自动内联

    /**
     * StorageManager - 数据持久化管理器
     */
    class StorageManager {
        constructor() {
            this.STORAGE_KEYS = {
                TASKS: 'TOMATO_MONKEY_TASKS',
                SETTINGS: 'TOMATO_MONKEY_SETTINGS',
                STATISTICS: 'TOMATO_MONKEY_STATISTICS'
            };
            this.DATA_VERSION = 1;
        }

        async saveTasks(tasks) {
            try {
                if (!Array.isArray(tasks)) {
                    throw new Error('Tasks must be an array');
                }

                this.validateTasksData(tasks);

                const storageData = {
                    version: this.DATA_VERSION,
                    timestamp: Date.now(),
                    tasks: tasks
                };

                const serializedData = JSON.stringify(storageData);
                GM_setValue(this.STORAGE_KEYS.TASKS, serializedData);
                
                console.log(`[StorageManager] Saved ${tasks.length} tasks to storage`);
                return true;
                
            } catch (error) {
                console.error('[StorageManager] Failed to save tasks:', error);
                return false;
            }
        }

        async loadTasks() {
            try {
                const serializedData = GM_getValue(this.STORAGE_KEYS.TASKS, null);
                
                if (!serializedData) {
                    console.log('[StorageManager] No tasks found in storage, returning empty array');
                    return [];
                }

                const storageData = JSON.parse(serializedData);
                
                if (!this.validateStorageData(storageData)) {
                    console.warn('[StorageManager] Invalid storage data format, returning empty array');
                    return [];
                }

                const tasks = storageData.tasks || [];
                this.validateTasksData(tasks);
                
                console.log(`[StorageManager] Loaded ${tasks.length} tasks from storage`);
                return tasks;
                
            } catch (error) {
                console.error('[StorageManager] Failed to load tasks:', error);
                return [];
            }
        }

        validateStorageData(storageData) {
            if (!storageData || typeof storageData !== 'object') return false;
            if (typeof storageData.version !== 'number' || storageData.version < 1) return false;
            if (!Array.isArray(storageData.tasks)) return false;
            return true;
        }

        validateTasksData(tasks) {
            if (!Array.isArray(tasks)) {
                throw new Error('Tasks must be an array');
            }

            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                
                if (!task || typeof task !== 'object') {
                    throw new Error(`Task at index ${i} is not a valid object`);
                }

                const requiredFields = ['id', 'title', 'isCompleted', 'createdAt', 'pomodoroCount'];
                for (const field of requiredFields) {
                    if (!(field in task)) {
                        throw new Error(`Task at index ${i} is missing required field: ${field}`);
                    }
                }

                if (typeof task.id !== 'string' || task.id.trim() === '') {
                    throw new Error(`Task at index ${i} has invalid id`);
                }

                if (typeof task.title !== 'string' || task.title.trim() === '') {
                    throw new Error(`Task at index ${i} has invalid title`);
                }

                if (typeof task.isCompleted !== 'boolean') {
                    throw new Error(`Task at index ${i} has invalid isCompleted`);
                }

                if (typeof task.createdAt !== 'number' || task.createdAt <= 0) {
                    throw new Error(`Task at index ${i} has invalid createdAt`);
                }

                if (typeof task.pomodoroCount !== 'number' || task.pomodoroCount < 0) {
                    throw new Error(`Task at index ${i} has invalid pomodoroCount`);
                }

                if (task.completedAt !== undefined && task.completedAt !== null &&
                    (typeof task.completedAt !== 'number' || task.completedAt <= 0)) {
                    throw new Error(`Task at index ${i} has invalid completedAt`);
                }
            }
        }
    }

    /**
     * TaskManager - 任务管理器 (单例模式)
     */
    class TaskManager {
        constructor() {
            if (TaskManager.instance) {
                return TaskManager.instance;
            }

            this.tasks = [];
            this.storageManager = null;
            this.isInitialized = false;
            this.observers = [];

            TaskManager.instance = this;
            return this;
        }

        async initialize(storageManager) {
            if (this.isInitialized) {
                return;
            }

            this.storageManager = storageManager;
            
            try {
                this.tasks = await this.storageManager.loadTasks();
                this.sortTasks();
                
                this.isInitialized = true;
                console.log(`[TaskManager] Initialized with ${this.tasks.length} tasks`);
                
                this.notifyObservers('initialized');
                
            } catch (error) {
                console.error('[TaskManager] Failed to initialize:', error);
                this.tasks = [];
            }
        }

        async createTask(title) {
            if (!title || typeof title !== 'string' || title.trim() === '') {
                throw new Error('Task title is required and must be a non-empty string');
            }

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
            
            await this.saveTasks();
            
            console.log(`[TaskManager] Created task: ${task.title}`);
            this.notifyObservers('taskCreated', { task });
            
            return task;
        }

        getAllTasks() {
            return [...this.tasks];
        }

        getTaskById(taskId) {
            return this.tasks.find(task => task.id === taskId) || null;
        }

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
            
            this.notifyObservers('taskToggled', { task, wasCompleted });
            
            return true;
        }

        async deleteTask(taskId) {
            const taskIndex = this.tasks.findIndex(task => task.id === taskId);
            if (taskIndex === -1) {
                console.warn(`[TaskManager] Task not found: ${taskId}`);
                return false;
            }

            const deletedTask = this.tasks.splice(taskIndex, 1)[0];
            await this.saveTasks();
            
            console.log(`[TaskManager] Deleted task: ${deletedTask.title}`);
            this.notifyObservers('taskDeleted', { task: deletedTask });
            
            return true;
        }

        async clearCompletedTasks() {
            const completedTasks = this.tasks.filter(task => task.isCompleted);
            const clearedCount = completedTasks.length;
            
            this.tasks = this.tasks.filter(task => !task.isCompleted);
            await this.saveTasks();
            
            console.log(`[TaskManager] Cleared ${clearedCount} completed tasks`);
            this.notifyObservers('completedTasksCleared', { count: clearedCount });
            
            return clearedCount;
        }

        getStatistics() {
            const total = this.tasks.length;
            const completed = this.tasks.filter(task => task.isCompleted).length;
            const pending = total - completed;
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

        sortTasks() {
            this.tasks.sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                    return a.isCompleted ? 1 : -1;
                }
                
                if (a.isCompleted && b.isCompleted) {
                    return (b.completedAt || 0) - (a.completedAt || 0);
                }
                
                return a.createdAt - b.createdAt;
            });
        }

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

        generateUUID() {
            return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        addObserver(observer) {
            if (typeof observer === 'function') {
                this.observers.push(observer);
            }
        }

        removeObserver(observer) {
            const index = this.observers.indexOf(observer);
            if (index > -1) {
                this.observers.splice(index, 1);
            }
        }

        notifyObservers(event, data = {}) {
            this.observers.forEach(observer => {
                try {
                    observer(event, data, this);
                } catch (error) {
                    console.error('[TaskManager] Observer error:', error);
                }
            });
        }

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

    /**
     * SettingsPanel - 设置面板UI组件 (简化版本)
     */
    class SettingsPanel {
        constructor() {
            this.isVisible = false;
            this.activeTab = 'todo';
            this.panel = null;
            this.contentArea = null;
            this.tabs = new Map();
            
            this.tabConfig = [
                { id: 'todo', name: 'ToDo列表', icon: '✅', component: null },
                { id: 'whitelist', name: '网站白名单', icon: '🌐', component: null },
                { id: 'statistics', name: '效率统计', icon: '📊', component: null }
            ];

            this.initialize();
        }

        initialize() {
            this.createPanelStructure();
            this.createNavigation();
            this.createContentArea();
            this.setupEventListeners();
            this.activateTab(this.activeTab);
            
            console.log('[SettingsPanel] Initialized successfully');
        }

        createPanelStructure() {
            const overlay = document.createElement('div');
            overlay.id = 'tomato-monkey-overlay';
            overlay.className = 'tomato-monkey-overlay tomato-monkey-hidden';
            
            this.panel = document.createElement('div');
            this.panel.id = 'tomato-monkey-settings-panel';
            this.panel.className = 'tomato-monkey-settings-panel tomato-monkey-hidden';
            
            const header = document.createElement('div');
            header.className = 'settings-header';
            header.innerHTML = \`
                <div class="header-title">
                    <span class="header-icon">🍅</span>
                    <h2>TomatoMonkey 设置</h2>
                </div>
                <button class="close-button" type="button" title="关闭设置面板 (Ctrl+Shift+T)">
                    ✕
                </button>
            \`;
            
            const body = document.createElement('div');
            body.className = 'settings-body';
            
            const navigation = document.createElement('nav');
            navigation.className = 'settings-navigation';
            
            this.contentArea = document.createElement('main');
            this.contentArea.className = 'settings-content';
            
            body.appendChild(navigation);
            body.appendChild(this.contentArea);
            this.panel.appendChild(header);
            this.panel.appendChild(body);
            
            document.body.appendChild(overlay);
            document.body.appendChild(this.panel);
            
            this.overlay = overlay;
            this.navigation = navigation;
            this.headerElement = header;
        }

        createNavigation() {
            const tabList = document.createElement('ul');
            tabList.className = 'tab-list';
            
            this.tabConfig.forEach((tab) => {
                const tabItem = document.createElement('li');
                tabItem.className = 'tab-item';
                
                const tabButton = document.createElement('button');
                tabButton.type = 'button';
                tabButton.className = \`tab-button \${tab.id === this.activeTab ? 'active' : ''}\`;
                tabButton.dataset.tabId = tab.id;
                
                tabButton.innerHTML = \`
                    <span class="tab-icon">\${tab.icon}</span>
                    <span class="tab-name">\${tab.name}</span>
                \`;
                
                tabButton.addEventListener('click', () => this.activateTab(tab.id));
                
                tabItem.appendChild(tabButton);
                tabList.appendChild(tabItem);
            });
            
            this.navigation.appendChild(tabList);
            this.tabButtons = this.navigation.querySelectorAll('.tab-button');
        }

        createContentArea() {
            this.tabConfig.forEach(tab => {
                const contentPanel = document.createElement('div');
                contentPanel.id = \`\${tab.id}-panel\`;
                contentPanel.className = \`content-panel \${tab.id === this.activeTab ? 'active' : 'hidden'}\`;
                
                switch (tab.id) {
                    case 'todo':
                        contentPanel.innerHTML = \`
                            <div class="panel-header">
                                <h3>任务管理</h3>
                                <p>管理您的待办事项列表</p>
                            </div>
                            <div id="todo-container" class="todo-container">
                                <!-- ToDo List组件将插入这里 -->
                            </div>
                        \`;
                        break;
                        
                    case 'whitelist':
                        contentPanel.innerHTML = \`
                            <div class="panel-header">
                                <h3>网站白名单</h3>
                                <p>设置允许使用番茄钟的网站</p>
                            </div>
                            <div class="placeholder-content">
                                <div class="placeholder-icon">🌐</div>
                                <p>网站白名单功能即将上线</p>
                            </div>
                        \`;
                        break;
                        
                    case 'statistics':
                        contentPanel.innerHTML = \`
                            <div class="panel-header">
                                <h3>效率统计</h3>
                                <p>查看您的专注时间和任务完成统计</p>
                            </div>
                            <div class="placeholder-content">
                                <div class="placeholder-icon">📊</div>
                                <p>统计功能即将上线</p>
                            </div>
                        \`;
                        break;
                }
                
                this.contentArea.appendChild(contentPanel);
                this.tabs.set(tab.id, contentPanel);
            });
        }

        setupEventListeners() {
            const closeButton = this.headerElement.querySelector('.close-button');
            closeButton.addEventListener('click', () => this.hide());
            
            this.overlay.addEventListener('click', () => this.hide());
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.hide();
                }
            });
            
            this.panel.addEventListener('click', (e) => e.stopPropagation());
        }

        activateTab(tabId) {
            if (!this.tabs.has(tabId)) {
                console.warn(\`[SettingsPanel] Tab not found: \${tabId}\`);
                return;
            }
            
            const previousTab = this.activeTab;
            this.activeTab = tabId;
            
            this.tabButtons.forEach(button => {
                const isActive = button.dataset.tabId === tabId;
                button.classList.toggle('active', isActive);
            });
            
            this.tabs.forEach((panel, id) => {
                const isActive = id === tabId;
                panel.classList.toggle('active', isActive);
                panel.classList.toggle('hidden', !isActive);
            });
            
            console.log(\`[SettingsPanel] Activated tab: \${tabId}\`);
        }

        show() {
            if (this.isVisible) return;
            
            this.overlay.classList.remove('tomato-monkey-hidden');
            this.panel.classList.remove('tomato-monkey-hidden');
            
            setTimeout(() => {
                this.overlay.classList.add('show');
                this.panel.classList.add('show');
            }, 10);
            
            this.isVisible = true;
            console.log('[SettingsPanel] Panel shown');
        }

        hide() {
            if (!this.isVisible) return;
            
            this.overlay.classList.remove('show');
            this.panel.classList.remove('show');
            
            setTimeout(() => {
                this.overlay.classList.add('tomato-monkey-hidden');
                this.panel.classList.add('tomato-monkey-hidden');
            }, 300);
            
            this.isVisible = false;
            console.log('[SettingsPanel] Panel hidden');
        }

        toggle() {
            if (this.isVisible) {
                this.hide();
            } else {
                this.show();
            }
        }

        getTabContainer(tabId) {
            return this.tabs.get(tabId) || null;
        }

        registerTabComponent(tabId, component) {
            const tabConfig = this.tabConfig.find(tab => tab.id === tabId);
            if (tabConfig) {
                tabConfig.component = component;
                console.log(\`[SettingsPanel] Registered component for tab: \${tabId}\`);
            }
        }
    }

    /**
     * TodoList - ToDo列表UI组件 (简化版本)
     */
    class TodoList {
        constructor(container, taskManager) {
            this.container = container;
            this.taskManager = taskManager;
            this.isInitialized = false;
            
            this.inputField = null;
            this.addButton = null;
            this.taskList = null;
            this.statsDisplay = null;
            this.clearCompletedButton = null;
            
            this.tasks = [];
            this.isLoading = false;
            
            this.initialize();
        }

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
                console.log('[TodoList] Initialized successfully');
                
            } catch (error) {
                console.error('[TodoList] Failed to initialize:', error);
                this.showError('初始化失败，请刷新页面重试');
            }
        }

        createUI() {
            this.container.innerHTML = \`
                <div class="todo-input-section">
                    <div class="input-group">
                        <input 
                            type="text" 
                            id="todo-input" 
                            class="todo-input" 
                            placeholder="输入新任务..." 
                            maxlength="200"
                        />
                        <button 
                            type="button" 
                            id="add-task-btn" 
                            class="add-task-button"
                            title="添加任务 (Enter)"
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
            \`;
            
            this.inputField = this.container.querySelector('#todo-input');
            this.addButton = this.container.querySelector('#add-task-btn');
            this.taskList = this.container.querySelector('#task-list');
            this.statsDisplay = this.container.querySelector('#stats-display');
            this.clearCompletedButton = this.container.querySelector('#clear-completed-btn');
            this.loadingIndicator = this.container.querySelector('#loading-indicator');
            this.emptyState = this.container.querySelector('#empty-state');
            this.inputError = this.container.querySelector('#input-error');
            
            this.totalCount = this.container.querySelector('#total-count');
            this.pendingCount = this.container.querySelector('#pending-count');
            this.completedCount = this.container.querySelector('#completed-count');
        }

        setupEventListeners() {
            this.addButton.addEventListener('click', () => this.addTask());
            
            this.inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.addTask();
                }
            });
            
            this.inputField.addEventListener('input', () => {
                this.validateInput();
                this.updateAddButtonState();
            });
            
            this.clearCompletedButton.addEventListener('click', () => {
                this.clearCompletedTasks();
            });
            
            this.taskList.addEventListener('click', (e) => {
                this.handleTaskListClick(e);
            });
        }

        bindTaskManager() {
            if (!this.taskManager) return;
            
            this.taskManager.addObserver((event, data) => {
                this.handleTaskManagerEvent(event, data);
            });
        }

        handleTaskManagerEvent(event, data) {
            switch (event) {
                case 'taskCreated':
                case 'taskToggled':
                case 'taskDeleted':
                case 'completedTasksCleared':
                    this.loadTasks();
                    break;
            }
        }

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
                console.error('[TodoList] Failed to load tasks:', error);
                this.showError('加载任务失败');
            } finally {
                this.isLoading = false;
                this.showLoading(false);
            }
        }

        async addTask() {
            const title = this.inputField.value.trim();
            
            if (!this.validateTaskTitle(title)) {
                return;
            }
            
            this.setButtonLoading(this.addButton, true);
            this.clearError();
            
            try {
                await this.taskManager.createTask(title);
                this.inputField.value = '';
                this.updateAddButtonState();
                this.inputField.focus();
                
            } catch (error) {
                console.error('[TodoList] Failed to add task:', error);
                this.showError('添加任务失败，请重试');
            } finally {
                this.setButtonLoading(this.addButton, false);
            }
        }

        async toggleTask(taskId) {
            try {
                await this.taskManager.toggleTaskCompletion(taskId);
            } catch (error) {
                console.error('[TodoList] Failed to toggle task:', error);
                this.showError('操作失败，请重试');
            }
        }

        async deleteTask(taskId, taskTitle) {
            const confirmed = confirm(\`确定要删除任务 "\${taskTitle}" 吗？\`);
            if (!confirmed) return;
            
            try {
                await this.taskManager.deleteTask(taskId);
            } catch (error) {
                console.error('[TodoList] Failed to delete task:', error);
                this.showError('删除失败，请重试');
            }
        }

        async clearCompletedTasks() {
            const completedCount = this.tasks.filter(task => task.isCompleted).length;
            if (completedCount === 0) return;
            
            const confirmed = confirm(\`确定要清除 \${completedCount} 个已完成任务吗？\`);
            if (!confirmed) return;
            
            try {
                await this.taskManager.clearCompletedTasks();
            } catch (error) {
                console.error('[TodoList] Failed to clear completed tasks:', error);
                this.showError('清除失败，请重试');
            }
        }

        renderTaskList() {
            if (this.tasks.length === 0) {
                this.taskList.innerHTML = '';
                return;
            }
            
            const taskItems = this.tasks.map(task => this.createTaskElement(task));
            this.taskList.innerHTML = taskItems.join('');
        }

        createTaskElement(task) {
            const completedClass = task.isCompleted ? 'completed' : '';
            const checkedAttr = task.isCompleted ? 'checked' : '';
            const createdDate = new Date(task.createdAt).toLocaleDateString();
            const completedDate = task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '';
            
            return \`
                <li class="task-item \${completedClass}" data-task-id="\${task.id}" role="listitem">
                    <div class="task-content">
                        <label class="task-checkbox-label">
                            <input 
                                type="checkbox" 
                                class="task-checkbox" 
                                \${checkedAttr}
                            />
                            <span class="checkbox-custom"></span>
                        </label>
                        
                        <div class="task-details">
                            <div class="task-title">\${task.title}</div>
                            <div class="task-meta">
                                <span class="task-date">创建于 \${createdDate}</span>
                                \${task.isCompleted ? \`<span class="task-completed-date">完成于 \${completedDate}</span>\` : ''}
                                \${task.pomodoroCount > 0 ? \`<span class="pomodoro-count">🍅 \${task.pomodoroCount}</span>\` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="task-actions">
                        <button 
                            type="button" 
                            class="delete-task-button" 
                            title="删除任务"
                        >
                            🗑️
                        </button>
                    </div>
                </li>
            \`;
        }

        handleTaskListClick(e) {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            const taskId = taskItem.dataset.taskId;
            
            if (e.target.classList.contains('task-checkbox')) {
                this.toggleTask(taskId);
            }
            else if (e.target.classList.contains('delete-task-button')) {
                const taskTitle = taskItem.querySelector('.task-title').textContent;
                this.deleteTask(taskId, taskTitle);
            }
        }

        updateStats() {
            const stats = this.taskManager ? this.taskManager.getStatistics() : {
                total: 0,
                pending: 0,
                completed: 0
            };
            
            this.totalCount.textContent = stats.total;
            this.pendingCount.textContent = stats.pending;
            this.completedCount.textContent = stats.completed;
        }

        updateUI() {
            const hasCompletedTasks = this.tasks.some(task => task.isCompleted);
            const hasTasks = this.tasks.length > 0;
            
            this.clearCompletedButton.classList.toggle('hidden', !hasCompletedTasks);
            this.emptyState.classList.toggle('hidden', hasTasks);
            this.taskList.classList.toggle('hidden', !hasTasks);
            
            this.updateAddButtonState();
        }

        updateAddButtonState() {
            const hasText = this.inputField.value.trim().length > 0;
            this.addButton.disabled = !hasText;
        }

        validateTaskTitle(title) {
            if (!title || title.length === 0) {
                this.showError('请输入任务内容');
                this.inputField.focus();
                return false;
            }
            
            if (title.length > 200) {
                this.showError('任务内容不能超过200个字符');
                this.inputField.focus();
                return false;
            }
            
            return true;
        }

        validateInput() {
            const value = this.inputField.value;
            
            if (value.length > 200) {
                this.showError('任务内容不能超过200个字符');
            } else {
                this.clearError();
            }
        }

        showError(message) {
            this.inputError.textContent = message;
            this.inputError.classList.remove('hidden');
            this.inputField.classList.add('error');
        }

        clearError() {
            this.inputError.classList.add('hidden');
            this.inputField.classList.remove('error');
        }

        showLoading(show) {
            this.loadingIndicator.classList.toggle('hidden', !show);
        }

        setButtonLoading(button, loading) {
            button.disabled = loading;
            button.classList.toggle('loading', loading);
            
            if (loading) {
                button.querySelector('.button-text').textContent = '添加中...';
            } else {
                button.querySelector('.button-text').textContent = '添加';
            }
        }

        getStats() {
            return this.taskManager ? this.taskManager.getStatistics() : null;
        }

        async refresh() {
            await this.loadTasks();
        }
    }

    // ========== 应用程序主类 ==========

    /**
     * 应用程序主类
     */
    class TomatoMonkeyApp {
        constructor() {
            this.isInitialized = false;
            this.modules = {};
        }

        /**
         * 初始化应用程序
         */
        async init() {
            if (this.isInitialized) {
                return;
            }

            try {
                console.log('[TomatoMonkey] Initializing application...');
                
                // 等待DOM加载完成
                if (document.readyState === 'loading') {
                    await new Promise(resolve => {
                        document.addEventListener('DOMContentLoaded', resolve);
                    });
                }

                // 加载样式
                this.loadStyles();
                
                // 动态加载核心模块
                await this.loadModules();
                
                // 初始化设置面板
                this.initializeSettingsPanel();
                
                // 设置键盘快捷键
                this.setupKeyboardShortcuts();

                this.isInitialized = true;
                console.log('[TomatoMonkey] Application initialized successfully');
                
            } catch (error) {
                console.error('[TomatoMonkey] Failed to initialize application:', error);
            }
        }

        /**
         * 加载CSS样式
         */
        loadStyles() {
            const styles = `
                /* TomatoMonkey 基础样式 - 将在 main.css 中完善 */
                .tomato-monkey-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    font-family: "Inter", "Lato", "Helvetica Neue", "Arial", sans-serif;
                }
                
                .tomato-monkey-hidden {
                    display: none !important;
                }
            `;
            
            GM_addStyle(styles);
        }

        /**
         * 动态加载模块
         */
        async loadModules() {
            console.log('[TomatoMonkey] Loading core modules...');
            
            // 由于 Tampermonkey 的限制，我们使用内嵌方式加载模块
            // 在生产环境中，可以通过构建工具将所有模块打包到此文件中
            
            try {
                // 加载 CSS 样式
                await this.loadCSS();
                
                // 初始化核心模块
                await this.initializeCore();
                
                console.log('[TomatoMonkey] All modules loaded successfully');
            } catch (error) {
                console.error('[TomatoMonkey] Failed to load modules:', error);
                throw error;
            }
        }

        /**
         * 加载CSS样式文件
         */
        async loadCSS() {
            const mainCSS = \`${await this.getMainCSS()}\`;
            GM_addStyle(mainCSS);
        }

        /**
         * 获取主CSS样式内容
         */
        async getMainCSS() {
            // 这里直接包含CSS内容，在实际项目中可以通过构建工具处理
            return \`
/* TomatoMonkey 主样式文件 - 完整样式内容已在 src/styles/main.css 中定义 */
.tomato-monkey-panel *,
.tomato-monkey-panel *::before,
.tomato-monkey-panel *::after {
    box-sizing: border-box;
}

.tomato-monkey-panel {
    font-family: "Inter", "Lato", "Helvetica Neue", "Arial", sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #666666;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.tomato-monkey-panel .hidden {
    display: none !important;
}

.tomato-monkey-settings-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    width: 90vw;
    max-width: 800px;
    height: 80vh;
    max-height: 600px;
    background: #FFFFFF;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    overflow: hidden;
}

.tomato-monkey-settings-panel.show {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
}

/* 其他样式内容... */
\`;
        }

        /**
         * 初始化核心模块
         */
        async initializeCore() {
            // 初始化存储管理器
            this.storageManager = new StorageManager();
            
            // 初始化任务管理器
            this.taskManager = new TaskManager();
            await this.taskManager.initialize(this.storageManager);
            
            console.log('[TomatoMonkey] Core modules initialized');
        }

        /**
         * 初始化设置面板
         */
        initializeSettingsPanel() {
            // 创建设置面板触发按钮
            this.createTriggerButton();
            
            // 创建设置面板
            this.settingsPanel = new SettingsPanel();
            
            // 初始化 ToDo 列表组件
            this.initializeTodoList();
        }

        /**
         * 初始化 ToDo 列表组件
         */
        initializeTodoList() {
            // 获取 ToDo 容器
            const todoContainer = document.getElementById('todo-container');
            if (!todoContainer) {
                console.error('[TomatoMonkey] Todo container not found');
                return;
            }
            
            // 创建 ToDo 列表组件
            this.todoList = new TodoList(todoContainer, this.taskManager);
            
            // 注册组件到设置面板
            this.settingsPanel.registerTabComponent('todo', this.todoList);
            
            console.log('[TomatoMonkey] Todo list initialized');
        }

        /**
         * 创建触发设置面板的按钮
         */
        createTriggerButton() {
            const triggerButton = document.createElement('div');
            triggerButton.id = 'tomato-monkey-trigger';
            triggerButton.innerHTML = '🍅';
            triggerButton.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: #D95550;
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 12px rgba(217, 85, 80, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;
            
            triggerButton.addEventListener('mouseenter', () => {
                triggerButton.style.transform = 'scale(1.1)';
                triggerButton.style.boxShadow = '0 6px 16px rgba(217, 85, 80, 0.4)';
            });
            
            triggerButton.addEventListener('mouseleave', () => {
                triggerButton.style.transform = 'scale(1)';
                triggerButton.style.boxShadow = '0 4px 12px rgba(217, 85, 80, 0.3)';
            });
            
            triggerButton.addEventListener('click', () => {
                this.toggleSettingsPanel();
            });

            document.body.appendChild(triggerButton);
        }

        /**
         * 切换设置面板显示状态
         */
        toggleSettingsPanel() {
            if (this.settingsPanel) {
                this.settingsPanel.toggle();
            } else {
                console.log('[TomatoMonkey] Settings panel not initialized yet');
            }
        }

        /**
         * 设置键盘快捷键
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + Shift + T 打开/关闭设置面板
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    this.toggleSettingsPanel();
                }
            });
        }

        /**
         * 获取应用程序实例
         */
        static getInstance() {
            if (!TomatoMonkeyApp.instance) {
                TomatoMonkeyApp.instance = new TomatoMonkeyApp();
            }
            return TomatoMonkeyApp.instance;
        }
    }

    // 启动应用程序
    const app = TomatoMonkeyApp.getInstance();
    app.init();

    // 将应用程序实例暴露到全局作用域以便调试
    window.TomatoMonkeyApp = app;

})();