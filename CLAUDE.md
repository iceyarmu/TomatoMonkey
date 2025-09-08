# CLAUDE.md - TomatoMonkey 开发指南

专为 Claude 助手准备的 TomatoMonkey 项目开发文档，确保构建配置完整性和开发流程一致性。

## 📋 项目概览

TomatoMonkey 是专注时间管理工具，结合番茄钟技术与任务管理，使用 Tampermonkey 用户脚本实现。

**核心架构**:
- **构建系统**: Node.js 脚本将模块化源码打包成单一用户脚本
- **模块化设计**: Core 模块 + UI 组件 + 样式系统
- **单例模式**: 所有管理器类使用单例模式确保全局一致性

## 🔧 构建系统架构 (build/build.js)

### 关键构建规则

**⚠️ 重要提醒**: 每次添加新模块必须同步更新构建配置的 3 个位置：

1. **文件读取阶段** (line 100+)
2. **内容提取阶段** (line 107+) 
3. **输出模板阶段** (line 141+)

### 构建流程详解

```javascript
// 1. 文件读取阶段 - 必须为每个新模块添加
const newManager = readFile(path.join(SRC_DIR, 'core', 'new-manager.js'));

// 2. 内容提取阶段 - 必须为每个新模块添加
const newManagerContent = extractModuleContent(newManager, 'NewManager');

// 3. 输出模板阶段 - 必须在正确位置插入
/**
 * NewManager - 新管理器描述
 */
${newManagerContent}
```

### 模块加载顺序 (依赖关系)

**严格按照此顺序添加到构建脚本**:

```
1. StorageManager      (最基础，被所有其他管理器依赖)
2. WhitelistManager    (依赖 StorageManager)
3. TaskManager         (依赖 StorageManager) 
4. SettingsPanel       (依赖所有管理器)
5. TodoList            (依赖 TaskManager)
6. TomatoMonkeyApp     (应用程序主类，最后加载)
```

## 📁 文件结构要求

### 目录规范

```
src/
├── core/                     # 核心业务逻辑模块
│   ├── storage-manager.js    # 数据持久化管理器
│   ├── whitelist-manager.js  # 网站白名单管理器  
│   ├── task-manager.js       # 任务管理器
│   └── [new-manager.js]      # 新管理器放此目录
├── components/               # UI 组件模块
│   ├── settings-panel.js     # 设置面板组件
│   ├── todo-list.js         # ToDo列表组件
│   └── [new-component.js]    # 新组件放此目录
├── styles/                   # 样式文件
│   └── main.css             # 主样式文件
└── utils/                    # 工具函数 (如需要)
```

### 模块文件规范

**每个模块文件必须包含**:

```javascript
/**
 * ModuleName - 模块描述
 * 
 * 负责：
 * 1. 功能描述1
 * 2. 功能描述2
 * 3. 功能描述3
 */

class ModuleName {
    constructor() {
        // 单例模式实现
        if (ModuleName.instance) {
            return ModuleName.instance;
        }
        ModuleName.instance = this;
    }
    
    // 类方法...
}

// 创建单例实例
const moduleName = new ModuleName();

// 全局对象暴露
if (typeof window !== "undefined") {
    window.ModuleName = ModuleName;
    window.moduleName = moduleName;
}

// 模块导出 (支持 CommonJS 和 ES6)
if (typeof module !== "undefined" && module.exports) {
    module.exports = { ModuleName, moduleName };
} else if (typeof exports !== "undefined") {
    exports.ModuleName = ModuleName;
    exports.moduleName = moduleName;
}
```

## ➕ 新模块添加检查清单

### 添加新的 Core 模块 (例: SecurityManager)

**步骤1: 创建模块文件**
- [ ] 在 `src/core/` 创建 `security-manager.js`
- [ ] 实现单例模式
- [ ] 添加全局对象暴露
- [ ] 添加模块导出

**步骤2: 更新构建配置 (build/build.js)**
- [ ] 添加文件读取: `const securityManager = readFile(...)`
- [ ] 添加内容提取: `const securityManagerContent = extractModuleContent(...)`
- [ ] 在正确依赖位置添加到输出模板

**步骤3: 验证构建**
- [ ] 运行 `npm run build`
- [ ] 检查生成的 userscript 包含新模块
- [ ] 验证全局对象创建: `grep "window.securityManager"`
- [ ] 运行测试确保无语法错误

### 添加新的 UI 组件 (例: NotificationPanel)

**步骤1-3**: 与 Core 模块相同

**步骤4: 集成到设置面板**
- [ ] 在 SettingsPanel 中注册组件
- [ ] 添加标签页或界面入口
- [ ] 更新 TomatoMonkeyApp 初始化逻辑

## 🎯 构建验证检查清单

### 必须验证项目

