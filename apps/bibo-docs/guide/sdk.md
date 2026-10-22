# JavaScript SDK

```sh
npm install @nextclaw/bibo-api
```

Node.js 22+ 或支持标准 fetch 的现代运行时。SDK 没有 Node 专用运行依赖，所有导出从包根入口读取。

```ts
import { BiboApi, BiboApiError, type BiboTask } from '@nextclaw/bibo-api';

const bibo = new BiboApi({
  token: process.env.BIBO_API_TOKEN!,
  // endpoint: 'https://your-bibo.example',
  timeoutMs: 30_000,
});

const identity = await bibo.me();
const actions = await bibo.actions();
const tasks = await bibo.call<{items: BiboTask[]; nextCursor: string | null}>(
  'task.list', { open: true, limit: 20 },
);

const task = await bibo.call<BiboTask>('task.create', {
  title: 'Review the plan', requestId: 'review-plan-2026-10-22',
});
await bibo.call('task.update', { id: task.id, version: task.version, status: 'done' });
const confirmed = await bibo.call<BiboTask>('task.get', { id: task.id });
```

`call<T>` 的类型参数用于调用方约束，不替代服务端验证。完整字段查看[在线动作目录](../api/actions)和公开类型声明。

图片：`uploadAsset(Uint8Array)` 返回 `{id,url,webUrl}`；`downloadAsset(id)` 返回字节；`revoke()` 撤销当前令牌。SDK 返回 `result` 本身，CLI 则用 `{result}` 包装。

错误是 `BiboApiError`，含 `status`、`code`、`requestId` 和可选 `retryAfter`。网络失败 status 为 0 / code 为 NETWORK_ERROR。不要自动重试写入；遵循[幂等合同](./auth#重试与幂等)。
