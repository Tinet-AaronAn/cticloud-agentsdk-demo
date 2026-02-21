// sdk.js — 统一获取 AgentSDK（支持动态加载 UMD 或 ESM）
(function() {
  'use strict';

  // AgentSDK 实例缓存
  let agentSDKInstance = null;
  let loadingPromise = null;

  // 动态加载脚本
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`无法加载脚本: ${src}`));
      document.head.appendChild(script);
    });
  }

  // 获取 AgentSDK
  window.getAgentSDK = async function(sdkUrl) {
    // 如果已经有实例，直接返回
    if (agentSDKInstance) {
      return agentSDKInstance;
    }

    // 如果正在加载，等待加载完成
    if (loadingPromise) {
      return loadingPromise;
    }

    loadingPromise = (async () => {
      // 1. 检查全局是否已有 AgentSDK
      if (window.AgentSDK) {
        agentSDKInstance = window.AgentSDK;
        return agentSDKInstance;
      }

      // 2. 如果提供了 SDK URL，尝试动态加载
      if (sdkUrl) {
        try {
          await loadScript(sdkUrl);
          if (window.AgentSDK) {
            agentSDKInstance = window.AgentSDK;
            console.log('[sdk] 从指定 URL 加载成功:', sdkUrl);
            return agentSDKInstance;
          }
        } catch (e) {
          console.warn('[sdk] 从指定 URL 加载失败:', e.message);
        }
      }

      // 3. 尝试从常见路径加载
      const commonUrls = [
        './agent-sdk.umd.min.js',
        './agent-sdk.js',
        '/agent-sdk.umd.min.js',
      ];

      for (const url of commonUrls) {
        try {
          await loadScript(url);
          if (window.AgentSDK) {
            agentSDKInstance = window.AgentSDK;
            console.log('[sdk] 从路径加载成功:', url);
            return agentSDKInstance;
          }
        } catch (e) {
          // 继续尝试下一个
        }
      }

      // 4. 尝试从 npm CDN 加载（如果包存在）
      try {
        const mod = await import('https://cdn.jsdelivr.net/npm/@cc/agent-sdk@latest/+esm');
        agentSDKInstance = mod.AgentJsSDK || mod.AgentSDK || mod.default;
        if (agentSDKInstance) {
          console.log('[sdk] 从 npm CDN 加载成功');
          return agentSDKInstance;
        }
      } catch (e) {
        console.warn('[sdk] npm CDN 加载失败:', e.message);
      }

      throw new Error('AgentSDK 未找到。请在配置中指定 AgentSDK 脚本 URL，或将 agent-sdk.umd.min.js 放置在页面同目录下。');
    })();

    return loadingPromise;
  };

  // 重置 SDK 实例（用于重新加载）
  window.resetAgentSDK = function() {
    agentSDKInstance = null;
    loadingPromise = null;
  };

})();
