# 测试用例 — cticloud-agentsdk-demo
角色：Test Design Agent「石纲」

|ID|场景|步骤|期望|
|--|--|--|--|
|TC-001|登录|填入配置→点击登录|code=0，AGENT_STATUS 到达|
|TC-002|预览外呼|输入号码→调用 previewObCall|收到 START/RINGING/BRIDGE/RESULT 事件|
|TC-003|软电话接听|bindEndpoint=3→点击接听|sipLink 成功，事件面板显示|
|TC-004|软电话挂断|点击挂断|sipUnlink 成功|
|TC-005|错误处理|模拟参数缺失|Promise reject 或 code!=0 分支被捕获|
