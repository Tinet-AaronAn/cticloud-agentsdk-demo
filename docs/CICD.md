# CI/CD 集成文档

> 最后更新：2026-03-05

## 📋 概述

项目使用 **GitHub Actions** 实现自动化 CI/CD，包含以下功能：

- ✅ 自动运行 E2E 测试
- ✅ 代码结构验证
- ✅ 测试报告自动生成
- ✅ PR 自动评论测试结果
- ✅ 自动部署到 GitHub Pages
- ✅ 手动触发测试（可选浏览器）

---

## 🚀 Workflows

### 1. CI/CD Pipeline (ci.yml)

**触发条件**：
- Push 到 `main` 分支
- Pull Request 到 `main` 分支

**流程图**：
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Lint      │ ──> │  E2E Test   │ ──> │ PR Comment  │
│  (代码检查)  │     │  (UI 测试)   │     │ (PR 评论)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           │ (main branch only)
                           ↓
                    ┌─────────────┐     ┌─────────────┐
                    │ Integration │ ──> │   Deploy    │
                    │    Test     │     │   (Pages)   │
                    └─────────────┘     └─────────────┘
```

**Jobs 说明**：

| Job | 说明 | 触发条件 |
|-----|------|---------|
| lint | 代码检查、项目结构验证 | 总是 |
| e2e-test | E2E UI 测试 | 总是 |
| integration-test | 集成测试（真实环境） | 仅 main 分支 |
| pr-comment | PR 评论测试结果 | PR 事件 |
| deploy | 部署到 GitHub Pages | main 分支 push |

**特性**：
- ✅ 并发控制（同一分支只运行一个 workflow）
- ✅ 失败时自动上传视频
- ✅ 测试报告保留 30 天
- ✅ 失败视频保留 7 天

---

### 2. 手动测试 (test.yml)

**触发方式**：
- GitHub Actions 页面手动触发

**可配置选项**：
- **测试类型**：
  - `all` - 所有测试
  - `ui` - 仅 UI 测试
  - `integration` - 仅集成测试
  - `supervisor-state` - 仅班组长状态测试
- **浏览器**：
  - `chromium` (默认)
  - `firefox`
  - `webkit`
- **调试模式**：
  - `true` - 开启 Playwright 调试日志
  - `false` - 正常模式

**使用场景**：
- 🔍 调试特定测试用例
- 🌐 跨浏览器测试
- 🧪 单独运行集成测试
- 📊 生成特定测试报告

---

## 📊 测试报告

### 查看测试报告

#### 方式 1: GitHub Actions Artifacts
1. 进入 GitHub Actions 页面
2. 选择对应的 workflow run
3. 下载 `playwright-report` artifact
4. 解压后打开 `index.html`

#### 方式 2: PR 评论
- 自动在 PR 中添加测试结果评论
- 显示测试状态和下载链接

#### 方式 3: Workflow Summary
- 在 workflow run 页面查看摘要
- 包含测试结果和部署信息

### 测试报告内容

| 内容 | 说明 |
|------|------|
| 测试步骤 | 每个测试用例的详细步骤 |
| 截图 | 失败时自动截图 |
| 视频 | 失败时录制视频 |
| 网络请求 | HTTP 请求日志 |
| 控制台日志 | 浏览器控制台输出 |

---

## 🔧 配置说明

### 环境变量

```yaml
CI: true                    # CI 环境标识
DEBUG: pw:api               # Playwright 调试模式（可选）
```

### 缓存策略

- ✅ `npm` 依赖缓存（基于 package-lock.json）
- ✅ Playwright 浏览器缓存

### 并发控制

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**效果**：
- 同一分支只运行一个 workflow
- 新的 commit 会取消旧的 workflow

---

## 📈 最佳实践

### 1. PR 流程

```
1. 创建功能分支
2. 开发 + 本地测试
3. 提交 PR
4. 自动运行 E2E 测试
5. 查看测试结果评论
6. 修复问题（如有）
7. 合并到 main
```

### 2. 本地测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- tests/demo.spec.ts

# 带 UI 模式运行
npm run test:ui

# 查看测试报告
npm run test:report
```

### 3. 调试失败的测试

**方法 1: 下载测试视频**
1. 进入失败的 workflow run
2. 下载 `playwright-videos` artifact
3. 查看失败时的视频

**方法 2: 手动触发测试**
1. 进入 Actions → 手动测试 workflow
2. 选择 `debug: true`
3. 查看详细日志

**方法 3: 本地复现**
```bash
# 安装依赖
npm ci

# 运行失败的测试
npm test -- tests/xxx.spec.ts --ui
```

---

## 🔐 权限说明

### GitHub Pages 部署

```yaml
permissions:
  pages: write
  id-token: write
```

### PR 评论

```yaml
permissions:
  issues: write        # 创建/更新评论
  pull-requests: write # PR 操作
```

---

## 🚨 故障排查

### 问题 1: 测试超时

**原因**：
- 网络问题
- 服务器响应慢

**解决方案**：
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000,  // 增加超时时间
});
```

### 问题 2: 浏览器安装失败

**原因**：
- 依赖缺失

**解决方案**：
```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

### 问题 3: 集成测试失败

**原因**：
- 真实环境配置问题
- 网络连接问题

**处理**：
- ✅ 集成测试使用 `continue-on-error: true`
- ✅ 不阻止部署流程
- ✅ 生成报告供人工审查

---

## 📦 Artifacts

| Artifact | 内容 | 保留时间 | 触发条件 |
|----------|------|---------|---------|
| playwright-report | HTML 测试报告 | 30 天 | 总是 |
| playwright-videos | 失败视频 | 7 天 | 失败时 |
| playwright-traces | 测试追踪 | 7 天 | 手动测试 |

---

## 🎯 未来优化

### 短期优化
- [ ] 添加测试覆盖率报告
- [ ] 添加性能测试
- [ ] 添加视觉回归测试

### 中期优化
- [ ] Slack/钉钉通知
- [ ] 测试结果趋势分析
- [ ] 自动生成测试报告网站

### 长期优化
- [ ] 并行测试（分片）
- [ ] 多浏览器矩阵测试
- [ ] 性能基准测试

---

## 🔗 相关链接

- [GitHub Actions Workflow](./.github/workflows/ci.yml)
- [手动测试 Workflow](./.github/workflows/test.yml)
- [E2E 测试文档](./E2E_TESTING.md)
- [测试用例清单](./TEST_CASES.md)

---

*陆测 (Test Agent) - 自动化质量保障*
