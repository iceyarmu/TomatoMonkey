# 数据库/存储设计

数据将以 JSON 字符串的形式存储在 Tampermonkey 提供的键值存储中。

- **Key**: `TOMATO_MONKEY_TASKS`
  - **Value**: `string` (序列化后的 `Task[]`)
- **Key**: `TOMATO_MONKEY_SETTINGS`
  - **Value**: `string` (序列化后的 `Settings`)
