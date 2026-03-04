# API 契约与集成说明 — cticloud-agentsdk-demo
角色：API Design Agent「边约」

本文件定义 Demo 与 AgentSDK 的集成契约，明确方法参数、返回结构（SdkResponse）、bindEndpoint/ChannelVariable 的含义与示例，以及错误处理（code!=0 与异常）。

## 配置结构（env.json）
{
  "baseURL": "https://api.example.com",
  "tenantId": "t1",
  "agentNo": "0001",
  "sessionKey": "sk_xxx",
  "bindEndpoint": { "endpointType": 3, "endpoint": "softphone_account" },
  "customerNumber": "13800138000",
  "initialStatus": 1
}

- baseURL：AgentSDK 服务基址（HTTPS 推荐）
- tenantId：租户标识
- agentNo：坐席号/工号
- sessionKey：鉴权令牌/会话密钥
- bindEndpoint：坐席绑定的语音终端（见下文说明）
- customerNumber：预览外呼默认被叫号码（Demo 用）
- initialStatus：登录后的初始坐席状态（示例值 1）

## SdkResponse 统一返回结构
除 sipLink/sipUnlink（通常仅成功/失败）外，API 方法统一返回 SdkResponse。

SdkResponse（示例定义，具体以 SDK 为准）：
- code：number — 业务返回码，0 表示成功；非 0 表示失败（需根据 message/errorCode 判断原因）
- message：string（可选）— 人类可读的提示或错误信息
- errorCode：string|number（可选）— 服务端/业务错误码
- data：any（可选）— 成功时的附加数据载荷

错误处理分支：
- code != 0：方法已成功调用到服务端，但业务失败（例如鉴权失败、号码非法、路由不可达）。应提示用户并记录日志。
- 异常（Promise reject）：网络/SDK 层异常（例如网络不可达、超时、WebRTC 初始化失败）。应统一捕获 err.code/err.message 并提示与记录。

## 集成步骤（概览）
- AgentSDK.setup({ baseURL, webrtc, ... })
- AgentSDK.login({ tenantId, agentNo, sessionKey, bindEndpoint, initialStatus })
- 事件订阅：AgentSDK.on(EventType.X, handler)
- 预览外呼：AgentSDK.previewObCall({ customerNumber, ... })
- 软电话：AgentSDK.sipLink() / AgentSDK.sipUnlink()
- 登出：AgentSDK.logout({ logoutMode, unbindEndpoint })

## bindEndpoint 说明
bindEndpoint 用于声明坐席绑定使用的语音终端类型与标识。

结构：
- endpointType：number — 终端类型枚举
  - 3：软电话/WebRTC（Demo 中用于启用 webrtc）
  - 其他值（示例）：1：PSTN/手机，2：SIP 硬话机（具体枚举以 SDK 文档为准）
- endpoint：string — 终端实际标识（例如分机号、SIP 账号、手机号）

示例：
- { endpointType: 3, endpoint: "3016" } — 绑定 WebRTC 软电话分机 3016（Demo 环境）

注意：在 setup 阶段可依据 endpointType 是否为 3 来打开 webrtc 能力：
- AgentSDK.setup({ webrtc: bindEndpoint?.endpointType === 3, ... })

## ChannelVariable 说明与示例
ChannelVariable（信道变量）用于在一次呼叫的信令或上下文中附带额外业务参数。典型用途：
- displayNumber：外显号码
- dialPrefix：拨号前缀/路由前缀
- bizLine：业务线标识
- crmCaseId / customerId：业务关联 ID
- 任意自定义键值对（需服务端/路由侧支持）

示例结构（示意，具体键名与支持能力以 SDK/环境为准）：
- channelVariables: {
  - displayNumber: "01012345678",
  - dialPrefix: "9",
  - bizLine: "sales",
  - crmCaseId: "CASE-20260212-001"
}

示例用法（若 SDK 支持在预览外呼传入 ChannelVariable）：
- AgentSDK.previewObCall({
  - customerNumber: "13800138000",
  - agentAnswerTimeout: 30,
  - customerAnswerTimeout: 45,
  - channelVariables: { displayNumber: "01012345678", bizLine: "sales" }
})

