# 使用 Codex 继续修改 EchoLoom

项目已经为 Codex 准备好，不需要重新解释产品背景。

## 1. 打开项目

在终端进入项目根目录：

```bash
cd EchoLoom_Interactive_Demo
```

启动 Codex：

```bash
codex
```

Codex 启动时会自动读取根目录的 `AGENTS.md`，其中包含产品原则、视觉要求、代码结构、测试命令和禁止事项。

## 2. 先让 Codex 熟悉项目

第一条消息可以直接使用：

```text
阅读 AGENTS.md、README_ZH.md、docs/PRODUCT_BRIEF.md、docs/RESEARCH_BASIS.md 和 docs/ARCHITECTURE.md。不要修改文件。总结当前产品流程、代码结构、设计约束，以及你认为下一步最值得测试的三个产品假设。
```

## 3. 使用项目 Skill

仓库包含：

```text
.codex/skills/echoloom-prototype/SKILL.md
```

在 Codex CLI 或 IDE 中可以输入：

```text
$echoloom-prototype
```

然后描述任务，例如：

```text
$echoloom-prototype 增加第二位官方角色，但不要复制 Aren 的冲突结构。先提出角色概念和用户测试目标，得到确认后再实现。
```

## 4. 推荐工作方式

对于小修改，直接描述目标并要求运行测试：

```text
把主页的角色主动事件改成一张语音消息卡。保持当前明亮配色、长期时间线和无情感绑架原则。完成后运行 npm test，并告诉我如何手动验证。
```

对于多文件任务，要求先写执行计划：

```text
这是一个多步骤任务。先按照 PLANS.md 创建计划，不要立即改代码。计划必须包含状态迁移、移动端验证、桌面验证和导出文件兼容性。
```

完成后可以要求：

```text
/review
```

重点检查回归、未转义的用户输入、本地数据兼容性、移动端布局和产品原则偏离。

## 5. 本地运行与验证

```bash
npm start
npm test
```

项目没有第三方依赖。除非任务确实需要并且你明确批准，不要让 Codex自行添加框架或依赖。

## 6. 常用文件

- 改页面和交互：`app/app.js`
- 改文案、默认数据和场景列表：`app/data.js`
- 改角色模拟回复：`app/story-engine.js`
- 改本地保存和导出：`app/storage.js`
- 改颜色、布局和动画：`app/styles.css`
- 改场景插画：`assets/backgrounds/*.svg`
- 改人物：`assets/character/*.svg`

## 7. 安全提醒

未来接入真实模型时，不要把 API Key 写进浏览器 JavaScript。应先设计本地或远程服务端代理，并保留当前离线模式作为无需账号的演示路径。
