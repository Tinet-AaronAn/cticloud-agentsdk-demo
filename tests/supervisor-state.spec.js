// @ts-check
import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test.describe('班组长操作状态控制', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });
  });
  
  test.afterAll(async () => {
    await page.close();
  });

  // 每个测试前刷新页面
  test.beforeEach(async () => {
    await page.goto('http://localhost:5173/?_=' + Date.now()); // 添加时间戳避免缓存
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#app', { timeout: 10000 });
    await page.waitForFunction(() => window.App !== undefined, { timeout: 5000 });
  });

  test('初始状态：未登录时所有班组长操作按钮应禁用', async () => {
    await page.waitForSelector('button.btn-info:has-text("监听")', { timeout: 10000 });
    
    const spyBtn = page.locator('button.btn-info:has-text("监听")').first();
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    const disconnectBtn = page.locator('button.btn-dark:has-text("强拆")').first();
    
    await expect(spyBtn).toBeDisabled();
    await expect(whisperBtn).toBeDisabled();
    await expect(bargeBtn).toBeDisabled();
    await expect(disconnectBtn).toBeDisabled();
  });

  test('登录后按钮状态正确', async () => {
    const loginBtn = page.locator('button:has-text("登录")').first();
    await loginBtn.click();
    
    await page.waitForSelector('.status-idle, :text("空闲")', { timeout: 30000 });
    
    const spyBtn = page.locator('button.btn-info:has-text("监听")').first();
    await expect(spyBtn).toBeEnabled({ timeout: 10000 });
    
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    await expect(whisperBtn).toBeDisabled();
    await expect(bargeBtn).toBeDisabled();
    
    const disconnectBtn = page.locator('button.btn-dark:has-text("强拆")').first();
    await expect(disconnectBtn).toBeEnabled();
  });

  test('监听后耳语和强插按钮应该可用', async () => {
    await ensureLoggedIn(page);
    
    // 使用 setTestState 方法更新状态
    const result = await page.evaluate(() => {
      if (typeof window.App.setTestState === 'function') {
        window.App.setTestState({
          isSpying: true,
          spyTarget: '1865'
        });
        return { success: true };
      }
      return { success: false, error: 'setTestState not found' };
    });
    
    expect(result.success).toBe(true);
    
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    
    await expect(whisperBtn).toBeEnabled({ timeout: 5000 });
    await expect(bargeBtn).toBeEnabled({ timeout: 5000 });
  });

  test('状态流转：监听 → 耳语 → 取消耳语 → 取消监听', async () => {
    await ensureLoggedIn(page);
    
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    
    // Step 1: 设置监听状态
    await page.evaluate(() => {
      window.App.setTestState({
        isSpying: true,
        spyTarget: '1865',
        isWhispering: false,
        isBarging: false
      });
    });
    
    await expect(whisperBtn).toBeEnabled({ timeout: 5000 });
    await expect(bargeBtn).toBeEnabled({ timeout: 5000 });
    
    // Step 2: 设置耳语状态
    await page.evaluate(() => {
      window.App.setTestState({
        isWhispering: true,
        whisperTarget: '1865'
      });
    });
    
    await expect(bargeBtn).toBeDisabled({ timeout: 5000 });
    
    // Step 3: 取消耳语
    await page.evaluate(() => {
      window.App.setTestState({
        isWhispering: false,
        whisperTarget: null
      });
    });
    
    await expect(bargeBtn).toBeEnabled({ timeout: 5000 });
    
    // Step 4: 取消监听
    await page.evaluate(() => {
      window.App.setTestState({
        isSpying: false,
        spyTarget: null
      });
    });
    
    await expect(whisperBtn).toBeDisabled({ timeout: 5000 });
    await expect(bargeBtn).toBeDisabled({ timeout: 5000 });
  });

  test('事件驱动的状态更新', async () => {
    await ensureLoggedIn(page);
    
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    
    // 初始状态
    await page.evaluate(() => {
      window.App.setTestState({
        isSpying: false,
        isWhispering: false,
        isBarging: false
      });
    });
    
    await expect(whisperBtn).toBeDisabled({ timeout: 3000 });
    
    // 模拟 spyLink 事件
    await page.evaluate(() => {
      window.App.setTestState({
        isSpying: true,
        spyTarget: '1888'
      });
    });
    
    await expect(whisperBtn).toBeEnabled({ timeout: 5000 });
    
    // 模拟 spyUnlink 事件
    await page.evaluate(() => {
      window.App.setTestState({
        isSpying: false,
        spyTarget: null,
        isWhispering: false,
        isBarging: false
      });
    });
    
    await expect(whisperBtn).toBeDisabled({ timeout: 5000 });
  });

  test('状态指示器显示', async () => {
    await ensureLoggedIn(page);
    
    await page.evaluate(() => {
      window.App.setTestState({
        isSpying: true,
        spyTarget: '1865'
      });
    });
    
    await page.waitForTimeout(300);
    
    const stateIndicator = page.locator('.supervisor-state .badge:has-text("监听")');
    const count = await stateIndicator.count();
    expect(count).toBeGreaterThan(0);
    
    await page.evaluate(() => {
      window.App.setTestState({
        isWhispering: true,
        whisperTarget: '1865'
      });
    });
    
    await page.waitForTimeout(300);
    
    const whisperIndicator = page.locator('.supervisor-state .badge:has-text("耳语")');
    const whisperCount = await whisperIndicator.count();
    expect(whisperCount).toBeGreaterThan(0);
  });

  test('自己通话中时不能监听', async () => {
    await ensureLoggedIn(page);
    
    const spyBtn = page.locator('button.btn-info:has-text("监听")').first();
    
    // 确保没有在通话中
    await page.evaluate(() => {
      window.App.setTestState({
        deviceStatus: 0,
        isSpying: false
      });
    });
    
    await expect(spyBtn).toBeEnabled({ timeout: 3000 });
    
    // 模拟通话中
    await page.evaluate(() => {
      window.App.setTestState({ deviceStatus: 3 });
    });
    
    await expect(spyBtn).toBeDisabled({ timeout: 5000 });
    
    // 恢复
    await page.evaluate(() => {
      window.App.setTestState({ deviceStatus: 0 });
    });
    
    await expect(spyBtn).toBeEnabled({ timeout: 5000 });
  });
});

async function ensureLoggedIn(page) {
  const loginBtn = page.locator('button:has-text("登录")').first();
  const isEnabled = await loginBtn.isEnabled().catch(() => false);
  
  if (isEnabled) {
    await loginBtn.click();
    await page.waitForSelector('.status-idle, :text("空闲")', { timeout: 30000 });
  }
  
  await page.waitForTimeout(500);
}