提示：本 Demo 代码未强制要求 ChannelVariable 字段，但在实际环境若需要外显或路由控制，可按 SDK 文档在相应方法中增加该参数。

## 方法与参数/返回

### setup(options)
- baseURL：string — SDK 基址
- webrtc：boolean — 是否启用 WebRTC（一般与 bindEndpoint.endpointType===3 对应）
- debug：boolean（可选）— 打印调试日志
- webrtcStats：boolean（可选）— 订阅并上报 WebRTC 指标事件
- observability：boolean（可选）— 观测/遥测能力开关

返回：void（配置生效）

### login(params) → Promise<SdkResponse>
- tenantId：string — 租户标识
- agentNo：string — 坐席号
- sessionKey：string — 鉴权令牌/密钥
- bindEndpoint：{ endpointType: number; endpoint: string } — 语音终端绑定
- initialStatus：number（可选）— 登录后的坐席初始状态（示例值 1）

返回（SdkResponse）：
- code：0 表示登录成功；非 0 表示登录失败
- message / errorCode：失败时的提示与错误码
- data（可选）：登录成功时返回的附加信息（以 SDK 为准）

示例：
- 成功：{ code: 0, message: "ok" }
- 失败：{ code: 1001, errorCode: "AUTH_FAILED", message: "鉴权失败" }

错误处理：
- if (res.code !== 0) → 显示失败提示并记录日志
- catch(err) → 显示 SDK 层错误（如网络不可达），日志记录 err.code/err.message

### previewObCall(params) → Promise<SdkResponse>
- customerNumber：string — 被叫号码
- agentAnswerTimeout：number — 坐席侧接听超时（秒）
- customerAnswerTimeout：number — 客户侧接听超时（秒）
- channelVariables：Record<string, string>（可选）— 信道变量（如外显/路由），具体支持项以 SDK/环境为准

返回（SdkResponse）：
- code：0 表示受理成功（后续进度通过事件上报）
- 非 0：受理失败（例如号码非法、策略拒绝）

事件（示例）：
- EventType.PREVIEW_OBCALL_START
- EventType.PREVIEW_OBCALL_RINGING
- EventType.PREVIEW_OBCALL_BRIDGE
- EventType.PREVIEW_OBCALL_RESULT

错误处理：
- res.code !== 0 → 显示失败提示并记录 errorCode/message
- catch(err) → 显示 SDK 层错误并记录 err.code/err.message

### sipLink() → Promise<void>
- 无参数；在 bindEndpoint.endpointType===3（WebRTC 软电话）场景下发起媒体/通话链路连接或接听动作（具体行为以 SDK 能力为准）

返回：
- 成功：Promise 解析（无载荷）
- 失败：Promise reject，错误对象可能包含 { code, message }

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### sipUnlink() → Promise<void>
- 无参数；在软电话场景下释放/挂断媒体链路（具体行为以 SDK 能力为准）

返回：
- 成功：Promise 解析（无载荷）
- 失败：Promise reject，错误对象可能包含 { code, message }

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### logout(params) → Promise<SdkResponse>
- logoutMode：number — 登出模式（示例：1 正常登出；具体取值以 SDK 文档为准）
- unbindEndpoint：number|boolean — 是否同时解除终端绑定（示例：0 不解除，1 解除）

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

错误处理：
- 统一检查 res.code；捕获异常并展示 err.code/err.message

### pause(params) → Promise<SdkResponse>
- pauseType：number — 忙碌类型（租户配置）。常见：0 生产性；2 非生产性
- pauseDescription：string（可选）— 忙碌原因描述（默认 "busy"），必须存在于租户配置中

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 置忙：pause({ pauseType: 2, pauseDescription: 'MEETING' })

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### unpause() → Promise<SdkResponse>
- 无参数

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 置闲：unpause()

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

## 事件订阅示例（Demo）
- const { EventType } = AgentSDK;
- 订阅所有事件并打印：

### 完整事件列表（40个）

