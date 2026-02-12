// sdk.js — 统一获取 AgentSDK（UMD 或 ESM）
export async function getAgentSDK() {
  const g = window;
  if (g.AgentSDK) return g.AgentSDK;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@cc/agent-sdk/+esm');
    return mod.AgentJsSDK || mod.AgentSDK || mod.default;
  } catch (e) {
    console.warn('[sdk] ESM import failed:', e);
    throw new Error('AgentSDK not found. 请使用 UMD bundle 或安装 @cc/agent-sdk');
  }
}
