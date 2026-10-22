# 项目

用项目组织一组相关任务，例如一次调研、一次发布或一个长期计划。项目本身保存名称，任务通过 `projectId` 归属到它。

## 建项目并归入任务

```sh
bibo project create --name '开放空间接入'
bibo project list
bibo project get PROJECT_ID
bibo project update PROJECT_ID --name 'Bibo 接入与验证'
bibo task create --title '验证笔记读写' --project-id PROJECT_ID
bibo task list --project-id PROJECT_ID
```

将 `PROJECT_ID` 替换为创建结果中的 `result.id`。读取需要只读权限，创建、改名和删除需要读写权限。

## 用 HTTP 创建项目

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/space \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"action":"project.create","input":{"name":"开放空间接入","requestId":"integration-project-001"}}'
```

`result` 包含 `id/name/createdAt/updatedAt/version`；列表返回 `{items,nextCursor}`。直接 API 改名提交 `project.update` 和 `{id,version,name}`；保留之前读取的 version 来检测并发更新。

## 操作与参数

<!--@include: ../.generated/projects.md-->

## 删除之后

`bibo project delete PROJECT_ID` 删除项目，并将其任务的 `projectId` 设为 null、递增对应任务版本；任务本身保留。当前没有项目成员、项目权限或项目文件夹 API；授权覆盖当前用户空间，不能按项目细分 scope。
