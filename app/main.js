import { getAgentSDK } from './sdk.js';

const $ = (id) => document.getElementById(id);
const logs = $('logs');
const statusEl = $('status');
const envStatus = $('envStatus');

let env = null;
let AgentSDK = null;

function log(msg, obj) {
  const line = obj ? `${msg} ${JSON.stringify(obj)}` : msg;
  logs.textContent = `${line}\n` + logs.textContent;
}

async function loadEnv() {
  try {
    const res = await fetch('./env.json');
    env = await res.json();
    envStatus.textContent = 'env: 已加载（文件）';
    log('[env] loaded', env);
  } catch {
    envStatus.textContent = 'env: 未找到 env.json，使用在线配置';
    log('[env] env.json 未找到，建议使用在线配置表单');
  }
}

function applyConfig() {
  const baseURL = $('cfg_baseURL').value.trim();
  const tenantId = $('cfg_tenantId').value.trim();
  const agentNo = $('cfg_agentNo').value.trim();
  const sessionKey = $('cfg_sessionKey').value.trim();
  const endpointType = parseInt(($('cfg_endpointType').value || '1').trim(), 10);
  const endpoint = $('cfg_endpoint').value.trim();
  const customerNumber = $('cfg_customerNumber').value.trim();
  const initialStatus = parseInt(($('cfg_initialStatus').value || '1').trim(), 10);
  env = {
    baseURL, tenantId, agentNo, sessionKey,
    bindEndpoint: { endpointType, endpoint },
    customerNumber, initialStatus
  };
  envStatus.textContent = 'env: 已加载（在线配置）';
  log('[env] applied', env);
}

function subscribeEvents() {
  const { EventType } = AgentSDK;
  const sub = (et) => AgentSDK.on(et, (e) => log(`[event] ${et}`, e));
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
  if (!env) { log('[login] 请先加载 env 或使用在线配置'); return; }
  AgentSDK = await getAgentSDK();
  AgentSDK.setup({
    baseURL: env.baseURL,
    debug: true,
    webrtc: env.bindEndpoint && env.bindEndpoint.endpointType === 3,
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
      initialStatus: env.initialStatus || 1,
    });
    statusEl.textContent = JSON.stringify(res, null, 2);
    if (res.code !== 0) log('[login server failed]', { errorCode: res.errorCode, message: res.message });
    else log('[login ok]');
  } catch (err) {
    log('[login sdk error]', { code: err && err.code, message: err && err.message });
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
  } catch (err) {
    log('[obcall sdk error]', { code: err && err.code, message: err && err.message });
  }
}

async function sipLink() {
  if (!AgentSDK) return log('[sipLink] 未登录');
  try { await AgentSDK.sipLink(); log('[sipLink ok]'); } catch (err) { log('[sipLink error]', { code: err && err.code, message: err && err.message }); }
}
async function sipUnlink() {
  if (!AgentSDK) return log('[sipUnlink] 未登录');
  try { await AgentSDK.sipUnlink(); log('[sipUnlink ok]'); } catch (err) { log('[sipUnlink error]', { code: err && err.code, message: err && err.message }); }
}
async function logout() {
  if (!AgentSDK) return log('[logout] 未登录');
  try { const res = await AgentSDK.logout({ logoutMode: 1, unbindEndpoint: 0 }); log('[logout]', res); } catch (err) { log('[logout error]', { code: err && err.code, message: err && err.message }); }
}

$('loadEnv').onclick = loadEnv;
$('applyConfig').onclick = applyConfig;
$('login').onclick = setupAndLogin;
$('previewObCall').onclick = previewObCall;
$('sipLink').onclick = sipLink;
$('sipUnlink').onclick = sipUnlink;
$('logout').onclick = logout;
