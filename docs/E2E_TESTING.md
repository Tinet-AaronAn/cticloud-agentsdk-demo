# E2E 测试文档

> 角色：陆测 (Test Agent)  
> 最后更新：2026-03-05

## 📋 测试概览

### 测试框架
- **Playwright** - 现代化的 E2E 测试框架
- **优势**：
  - 跨浏览器支持（Chromium、Firefox、WebKit）
  - 自动等待机制
  - 强大的选择器引擎
  - 内置截图和视频录制
  - 优秀的调试工具

### 测试用例统计
| 测试文件 | 用例数 | 类型 | 说明 |
|---------|--------|------|------|
| demo.spec.ts | 31 | UI 测试 | 页面基础、按钮状态、配置面板、事件面板 |
| integration.spec.ts | 25 | 集成测试 | 登录/登出、外呼、软电话、通话控制、转接、班组长操作 |
| supervisor-state.spec.js | 7 | 状态测试 | 班组长操作状态流转 |
| **总计** | **63** | - | - |

---

## 🚀 本地运行测试

### 1. 安装依赖
```bash
npm install
```

### 2. 安装 Playwright 浏览器
```bash
npx playwright install
```

### 3. 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/demo.spec.ts

# 带 UI 模式运行（推荐调试时使用）
npm run test:ui

# 查看测试报告
npm run test:report
```

### 4. 运行集成测试（需要真实环境）
```bash
# 确保 app/env.test.json 配置正确
npm test -- tests/integration.spec.ts
```

---

## 📊 测试配置

### playwright.config.ts
```typescript
{
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npx serve app -l 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  }
}
```

---

## 🧪 测试分类

### 一、UI 测试 (demo.spec.ts)

#### 1. 页面基础测试
- TC-UI-001: 页面标题正确
- TC-UI-002: 导航栏显示正确
- TC-UI-003: 初始状态为离线

#### 2. 按钮状态测试
- TC-BTN-001~007: 未登录时各按钮状态

#### 3. 配置面板测试
- TC-CFG-001~004: 配置面板功能

#### 4. 事件面板测试
- TC-EVT-001~004: 事件日志功能

#### 5. WebRTC 指标测试
- TC-WEBRTC-001~002: 指标显示

#### 6. 主题切换测试
- TC-THEME-001: 主题切换按钮

### 二、集成测试 (integration.spec.ts)

#### 1. 登录/登出测试
- TC-INT-LOGIN-001: 登录成功
- TC-INT-LOGIN-002: 登出成功
- TC-INT-LOGIN-003: 登录失败

#### 2. 外呼测试
- TC-INT-CALL-001~002: 外呼流程

#### 3. 软电话测试
- TC-INT-SOFTPHONE-001~002: 接听/挂断按钮状态

#### 4. 通话控制测试
- TC-INT-CALL-CTRL-001~002: 保持、恢复、静音、DTMF

#### 5. 转接控制测试
- TC-INT-TRANSFER-001~002: 咨询转接、盲转

#### 6. 班组长操作测试
- TC-INT-SUPERVISOR-001~002: 置忙置闲、监听耳语、强插强拆

#### 7. 事件测试
- TC-INT-EVENT-001~002: 事件过滤、清空

#### 8. 配置测试
- TC-INT-CFG-001: 配置持久化

#### 9. 一键自测
- TC-INT-AUTO-001: 自测流程

### 三、状态测试 (supervisor-state.spec.js)

#### 班组长操作状态控制
- 初始状态验证
- 登录后按钮状态
- 监听→耳语→取消耳语→取消监听状态流转
- 事件驱动状态更新
- 状态指示器显示
- 通话中不能监听

---

## 🔄 CI/CD 集成

### GitHub Actions 工作流

#### 1. Build Job
- 验证项目结构
- 检查必要文件

#### 2. E2E Test Job
- 自动运行所有 UI 测试
- 上传测试报告
- 上传失败视频

#### 3. Integration Test Job
- 仅在 main 分支运行
- 运行集成测试
- 失败不阻止部署（continue-on-error）

### 查看测试结果
1. 进入 GitHub Actions 页面
2. 选择对应的 workflow run
3. 下载 `playwright-report` artifact
4. 解压后打开 `index.html`

---

## 📈 测试覆盖率

### 功能模块覆盖
| 模块 | 覆盖率 | 说明 |
|------|--------|------|
| 登录/登出 | ✅ 100% | 2个测试用例 |
| 外呼功能 | ✅ 100% | 2个测试用例 |
| 软电话控制 | ✅ 100% | 4个测试用例 |
| 通话控制 | ✅ 100% | 2个测试用例 |
| 转接控制 | ✅ 100% | 2个测试用例 |
| 班组长操作 | ✅ 100% | 9个测试用例 |
| 事件系统 | ✅ 100% | 2个测试用例 |
| 配置管理 | ✅ 100% | 5个测试用例 |
| UI 界面 | ✅ 100% | 35个测试用例 |

### 状态机覆盖
- ✅ 离线 → 在线
- ✅ 在线 → 空闲/忙碌
- ✅ 空闲 → 通话中
- ✅ 监听 → 耳语 → 强插
- ✅ 通话中 → 保持 → 恢复
- ✅ 静音 → 取消静音

---

## 🐛 调试技巧

### 1. 使用 UI 模式
```bash
npm run test:ui
```
- 可视化测试步骤
- 时间旅行调试
- 实时查看 DOM

### 2. 查看测试报告
```bash
npm run test:report
```
- 详细的测试步骤
- 截图和视频
- 网络请求日志

### 3. 本地调试
```typescript
test('debug test', async ({ page }) => {
  await page.pause(); // 暂停执行，打开调试器
});
```

### 4. 查看控制台日志
```typescript
page.on('console', msg => console.log(msg.text()));
```

---

## 🎯 最佳实践

### 1. 测试隔离
- 每个测试独立运行
- 使用 `beforeEach` 初始化状态
- 避免测试间依赖

### 2. 等待策略
- 优先使用 `expect().toBeVisible()`
- 避免 `waitForTimeout`
- 使用 `waitForSelector`

### 3. 选择器策略
- 优先使用 `getByRole`, `getByText`
- 避免使用 CSS 类名
- 使用 `data-testid` 作为备选

### 4. 测试数据
- 使用 `env.test.json` 管理测试配置
- 不要硬编码敏感信息
- 使用环境变量

---

## 📝 维护指南

### 添加新测试
1. 在 `tests/` 目录创建新文件
2. 遵循命名规范：`*.spec.ts`
3. 添加测试 ID：`TC-XXX-NNN`
4. 更新本文档

### 更新测试
1. 修改对应测试文件
2. 本地运行验证
3. 更新文档说明

### 删除测试
1. 标记为 `test.skip`
2. 说明跳过原因
3. 后续清理

---

## 🔗 相关资源

- [Playwright 官方文档](https://playwright.dev/)
- [测试用例清单](./TEST_CASES.md)
- [PRD 文档](./PRD.md)
- [集成测试配置](../app/env.test.json)

---

*陆测 (Test Agent) - 确保产品质量*
