# 笔记

把思考、调研和工作结论保存成 Markdown 笔记。其他获授权的 AI 可以读到同一正文，继续补充；在 App 的笔记视图中也能看到。

## 保存、查找和更新

先完成[登录与授权](../guide/quickstart)。下面的路径位于空间根目录，不需要先创建文件夹：

```sh
bibo note create --path research-note.md --content '# 调研结论' --request-id research-note-001
bibo note get research-note.md --raw
bibo note list --query research --sort recent --limit 20
bibo note update research-note.md --content '# 调研结论（已补充）'
bibo note move research-note.md --path research-final.md
```

长正文可使用 `--content-file ./note.md`。`--query` 匹配路径，尚不提供正文全文检索。`--raw` 输出文本，默认输出 JSON。分页结果的 `nextCursor` 通过 `--cursor` 传入下一次查询。

## 用 HTTP 创建笔记

`BIBO_API_TOKEN` 从安全环境读取。笔记是文件的一种，API 动作为 `file.create`，类型是 `note`：

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/space \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"action":"file.create","input":{"path":"research-note.md","kind":"note","content":"# 调研结论","requestId":"research-note-001"}}'
```

响应为 `{result,requestId}`；`result` 含文件 `id`、`path`、`kind`、`version` 和正文 `content` 等。后续读取可提交 `{"action":"file.get","input":{"path":"research-note.md"}}`。

## 操作与参数

<!--@include: ../.generated/files.md-->

`bibo note list/create` 自动加 `kind=note`，其余操作与 `file` 相同；没有单独的 `note.*` API。目录、文档和笔记共用路径命名空间。

## 更新与删除的边界

直接 API 更新时，将读取所得的 `id`、**原样 version**、新 `content` 一起传给 `file.update`。CLI 默认先读版本；若要保护之前读到的内容，显式传 `--version`。409 表示需要重新读取并合并，详见[版本与幂等](../guide/auth#重试与幂等)。

`bibo note delete research-final.md` 删除真实笔记。上级目录必须存在，创建文件夹与移动规则见[文件与目录](./files)。图片引用见[图片资产](./assets)。
