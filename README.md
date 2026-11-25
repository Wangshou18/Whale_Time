# 鲸时 · 个人工作助手

一个**完全在本地运行**的个人工作助手：任务、日历、考勤、笔记、每日工作总结与附件都保存在浏览器里，没有账户系统，也没有任何后端请求。

界面以浅色为主、支持深色模式，桌面与移动端自适应。构建产物是纯静态文件，可以直接部署到任意静态服务器，也可以打包成单个 HTML 文件双击打开。

---

## 功能一览

### 仪表盘
- 今日问候与日期、今日待办、今日日程、今日考勤状态
- 提醒栏：今日到期、即将到期（默认 3 天内）、已逾期，按紧急程度排序
- 统计卡片：待办、已完成、逾期、笔记
- 今日总结卡片：当天总结片段，一键跳转去写或完善
- 快捷入口：新建任务、写笔记、去打卡、看日历

### 任务
- 新建 / 编辑 / 删除任务，字段包含标题、Markdown 内容、起始日期、截止日期、优先级、标签、附件
- 未完成进入「待办」，勾选后进入「已办」并记录完成时间，可随时恢复为未完成
- 待办支持按关键词、优先级、标签筛选，按截止日期 / 优先级 / 创建时间 / 标题排序
- 「汇总」页支持按状态、日期范围、标签筛选，展示总数、待办、已完成、逾期统计
- 任务附件可上传、预览、下载、删除；附件以 Blob 存入 IndexedDB

### 日历
- 日 / 周 / 月三种视图，可前后翻页、一键回到今天
- 展示任务的开始与截止节点、关联笔记、考勤打卡/休息标记
- 选中某天后可在侧栏直接新建任务或笔记，并快捷打卡
- 日视图提供完整当天议程

### 考勤
- 按天记录，上午 / 下午 / 全天三种粒度
- 每个粒度可标记「打卡」或「休息」，重复点击可取消
- 支持任意日期范围筛选、统计出勤天数 / 休息天数 / 未记录 / 出勤率
- 支持导出当前范围的 CSV

### 笔记
- Markdown 编辑与预览，支持标签、可选关联日期
- 搜索标题/正文/标签，按标签筛选，按更新时间 / 创建时间 / 标题排序
- 关联日期后，笔记会出现在日历对应日期中

### 工作总结
- 按天记录，一个日期对应一篇总结，段落自由书写（支持 Markdown 语法）
- 左侧月历标注已写的日期，点日期即可切换；当月记录列表按时间倒序排列
- 输入停止 0.9 秒自动保存，切换日期、切换页面也会兜底保存；支持 `Ctrl / ⌘ + Enter` 手动保存
- 提供「今日完成 / 问题与收获 / 明日计划 / 三段式」模板，一键插入
- 头部实时统计：本月已写天数、总字数、连续记录天数
- **按月份导出**：整月记录汇总成一份文档，文件名如 `jing-shi-summary-2026-11.md`
- **按年份导出**：整年记录按月份自动分组，文件名如 `jing-shi-summary-2026.md`
- 导出格式支持 Markdown / 纯文本 / CSV，导出前可在弹窗里预览，也可以直接复制全文
- 支持删除某一天的总结（删除后日历标记同步消失）

### 数据导入导出
- 导出 JSON：任务、笔记、考勤、总结、设置（不含附件，文件轻量）
- 导出 ZIP：JSON + 全部附件原始文件，可完整恢复
- 导出 CSV 表格包：`tasks.csv`、`notes.csv`、`attendance.csv`、`summaries.csv`
- 导入 JSON / ZIP，支持「合并」与「覆盖」两种策略
- 全部在浏览器本地完成，不经过网络

---

## 技术栈

- React 18 + TypeScript
- Vite 6
- IndexedDB（任务、笔记、考勤、总结、附件）
- localStorage（主题、提醒天数等少量配置）
- marked + DOMPurify（Markdown 渲染与 XSS 清理）
- JSZip（含附件备份、CSV 打包）
- 手写 CSS 设计系统，无 UI 框架依赖
- 手写 Service Worker + Web App Manifest（可选 PWA 离线）

---

## 快速开始

要求 Node.js ≥ 18（推荐 20 或 22）。

> 本目录已附带一份构建产物：`dist/`（静态部署版）与 `dist-single/index.html`（单文件版），可以直接使用；修改源码后重新运行构建命令即可覆盖。

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://127.0.0.1:5173）
npm run dev

# 类型检查
npm run typecheck

# 生产构建，输出到 dist/
npm run build

