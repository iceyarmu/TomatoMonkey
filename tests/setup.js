/**
 * Jest 测试环境设置
 * 为 Node.js 环境提供浏览器 API 模拟
 */

// 存储事件监听器
const eventListeners = new Map();

// 模拟 document 对象和事件系统
const mockDocument = {
  dispatchEvent: jest.fn((event) => {
    // 调用对应的事件监听器
    const listeners = eventListeners.get(event.type) || [];
    listeners.forEach((listener) => listener(event));
    return true;
  }),
  createElement: jest.fn(() => ({
    textContent: "",
    innerHTML: "",
  })),
  addEventListener: jest.fn((type, listener) => {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, []);
    }
    eventListeners.get(type).push(listener);
  }),
  removeEventListener: jest.fn((type, listener) => {
    if (eventListeners.has(type)) {
      const listeners = eventListeners.get(type);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

// 模拟 CustomEvent
global.CustomEvent = jest.fn((type, options) => ({
  type,
  detail: options ? options.detail : {},
  bubbles: options ? options.bubbles : false,
  cancelable: options ? options.cancelable : false,
}));

// 设置 global document
global.document = mockDocument;

// 模拟 window 对象
global.window = {
  document: mockDocument,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// 模拟 Tampermonkey API
global.GM_setValue = jest.fn();
global.GM_getValue = jest.fn();
global.GM_addStyle = jest.fn();

// 模拟 console 方法以避免测试输出过多日志
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// 在每个测试后重置 mocks
afterEach(() => {
  jest.clearAllMocks();
  eventListeners.clear();
});
