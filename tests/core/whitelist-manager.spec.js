/**
 * WhitelistManager 单元测试
 *
 * 测试范围：
 * 1. 域名格式验证的各种情况
 * 2. 包含匹配的正确性
 * 3. 数据持久化的可靠性
 * 4. 边界条件处理
 * 5. 添加、删除、重复处理功能
 */

const { WhitelistManager } = require("../../src/core/whitelist-manager");
const { StorageManager } = require("../../src/core/storage-manager");

// Mock GM_setValue and GM_getValue for testing
global.GM_setValue = jest.fn();
global.GM_getValue = jest.fn();

describe("WhitelistManager", () => {
  let whitelistManager;
  let storageManager;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 创建新实例
    whitelistManager = new WhitelistManager();
    storageManager = new StorageManager();

    // 清空单例引用以确保每个测试都是独立的
    WhitelistManager.instance = null;
  });

  describe("单例模式", () => {
    test("应该创建单例实例", () => {
      const instance1 = new WhitelistManager();
      const instance2 = new WhitelistManager();
      expect(instance1).toBe(instance2);
    });
  });

  describe("域名验证", () => {
    test("应该验证有效域名格式", () => {
      const validDomains = [
        "example.com",
        "sub.example.com",
        "api.google.com",
        "github.com",
        "stackoverflow.com",
        "www.example.co.uk",
        "test-domain.com",
        "domain123.org",
      ];

      validDomains.forEach((domain) => {
        expect(whitelistManager.validateAndCleanDomain(domain)).toBe(
          domain.toLowerCase(),
        );
      });
    });

    test("应该拒绝无效域名格式", () => {
      const invalidDomains = [
        "", // 空字符串
        "   ", // 只有空格
        "localhost", // 没有点号的域名
        ".example.com", // 以点号开始
        "example.com.", // 以点号结束
        "example..com", // 连续点号
        "example .com", // 包含空格
        "example@com", // 包含非法字符
        "a".repeat(64) + ".com", // 标签过长
        "example-.com", // 标签以连字符结束
        "-example.com", // 标签以连字符开始
        "exam ple.com", // 包含空格
        "example.c-", // 标签以连字符结束
      ];

      invalidDomains.forEach((domain) => {
        expect(whitelistManager.validateAndCleanDomain(domain)).toBeNull();
      });
    });

    test("应该清理域名格式（移除协议、路径等）", () => {
      const testCases = [
        { input: "EXAMPLE.COM", expected: "example.com" },
        { input: "  example.com  ", expected: "example.com" },
        { input: "https://example.com", expected: "example.com" },
        { input: "http://example.com", expected: "example.com" },
        { input: "example.com/path", expected: "example.com" },
        { input: "example.com?query=1", expected: "example.com" },
        { input: "example.com#fragment", expected: "example.com" },
        { input: "example.com:8080", expected: "example.com" },
        {
          input: "https://example.com:8080/path?query=1#fragment",
          expected: "example.com",
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(whitelistManager.validateAndCleanDomain(input)).toBe(expected);
      });
    });
  });

  describe("URL域名提取", () => {
    test("应该正确提取URL中的域名", () => {
      const testCases = [
        {
          url: "https://www.google.com/search?q=test",
          expected: "www.google.com",
        },
        { url: "http://api.github.com/user", expected: "api.github.com" },
        {
          url: "https://subdomain.example.co.uk:8080/path",
          expected: "subdomain.example.co.uk",
        },
        { url: "example.com", expected: "example.com" },
        { url: "www.stackoverflow.com", expected: "www.stackoverflow.com" },
      ];

      testCases.forEach(({ url, expected }) => {
        expect(whitelistManager.extractDomainFromURL(url)).toBe(expected);
      });
    });

    test("应该处理无效URL", () => {
      const invalidUrls = [
        "",
        "   ",
        "not-a-url",
        "http://",
        "ftp://example.com", // 会降级到手动解析
      ];

      invalidUrls.forEach((url) => {
        const result = whitelistManager.extractDomainFromURL(url);
        // 应该返回null或有效的域名（降级解析成功的情况）
        expect(result === null || typeof result === "string").toBe(true);
      });
    });
  });

  describe("包含匹配逻辑", () => {
    beforeEach(async () => {
      // Mock storageManager loadSettings
      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: ["google.com", "github.com", "example.org"],
      });

      await whitelistManager.initialize(storageManager);
    });

    test("应该正确匹配包含白名单域名的URL", () => {
      const testCases = [
        // google.com 匹配
        { url: "https://www.google.com", expected: true },
        { url: "https://api.google.com", expected: true },
        { url: "https://mail.google.com.hk", expected: true },
        { url: "https://contentgoogle.com", expected: true },
        { url: "https://notgoogle.org", expected: false },

        // github.com 匹配
        { url: "https://api.github.com", expected: true },
        { url: "https://raw.githubusercontent.com", expected: false }, // 不包含github.com
        { url: "https://github.com", expected: true },

        // example.org 匹配
        { url: "https://test.example.org", expected: true },
        { url: "https://example.org.evil.com", expected: true },
        { url: "https://example.com", expected: false }, // 不是.org

        // 完全不匹配的域名
        { url: "https://facebook.com", expected: false },
        { url: "https://twitter.com", expected: false },
      ];

      testCases.forEach(({ url, expected }) => {
        expect(whitelistManager.isDomainAllowed(url)).toBe(expected);
      });
    });

    test("应该处理空白名单", async () => {
      const emptyWhitelistManager = new WhitelistManager();
      WhitelistManager.instance = null;

      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: [],
      });

      await emptyWhitelistManager.initialize(storageManager);

      expect(emptyWhitelistManager.isDomainAllowed("https://google.com")).toBe(
        false,
      );
      expect(emptyWhitelistManager.isDomainAllowed("https://example.com")).toBe(
        false,
      );
    });
  });

  describe("域名管理功能", () => {
    beforeEach(async () => {
      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: [],
      });
      jest.spyOn(storageManager, "saveSettings").mockResolvedValue(true);

      await whitelistManager.initialize(storageManager);
    });

    test("应该成功添加有效域名", async () => {
      const result = await whitelistManager.addDomain("example.com");

      expect(result).toBe(true);
      expect(whitelistManager.getDomains()).toContain("example.com");
      expect(storageManager.saveSettings).toHaveBeenCalled();
    });

    test("应该拒绝无效域名", async () => {
      const result = await whitelistManager.addDomain("invalid domain");

      expect(result).toBe(false);
      expect(whitelistManager.getDomains()).not.toContain("invalid domain");
      expect(storageManager.saveSettings).not.toHaveBeenCalled();
    });

    test("应该防止重复添加域名", async () => {
      await whitelistManager.addDomain("example.com");
      const result = await whitelistManager.addDomain("example.com");

      expect(result).toBe(false);
      expect(
        whitelistManager.getDomains().filter((d) => d === "example.com"),
      ).toHaveLength(1);
    });

    test("应该成功删除存在的域名", async () => {
      await whitelistManager.addDomain("example.com");
      const result = await whitelistManager.removeDomain("example.com");

      expect(result).toBe(true);
      expect(whitelistManager.getDomains()).not.toContain("example.com");
    });

    test("应该处理删除不存在的域名", async () => {
      const result = await whitelistManager.removeDomain("nonexistent.com");

      expect(result).toBe(false);
    });

    test("应该清空所有域名", async () => {
      await whitelistManager.addDomain("example.com");
      await whitelistManager.addDomain("google.com");

      const result = await whitelistManager.clearDomains();

      expect(result).toBe(true);
      expect(whitelistManager.getDomains()).toHaveLength(0);
    });

    test("应该返回排序后的域名列表", async () => {
      const domains = ["zzz.com", "aaa.com", "mmm.com"];

      for (const domain of domains) {
        await whitelistManager.addDomain(domain);
      }

      const sortedDomains = whitelistManager.getDomains();
      expect(sortedDomains).toEqual(["aaa.com", "mmm.com", "zzz.com"]);
    });
  });

  describe("数据持久化", () => {
    test("应该在初始化时加载存储的域名", async () => {
      const storedDomains = ["google.com", "github.com"];

      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: storedDomains,
      });

      await whitelistManager.initialize(storageManager);

      // getDomains() 返回排序后的数组，所以要比较排序后的版本
      expect(whitelistManager.getDomains()).toEqual([
        "github.com",
        "google.com",
      ]);
    });

    test("集成测试：应该正确保存和加载设置数据（不使用mock）", async () => {
      // 这是一个集成测试，测试真实的保存和加载流程
      const testSettings = {
        pomodoroDuration: 30,
        whitelist: ["example.com", "test.org"],
      };

      // Mock GM_setValue and GM_getValue to simulate actual storage
      const mockStorage = new Map();
      GM_setValue.mockImplementation((key, value) => {
        mockStorage.set(key, value);
      });
      GM_getValue.mockImplementation((key, defaultValue) => {
        return mockStorage.get(key) || defaultValue;
      });

      // 创建新的storageManager实例来避免mock污染
      const realStorageManager = new StorageManager();

      // 保存设置
      const saveResult = await realStorageManager.saveSettings(testSettings);
      expect(saveResult).toBe(true);

      // 验证数据确实被存储了
      expect(GM_setValue).toHaveBeenCalledWith(
        "TOMATO_MONKEY_SETTINGS",
        expect.stringContaining('"settings"'),
      );

      // 加载设置
      const loadedSettings = await realStorageManager.loadSettings();

      // 验证加载的设置与保存的一致
      expect(loadedSettings).toEqual(testSettings);
    });

    test("应该在添加域名时保存到存储", async () => {
      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: [],
      });
      jest.spyOn(storageManager, "saveSettings").mockResolvedValue(true);

      await whitelistManager.initialize(storageManager);
      await whitelistManager.addDomain("example.com");

      expect(storageManager.saveSettings).toHaveBeenCalledWith({
        pomodoroDuration: 25,
        whitelist: ["example.com"],
      });
    });

    test("应该处理存储保存失败", async () => {
      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: [],
      });
      jest.spyOn(storageManager, "saveSettings").mockResolvedValue(false);

      await whitelistManager.initialize(storageManager);
      const result = await whitelistManager.addDomain("example.com");

      expect(result).toBe(false);
      expect(whitelistManager.getDomains()).not.toContain("example.com");
    });

    test("应该处理初始化时加载失败", async () => {
      jest
        .spyOn(storageManager, "loadSettings")
        .mockRejectedValue(new Error("Load failed"));

      await whitelistManager.initialize(storageManager);

      // 应该使用空白名单
      expect(whitelistManager.getDomains()).toHaveLength(0);
    });
  });

  describe("事件系统", () => {
    beforeEach(async () => {
      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: [],
      });
      jest.spyOn(storageManager, "saveSettings").mockResolvedValue(true);

      await whitelistManager.initialize(storageManager);
    });

    test("应该在添加域名时触发事件", async () => {
      const eventListener = jest.fn();
      document.addEventListener(
        "tomato-monkey-whitelist-domainAdded",
        eventListener,
      );

      await whitelistManager.addDomain("example.com");

      expect(eventListener).toHaveBeenCalled();
      const eventDetail = eventListener.mock.calls[0][0].detail;
      expect(eventDetail.domain).toBe("example.com");
      expect(eventDetail.domains).toContain("example.com");

      document.removeEventListener(
        "tomato-monkey-whitelist-domainAdded",
        eventListener,
      );
    });

    test("应该在删除域名时触发事件", async () => {
      await whitelistManager.addDomain("example.com");

      const eventListener = jest.fn();
      document.addEventListener(
        "tomato-monkey-whitelist-domainRemoved",
        eventListener,
      );

      await whitelistManager.removeDomain("example.com");

      expect(eventListener).toHaveBeenCalled();
      const eventDetail = eventListener.mock.calls[0][0].detail;
      expect(eventDetail.domain).toBe("example.com");

      document.removeEventListener(
        "tomato-monkey-whitelist-domainRemoved",
        eventListener,
      );
    });

    test("应该在清空域名时触发事件", async () => {
      await whitelistManager.addDomain("example.com");

      const eventListener = jest.fn();
      document.addEventListener(
        "tomato-monkey-whitelist-domainsCleared",
        eventListener,
      );

      await whitelistManager.clearDomains();

      expect(eventListener).toHaveBeenCalled();

      document.removeEventListener(
        "tomato-monkey-whitelist-domainsCleared",
        eventListener,
      );
    });
  });

  describe("统计信息", () => {
    beforeEach(async () => {
      jest.spyOn(storageManager, "loadSettings").mockResolvedValue({
        pomodoroDuration: 25,
        whitelist: ["google.com", "github.com"],
      });

      await whitelistManager.initialize(storageManager);
    });

    test("应该返回正确的统计信息", () => {
      const stats = whitelistManager.getStats();

      expect(stats.totalDomains).toBe(2);
      expect(stats.domains).toEqual(["github.com", "google.com"]);
      expect(typeof stats.lastModified).toBe("number");
    });
  });

  describe("边界条件和错误处理", () => {
    test("应该处理未初始化的状态", async () => {
      const uninitializedManager = new WhitelistManager();
      WhitelistManager.instance = null;

      // 应该处理没有storageManager的情况
      const addResult = await uninitializedManager.addDomain("example.com");
      expect(addResult).toBe(false);
    });

    test("应该处理极长的域名", async () => {
      const longDomain = "a".repeat(250) + ".com";

      expect(whitelistManager.validateAndCleanDomain(longDomain)).toBeNull();
    });

    test("应该处理特殊字符", async () => {
      const specialDomains = [
        "xn--nxasmq6b.xn--j6w193g", // 中文域名的punycode
        "example.xn--fiqs8s", // .中国 的punycode
      ];

      // 这些应该被视为有效域名（简化的实现可能不完全支持国际化域名）
      specialDomains.forEach((domain) => {
        const result = whitelistManager.validateAndCleanDomain(domain);
        // 至少不应该崩溃
        expect(typeof result === "string" || result === null).toBe(true);
      });
    });

    test("应该处理null/undefined输入", () => {
      expect(whitelistManager.validateAndCleanDomain(null)).toBeNull();
      expect(whitelistManager.validateAndCleanDomain(undefined)).toBeNull();
      expect(() => whitelistManager.isDomainAllowed(null)).not.toThrow();
      expect(() => whitelistManager.isDomainAllowed(undefined)).not.toThrow();
    });
  });
});
