/**
 * WhitelistManager - 网站白名单管理器
 *
 * 负责：
 * 1. 管理允许访问的域名白名单
 * 2. 提供域名添加、删除和验证功能
 * 3. 实现包含匹配逻辑（contains matching）
 * 4. 与 StorageManager 集成进行数据持久化
 * 5. 提供域名格式验证和清理功能
 */

/**
 * 网站白名单管理器类（单例模式）
 */
class WhitelistManager {
  constructor() {
    if (WhitelistManager.instance) {
      return WhitelistManager.instance;
    }

    this.domains = new Set(); // 使用 Set 避免重复
    this.storageManager = null; // 延迟初始化

    WhitelistManager.instance = this;
  }

  /**
   * 初始化白名单管理器
   * @param {StorageManager} storageManager - 存储管理器实例
   */
  async initialize(storageManager) {
    this.storageManager = storageManager;

    try {
      // 从存储加载白名单数据
      const settings = await this.storageManager.loadSettings();
      if (settings && Array.isArray(settings.whitelist)) {
        this.domains = new Set(settings.whitelist);
        console.log(
          `[WhitelistManager] Loaded ${this.domains.size} domains from storage`,
        );
      }
    } catch (error) {
      console.error("[WhitelistManager] Failed to initialize:", error);
    }
  }

  /**
   * 添加域名到白名单
   * @param {string} domain - 要添加的域名
   * @returns {boolean} 添加是否成功
   */
  async addDomain(domain) {
    try {
      // 验证域名格式
      const cleanDomain = this.validateAndCleanDomain(domain);
      if (!cleanDomain) {
        console.warn("[WhitelistManager] Invalid domain format:", domain);
        return false;
      }

      // 检查是否已存在
      if (this.domains.has(cleanDomain)) {
        console.warn("[WhitelistManager] Domain already exists:", cleanDomain);
        return false;
      }

      // 添加到内存
      this.domains.add(cleanDomain);

      // 持久化到存储
      const success = await this.saveToStorage();
      if (success) {
        console.log("[WhitelistManager] Domain added:", cleanDomain);
        this.dispatchChangeEvent("domainAdded", { domain: cleanDomain });
        return true;
      } else {
        // 如果保存失败，从内存中移除
        this.domains.delete(cleanDomain);
        return false;
      }
    } catch (error) {
      console.error("[WhitelistManager] Failed to add domain:", error);
      return false;
    }
  }

  /**
   * 从白名单移除域名
   * @param {string} domain - 要移除的域名
   * @returns {boolean} 移除是否成功
   */
  async removeDomain(domain) {
    try {
      const cleanDomain = this.validateAndCleanDomain(domain);
      if (!cleanDomain || !this.domains.has(cleanDomain)) {
        console.warn("[WhitelistManager] Domain not found:", domain);
        return false;
      }

      // 从内存移除
      this.domains.delete(cleanDomain);

      // 持久化到存储
      const success = await this.saveToStorage();
      if (success) {
        console.log("[WhitelistManager] Domain removed:", cleanDomain);
        this.dispatchChangeEvent("domainRemoved", { domain: cleanDomain });
        return true;
      } else {
        // 如果保存失败，重新添加到内存
        this.domains.add(cleanDomain);
        return false;
      }
    } catch (error) {
      console.error("[WhitelistManager] Failed to remove domain:", error);
      return false;
    }
  }

