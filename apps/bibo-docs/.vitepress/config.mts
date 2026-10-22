import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Bibo 开放空间", description: "让每个获授权的 AI 共享你的个人上下文与资产。", lang: "zh-CN", base: "/docs/",
  cleanUrls: true, lastUpdated: true,
  head: [["meta", { name: "theme-color", content: "#2f6b47" }]],
  themeConfig: {
    siteTitle: "Bibo · 开发者文档",
    nav: [{ text: "快速开始", link: "/guide/quickstart" }, { text: "API", link: "/api/reference" }, { text: "English", link: "/en/quickstart" }, { text: "打开空间 ↗", link: "https://app.bibo.bot/integrations" }],
    sidebar: [
      { text: "开始接入", items: [{ text: "介绍", link: "/" }, { text: "五分钟接入", link: "/guide/quickstart" }, { text: "授权与安全", link: "/guide/auth" }, { text: "给 AI 安装 Skill", link: "/guide/skill" }] },
      { text: "使用与参考", items: [{ text: "CLI 命令", link: "/cli/reference" }, { text: "API 协议", link: "/api/reference" }, { text: "完整动作目录", link: "/api/actions" }, { text: "JavaScript SDK", link: "/guide/sdk" }, { text: "自部署", link: "/guide/self-hosting" }] },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Peiiii/bibo" }],
    search: { provider: "local" },
    outline: { label: "本页内容", level: [2, 3] },
    docFooter: { prev: "上一页", next: "下一页" },
    footer: { message: "你的空间，由你授权。", copyright: "Bibo · MIT License" },
  },
});
