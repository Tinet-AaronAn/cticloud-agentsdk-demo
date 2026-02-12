// sdk.ts — 统一获取 AgentSDK（UMD 或 ESM）
export async function getAgentSDK(): Promise<any> {
  // 优先使用全局 UMD
  const g: any = (window as any);
  if (g.AgentSDK) return g.AgentSDK;
  // 尝试 ESM 导入（如已安装 @cc/agent-sdk）
  try {
    const mod = await import('@cc/agent-sdk');
    return (mod as any).AgentJsSDK || mod.AgentSDK || mod.default;
  } catch (e) {
    console.warn('[sdk] ESM import failed:', e);
    throw new Error('AgentSDK not found. Please include UMD bundle or install @cc/agent-sdk');
  }
}
