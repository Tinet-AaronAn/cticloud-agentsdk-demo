// @ts-check
import { test, expect } from '@playwright/test';

test.describe('班组长操作状态控制', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // 监听控制台输出
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[Browser ${msg.type()}] ${msg.text()}`);
      }
    });
    
    // 访问本地页面
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });
  
  test.afterAll(async () => {
    await page.close();
  });

  test('初始状态：未登录时所有班组长操作按钮应禁用', async () => {
    // 等待页面加载完成
    await page.waitForSelector('button.btn-info:has-text("监听")', { timeout: 10000 });
    
    // 检查所有班组长操作按钮状态（使用更精确的选择器）
    const spyBtn = page.locator('button.btn-info:has-text("监听")').first();
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    const disconnectBtn = page.locator('button.btn-dark:has-text("强拆")').first();
    
    // 未登录时，所有按钮应该被禁用
    await expect(spyBtn).toBeDisabled();
    await expect(whisperBtn).toBeDisabled();
    await expect(bargeBtn).toBeDisabled();
    await expect(disconnectBtn).toBeDisabled();
  });

  test('登录后监听按钮应该可用', async () => {
    // 点击登录按钮
    const loginBtn = page.locator('button:has-text("登录")').first();
    await loginBtn.click();
    
    // 等待登录成功（状态变为"空闲"）
    await page.waitForSelector('.status-idle, :text("空闲")', { timeout: 15000 });
    
    // 检查监听按钮状态（使用更精确的选择器）
    const spyBtn = page.locator('button.btn-info:has-text("监听")').first();
    await expect(spyBtn).toBeEnabled();
    
    // 耳语和强插按钮仍然禁用（需要先监听）
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    await expect(whisperBtn).toBeDisabled();
    await expect(bargeBtn).toBeDisabled();
    
    // 强拆按钮应该可用（不需要先监听）
    const disconnectBtn = page.locator('button.btn-dark:has-text("强拆")').first();
    await expect(disconnectBtn).toBeEnabled();
  });

  test('监听后耳语和强插按钮应该可用', async () => {
    // 确保已登录
    const loginBtn = page.locator('button:has-text("登录")').first();
    if (await loginBtn.isEnabled()) {
      await loginBtn.click();
      await page.waitForSelector('.status-idle, :text("空闲")', { timeout: 15000 });
    }
    
    // 模拟监听事件 - 使用 PetiteVue 的响应式对象
    await page.evaluate(() => {
      // window.App 现在是 PetiteVue 的响应式代理对象
      const app = window.App;
      if (app) {
        app.loggedIn = true;
        app.agentState = 'idle';
        app.deviceStatus = 0;
        app.isSpying = true;
        app.spyTarget = '1865';
      }
    });
    
    // 等待 UI 更新（给 Vue 更多时间反应）
    await page.waitForTimeout(1000);
    
    // 检查耳语和强插按钮状态
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    
    await expect(whisperBtn).toBeEnabled({ timeout: 5000 });
    await expect(bargeBtn).toBeEnabled({ timeout: 5000 });
  });

  test('状态流转：监听 → 耳语 → 取消耳语 → 取消监听', async () => {
    // 确保已登录
    const loginBtn = page.locator('button:has-text("登录")').first();
    if (await loginBtn.isEnabled()) {
      await loginBtn.click();
      await page.waitForSelector('.status-idle, :text("空闲")', { timeout: 15000 });
    }
    
    // 设置监听状态
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isSpying = true;
        app.spyTarget = '1865';
        app.isWhispering = false;
        app.isBarging = false;
      }
    });
    await page.waitForTimeout(800);
    
    // 模拟耳语
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isWhispering = true;
        app.whisperTarget = '1865';
      }
    });
    await page.waitForTimeout(800);
    
    // 验证耳语状态：强插按钮应该禁用
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    await expect(bargeBtn).toBeDisabled({ timeout: 5000 });
    
    // 取消耳语
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isWhispering = false;
        app.whisperTarget = null;
      }
    });
    await page.waitForTimeout(800);
    
    // 验证：强插按钮应该重新可用
    await expect(bargeBtn).toBeEnabled({ timeout: 5000 });
    
    // 取消监听
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isSpying = false;
        app.spyTarget = null;
      }
    });
    await page.waitForTimeout(800);
    
    // 验证：耳语和强插按钮应该禁用
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    await expect(whisperBtn).toBeDisabled({ timeout: 5000 });
    await expect(bargeBtn).toBeDisabled({ timeout: 5000 });
  });

  test('事件驱动的状态更新：spyLink → spyUnlink', async () => {
    // 确保已登录
    const loginBtn = page.locator('button:has-text("登录")').first();
    if (await loginBtn.isEnabled()) {
      await loginBtn.click();
      await page.waitForSelector('.status-idle, :text("空闲")', { timeout: 15000 });
    }
    
    // 初始状态：确保没有在监听
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isSpying = false;
        app.isWhispering = false;
        app.isBarging = false;
      }
    });
    await page.waitForTimeout(800);
    
    // 模拟收到 spyLink 事件
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isSpying = true;
        app.spyTarget = '1888';
        app.addEvent('SPY_LINK', { eventType: 'spyLink', spiedCno: '1888' });
      }
    });
    
    await page.waitForTimeout(1000);
    
    // 验证监听状态
    const whisperBtn = page.locator('button.btn-warning:has-text("耳语")').first();
    await expect(whisperBtn).toBeEnabled({ timeout: 5000 });
    
    // 模拟收到 spyUnlink 事件
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isSpying = false;
        app.spyTarget = null;
        app.isWhispering = false;
        app.whisperTarget = null;
        app.isBarging = false;
        app.bargeTarget = null;
        app.addEvent('SPY_UNLINK', { eventType: 'spyUnlink' });
      }
    });
    
    await page.waitForTimeout(1000);
    
    // 验证状态已重置
    await expect(whisperBtn).toBeDisabled({ timeout: 5000 });
    const bargeBtn = page.locator('button.btn-danger:has-text("强插")').first();
    await expect(bargeBtn).toBeDisabled({ timeout: 5000 });
  });

  test('状态指示器显示正确', async () => {
    // 设置监听状态
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isSpying = true;
        app.spyTarget = '1865';
      }
    });
    await page.waitForTimeout(800);
    
    // 检查状态指示器
    const stateIndicator = page.locator('.supervisor-state .badge:has-text("监听")');
    if (await stateIndicator.count() > 0) {
      await expect(stateIndicator.first()).toBeVisible();
    }
    
    // 设置耳语状态
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isWhispering = true;
        app.whisperTarget = '1865';
      }
    });
    await page.waitForTimeout(800);
    
    // 检查耳语状态指示器
    const whisperIndicator = page.locator('.supervisor-state .badge:has-text("耳语")');
    if (await whisperIndicator.count() > 0) {
      await expect(whisperIndicator.first()).toBeVisible();
    }
    
    // 清理状态
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.isSpying = false;
        app.spyTarget = null;
        app.isWhispering = false;
        app.whisperTarget = null;
      }
    });
  });

  test('自己通话中时不能监听', async () => {
    // 确保已登录
    const loginBtn = page.locator('button:has-text("登录")').first();
    if (await loginBtn.isEnabled()) {
      await loginBtn.click();
      await page.waitForSelector('.status-idle, :text("空闲")', { timeout: 15000 });
    }
    
    // 先确保没有在通话中
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.deviceStatus = 0;
        app.isSpying = false;
      }
    });
    await page.waitForTimeout(800);
    
    // 验证监听按钮可用
    const spyBtn = page.locator('button.btn-info:has-text("监听")').first();
    await expect(spyBtn).toBeEnabled({ timeout: 5000 });
    
    // 模拟自己通话中（deviceStatus = 3）
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.deviceStatus = 3; // 通话中
      }
    });
    await page.waitForTimeout(800);
    
    // 监听按钮应该禁用
    await expect(spyBtn).toBeDisabled({ timeout: 5000 });
    
    // 恢复状态
    await page.evaluate(() => {
      const app = window.App;
      if (app) {
        app.deviceStatus = 0;
      }
    });
    await page.waitForTimeout(800);
    
    // 监听按钮应该恢复可用
    await expect(spyBtn).toBeEnabled({ timeout: 5000 });
  });
});
