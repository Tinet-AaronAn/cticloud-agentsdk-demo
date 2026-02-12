# cticloud-agentsdk-demo

目标：基于 CTICloud AgentSDK，完成坐席工作台工具条的集成 Demo，并确保可运行（本地）。

运行（本地）：
- 将 app/env.example.json 复制为 app/env.json，并填入 baseURL / tenantId / agentNo / sessionKey / bindEndpoint / customerNumber
- 使用任何静态服务器在 localhost 提供 app/ 目录（示例：npx http-server ./app 或 Vite dev）
- 在浏览器打开 http://localhost:5173 或对应端口（localhost 下可授予麦克风权限）

Demo 功能：
- 登录/登出；订阅事件；预览外呼；软电话接听/挂断
- 事件日志面板展示关键事件（AGENT_STATUS、PREVIEW_OBCALL_*、RINGING、RECONNECT_ATTEMPT、TRANSCRIPT、WEBRTC_STATS）

安全与注意：
- 生产需 HTTPS；本地 localhost 视为安全上下文。
- 请确认 baseURL 可达、凭证有效、浏览器麦克风权限已开启。
