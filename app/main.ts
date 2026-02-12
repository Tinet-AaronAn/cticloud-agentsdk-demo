import { getAgentSDK } from './sdk.ts';

const $ = (id: string) => document.getElementById(id)!;
const logs = $('logs');
const statusEl = $('status');
const envStatus = $('envStatus');

let env: any = null;
let AgentSDK: any = null;

function log(msg: string, obj?: any) {
  const line = obj ? `${msg} ${JSON.stringify(obj)}` : msg;
  logs.textContent = `${line}\n` + logs.textContent;
}

async function loadEnv() {
  try {
    const res = await fetch('./env.json');
    env = await res.json();
    envStatus.textContent = 'env: 已加载';
    log('[env] loaded', env);
  } catch {
    envStatus.textContent = 'env: 未找到 env.json，使用示例值';
    log('[env] env.json 未找到，参考 app/env.example.json');
  }
}

function subscribeEvents() {
  const { EventType } = AgentSDK;
  const sub = (et: any) => AgentSDK.on(et, (e: any) => log(`[event] ${et}`, e));
  [
    EventType.AGENT_STATUS,
    EventType.PREVIEW_OBCALL_START,
    EventType.PREVIEW_OBCALL_RINGING,
    EventType.PREVIEW_OBCALL_BRIDGE,
    EventType.PREVIEW_OBCALL_RESULT,
    EventType.RINGING,
    EventType.RECONNECT_ATTEMPT,
    EventType.TRANSCRIPT,
    EventType.WEBRTC_STATS,
  ].forEach(sub);
}

async function setupAndLogin() {
  if (!env) { log('[login] 请先加载 env'); return; }
  AgentSDK = await getAgentSDK();
  AgentSDK.setup({
    baseURL: env.baseURL,
    debug: true,
    webrtc: env.bindEndpoint?.endpointType === 3,
    webrtcStats: true,
    observability: false,
  });
  subscribeEvents();
  try {
    const res = await AgentSDK.login({
      tenantId: env.tenantId,
      agentNo: env.agentNo,
      sessionKey: env.sessionKey,
      bindEndpoint: env.bindEndpoint,
      initialStatus: env.initialStatus ?? 1,
    });
    statusEl.textContent = JSON.stringify(res, null, 2);
    if (res.code !== 0) log('[login server failed]', res.errorCode + '', res.message);
    else log('[login ok]');
  } catch (err: any) {
    log('[login sdk error]', { code: err?.code, message: err?.message });
  }
}

async function previewObCall() {
  if (!AgentSDK || !env) return log('[obcall] 缺少登录或配置');
  try {
    const res = await AgentSDK.previewObCall({
      customerNumber: env.customerNumber,
      agentAnswerTimeout: 30,
      customerAnswerTimeout: 45,
    });
    if (res.code !== 0) log('[obcall server failed]', { errorCode: res.errorCode, message: res.message });
    else log('[obcall ok]');
  } catch (err: any) {
    log('[obcall sdk error]', { code: err?.code, message: err?.message });
  }
}

async function sipLink() {
  if (!AgentSDK) return log('[sipLink] 未登录');
  try {
    await AgentSDK.sipLink();
    log('[sipLink ok]');
  } catch (err: any) {
    log('[sipLink error]', { code: err?.code, message: err?.message });
  }
}

async function sipUnlink() {
  if (!AgentSDK) return log('[sipUnlink] 未登录');
  try {
    await AgentSDK.sipUnlink();
    log('[sipUnlink ok]');
  } catch (err: any) {
    log('[sipUnlink error]', { code: err?.code, message: err?.message });
  }
}

async function logout() {
  if (!AgentSDK) return log('[logout] 未登录');
  try {
    const res = await AgentSDK.logout({ logoutMode: 1, unbindEndpoint: 0 });
    log('[logout]', res);
  } catch (err: any) {
    log('[logout error]', { code: err?.code, message: err?.message });
  }
}

// Wire up buttons
$('loadEnv').onclick = loadEnv;
$('login').onclick = setupAndLogin;
$('previewObCall').onclick = previewObCall;
$('sipLink').onclick = sipLink;
$('sipUnlink').onclick = sipUnlink;
$('logout').onclick = logout;