# 本地预览构建结果（固定 http://127.0.0.1:4173）
npm run preview
```

### 重要：始终用同一个地址打开

数据存在浏览器的 IndexedDB 里，浏览器按 **协议 + 域名 + 端口** 隔离存储，所以下面这些地址各自是一份独立的数据，互相看不见：

| 打开方式 | 数据归属 |
| --- | --- |
| `http://127.0.0.1:5173`（`npm run dev`） | 一份 |
| `http://localhost:5173` | 另一份（`localhost` 与 `127.0.0.1` 不同源） |
| `http://127.0.0.1:4173`（`npm run preview`） | 另一份 |
| `file:///.../dist-single/index.html`（双击单文件） | 又一份 |

**建议固定使用 `http://127.0.0.1:5173`**（`vite.config.ts` 已开启 `strictPort`，端口被占用时会直接报错，而不是悄悄换到 5174 让你看到一份空数据）。

如果怀疑数据"丢了"，先打开 `/data-check.html`（例如 <http://127.0.0.1:5173/data-check.html>）：它会显示当前地址下的数据条数，非空时可以一键导出成应用可导入的备份 JSON，再搬到你固定的那个地址。设置页的「本地存储」里也会显示当前访问地址。

---

## 构建与部署

### 方式一：静态服务器（推荐，支持 PWA）

```bash
npm run build
```

将 `dist/` 整个目录上传到任意静态站点即可：

- Nginx / Apache / Caddy
- Vercel / Netlify / Cloudflare Pages / GitHub Pages
- 本地快速预览：`npx serve dist`，或 `python -m http.server 8080 -d dist`

项目使用 Hash 路由（`#/tasks/todo`），**不需要**配置服务端 rewrite；同时 `base` 为相对路径 `./`，部署在子目录下也能正常工作。

Service Worker 与 PWA 安装需要 **HTTPS 或 localhost** 环境，直接双击 HTML 不会启用离线缓存。

### 方式二：单文件版（可直接双击打开）

```bash
npm run build:single
```

产物为 `dist-single/index.html`，JS 与 CSS 已全部内联，可直接双击在 Chrome / Edge 中打开使用，数据同样持久化在浏览器 IndexedDB 中。

> 单文件模式下浏览器不允许注册 Service Worker，因此没有 PWA 离线缓存；部分浏览器（如 Safari）对 `file://` 下的本地数据库限制较多，建议优先使用 Chrome / Edge 或静态服务器方式。

---

## 版本管理

仓库地址：<https://github.com/Wangshou18/Whale_Time>

项目使用 Git 维护版本，`main` 为稳定分支，`package.json` 的 `version` 与 Git tag 保持一致。

```bash
git clone git@github.com:Wangshou18/Whale_Time.git
cd Whale_Time
npm install
npm run dev
```

日常提交流程：

```bash
git pull                      # 先同步远程
git checkout -b feat/xxx      # 功能分支（简单改动可直接在 main 上）
# ... 修改代码 ...
npm run typecheck             # 提交前类型检查
npm run build                 # 确认可构建
git add -A
git commit -m "feat: 说明本次改动"
git push -u origin feat/xxx
```

提交信息约定（参考 Conventional Commits）：

| 前缀 | 含义 |
| --- | --- |
| `feat` | 新增功能 |
| `fix` | 修复缺陷 |
| `style` | 样式或格式调整（不影响逻辑） |
| `refactor` | 重构（不新增功能、不修缺陷） |
| `docs` | 文档变更 |
| `chore` | 依赖、构建配置、杂项 |
| `perf` | 性能优化 |

发版时同步三处版本号，并打 tag：

```bash
# 1. 修改 package.json 的 version
# 2. 更新 README 的版本说明
npm run build && npm run build:single
git add -A && git commit -m "chore: release v1.1.0"
git tag -a v1.1.0 -m "v1.1.0 新增工作总结页面"
git push && git push --tags
```

`node_modules/`、`dist/`、`dist-single/` 已在 `.gitignore` 中忽略，构建产物不进仓库；换行符由 `.gitattributes` 统一为 LF。

---

## 数据存储说明

| 数据 | 位置 | 说明 |
| --- | --- | --- |
| 任务 | IndexedDB `tasks` | 含附件元信息 |
| 笔记 | IndexedDB `notes` | Markdown 原文 |
| 考勤 | IndexedDB `attendance` | 每天可有多条（上午/下午/全天） |
| 总结 | IndexedDB `summaries` | 一天一条，`id` 与日期相同 |
| 附件 | IndexedDB `attachments` | 以 Blob 保存原始文件 |
| 主题 / 提醒天数 | localStorage | 仅少量配置 |

- 数据按**浏览器 + 站点地址**隔离。更换浏览器、切换域名/端口、使用无痕窗口，都会看到不同的数据。
- 清除浏览器站点数据会同时删除全部任务、笔记、考勤、总结与附件。
- 建议定期在「设置 → 导出数据」中做一份完整 ZIP 备份。

