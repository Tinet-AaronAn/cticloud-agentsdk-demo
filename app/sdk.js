// sdk.js — 统一获取 AgentSDK（UMD 或 ESM）
async function getAgentSDK() {
  const g = window;
  if (g.AgentSDK) return g.AgentSDK;
  // 尝试从 CDN 加载
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@cc/agent-sdk@latest/+esm');
    return mod.AgentJsSDK || mod.AgentSDK || mod.default;
  } catch (e) {
    console.warn('[sdk] ESM import failed:', e);
    throw new Error('AgentSDK 未找到。请确保页面包含 UMD bundle 或已安装 @cc/agent-sdk');
  }
}
