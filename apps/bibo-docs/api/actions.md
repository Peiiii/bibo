# 完整动作目录

下表从服务端同一动作 owner 生成。实际服务版本以 `bibo actions` 或 `GET /api/v1/actions` 为准。所有动作通过 `POST /api/v1/space` 执行。

<!--@include: ../.generated/actions.md-->

update/delete/move/read/resolve 均需要当前 version；写入动作均可附加 requestId。文件路径与 id 在当前云端空间中是相对 workspace 的路径；目录创建前确保父目录存在。文本内容上限 1 MiB，较大或二进制现有文件的 get 可能返回 preview 元数据，不能把预览当完整内容。
