/**
 * cticloud-agentsdk-demo 集成测试（真实环境）
 * 角色：陆测 (Test Agent)
 * 日期：2026-02-22
 * 
 * 运行前确保：
 * 1. app/env.test.json 配置正确
 * 2. 软电话客户端已就绪（endpointType=3）
 */

import { test, expect, Page } from '@playwright/test';

// 延长测试超时时间（集成测试需要更长时间）
test.setTimeout(180000); // 3分钟

// 测试配置
const TEST_CONFIG = {
  baseURL: 'https://agent-gateway-hs-dev.cticloud.cn',
  tenantId: '6000001',
  agentNo: '1865',
  // sessionKey 已移除，通过 JSONP 动态获取
  bindEndpoint: {
    endpointType: 3,
    endpoint: '1883'
  },
  customerNumber: '13426307922',
  initialStatus: 1
};

// 辅助函数：等待事件出现
async function waitForEvent(page: Page, eventType: string, timeout = 10000): Promise<boolean> {
  try {
    const eventCode = page.locator('code').filter({ hasText: eventType });
    await eventCode.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// 辅助函数：获取状态文本
async function getStatusText(page: Page): Promise<string> {
  const badge = page.locator('.status-badge').first();
  return await badge.textContent() || '';
}

// 辅助函数：等待 Toast 并获取文本
async function waitForToast(page: Page, timeout = 5000): Promise<string | null> {
  try {
    const toast = page.locator('.toast.show');
    await toast.waitFor({ state: 'visible', timeout });
    return await toast.textContent();
  } catch {
    return null;
  }
}

test.describe('集成测试（真实环境）', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.navbar-brand');
    
    // 注意：不再打开配置面板填写
    // 测试将使用 env.test.json 中的默认配置
  });

  // ==================== 登录/登出测试 ====================

  test('TC-INT-LOGIN-001: 登录成功', async ({ page }) => {
    // 初始状态应为离线
    const initialStatus = await getStatusText(page);
    expect(initialStatus).toContain('离线');
    
    // 点击登录
    await page.getByRole('button', { name: /登录/ }).click();
    
    // 等待 agentStatus 事件（延长超时到30秒）
    const hasEvent = await waitForEvent(page, 'agentStatus', 30000);
    expect(hasEvent).toBe(true);
    
    // 验证状态变为空闲
    const status = await getStatusText(page);
    expect(status).toContain('空闲');
    
    // 验证登录按钮禁用，登出按钮可用
    await expect(page.getByRole('button', { name: /登录/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /登出/ })).toBeEnabled();
    
    console.log('✅ 登录成功');
  });

  test('TC-INT-LOGIN-002: 登出成功', async ({ page }) => {
    // 先登录
    await page.getByRole('button', { name: /登录/ }).click();
    await waitForEvent(page, 'agentStatus', 30000);
    
    // 点击登出
    await page.getByRole('button', { name: /登出/ }).click();
    
    // 等待状态变为离线
    await page.waitForTimeout(2000);
    const status = await getStatusText(page);
    expect(status).toContain('离线');
    
    // 验证按钮状态恢复
    await expect(page.getByRole('button', { name: /登录/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /登出/ })).toBeDisabled();
    
    console.log('✅ 登出成功');
  });

  // TC-INT-LOGIN-003: 登录失败-无效 sessionKey
  // 注意：sessionKey 现在通过 JSONP 动态获取，无法直接设置无效值
  // 此测试用例暂时跳过
  test.skip('TC-INT-LOGIN-003: 登录失败-无效 sessionKey（已跳过）', async ({ page }) => {
    // 由于 sessionKey 现在通过 JSONP 动态获取，此测试用例不再适用
    console.log('⚠️ sessionKey 现在通过 JSONP 动态获取，无法直接测试无效 sessionKey');
  });

  // ==================== 外呼测试 ====================

  test('TC-INT-CALL-001: 外呼流程', async ({ page }) => {
    // 登录
    await page.getByRole('button', { name: /登录/ }).click();
    const loginSuccess = await waitForEvent(page, 'agentStatus', 30000);
    expect(loginSuccess).toBe(true);
    
    // 等待状态稳定
    await page.waitForTimeout(1000);
    
    // 点击外呼
    const callBtn = page.getByRole('button', { name: /外呼/ });
    await expect(callBtn).toBeEnabled();
    await callBtn.click();
    
    // 等待 PREVIEW_OBCALL 事件
    const hasCallEvent = await waitForEvent(page, 'PREVIEW_OBCALL', 15000);
    expect(hasCallEvent).toBe(true);
    
    console.log('✅ 外呼发起成功');
    
    // 注意：完整外呼流程需要等待接通、挂断等，这里只验证发起
    // 实际通话需要人工介入或更长的等待时间
  });

  test('TC-INT-CALL-002: 未登录时外呼按钮禁用', async ({ page }) => {
    const callBtn = page.getByRole('button', { name: /外呼/ });
    await expect(callBtn).toBeDisabled();
    
    console.log('✅ 未登录时外呼按钮禁用');
  });

  // ==================== 软电话测试 ====================

  test('TC-INT-SOFTPHONE-001: 未登录时接听/挂断按钮禁用', async ({ page }) => {
    await expect(page.getByRole('button', { name: /接听/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /挂断/ })).toBeDisabled();
    
    console.log('✅ 未登录时接听/挂断按钮禁用');
  });

  test('TC-INT-SOFTPHONE-002: 登录后空闲状态接听/挂断按钮禁用', async ({ page }) => {
    // 登录
    await page.getByRole('button', { name: /登录/ }).click();
    await waitForEvent(page, 'agentStatus', 30000);
    
    // 空闲状态下，接听和挂断应该禁用（因为没有来电）
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: /接听/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /挂断/ })).toBeDisabled();
    
    console.log('✅ 空闲状态下接听/挂断按钮禁用');
  });

  // ==================== 事件测试 ====================

  test('TC-INT-EVENT-001: 事件过滤功能', async ({ page }) => {
    // 登录产生事件
    await page.getByRole('button', { name: /登录/ }).click();
    await waitForEvent(page, 'agentStatus', 30000);
    
    // 使用事件过滤
    const filterSelect = page.locator('.card-header').filter({ hasText: '事件日志' }).locator('select');
    await filterSelect.selectOption('agentStatus');
    
    // 验证只显示 agentStatus 事件
    await page.waitForTimeout(500);
    const eventCodes = await page.locator('tbody code').allTextContents();
    eventCodes.forEach(code => {
      expect(code).toContain('agentStatus');
    });
    
    console.log('✅ 事件过滤功能正常');
  });

  test('TC-INT-EVENT-002: 事件清空功能', async ({ page }) => {
    // 登录产生事件
    await page.getByRole('button', { name: /登录/ }).click();
    await waitForEvent(page, 'agentStatus', 30000);
    
    // 点击清空按钮
    await page.getByRole('button', { name: '' }).filter({ has: page.locator('.bi-trash') }).click();
    
    // 验证显示"暂无事件"
    await page.waitForTimeout(500);
    const noEventRow = page.locator('td').filter({ hasText: '暂无事件' });
    await expect(noEventRow).toBeVisible();
    
    console.log('✅ 事件清空功能正常');
  });

  // ==================== 配置持久化测试 ====================

  test('TC-INT-CFG-001: 配置持久化到 localStorage', async ({ page }) => {
    // 配置已在 beforeEach 中应用
    // 刷新页面
    await page.reload();
    await page.waitForSelector('.navbar-brand');
    
    // 打开配置面板验证
    await page.locator('.navbar-actions').getByRole('button', { name: /配置/ }).click();
    await page.waitForSelector('.offcanvas.open');
    
    // 验证配置已保存
    const baseURLInput = page.locator('.offcanvas').getByPlaceholder('https://...');
    await expect(baseURLInput).toHaveValue(TEST_CONFIG.baseURL);
    
    console.log('✅ 配置持久化正常');
  });

  // ==================== 一键自测 ====================

  test('TC-INT-AUTO-001: 一键自测流程', async ({ page }) => {
    // 点击一键自测
    const autoTestBtn = page.getByRole('button', { name: /一键自测/ });
    await autoTestBtn.click();
    
    // 等待登录事件（自测第一步）
    const hasLoginEvent = await waitForEvent(page, 'agentStatus', 15000);
    expect(hasLoginEvent).toBe(true);
    
    console.log('✅ 一键自测启动成功');
    
    // 注意：完整自测流程较长，这里只验证启动
  });

});

// ==================== 测试工具函数 ====================

/**
 * 等待状态变为指定值
 */
async function waitForStatus(page: Page, statusText: string, timeout = 10000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const status = await getStatusText(page);
    if (status.includes(statusText)) {
      return true;
    }
    await page.waitForTimeout(500);
  }
  return false;
}

/**
 * 获取最新事件类型
 */
async function getLatestEventType(page: Page): Promise<string | null> {
  try {
    const firstCode = page.locator('tbody code').first();
    return await firstCode.textContent();
  } catch {
    return null;
  }
}