  /**
   * 检查URL对应的域名是否在白名单中
   * @param {string} url - 要检查的URL
   * @returns {boolean} 域名是否被允许
   */
  isDomainAllowed(url) {
    try {
      const domain = this.extractDomainFromURL(url);
      if (!domain) {
        return false;
      }

      // 使用包含匹配逻辑
      for (const whitelistDomain of this.domains) {
        if (domain.includes(whitelistDomain)) {
          console.log(
            `[WhitelistManager] Domain allowed: ${domain} (matched: ${whitelistDomain})`,
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("[WhitelistManager] Failed to check domain:", error);
      return false;
    }
  }

  /**
   * 获取所有白名单域名
   * @returns {Array<string>} 域名数组
   */
  getDomains() {
    return Array.from(this.domains).sort();
  }

  /**
   * 清空所有白名单域名
   * @returns {boolean} 清空是否成功
   */
  async clearDomains() {
    try {
      this.domains.clear();
      const success = await this.saveToStorage();

      if (success) {
        console.log("[WhitelistManager] All domains cleared");
        this.dispatchChangeEvent("domainsCleared");
        return true;
      }

      return false;
    } catch (error) {
      console.error("[WhitelistManager] Failed to clear domains:", error);
      return false;
    }
  }

  /**
   * 验证并清理域名格式
   * @param {string} domain - 原始域名
   * @returns {string|null} 清理后的域名，无效时返回null
   */
  validateAndCleanDomain(domain) {
    if (typeof domain !== "string") {
      return null;
    }

    // 清理空白字符和转换为小写
    const cleaned = domain.trim().toLowerCase();

    if (cleaned === "") {
      return null;
    }

    // 移除协议前缀
    const withoutProtocol = cleaned.replace(/^https?:\/\//, "");

    // 移除路径、查询参数和片段
    const domainOnly = withoutProtocol
      .split("/")[0]
      .split("?")[0]
      .split("#")[0];

    // 移除端口号
    const withoutPort = domainOnly.split(":")[0];

    // 基础域名格式验证
    if (!this.isValidDomainFormat(withoutPort)) {
      return null;
    }

    return withoutPort;
  }

  /**
   * 检查域名格式是否有效
   * @param {string} domain - 域名
   * @returns {boolean} 格式是否有效
   */
  isValidDomainFormat(domain) {
    // 空字符串检查
    if (!domain || domain.length === 0) {
      return false;
    }

    // 长度检查
    if (domain.length > 253) {
      return false;
    }

    // 基础字符检查：只允许字母、数字、点号和连字符
    const domainRegex = /^[a-z0-9.-]+$/;
    if (!domainRegex.test(domain)) {
      return false;
    }

    // 检查是否以点号开始或结束
    if (domain.startsWith(".") || domain.endsWith(".")) {
      return false;
    }

    // 检查是否包含连续的点号
    if (domain.includes("..")) {
      return false;
    }

    // 检查各部分长度（每个标签不能超过63个字符）
    const labels = domain.split(".");
    for (const label of labels) {
      if (label.length === 0 || label.length > 63) {
        return false;
      }

      // 标签不能以连字符开始或结束
      if (label.startsWith("-") || label.endsWith("-")) {
        return false;
      }

      // 检查标签是否只包含连字符（无效）
      if (label === "-") {
        return false;
      }
    }

    // 至少要有一个点号（排除纯localhost等）
    if (!domain.includes(".")) {
      return false;
    }

    return true;
  }

  /**
   * 从URL提取域名
   * @param {string} url - URL字符串
   * @returns {string|null} 域名，提取失败返回null
   */
  extractDomainFromURL(url) {
    try {
      // 如果不是完整URL，假设是域名
      if (!url.includes("://")) {
        return this.validateAndCleanDomain(url);
      }

      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch (error) {
      // URL构造失败，尝试手动解析
      const cleaned = url.replace(/^https?:\/\//, "");
      const domain = cleaned.split("/")[0].split("?")[0].split("#")[0];
      return this.validateAndCleanDomain(domain);
    }
  }

  /**
   * 保存白名单数据到存储
   * @returns {boolean} 保存是否成功
   * @private
   */
  async saveToStorage() {
    if (!this.storageManager) {
      console.error("[WhitelistManager] StorageManager not initialized");
      return false;
    }

    try {
      // 获取当前设置
      const settings = await this.storageManager.loadSettings();

      // 更新白名单
      settings.whitelist = Array.from(this.domains);

      // 保存设置
      return await this.storageManager.saveSettings(settings);
    } catch (error) {
      console.error("[WhitelistManager] Failed to save to storage:", error);
      return false;
    }
  }

  /**
   * 触发白名单变更事件
   * @param {string} eventType - 事件类型
   * @param {Object} detail - 事件详情
   * @private
   */
  dispatchChangeEvent(eventType, detail = {}) {
    // 检查是否在浏览器环境中
    if (
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      typeof CustomEvent !== "undefined"
    ) {
      try {
        const event = new CustomEvent(`tomato-monkey-whitelist-${eventType}`, {
          detail: {
            ...detail,
            domains: this.getDomains(),
            timestamp: Date.now(),
          },
          bubbles: false,
          cancelable: false,
        });

        document.dispatchEvent(event);
      } catch (error) {
        console.warn("[WhitelistManager] Failed to dispatch event:", error);
      }
    }
  }

  /**
   * 获取白名单统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalDomains: this.domains.size,
      domains: this.getDomains(),
      lastModified: Date.now(),
    };
  }
}

// 创建单例实例
const whitelistManager = new WhitelistManager();

// 如果在浏览器环境中，将其添加到全局对象
if (typeof window !== "undefined") {
  window.WhitelistManager = WhitelistManager;
  window.whitelistManager = whitelistManager;
}

// 导出模块 (支持 CommonJS 和 ES6 模块)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WhitelistManager, whitelistManager };
} else if (typeof exports !== "undefined") {
  exports.WhitelistManager = WhitelistManager;
  exports.whitelistManager = whitelistManager;
}
