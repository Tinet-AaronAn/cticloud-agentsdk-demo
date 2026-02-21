// sdk.js — 获取 AgentSDK（已通过 script 标签加载）
(function() {
  'use strict';

  // 获取 AgentSDK（已通过 script 标签加载到 window.AgentSDK）
  window.getAgentSDK = async function() {
    if (window.AgentSDK) {
      return window.AgentSDK;
    }
    throw new Error('AgentSDK 未找到。请确保 agent-sdk.umd.min.js 已正确加载。');
  };

})();
