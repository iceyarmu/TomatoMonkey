/**
 * BlockerManager 单元测试
 *
 * 测试范围：
 * 1. 单例模式实现
 * 2. 初始化和依赖注入
 * 3. URL拦截逻辑和白名单集成
 * 4. 计时器事件处理和状态管理
 * 5. FocusPage集成和显示控制
 * 6. 跨标签页状态同步
 * 7. 缓存机制和性能优化
 * 8. 边界条件和错误处理
 */

const { BlockerManager } = require("../../src/core/blocker-manager");
const { TimerManager } = require("../../src/core/timer-manager");
const { WhitelistManager } = require("../../src/core/whitelist-manager");
const { StorageManager } = require("../../src/core/storage-manager");

// Mock GM functions
global.GM_setValue = jest.fn();
global.GM_getValue = jest.fn();
global.GM_addValueChangeListener = jest.fn();

// Mock DOM and window objects
global.window = {
  location: { href: 'https://example.com', hostname: 'example.com' },
  addEventListener: jest.fn(),
  Date: global.Date
};
global.document = {
  addEventListener: jest.fn(),
  body: { style: {} }
};

describe("BlockerManager", () => {
  let blockerManager;
  let timerManager;
  let whitelistManager;
  let focusPage;
  let storageManager;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 清空单例引用以确保每个测试都是独立的
    BlockerManager.instance = null;
    TimerManager.instance = null;
    WhitelistManager.instance = null;

    // 创建mock对象
    storageManager = new StorageManager();
    timerManager = new TimerManager();
    whitelistManager = new WhitelistManager();
    
    // Mock FocusPage
    focusPage = {
      show: jest.fn(),
      hide: jest.fn(),
      isPageVisible: jest.fn().mockReturnValue(false),
      container: {
        setAttribute: jest.fn(),
        querySelector: jest.fn().mockReturnValue({ 
          textContent: '', 
          className: '',
          classList: {
            add: jest.fn(),
            remove: jest.fn()
          }
        }),
        querySelectorAll: jest.fn().mockReturnValue([{
          classList: { add: jest.fn(), remove: jest.fn() }
        }])
      },
      statusElement: { textContent: '', className: '' }
    };

    // 创建BlockerManager实例
    blockerManager = new BlockerManager();
  });

  describe("单例模式", () => {
    test("应该创建单例实例", () => {
      const instance1 = new BlockerManager();
      const instance2 = new BlockerManager();
      expect(instance1).toBe(instance2);
    });

    test("getInstance 应该返回相同实例", () => {
      const instance1 = BlockerManager.getInstance();
      const instance2 = BlockerManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("初始化", () => {
    test("应该正确初始化所有依赖", async () => {
      expect(blockerManager.initialized).toBe(false);
      
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
      
      expect(blockerManager.initialized).toBe(true);
      expect(blockerManager.timerManager).toBe(timerManager);
      expect(blockerManager.whitelistManager).toBe(whitelistManager);
      expect(blockerManager.focusPage).toBe(focusPage);
      expect(blockerManager.storageManager).toBe(storageManager);
    });

    test("重复初始化应该被忽略", async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
      const firstInitState = blockerManager.initialized;
      
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
      
      expect(blockerManager.initialized).toBe(firstInitState);
    });
  });

  describe("URL拦截逻辑", () => {
    beforeEach(async () => {
      // Mock白名单管理器行为
      whitelistManager.isDomainAllowed = jest.fn();
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("应该正确识别需要拦截的URL", async () => {
      blockerManager.isActive = true;
      whitelistManager.isDomainAllowed.mockReturnValue(false);

      const shouldBlock = await blockerManager.shouldBlockUrl('https://blocked-site.com');
      expect(shouldBlock).toBe(true);
    });

    test("应该正确识别白名单中的URL", async () => {
      blockerManager.isActive = true;
      whitelistManager.isDomainAllowed.mockReturnValue(true);

      const shouldBlock = await blockerManager.shouldBlockUrl('https://allowed-site.com');
      expect(shouldBlock).toBe(false);
    });

    test("拦截器未激活时不应该拦截任何URL", async () => {
      blockerManager.isActive = false;
      whitelistManager.isDomainAllowed.mockReturnValue(false);

      const shouldBlock = await blockerManager.shouldBlockUrl('https://any-site.com');
      expect(shouldBlock).toBe(false);
    });

    test("应该豁免特殊协议的URL", async () => {
      blockerManager.isActive = true;
      // 即使白名单管理器返回false，豁免URL也应该不被拦截
      whitelistManager.isDomainAllowed = jest.fn().mockReturnValue(false);
      
      const exemptUrls = [
        'about:blank',
        'chrome://settings/',
        'chrome-extension://abc123/',
        'file:///path/to/file',
        'data:text/html,<html></html>',
        'http://localhost:3000',
        'http://127.0.0.1:8080'
      ];

      for (const url of exemptUrls) {
        const shouldBlock = await blockerManager.shouldBlockUrl(url);
        expect(shouldBlock).toBe(false);
        if (shouldBlock) {
          console.log(`Failing URL: ${url}`);
        }
      }
    });

    test("应该正确识别localhost URLs", async () => {
      blockerManager.isActive = true;
      whitelistManager.isDomainAllowed = jest.fn().mockReturnValue(false);
      
      expect(await blockerManager.shouldBlockUrl('http://localhost:3000')).toBe(false);
      expect(await blockerManager.shouldBlockUrl('http://127.0.0.1:8080')).toBe(false);
      expect(await blockerManager.shouldBlockUrl('https://localhost')).toBe(false);
    });
  });

  describe("计时器事件处理", () => {
    beforeEach(async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("计时器开始时应该激活拦截器", () => {
      blockerManager.handleTimerEvent('timerStarted', { taskId: '1', taskTitle: 'Test Task' });
      
      expect(blockerManager.isActive).toBe(true);
    });

    test("计时器停止时应该停用拦截器", () => {
      blockerManager.isActive = true;
      blockerManager.handleTimerEvent('timerStopped', {});
      
      expect(blockerManager.isActive).toBe(false);
    });

    test("计时器完成时应该停用拦截器", () => {
      blockerManager.isActive = true;
      blockerManager.handleTimerEvent('timerCompleted', {});
      
      expect(blockerManager.isActive).toBe(false);
    });
  });

  describe("页面拦截控制", () => {
    beforeEach(async () => {
      whitelistManager.isDomainAllowed = jest.fn();
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("激活拦截器时应该检查当前页面", async () => {
      whitelistManager.isDomainAllowed.mockReturnValue(false);
      
      await blockerManager.activateBlocking();
      
      expect(blockerManager.isActive).toBe(true);
      expect(whitelistManager.isDomainAllowed).toHaveBeenCalled();
    });

    test("新会话激活时应该清除临时跳过域名", async () => {
      blockerManager.temporarySkipDomains = new Set(['example.com']);
      
      await blockerManager.activateBlocking(true);
      
      expect(blockerManager.temporarySkipDomains.size).toBe(0);
    });

    test("非新会话激活时应该保持临时跳过域名", async () => {
      blockerManager.temporarySkipDomains = new Set(['example.com']);
      
      await blockerManager.activateBlocking(false);
      
      expect(blockerManager.temporarySkipDomains.has('example.com')).toBe(true);
    });

    test("应该拦截非白名单页面", () => {
      blockerManager.isActive = true;
      
      blockerManager.blockCurrentPage();
      
      expect(blockerManager.isCurrentPageBlocked).toBe(true);
      expect(focusPage.show).toHaveBeenCalled();
    });

    test("应该解除页面拦截", () => {
      blockerManager.isCurrentPageBlocked = true;
      focusPage.isPageVisible.mockReturnValue(true);
      
      blockerManager.unblockCurrentPage();
      
      expect(blockerManager.isCurrentPageBlocked).toBe(false);
      expect(focusPage.hide).toHaveBeenCalled();
    });
  });

  describe("拦截上下文设置", () => {
    beforeEach(async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("应该设置拦截模式的上下文", () => {
      blockerManager.setupBlockingContext();
      
      expect(focusPage.container.setAttribute).toHaveBeenCalledWith('data-blocking-mode', 'true');
    });

    test("应该调整拦截模式下的按钮显示", () => {
      const mockTimerButtons = [
        { classList: { add: jest.fn() } },
        { classList: { add: jest.fn() } }
      ];
      const mockCompleteBtn = { classList: { add: jest.fn(), remove: jest.fn() } };
      const mockCancelBtn = { classList: { add: jest.fn(), remove: jest.fn() } };
      const mockSkipBtn = { classList: { add: jest.fn(), remove: jest.fn() } };
      const mockEndFocusBtn = { classList: { add: jest.fn(), remove: jest.fn() } };
      
      focusPage.container.querySelectorAll = jest.fn().mockReturnValue(mockTimerButtons);
      focusPage.container.querySelector = jest.fn()
        .mockReturnValueOnce(mockCompleteBtn)
        .mockReturnValueOnce(mockCancelBtn)
        .mockReturnValueOnce(mockSkipBtn)
        .mockReturnValueOnce(mockEndFocusBtn);
      
      blockerManager.adjustButtonsForBlockingMode();
      
      mockTimerButtons.forEach(btn => {
        expect(btn.classList.add).toHaveBeenCalledWith('hidden');
      });
      expect(mockCompleteBtn.classList.add).toHaveBeenCalledWith('hidden');
      expect(mockCancelBtn.classList.add).toHaveBeenCalledWith('hidden');
      expect(mockSkipBtn.classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockEndFocusBtn.classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe("缓存机制", () => {
    beforeEach(async () => {
      whitelistManager.isDomainAllowed = jest.fn();
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("应该缓存URL匹配结果", async () => {
      blockerManager.isActive = true;
      whitelistManager.isDomainAllowed.mockReturnValue(false);
      
      const url = 'https://test.com';
      await blockerManager.shouldBlockUrl(url);
      await blockerManager.shouldBlockUrl(url); // 第二次调用
      
      expect(whitelistManager.isDomainAllowed).toHaveBeenCalledTimes(1);
    });

    test("clearCache 应该清空缓存", async () => {
      blockerManager.isActive = true;
      whitelistManager.isDomainAllowed.mockReturnValue(false);
      
      const url = 'https://test.com';
      await blockerManager.shouldBlockUrl(url);
      
      blockerManager.clearCache();
      
      await blockerManager.shouldBlockUrl(url);
      expect(whitelistManager.isDomainAllowed).toHaveBeenCalledTimes(2);
    });
  });

  describe("白名单快捷操作", () => {
    beforeEach(async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
      whitelistManager.addDomain = jest.fn();
    });

    test("应该能添加当前域名到白名单", async () => {
      whitelistManager.addDomain.mockResolvedValue(true);
      
      const result = await blockerManager.addCurrentDomainToWhitelist();
      
      expect(result).toBe(true);
      expect(whitelistManager.addDomain).toHaveBeenCalledWith('example.com');
    });

    test("添加失败时应该返回false", async () => {
      whitelistManager.addDomain.mockResolvedValue(false);
      
      const result = await blockerManager.addCurrentDomainToWhitelist();
      
      expect(result).toBe(false);
    });

    test("没有白名单管理器时应该返回false", async () => {
      blockerManager.whitelistManager = null;
      
      const result = await blockerManager.addCurrentDomainToWhitelist();
      
      expect(result).toBe(false);
    });
  });

  describe("状态管理", () => {
    beforeEach(async () => {
      storageManager.setData = jest.fn();
      storageManager.getData = jest.fn();
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("应该保存拦截器状态", () => {
      blockerManager.isActive = true;
      
      blockerManager.saveBlockerState();
      
      expect(storageManager.setData).toHaveBeenCalledWith(
        'blockerState',
        expect.objectContaining({
          isActive: true,
          timestamp: expect.any(Number)
        })
      );
    });

    test("应该恢复拦截器状态", async () => {
      const savedState = {
        isActive: true,
        timestamp: Date.now()
      };
      storageManager.getData.mockReturnValue(savedState);
      
      await blockerManager.restoreBlockerState();
      
      expect(blockerManager.isActive).toBe(true);
    });

    test("getBlockerState 应该返回当前状态", () => {
      blockerManager.isActive = true;
      blockerManager.isCurrentPageBlocked = true;
      
      const state = blockerManager.getBlockerState();
      
      expect(state).toEqual({
        isActive: true,
        isCurrentPageBlocked: true,
        currentUrl: 'https://example.com',
        initialized: true,
        cacheSize: expect.any(Number)
      });
    });
  });

  describe("错误处理", () => {
    beforeEach(async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("WhitelistManager异常时shouldBlockUrl应该返回false", async () => {
      blockerManager.isActive = true;
      whitelistManager.isDomainAllowed = jest.fn().mockImplementation(() => {
        throw new Error('WhitelistManager error');
      });
      
      const shouldBlock = await blockerManager.shouldBlockUrl('https://error.com');
      
      expect(shouldBlock).toBe(false);
    });

    test("存储异常时状态恢复应该优雅处理", async () => {
      storageManager.getData = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      await expect(blockerManager.restoreBlockerState()).resolves.toBeUndefined();
    });
  });

  describe("跨标签页同步", () => {
    beforeEach(async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("应该处理远程计时器状态变化 - 运行中", async () => {
      const newState = JSON.stringify({ status: 'running' });
      whitelistManager.isDomainAllowed = jest.fn().mockReturnValue(false);
      
      await blockerManager.handleRemoteTimerStateChange(newState);
      
      expect(blockerManager.isActive).toBe(true);
    });

    test("应该处理远程计时器状态变化 - 停止", async () => {
      blockerManager.isActive = true;
      const newState = JSON.stringify({ status: 'idle' });
      
      await blockerManager.handleRemoteTimerStateChange(newState);
      
      expect(blockerManager.isActive).toBe(false);
    });

    test("应该处理窗口获得焦点事件", async () => {
      timerManager.getTimerState = jest.fn().mockReturnValue({ status: 'running' });
      blockerManager.isActive = false;
      
      await blockerManager.handleWindowFocus();
      
      expect(blockerManager.isActive).toBe(true);
    });
  });

  describe("清理和销毁", () => {
    beforeEach(async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
    });

    test("destroy 应该清理所有资源", () => {
      blockerManager.isActive = true;
      timerManager.removeObserver = jest.fn();
      
      blockerManager.destroy();
      
      expect(timerManager.removeObserver).toHaveBeenCalled();
      expect(blockerManager.isActive).toBe(false);
      expect(blockerManager.timerManager).toBeNull();
      expect(blockerManager.whitelistManager).toBeNull();
      expect(blockerManager.focusPage).toBeNull();
      expect(blockerManager.storageManager).toBeNull();
    });
  });

  describe("跳过拦截功能", () => {
    beforeEach(async () => {
      await blockerManager.initialize(timerManager, whitelistManager, focusPage, storageManager);
      focusPage.hide = jest.fn();
      focusPage.isPageVisible = jest.fn().mockReturnValue(true);
      blockerManager.isActive = true;
      blockerManager.isCurrentPageBlocked = true;
    });

    test("应该处理跳过拦截请求", () => {
      const testUrl = "https://example.com/test";
      
      blockerManager.handleSkipBlocking(testUrl);
      
      expect(blockerManager.temporarySkipDomains).toContain("example.com");
      expect(focusPage.hide).toHaveBeenCalled();
      expect(blockerManager.isCurrentPageBlocked).toBe(false);
    });

    test("应该使用当前页面URL如果没有提供URL", () => {
      // 模拟当前页面
      const originalWindow = global.window;
      global.window = {
        ...originalWindow,
        location: { href: 'https://test.com', hostname: 'test.com' }
      };
      
      blockerManager.handleSkipBlocking();
      
      expect(blockerManager.temporarySkipDomains).toContain("test.com");
      
      // 恢复原始window对象
      global.window = originalWindow;
    });

    test("未拦截的页面不应该被跳过", () => {
      blockerManager.isCurrentPageBlocked = false;
      console.warn = jest.fn();
      
      blockerManager.handleSkipBlocking();
      
      expect(console.warn).toHaveBeenCalledWith("[BlockerManager] Current page is not blocked, skip ignored");
      expect(focusPage.hide).not.toHaveBeenCalled();
    });

    test("临时跳过的域名不应该被拦截", async () => {
      // 设置临时跳过域名
      blockerManager.temporarySkipDomains = new Set(["example.com"]);
      blockerManager.isActive = true;
      whitelistManager.isDomainAllowed = jest.fn().mockReturnValue(false);
      
      const shouldBlock = await blockerManager.shouldBlockUrl("https://example.com/page");
      
      expect(shouldBlock).toBe(false);
    });

    test("激活拦截时应该清除临时跳过域名", async () => {
      blockerManager.temporarySkipDomains = new Set(["example.com"]);
      
      await blockerManager.activateBlocking(true); // 新会话才会清除临时跳过域名
      
      expect(blockerManager.temporarySkipDomains.size).toBe(0);
    });

    test("停用拦截时应该清除临时跳过域名", () => {
      blockerManager.temporarySkipDomains = new Set(["example.com"]);
      
      blockerManager.deactivateBlocking();
      
      expect(blockerManager.temporarySkipDomains.size).toBe(0);
    });

    test("应该处理无效的URL", () => {
      console.warn = jest.fn();
      
      blockerManager.handleSkipBlocking("invalid-url");
      
      expect(console.warn).toHaveBeenCalledWith("[BlockerManager] Invalid URL for skip blocking:", "invalid-url");
      expect(blockerManager.temporarySkipDomains).toContain("example.com"); // 回退到当前域名 (global.window.location.hostname)
    });
  });
});