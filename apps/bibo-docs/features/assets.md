# 图片资产

上传图片并在笔记或文档中引用，也可通过 API 下载原始字节。图片归属于当前账户，只有获该账户授权的访问方可以读取。

## 上传与下载

```sh
bibo assets upload ./diagram.png
bibo assets download ASSET_ID --out ./downloaded.png
```

把上传返回的 `result.id` 用作 `ASSET_ID`。上传需要读写权限，下载只需只读权限。下载默认不覆盖已有本地文件，明确 `--force` 才覆盖。

## 用 HTTP 上传

```sh
curl --fail-with-body https://app.bibo.bot/api/v1/assets \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  -H 'Content-Type: application/octet-stream' \
  --data-binary @./diagram.png
```

返回 201 和 `{result:{id,url,webUrl},requestId}`。`url` 是 `/api/v1/assets/:id`，用 Bearer 授权下载；`webUrl` 是供 App 通过登录 cookie 读取的网页资产路径，可直接写入笔记 Markdown：`![图示](返回的webUrl)`。两者都不是匿名公开链接。

```sh
curl --fail-with-body "https://app.bibo.bot/api/v1/assets/$ASSET_ID" \
  -H "Authorization: Bearer $BIBO_API_TOKEN" \
  --output ./downloaded.png
```

## 端点与限制

| 操作 | 端点 | 输入与输出 |
| --- | --- | --- |
| 上传 | `POST /api/v1/assets` | body 是原始图片字节，返回 id/url/webUrl |
| 下载 | `GET /api/v1/assets/:id` | 当前账户的 UUID，返回二进制 |

支持 PNG、JPEG、GIF、WebP、AVIF，按文件签名识别，最大 **10 MiB**。超限 413，格式不支持 415，其他账户或不存在的图片 404。当前不支持列举/删除图片、公开分享以及 PDF/ZIP 等任意二进制上传。文本文件管理见[文件与目录](./files)。
