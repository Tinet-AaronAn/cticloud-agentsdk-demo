## 功能描述

添加班组长操作功能，支持班组长对坐席进行监控和管理。

## 实现内容

### UI 更新
- 添加班组长操作卡片
- 添加 6 个班组长操作按钮（置忙、置闲、监听、耳语、强插、强拆）

### 代码实现
- `setPause({ agent })` - 班组长置忙坐席
- `setUnpause({ agent })` - 班组长置闲坐席
- `spy({ agent })` - 班组长监听通话
- `whisper({ agent })` - 班组长耳语指导
- `barge({ agent })` - 班组长强插通话
- `disconnect({ agent })` - 班组长强拆通话

### 计算属性
- `canSetPause` - 可置忙（空闲状态）
- `canSetUnpause` - 可置闲（忙碌/整理状态）
- `canSpy` - 可监听（通话中）
- `canWhisper` - 可耳语（通话中）
- `canBarge` - 可强插（通话中）
- `canDisconnect` - 可强拆（通话中）

### 测试
- TC-INT-SUPERVISOR-001: 未登录时班组长按钮禁用 ✅
- TC-INT-SUPERVISOR-002: 空闲状态班组长按钮状态正确 ✅

### 文档
- 更新 API.md 添加班组长操作方法说明

## 测试状态

| 测试 | 结果 |
|------|------|
| 集成测试 | 15/17 通过 (2跳过) |

---

@严审 请审查代码
