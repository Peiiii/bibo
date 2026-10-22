# @nextclaw/bibo-api

Public Bibo space API client. Node 22+ and modern fetch runtimes. No model access is required.

```js
import { BiboApi } from '@nextclaw/bibo-api';
const bibo = new BiboApi({ token: process.env.BIBO_API_TOKEN });
console.log(await bibo.me());
console.log(await bibo.call('task.list', { open: true }));
```

Create a scoped token in Bibo → account menu → 接入与授权. Keep tokens private.
[Documentation](https://docs.bibo.bot/) · [Source](https://github.com/Peiiii/bibo)