#### 坐席状态与会话（7个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `AGENT_STATUS` | agentStatus | 坐席状态变化 |
| `SESSION_INIT` | sessionInit | 会话初始化 |
| `SESSION_TERMINATE` | sessionTerminate | 会话终止 |
| `SIP_SESSION_INIT` | sipSessionInit | SIP会话初始化 |
| `SIP_SESSION_TERMINATE` | sipSessionTerminate | SIP会话终止 |
| `SIP_DISCONNECTED` | sipDisconnected | 软电话断开 |
| `RECONNECT_ATTEMPT` | reconnectAttempt | 重连尝试 |

#### 预览外呼（4个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `PREVIEW_OBCALL_START` | previewObCallStart | 预览外呼-开始拨打 |
| `PREVIEW_OBCALL_RINGING` | previewObCallRinging | 预览外呼-振铃 |
| `PREVIEW_OBCALL_BRIDGE` | previewObCallBridge | 预览外呼-接通 |
| `PREVIEW_OBCALL_RESULT` | previewObCallResult | 预览外呼-结果 |

#### 来电振铃（1个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `RINGING` | ringing | 来电振铃 |

#### 咨询转接（7个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `ATXFER_START` | atxferStart | 咨询开始 |
| `ATXFER_LINK` | atxferLink | 咨询接通 |
| `ATXFER_ENDED` | atxferEnded | 咨询结束 |
| `ATXFER_ERROR` | atxferError | 咨询失败 |
| `THREEWAY_ATXFER_RESULT` | threewayAtxferResult | 咨询三方结果 |
| `ATXFER_THREEWAY_UNLINK` | atxferThreewayUnlink | 咨询三方结束 |
| `COMPLETE_ATXFER_RESULT` | completeAtxferResult | 转接完成 |

#### 班组长操作 - 监听（3个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `SPY_RESULT` | spyResult | 监听结果 |
| `SPY_LINK` | spyLink | 监听接通 |
| `SPY_UNLINK` | spyUnlink | 监听结束 |

#### 班组长操作 - 三方（3个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `THREEWAY_RESULT` | threewayResult | 三方结果 |
| `THREEWAY_LINK` | threewayLink | 三方接通 |
| `THREEWAY_UNLINK` | threewayUnlink | 三方结束 |

#### 班组长操作 - 耳语（3个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `WHISPER_RESULT` | whisperResult | 耳语结果 |
| `WHISPER_LINK` | whisperLink | 耳语接通 |
| `WHISPER_UNLINK` | whisperUnlink | 耳语结束 |

#### 班组长操作 - 强插（3个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `BARGE_RESULT` | bargeResult | 强插结果 |
| `BARGE_LINK` | bargeLink | 强插接通 |
| `BARGE_UNLINK` | bargeUnlink | 强插结束 |

#### 班组长操作 - 强拆/强下（2个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `DISCONNECT_RESULT` | disconnectResult | 强制断开结果 |
| `SET_OFFLINE` | setOfflineResult | 强制下线结果 |

#### 队列与分机状态（2个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `QUEUE_STATUS` | queueStatus | 队列状态（班长） |
| `EXTENSTATE` | extenState | 分机状态 |

#### IVR 交互（1个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `INTERACT_RETURN` | interactReturn | IVR交互返回 |

#### 转写与回调（2个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `TRANSCRIPT` | transcript | 实时转写 |
| `ORDER_CALLBACK` | orderCallBack | 预约回调 |

#### 网络与质量（2个）
| EventType 常量 | eventType | 说明 |
|----------------|-----------|------|
| `PING` | ping | Ping延迟/网络 |
| `WEBRTC_STATS` | webrtcStats | WebRTC统计（通话中每秒） |
  - RINGING（来电/振铃）
  - RECONNECT_ATTEMPT（断线重连）
  - TRANSCRIPT（语音转写，若支持）
  - WEBRTC_STATS（WebRTC 指标）

示例代码片段（来源：app/main.ts）：
- AgentSDK.setup({ baseURL: env.baseURL, debug: true, webrtc: env.bindEndpoint?.endpointType === 3, webrtcStats: true });
- const res = await AgentSDK.login({ tenantId: env.tenantId, agentNo: env.agentNo, sessionKey: env.sessionKey, bindEndpoint: env.bindEndpoint, initialStatus: env.initialStatus ?? 1 });
- if (res.code !== 0) { /* 登录失败处理 */ } else { /* 登录成功 */ }
- const obRes = await AgentSDK.previewObCall({ customerNumber: env.customerNumber, agentAnswerTimeout: 30, customerAnswerTimeout: 45 });
- await AgentSDK.sipLink();
- await AgentSDK.sipUnlink();
- const lgRes = await AgentSDK.logout({ logoutMode: 1, unbindEndpoint: 0 });

