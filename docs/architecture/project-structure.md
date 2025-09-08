# 项目结构

```plaintext
tomatomonkey-script/
├── src/
│   ├── components/       # UI组件（如设置面板、专注页面）
│   │   ├── settings-panel.js
│   │   └── focus-page.js
│   ├── core/             # 核心逻辑模块
│   │   ├── task-manager.js
│   │   ├── timer-manager.js
│   │   ├── whitelist-manager.js
│   │   ├── blocker-manager.js
│   │   ├── stats-manager.js
│   │   └── storage-manager.js
│   ├── utils/            # 通用工具函数 (如ID生成器)
│   └── styles/           # CSS样式文件
│       └── main.css
├── tests/                # Jest单元测试
│   └── core/
│       └── task-manager.spec.js
├── tomatomonkey.user.js  # Tampermonkey脚本主入口文件
└── package.json          # 项目依赖与脚本
```
