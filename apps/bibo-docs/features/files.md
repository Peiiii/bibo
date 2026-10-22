# 文件与目录

组织空间中的笔记、文档和文本产物。所有文件共用一棵目录树；移动目录会一起移动后代，网页和其他 Agent 读取的新路径也随之改变。

## 建目录并保存文件

```sh
bibo file create --path research --kind folder
bibo file create --path research/report.md --kind document --content '# 研究报告'
bibo file list --parent-path research
bibo file get research/report.md --raw
bibo file update research/report.md --content-file ./report.md
bibo file move research/report.md --path research/final.md
```

`kind` 支持 `folder`、`note`、`document`、`artifact`；CLI `file create` 默认 `document`。本地文件不会自动同步，`--content-file` 只读取该次输入的 UTF-8 文本。

## 浏览与检索

```sh
bibo file list --parent-path ''         # 根目录直接子项
bibo file list --query report           # 全空间按路径搜索
bibo file list --kind artifact --limit 50
```

`parentPath` 是目录浏览模式，只能配合分页，不能混用 `kind/query/ancestorOf/sort`。省略 `parentPath` 时才是全空间筛选。路径相对空间根目录，上级目录须先存在。

## 用 HTTP 保存文档

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/space \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"action":"file.create","input":{"path":"report.md","kind":"document","content":"# 研究报告","requestId":"report-001"}}'
```

创建/读取返回 `{result,requestId}`，`result` 包含文件身份、路径、类型、版本和可读内容；列表返回 `{result:{items,nextCursor},requestId}`。API 读取可以用 `id` 或 `path`，修改/移动/删除需要 `id` 和当前 `version`。CLI 会解析文件路径并读取版本。

## 操作与参数

<!--@include: ../.generated/files.md-->

## 移动、删除与内容限制

- 目标父目录必须存在；不能移动到自己的子目录，也不能覆盖已有路径。
- `bibo file delete research` 会删除目录及所有后代，当前没有回收站 API。
- 文档接口管理文本，不能用它上传 PDF、ZIP 等任意二进制文件。图片使用[图片资产](./assets)专用端点。
- 同名创建返回 409；正文保存受 [API 请求上限](../guide/auth)限制。直接 API 请保留 version 的原类型。