### startAtxfer(params) → Promise<SdkResponse>
- dest：string — 咨询目标号码（坐席号或外线号码）

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 开始咨询：startAtxfer({ dest: '8001' })

前提条件：
- 已登录且处于通话中（deviceStatus === 4）

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### cancelAtxfer() → Promise<SdkResponse>
- 无参数；取消当前的咨询

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 取消咨询：cancelAtxfer()

前提条件：
- 已登录且处于咨询中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### resumeAtxfer() → Promise<SdkResponse>
- 无参数；恢复咨询

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 恢复咨询：resumeAtxfer()

前提条件：
- 已登录且处于咨询中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### completeAtxfer() → Promise<SdkResponse>
- 无参数；完成咨询转接

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 完成转接：completeAtxfer()

前提条件：
- 已登录且处于咨询中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### threewayAtxfer() → Promise<SdkResponse>
- 无参数；建立三方咨询

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 三方咨询：threewayAtxfer()

前提条件：
- 已登录且处于咨询中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### blxfer(params) → Promise<SdkResponse>
- dest：string — 盲转目标号码（坐席号或外线号码）

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 盲转：blxfer({ dest: '8001' })

前提条件：
- 已登录且处于通话中（deviceStatus === 4）

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

## 统一错误处理策略（建议）
- 对返回 SdkResponse 的方法：
  - 判定 res.code === 0 → 成功；否则展示失败并记录 { errorCode, message }
- 对抛异常的方法或网络异常：
  - catch(err) → 展示 { err.code, err.message }，在事件面板与控制台记录
- 可视化与重试：
  - 关键路径提供可重试入口（登录/外呼/Link/Unlink）
  - 断线/重连（RECONNECT_ATTEMPT）给予提示；自动重试需设置上限（例如最多 3 次）
- 日志：
  - 将关键错误与上下文写入事件日志面板与控制台（开发环境），便于验收与定位

## 备注
- ChannelVariable 的具体支持字段与位置（方法参数名）以实际 SDK 文档为准；本文件给出常见示例与推荐做法。
- bindEndpoint 的类型枚举与含义以 SDK/环境定义为准；Demo 中仅使用 3（WebRTC 软电话）。

### setPause(params) → Promise<SdkResponse>
- agent：string — 目标坐席号

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 班组长置忙坐席：setPause({ agent: '8001' })

前提条件：
- 已登录且有班组长权限

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### setUnpause(params) → Promise<SdkResponse>
- agent：string — 目标坐席号

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 班组长置闲坐席：setUnpause({ agent: '8001' })

前提条件：
- 已登录且有班组长权限

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### spy(params) → Promise<SdkResponse>
- agent：string — 目标坐席号

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 班组长监听坐席通话：spy({ agent: '8001' })

前提条件：
- 已登录且有班组长权限
- 目标坐席处于通话中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### whisper(params) → Promise<SdkResponse>
- agent：string — 目标坐席号

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 班组长耳语指导坐席：whisper({ agent: '8001' })

前提条件：
- 已登录且有班组长权限
- 目标坐席处于通话中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### barge(params) → Promise<SdkResponse>
- agent：string — 目标坐席号

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 班组长强插通话：barge({ agent: '8001' })

前提条件：
- 已登录且有班组长权限
- 目标坐席处于通话中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）

### disconnect(params) → Promise<SdkResponse>
- agent：string — 目标坐席号

返回（SdkResponse）：
- 成功：{ code: 0, ... }
- 失败：{ code: 非 0, errorCode, message }

使用场景：
- 班组长强拆通话：disconnect({ agent: '8001' })

前提条件：
- 已登录且有班组长权限
- 目标坐席处于通话中

错误处理：
- catch(err) → 显示错误提示与日志（err.code/err.message）
