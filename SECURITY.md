# 安全策略 (Security Policy)

## 支持的版本

| 版本 | 支持状态 |
| --- | --- |
| `main` (1.0.x) | ✅ 支持 |

## 报告安全问题

本项目是一个纯前端静态单页应用（无后端服务，本地学习进度与速拧记录仅保存在浏览器 `localStorage` 中）。

如果你在本项目中发现了潜在的安全漏洞或供应链风险，**请优先通过保密渠道提交，切勿在公开 Issue 中直接披露未修复漏洞细节**：

1. **首选保密渠道（GitHub Private Vulnerability Reporting）**：请前往 [GitHub Security Advisories · Report a vulnerability](https://github.com/ChingYung717/rubiks-cube-academy/security/advisories/new) 私密提交漏洞报告。
2. **备用联系入口**：若因平权或网络原因无法访问上述私密报告入口，可联系维护者（[@ChingYung717](https://github.com/ChingYung717)）说明需要建立私密沟通渠道，避免公开暴露利用细节。

我们会在确认后第一时间评估、修复并发布更新。

## 部署与安全响应头说明

- **静态托管与 CSP**：本项目通过 `index.html` 的 `<meta http-equiv="Content-Security-Policy">` 限制脚本、对象与资源加载来源（`default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'` 等）。
- **关于 iframe 嵌套（`frame-ancestors`）**：根据 W3C CSP 规范，`frame-ancestors` 指令在 HTML `<meta>` 标签中无效（浏览器会忽略并告警），且本项目为无账号态、无敏感写操作的纯静态教学工具，默认不限制教学内嵌。若在自定义域名或企业内部环境中需要禁止跨站 iframe 嵌套，请在支持自定义 HTTP 响应头的托管层或反向代理（如 Cloudflare、Nginx、Vercel/Netlify Headers）配置 `Content-Security-Policy: frame-ancestors 'none'`（或 `'self'`）及 `X-Frame-Options: DENY`，切勿在 `<meta>` 中添加无效的 `frame-ancestors`。

