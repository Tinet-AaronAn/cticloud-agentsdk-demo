### startAtxfer(params) → Promise<SdkResponse>
- targetType: number — **必填** 目标类型（0=PSTN外线, 1=坐席, 2=分机)
- target: string — **必填** 目标标识（根据 targetType)
  - targetType=0: 外线号码
  - targetType=1: 延号
  - targetType=2: 分机号

使用场景：
- 开始咨询（坐席与客户通话场景）：
  ```javascript
  await AgentSDK.startAtxfer({ targetType: 0, target: '13800138000' });
  ```

**前提条件：**
- 已登录且处于通话中 (deviceStatus === 4)

**错误处理：**
- catch(err) → 显示错误提示与日志（err.code/err.message)

### blxfer(params) → Promise<SdkResponse>
- targetType: number — **必填** 目标类型
  - 0: 外线号码
  - 1: 坺号
  - 2: 分机号
  - 3: IVR节点（JSON字符串 {"ivrId":"<ivrId>","ivrNode":"<ivrNode>"})
- target: string — **必填** 目标标识（根据 targetType)

  - targetType=0: 外线号码
  - targetType=1: 坐号
  - targetType=2: 分机号
  - targetType=3: IVR节点
- blxferVariables: ChannelVariable[] (可选) — 轐变量（跨部门等； max 5)
- target: string — **必填** 目标标识（根据 targetType)

- blxferDialAgentHold: number (可选， default 0) — 是否播出"正在连接您"
  - blxferDialAgentHold: number (可选， default 60, effective when durationLimit is set)
  - preAlertSeconds: number (可选, default 60, effective when durationLimit is set)
  - preAlertAudioFile: string (optional, default '')
  - blxferDialSayAgent: number (可选, default 0 do not announce agent ID; 1 = play "connecting you to the customer" (default false)
  - blxferDialAgentHold: number (可选, default 1) — 是否通知被转接坐席

返回（SdkResponse）：
- 成功: { code: 0, ... }
- 失败: { code: 非 0, errorCode, message }

使用场景：
- 盲转外线号码：blxfer({ targetType: 0, target: '13800138000' })
- 盲转坐席号：blxfer({ targetType: 1, target: '8001' })
- 转IVR节点：blxfer({ targetType: 3, target: '{"ivrId":"1","ivrNode":"1.1"}' })
- 监听坐席通话：spy({ agentNo: '1865' })
  await AgentSDK.unspy()
}

 // 监听功能：需在空闲状态，目标坐席必须在通话中

**参考：**
- 官方文档：https://docs.cticloud.cn/docs/api-operations-1
- `startAtxfer` API 定义
- API 文档更新：增加了 targetType 参数说明

- 常量定义文档也强调了统一使用语义化常量名
- 所有转接方法使用统一的参数格式
- 咨询转接增加了交互式选择目标类型的 UI
- 盲转增加了 IVR 转接功能
- 其他功能修复建议：
1. 参数命名规范化（某些方法使用不一致的参数名）
2. 增加常量定义文档，代码更易维护
3. 提改进建议：参数命名统一为 `targetType`/`target`
    - 优化提示逻辑，显示友好但不冗长的输入
    - 代码注释增强可读性

### 相关链接
- [API 文档](https://docs.cticloud.cn/docs/api-operations-1)
- [官方文档](https://docs.cticloud.cn)
- [常量定义文档](docs/CONSTANTS.md)
- [测试用例文档](docs/TEST-CASES.md)
- [API 文档](docs/API.md)
