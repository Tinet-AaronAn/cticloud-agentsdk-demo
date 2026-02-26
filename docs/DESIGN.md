# 技术设计 — cticloud-agentsdk-demo
角色：Architect Agent「梁构」

## 目标与范围
- 演示坐席前端工具条如何集成 CTICloud AgentSDK，覆盖登录→事件订阅→预览外呼→软电话→登出完整闭环。
- 明确状态机、事件序列与关键 EventType 映射，以及网络重连策略。
- 说明配置文件 env.json 的注入方式与 UMD/ESM 两种 SDK集成兼容策略。

## 架构概览
- 前端单页：app/index.html + app/main.ts + app/sdk.ts
- AgentSDK 集成：setup → login → on/once → operations（previewObCall/sipLink/sipUnlink/logout）
- 事件日志：统一订阅 EventType，打印到面板（app/main.ts → subscribeEvents）

## 配置与注入（env.json）
- 位置：app/env.json（示例：app/env.example.json）
- 加载：main.ts 通过 `fetch('./env.json')` 异步加载；未找到时提示并参考示例值。
- 字段：
  - baseURL：后端网关地址
  - tenantId：租户 ID
  - agentNo：坐席工号
  - sessionKey：会话签名/令牌
  - bindEndpoint：{ endpointType, endpoint }，其中 endpointType=3 表示软电话（WebRTC）
  - customerNumber：预览外呼目标号码
  - initialStatus：登录后初始化坐席状态（默认 1）
- 使用：
  - setup：传入 baseURL、debug、webrtc（依据 bindEndpoint.endpointType===3）、webrtcStats 等
  - login：传入 tenantId/agentNo/sessionKey/bindEndpoint/initialStatus
  - previewObCall：传入 customerNumber 及超时配置

示例（摘自 API.md）：
{
  "baseURL": "https://api.example.com",
  "tenantId": "t1",
  "agentNo": "0001",
  "sessionKey": "sk_xxx",
  "bindEndpoint": { "endpointType": 3, "endpoint": "softphone_account" },
  "customerNumber": "13800138000"
}

## SDK 集成兼容（UMD / ESM）

### UMD 模式（推荐）

通过 `<script>` 标签引入 UMD 包：
```html
<script src="https://agent-gateway-hs-dev.cticloud.cn/js/AgentJsSDK/agent-sdk.umd.js"></script>
```

**UMD 导出结构**：
```javascript
window.AgentSDK = {
  AgentSDK: Object,        // 命名导出（主对象）
  default: Object,         // 默认导出（同 AgentSDK）
  EventType: Object,       // 事件类型枚举
  ErrorCodes: Object,      // 错误码枚举
  AgentSdkError: Function, // 错误类
  PROTOCOL_VERSION: String,// 协议版本
  SDK_BUILD_TIME: String   // 构建时间
}
```

**获取 SDK 对象**：
```javascript
// app/sdk.js
window.getAgentSDK = async function() {
  // 等待 SDK 加载
  if (window.AgentSDK) {
    // 优先使用 AgentSDK 属性，其次使用 default 属性
    const sdk = window.AgentSDK.AgentSDK || window.AgentSDK.default;
    if (sdk) return sdk;
  }
  // 等待加载（带超时）
  // ...
};
```

### ESM 模式（兜底）

通过 npm 安装：
```bash
npm install @cc/agent-sdk
```

**导入方式**：
```javascript
import { AgentSDK } from '@cc/agent-sdk';
// 或
import AgentSDK from '@cc/agent-sdk';
```

### 使用建议

- **UMD（推荐）**：在 index.html 中先行引入 AgentSDK UMD 脚本，再加载 main.js
- **ESM（兜底）**：在项目中安装 `@cc/agent-sdk`，并确保构建工具支持动态导入

### 错误处理

若两者均不可用，sdk.js 会抛出错误提示：
```
AgentSDK 未找到。请确保 agent-sdk.umd.js 已正确加载。
```

## 状态机设计
顶层运行状态（前端视角）：
- Uninitialized：未加载 env，未 setup
- Ready (Configured)：已加载 env，完成 setup
- LoggingIn：进行 login 调用
- LoggedIn：登录成功，事件已订阅
- PreviewCalling：发起预览外呼流程中
- Ringing：坐席/客户响铃阶段（含软电话来电）
- Bridged/Talking：已接通（Bridge）并通话中
- CallEnded：通话结束（Result）
- SoftphoneLinked：软电话（WebRTC/SIP）已接通
- SoftphoneUnlinked：软电话挂断/未接通
- Reconnecting：网络/通道重连中
- LoggingOut：调用 logout 进行资源释放
- LoggedOut：已登出且完成清理

主要状态迁移：
- Uninitialized → loadEnv → Ready
- Ready → setupAndLogin → LoggingIn → LoggedIn
- LoggedIn → previewObCall → PreviewCalling → Ringing → Bridged/Talking → CallEnded
- LoggedIn ↔ SoftphoneLinked/SoftphoneUnlinked（通过 sipLink/sipUnlink）
- 任意状态 → 网络异常 → Reconnecting → 恢复后返回先前工作状态（优先保证会话与事件订阅）
- LoggedIn/CallEnded → logout → LoggingOut → LoggedOut

