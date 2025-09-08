# 数据模型

```typescript
// Task.ts
interface Task {
  id: string; // 使用UUID或时间戳生成
  title: string;
  isCompleted: boolean;
  createdAt: number; // 时间戳
  completedAt?: number; // 完成时的时间戳
  pomodoroCount: number; // 完成此任务所用的番茄数
}

// Settings.ts
interface Settings {
  pomodoroDuration: number; // 单位：分钟
  whitelist: string[];
}
```
