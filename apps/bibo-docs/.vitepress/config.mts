import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Bibo 开放空间", description: "笔记、文件、待办、项目与日程：通过 CLI 和 API 管理你的个人空间。", lang: "zh-CN", base: "/",
  cleanUrls: true, lastUpdated: true,
  srcExclude: ["public/**"],
  head: [["meta", { name: "theme-color", content: "#2f6b47" }]],
  themeConfig: {
    siteTitle: "Bibo · 开发者文档",
    nav: [{ text: "指南", link: "/guide/quickstart" }, { text: "功能", link: "/features/" }, { text: "CLI", link: "/cli/reference" }, { text: "API", link: "/api/reference" }, { text: "English", link: "/en/quickstart" }, { text: "打开空间 ↗", link: "https://app.bibo.bot/integrations" }],
    sidebar: [
      { text: "开始接入", items: [{ text: "介绍", link: "/" }, { text: "五分钟接入", link: "/guide/quickstart" }, { text: "授权与安全", link: "/guide/auth" }, { text: "给 AI 安装 Skill", link: "/guide/skill" }] },
      { text: "空间功能", items: [
        { text: "功能总览", link: "/features/" },
        { text: "笔记", link: "/features/notes" },
        { text: "文件与目录", link: "/features/files" },
        { text: "待办与任务", link: "/features/tasks" },
        { text: "项目", link: "/features/projects" },
        { text: "日程", link: "/features/events" },
        { text: "收件箱", link: "/features/inbox" },
        { text: "图片资产", link: "/features/assets" },
        { text: "空间概览", link: "/features/overview" },
      ] },
      { text: "工具与参考", items: [{ text: "CLI 命令", link: "/cli/reference" }, { text: "API 协议", link: "/api/reference" }, { text: "完整动作目录", link: "/api/actions" }, { text: "JavaScript SDK", link: "/guide/sdk" }, { text: "自部署", link: "/guide/self-hosting" }] },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Peiiii/bibo" }],
    sidebarMenuLabel: "目录",
    returnToTopLabel: "返回顶部",
    search: { provider: "local", options: { translations: {
      button: { buttonText: "搜索文档", buttonAriaLabel: "搜索文档" },
      modal: { displayDetails: "显示详情", resetButtonTitle: "清空搜索", backButtonTitle: "返回", noResultsText: "没有找到相关内容", footer: { selectText: "选择", navigateText: "切换", closeText: "关闭" } },
    } } },
    outline: { label: "本页内容", level: [2, 3] },
    docFooter: { prev: "上一页", next: "下一页" },
    footer: { message: "你的空间，由你授权。", copyright: "Bibo · MIT License" },
  },
});
