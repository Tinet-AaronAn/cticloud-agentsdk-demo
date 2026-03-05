# CTICloud AgentSDK 官方文档索引

> **⚠️ 标准契约 - 必须牢记**
>
> 这些文档是 CTICloud AgentSDK 的权威定义，所有开发必须以这些文档为准！

---

## 📚 核心文档

### 1. API 操作文档
- **API Operations (主要)**: https://docs.cticloud.cn/docs/api-operations-1
- **API Operations (补充)**: https://docs.cticloud.cn/docs/api-operations

### 2. 核心概念
- **生命周期与核心概念**: https://docs.cticloud.cn/docs/core-concepts-lifecycle

### 3. 类型定义
- **Types (类型定义)**: https://docs.cticloud.cn/docs/types

### 4. 状态机
- **状态机 (State & StateAction)**: https://docs.cticloud.cn/docs/state-machine-state-stateaction

### 5. 转接参数
- **Transfer Parameters (blxferVariables)**: https://docs.cticloud.cn/docs/transfer-parameters-blxfervariables

### 6. 关键流程
- **Key Flows (时序图)**: https://docs.cticloud.cn/docs/key-flows-sequence-diagrams

---

## 🎯 开发前必须阅读

每次开发新功能或修复 Bug 前，**必须**按照以下顺序查阅文档：

1. **API Operations-1** - 确认方法签名和参数
2. **Types** - 确认数据结构定义
3. **State Machine** - 确认状态流转规则
4. **Key Flows** - 确认业务流程

---

## 📋 文档使用场景

| 场景 | 查阅文档 |
|------|----------|
| 添加新的 SDK 方法 | API Operations-1 → Types |
| 状态判断错误 | State Machine → Types |
| 参数格式错误 | API Operations-1 → Types |
| 流程理解错误 | Key Flows → Core Concepts |
| 转接参数问题 | Transfer Parameters → API Operations-1 |

---

## ⚠️ 重要原则

1. **官方文档是唯一真相源**
   - 本地文档（docs/API.md）仅供参考
   - 如有不一致，以官方文档为准

2. **开发前必须查阅官方文档**
   - 不要凭记忆编写代码
   - 不要假设参数格式

3. **遇到问题先查文档**
   - 不要先看代码实现
   - 先查官方文档确认正确用法

4. **本地文档必须与官方同步**
   - 发现不一致立即更新
   - 保持本地文档的准确性

---

## 🔄 更新记录

- 2026-03-05: 创建索引，记录 7 个核心文档链接
- 2026-03-05: 添加开发流程和原则

---

## 📝 相关本地文档

- [API.md](./API.md) - 本地 API 文档（需与官方同步）
- [CONSTANTS.md](./CONSTANTS.md) - 常量定义
- [TEST-CASES.md](./TEST-CASES.md) - 测试用例

---

**维护者**: 随行 🦞
**最后更新**: 2026-03-05
**重要性**: 🔴 **极高 - 这是标准契约！**
