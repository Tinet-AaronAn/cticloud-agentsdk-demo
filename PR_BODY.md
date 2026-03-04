## 功能描述

添加通话控制功能，支持在通话中进行保持、恢复、静音、取消静音和发送 DTMF。

## 实现内容

### UI 更新
- 添加保持/恢复按钮
- 添加静音/取消静音按钮  
- 添加发送 DTMF 按钮

### 代码实现
- `hold()` - 使用 `AgentSDK.hold()`
- `unhold()` - 使用 `AgentSDK.unhold()`
- `mute()` - 使用 `AgentSDK.mute({ direction: 'sendrecv' })`
- `unmute()` - 使用 `AgentSDK.unmute({ direction: 'sendrecv' })`
- `sendDtmf()` - 使用 `AgentSDK.sendDtmf({ digits })`

### 状态管理
- 添加 `isOnHold` 状态跟踪保持状态
- 添加 `isMuted` 状态跟踪静音状态
- 添加计算属性控制按钮可用性

### 测试
- TC-INT-CALL-CTRL-001: 未登录时通话控制按钮禁用 ✅
- TC-INT-CALL-CTRL-002: 空闲状态通话控制按钮禁用 ✅

### 文档
- 更新 API.md 添加通话控制方法说明
- 更新 TEST-CASES.md 添加测试用例

## 测试状态

| 测试 | 结果 |
|------|------|
| 集成测试 | 11/11 通过 |
| UI 测试 | 26/26 通过 |

---

@严审 请审查代码