```bash
# 1. 构建成功验证
npm run build
# ✅ 应显示: "✅ Build successful!"

# 2. 语法检查
node -c tomatomonkey.user.js  
# ✅ 应无输出 (无语法错误)

# 3. 模块包含验证
grep -n "class YourNewClass" tomatomonkey.user.js
# ✅ 应找到类定义

# 4. 全局对象验证  
grep -n "window.yourNewManager" tomatomonkey.user.js
# ✅ 应找到全局对象创建

# 5. 测试验证
npm test
# ✅ 所有测试应通过

# 6. 文件大小检查
ls -lh tomatomonkey.user.js
# ✅ 文件大小应合理增长
```

## ⚠️ 常见构建陷阱

### 陷阱1: 忘记添加到构建配置
**症状**: 模块文件存在但构建输出不包含
**解决**: 检查 build.js 的 3 个位置是否都已添加

### 陷阱2: 模块依赖顺序错误  
**症状**: 运行时出现 "undefined is not a constructor" 错误
**解决**: 确保依赖模块在输出模板中的正确顺序

### 陷阱3: 全局对象未创建
**症状**: SettingsPanel 初始化失败，提示管理器不存在
**解决**: 检查模块文件末尾的全局对象暴露代码

### 陷阱4: 模块导出格式不一致
**症状**: 测试环境中模块导入失败
**解决**: 确保使用标准的模块导出模板

## 🧪 测试策略

### 单元测试要求

每个新模块都必须创建对应测试文件:

```
tests/
├── core/
│   ├── storage-manager.spec.js
│   ├── whitelist-manager.spec.js
│   ├── task-manager.spec.js
│   └── [new-manager.spec.js]     # 新模块测试
└── setup.js                      # 测试环境配置
```

### 测试覆盖范围要求

- [ ] **构造函数测试**: 单例模式验证
- [ ] **核心方法测试**: 主要功能验证  
- [ ] **错误处理测试**: 异常情况处理
- [ ] **存储集成测试**: 如适用
- [ ] **事件系统测试**: 如适用

## 📊 构建性能监控

### 文件大小基准

| 版本 | 文件大小 | 新增模块 |
|------|----------|----------|
| v1.0 | ~95KB   | StorageManager, TaskManager, SettingsPanel, TodoList, WhitelistManager |

**性能指标**:
- 构建时间: < 2秒
- 文件大小: < 150KB (推荐)
- 模块数量: < 10个 (合理范围)

## 🔍 调试指南

### 构建失败排查

1. **检查文件路径**: 确保所有路径正确
2. **验证模块语法**: 使用 `node -c filename.js`
3. **检查依赖顺序**: 确认模块加载顺序
4. **查看构建日志**: 分析具体错误信息

### 运行时问题排查

1. **全局对象检查**: 在浏览器控制台检查 `window.yourManager`
2. **模块初始化**: 检查 SettingsPanel 初始化日志
3. **依赖验证**: 确认所有依赖模块已正确加载

## 📝 开发工作流

### 添加新功能的完整流程

1. **规划设计**
   - [ ] 确定功能归属 (Core 模块 vs UI 组件)
   - [ ] 设计依赖关系
   - [ ] 确定数据模型

2. **实现开发**
   - [ ] 创建模块文件 (使用标准模板)
   - [ ] 实现核心功能
   - [ ] 添加错误处理

3. **构建集成** 
   - [ ] 更新 build.js (3个位置)
   - [ ] 验证构建成功
   - [ ] 检查输出质量

4. **测试验证**
   - [ ] 编写单元测试
   - [ ] 运行完整测试套件
   - [ ] 手工功能验证

5. **文档更新**
   - [ ] 更新 README (如需要)
   - [ ] 更新架构文档 (如需要)
   - [ ] 更新此 CLAUDE.md (如有架构变更)

## 🚨 紧急修复指南

### WhitelistManager 缺失问题 (已修复)

此问题的修复模式可应用于所有类似情况:

```javascript
// build/build.js 修复模式
const newManager = readFile(path.join(SRC_DIR, 'core', 'new-manager.js'));
const newManagerContent = extractModuleContent(newManager, 'NewManager');

// 在输出模板正确位置添加
/**
 * NewManager - 描述
 */
${newManagerContent}
```

### 快速验证修复

```bash
npm run build && grep -c "class NewManager" tomatomonkey.user.js
# 输出应该是 "1"，表示找到类定义
```

---

## 📚 参考资源

- **构建脚本**: `build/build.js`
- **项目结构**: `src/` 目录
- **测试配置**: `package.json` Jest 配置
- **输出文件**: `tomatomonkey.user.js`

**重要提醒**: 每次修改构建系统时，请更新此文档以保持同步性。

---

*此文档最后更新: 2025-09-08*  
*版本: v1.2 (WhitelistManager 集成后)*