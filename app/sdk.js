// sdk.js — 获取 AgentSDK（已通过 script 标签加载）
(function() {
  'use strict';

  /**
   * 获取 AgentSDK 对象
   * 
   * UMD 模块导出结构：
   * - window.AgentSDK.AgentSDK (命名导出)
   * - window.AgentSDK.default (默认导出)
   * 
   * @returns {Promise<Object>} AgentSDK 对象
   */
  window.getAgentSDK = async function() {
    // 等待 SDK 加载完成
    if (window.AgentSDK) {
      // 优先使用 AgentSDK 属性，其次使用 default 属性
      const sdk = window.AgentSDK.AgentSDK || window.AgentSDK.default;
      if (sdk) {
        return sdk;
      }
    }
    
    // 等待 SDK 加载（最多 5 秒）
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (window.AgentSDK) {
        const sdk = window.AgentSDK.AgentSDK || window.AgentSDK.default;
        if (sdk) {
          return sdk;
        }
      }
    }
    
    throw new Error('AgentSDK 未找到。请确保 agent-sdk.umd.js 已正确加载。');
  };

})();