## 事件序列（登录→事件订阅→预览外呼→软电话→登出）
- 登录：
  1) loadEnv → setup(baseURL,webrtc,...) → login(tenantId,agentNo,sessionKey,...)
  2) 订阅事件：AGENT_STATUS、PREVIEW_OBCALL_*、RINGING、RECONNECT_ATTEMPT、TRANSCRIPT、WEBRTC_STATS
  3) 登录返回成功（code===0），进入 LoggedIn
- 预览外呼：
  1) 调用 previewObCall({ customerNumber, ... }) → PreviewCalling
  2) 事件流：
     - PREVIEW_OBCALL_START：外呼流程启动
     - PREVIEW_OBCALL_RINGING：坐席或客户侧响铃（可能伴随 RINGING）
     - PREVIEW_OBCALL_BRIDGE：双方接通，进入 Bridged/Talking
     - TRANSCRIPT（可选）：语音转写流事件（通话期间）
     - WEBRTC_STATS（可选）：WebRTC 网络质量统计（通话期间）
     - PREVIEW_OBCALL_RESULT：通话结束，返回结果（成功/失败/挂断原因）→ CallEnded
- 软电话：
  1) sipLink：拉起软电话媒体链路（若 bindEndpoint.endpointType===3）→ SoftphoneLinked
  2) sipUnlink：释放媒体链路 → SoftphoneUnlinked
  3) 在 PreviewCalling/Ringing/Bridged 阶段，软电话联动会触发 RINGING/BRIDGE/RESULT 等事件
- 登出：
  1) logout({ logoutMode, unbindEndpoint }) → LoggingOut
  2) 成功则停止媒体、取消订阅（off）、释放资源 → LoggedOut

## 关键事件与 EventType 映射
- AGENT_STATUS：坐席状态变化（示例：签入/示忙/示闲/置忙原因等）；进入/维持 LoggedIn 的细化子状态
- PREVIEW_OBCALL_START：预览外呼流程开始 → PreviewCalling
- PREVIEW_OBCALL_RINGING：响铃阶段（坐席端/客户端）→ Ringing
- PREVIEW_OBCALL_BRIDGE：接通 → Bridged/Talking
- PREVIEW_OBCALL_RESULT：结束与结果 → CallEnded（可据此恢复到 LoggedIn/空闲）
- RINGING：软电话来电响铃指示（与预览外呼/接通联动）→ Ringing
- RECONNECT_ATTEMPT：SDK 发起重连尝试（可能多次）→ Reconnecting（UI 可提示网络状态）
- TRANSCRIPT：通话转写流（内容、时序、说话人标注等）→ 附加到日志/转写面板
- WEBRTC_STATS：WebRTC 统计（RTT、丢包、码率等）→ 附加到诊断面板

注：订阅在 main.ts 中统一完成：
- `AgentSDK.on(EventType.X, handler)`；列表包含上述全部关键事件。

## 重连策略（前端侧）
- 触发条件：网络抖动、信令通道中断、后台会话续期导致的连接重置。
- SDK 行为：当连接异常时触发 `RECONNECT_ATTEMPT` 事件并自动重试（由 SDK 内部控制节流与退避）。
- 前端设计：
  - 监听 RECONNECT_ATTEMPT：更新 UI（例如状态栏提示“正在重连”），在重连完成前禁用敏感操作（发起新呼叫/登出等）。
  - 事件订阅的幂等性：订阅在登录后一次完成；重连过程中无需重复 `on()`，由 SDK 维护会话与事件流恢复。
  - 会话验证：重连成功后读取最新 AGENT_STATUS 与最近通话上下文，必要时在 UI 上恢复按钮状态。
  - 媒体链路：若软电话（WebRTC）媒体断开，由 SDK 决定是否自动重建；若未恢复，用户可手动 `sipLink()` 重新拉起。
  - 退避建议（若自管重连场景）：指数退避（1s、2s、4s、8s，最大 30s），上限与超时可配置；达到上限后提示人工干预。

## 资源清理与登出
- off：取消事件订阅（如需），避免重复绑定与内存泄漏。
- logout：传入 `logoutMode` 与 `unbindEndpoint` 释放服务端与媒体资源。
- 结束后清理本地 UI 状态与缓存，回到 LoggedOut。

## 开发者提示与落地对照
- main.ts：
  - loadEnv → setupAndLogin → subscribeEvents → previewObCall/sipLink/sipUnlink/logout
  - `webrtc: env.bindEndpoint?.endpointType === 3` 控制软电话开关；启用 `webrtcStats` 输出诊断。
- sdk.ts：
  - UMD 优先，ESM 兜底；若两者不可用则抛错并提示正确接入方式。
- index.html：
  - 使用 `<script type="module" src="main.js">` 运行示例；按钮事件与日志区见页面结构。

## 风险与边界
- env.json 为演示用途，真实生产环境需通过安全配置与凭证管理（避免将敏感字段入仓）。
- 事件名以 SDK 为准，示例中列出的 EventType 需与具体版本一致；如有差异请在 API.md 同步维护。
- 重连细节由 SDK 管理；前端仅做 UI 反馈与操作保护，避免与 SDK 重连逻辑冲突。

