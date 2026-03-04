# 安全审查报告 - CTICloud AgentSDK Demo
**审查时间**: 2026-02-28 10:35 北京时间  
**审查人**: 卫域 (Security Agent)  
**分支**: feature/fix-pause-unpause  
**提交**: e9b77ba

---

## 执行摘要

| 类别 | 评级 |
|------|------|
| **代码安全** | ⚠️ 中风险 |
| **配置安全** | ⚠️ 中风险 |
| **依赖安全** | ✅ 低风险 |
| **综合评级** | ⚠️ **中风险** |

---

## 发现的问题

### 🔴 高风险问题

#### 1. 硬编码敏感凭证 (HARD-CODED-001)
- **位置**: `app/main.js` 第 21 行
- **问题**: `AUTH_CONFIG.token` 包含硬编码的 API Token
  ```javascript
  token: '0e7a1929ab9d2bd9eb958c8873933123'
  ```
- **风险**: 
  - Token 泄露到版本控制
  - 任何有代码访问权限的人都能看到凭证
  - 难以轮换凭证
- **修复建议**: 
  - 将 token 移至环境变量
  - 使用运行时注入方式
  - 在 CI/CD 中配置密钥管理服务

---

### 🟡 中风险问题

#### 2. 测试配置信息暴露 (CONFIG-001)
- **位置**: `app/env.test.json`
- **问题**: 测试环境配置文件中包含真实的服务端点
  ```json
  {
    "baseURL": "https://agent-gateway-hs-dev.cticloud.cn",
    "tenantId": "6000001",
    "agentNo": "1865",
    ...
  }
  ```
- **风险**: 
  - 内部系统架构信息泄露
  - 可能被用于社会工程攻击
- **修复建议**: 
  - 将测试配置加入 `.gitignore`
  - 使用环境变量或配置管理工具

#### 3. JSONP 跨域请求 (XSS-001)
- **位置**: `app/main.js` 第 45-90 行
- **问题**: 使用 JSONP 方式获取 sessionKey
  ```javascript
  function fetchSessionKey() {
    return new Promise((resolve, reject) => {
      // JSONP 请求
      window[callbackName] = (response) => {
        document.head.removeChild(script);
        delete window[callbackName];
        // ...
      };
    });
  }
  ```
- **风险**: 
  - JSONP 存在 XSS 注入风险
  - 如果 API 被劫持，可能导致恶意代码执行
- **缓解措施**: 
  - 当前代码已使用 HTTPS
  - 建议迁移到 CORS + JSON 方式

---

### ✅ 正面发现

#### 1. 敏感信息掩码处理
- **位置**: `app/main.js` 第 25-42 行
- **优点**: 代码实现了敏感信息脱敏功能
  ```javascript
  const SENSITIVE_KEYS = ['sessionKey', 'token', 'password', 'secret'];
  
  function safeStringify(obj) {
    const clone = JSON.parse(JSON.stringify(obj));
    function mask(o) {
      if (!o || typeof o !== 'object') return;
      for (const k of Object.keys(o)) {
        if (SENSITIVE_KEYS.includes(k)) o[k] = '***';
        else if (typeof o[k] === 'object') mask(o[k]);
      }
    }
    mask(clone);
    return JSON.stringify(clone, null, 2);
  }
  ```

#### 2. .gitignore 配置
- **位置**: `.gitignore`
- **优点**: 正确排除了敏感文件
  ```
  node_modules/
  dist/
  app/env.json
  test-results/
  test-report/
  ```

#### 3. 依赖安全
- **发现**: 项目依赖较少，无已知高危漏洞
- **依赖项**:
  - `@playwright/test`: ^1.40.0
  - `serve`: ^14.2.5

---

## 修复优先级

| 优先级 | 问题 | 建议修复时间 |
|--------|------|-------------|
| P0 | 硬编码 Token | 立即 |
| P1 | 测试配置暴露 | 本次迭代 |
| P2 | JSONP 迁移 | 下次迭代 |

---

## 详细检查结果

### 代码扫描
| 检查项 | 状态 |
|--------|------|
| 硬编码密码/密钥 | ❌ 发现 1 处 |
| SQL 注入 | ✅ 无 |
| XSS 漏洞 | ⚠️ JSONP 风险 |
| 不安全随机数 | ✅ 无 |
| 路径遍历 | ✅ 无 |

### 配置检查
| 检查项 | 状态 |
|--------|------|
| 敏感文件 .gitignore | ⚠️ env.test.json 未排除 |
| 调试模式关闭 | ✅ 已关闭 |
| HTTPS 强制 | ✅ 已使用 |

---

## 建议行动

1. **立即行动**: 从代码中移除硬编码 token，改用环境变量
2. **本次迭代**: 将 `app/env.test.json` 加入 `.gitignore`
3. **后续迭代**: 评估从 JSONP 迁移到 CORS 的可行性

---

*报告生成时间: 2026-02-28 10:35*  
*下次审查建议: 每次代码合并前*
