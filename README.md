# Chrona

Chrona 是一个本地优先的 AI 项目管理工作台，把项目目标、任务优先级、进度视图和智能时间规划放在同一个界面中。

## 功能

- 列表、状态看板、四象限和甘特图四种任务视图
- 拖拽调整任务顺序、流程状态和四象限优先级
- 查看、编辑任务详情与验收标准
- AI 对话规划行程和时间，可确认后自动写入任务
- OpenAI 兼容模型配置
- 多套配色、GitHub 风格暗黑主题、多种字体和四档字号
- 本地 SQLite 数据存储与到期桌面提醒

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。Windows 用户也可以双击 `启动项目管理系统.bat`，脚本会自动安装依赖、构建并启动服务。

## AI 模型

启动后进入“模型设置”，填写 OpenAI 兼容服务的 API 地址、API Key 和模型名称。模型设置保存在本地数据库，不会提交到 Git 仓库。

## 数据与隐私

项目数据默认保存在 `data/project-manager.db`。数据库、环境变量、日志、构建产物和本地备份均已从 Git 排除；备份或迁移前请先关闭 Chrona，再复制 `data` 文件夹。

## 字体

Merriweather 依据 SIL Open Font License 随项目提供。Anthropic Sans 选项使用本机字体资源，相关文件不包含在公开仓库中；缺少字体文件时会自动回退到系统字体。

## 常用命令

```bash
npm run dev     # 开发模式
npm run lint    # TypeScript 检查
npm run build   # 生产构建
npm run start   # 启动生产服务
```