### 导入策略

- **合并**：保留现有数据；同 ID 的任务/笔记以 `updatedAt` 较新的版本为准；考勤按「日期 + 时段」覆盖；总结按日期取 `updatedAt` 较新的版本。
- **覆盖**：先清空任务、笔记、考勤、总结与附件，再完整导入备份内容（包括备份中的主题与提醒设置）。

---

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Alt + N` | 新建任务 |
| `Alt + M` | 新建笔记 |
| `Ctrl / ⌘ + Enter` | 在任务/笔记/总结编辑器中保存 |
| `?` | 打开快捷键面板 |
| `Esc` | 关闭最上层弹窗 |

快捷键在输入框、文本域、下拉框中不会误触发。

---

## 目录结构

```text
.
├─ public/                 # 图标、Manifest、Service Worker、data-check.html（数据体检页）
├─ src/
│  ├─ components/          # 布局、弹窗、任务项、编辑器、附件预览等
│  ├─ context/             # 路由、弹窗、确认框、快捷键
│  ├─ db/                  # IndexedDB 封装与仓储方法
│  ├─ pages/               # 仪表盘 / 任务 / 日历 / 考勤 / 笔记 / 总结 / 设置
│  ├─ store/               # 全局数据状态与业务操作
│  ├─ utils/               # 日期、考勤统计、导入导出、Markdown、格式化
│  ├─ types.ts             # 数据模型与常量
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ styles.css           # 设计系统与全部页面样式
├─ index.html
├─ vite.config.ts
└─ README.md
```

---

## 数据模型

```ts
Task {
  id, title, content, startDate, dueDate, priority,
  tags, status, completedAt, attachments, createdAt, updatedAt
}

Note {
  id, title, content, tags, date, createdAt, updatedAt
}

Attendance {
  id, date, period: 'am' | 'pm' | 'full',
  type: 'work' | 'rest', createdAt
}

DailySummary {
  id, date, content, createdAt, updatedAt
}

Attachment {
  id, taskId, name, type, size, blob, createdAt
}

Settings {
  theme: 'light' | 'dark' | 'system',
  reminderDays: number
}
```

---

## 设计说明

- 浅色为默认基调，深色模式与系统偏好自动适配
- 使用低饱和雾蓝灰背景、单一蓝色强调色，颜色只用于传达状态（优先级、逾期、打卡）
- 6 个主页面共用同一套间距、圆角、字号与按钮层级
- 移动端自动切换为底部标签栏，表单、日历与表格均做响应式处理；总结页在窄屏下把编辑器放到月历之前，先写字再看日期
- 空状态、加载状态、错误状态、操作反馈（Toast）均已覆盖

---

## 常见问题

**Q：之前新建的任务和笔记怎么不见了？**
先确认是不是换了打开地址。数据按「协议 + 域名 + 端口」隔离，`localhost:5173`、`127.0.0.1:5173`、`127.0.0.1:4173`、`file://` 分别是四份互不相通的数据。打开 `/data-check.html` 逐一检查这些地址，看到非空就导出备份，回到你要长期使用的地址导入即可。详见上文「始终用同一个地址打开」。

**Q：换电脑/浏览器后数据没了？**
数据只存在原浏览器的 IndexedDB 中。请在旧环境导出 ZIP 备份，在新环境导入。

**Q：附件有大小限制吗？**
单个附件限制 50MB。浏览器整体配额取决于磁盘剩余空间，可在「设置 → 本地存储」查看估算值。

**Q：为什么刷新后还在原页面？**
应用使用 Hash 路由，地址栏中的 `#/calendar` 会保留当前页面，刷新不会丢。

**Q：可以直接用 `file://` 打开吗？**
可以打开 `dist-single/index.html`，Chrome / Edge 支持在本地文件页面使用 IndexedDB；但 PWA、Service Worker 不可用，推荐通过静态服务器访问。

**Q：工作总结怎么导出成周报/月报？**
在「总结」页右上角点「导出」，选择「按月」或「按年」，再选 Markdown / 纯文本 / CSV。Markdown 带标题层级，可以直接贴进周报文档；CSV 适合再做统计。

**Q：总结是自动保存的吗？**
是。停止输入约 1 秒后自动写入本地，切换日期或离开页面时也会补存一次；右上角的按钮可以手动保存，键盘用 `Ctrl / ⌘ + Enter`。

**Q：数据会发到网上吗？**
不会。项目没有任何统计脚本、远程字体或后端接口，所有文件读写都在浏览器内完成。

---

## 隐私

- 无账户、无登录、无云同步
- 无网络请求依赖（构建后的静态资源均为本地文件）
- 导入导出的文件只在本机生成与读取

---

个人自用项目。按需修改与扩展即可。
