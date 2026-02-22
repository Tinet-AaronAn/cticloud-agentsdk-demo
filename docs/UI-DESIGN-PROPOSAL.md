# cticloud-agentsdk-demo UI 重设计方案

**设计师**: 宋绘（Design Agent）
**参考**: zenava.ai
**日期**: 2026-02-22

---

## 🎨 设计风格提取

### Zenava.ai 核心特征

| 维度 | 特征 |
|------|------|
| **配色** | 蓝紫渐变 `#6366f1 → #06b6d4`，白色背景，紫色 CTA `#6438FF` |
| **圆角** | 大圆角 `rounded-3xl`，按钮全圆 `rounded-full` |
| **阴影** | 柔和阴影 `shadow-xl`，悬停增强 `hover:shadow-lg` |
| **渐变背景** | `bg-gradient-to-tr from-blue-200 via-purple-200 to-pink-200` |
| **卡片** | 白底、大圆角、图标带渐变圆背景 |
| **按钮** | 渐变主按钮、白底描边次按钮 |

---

## 📐 设计规范

### 配色方案

```css
:root {
  /* 主色 - 紫蓝渐变 */
  --primary: #6366f1;
  --primary-light: #818cf8;
  --primary-dark: #4f46e5;
  
  /* 强调色 */
  --accent: #6438FF;
  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
  
  /* 功能色 */
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  
  /* 中性色 */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-500: #6b7280;
  --gray-700: #374151;
  --gray-900: #111827;
  
  /* 背景 */
  --bg-gradient: linear-gradient(to top right, #dbeafe, #e9d5ff, #fce7f3);
}
```

### 圆角规范

| 组件 | 圆角值 | Tailwind 类 |
|------|--------|-------------|
| 卡片/面板 | 24px | `rounded-3xl` |
| 按钮（主） | 全圆 | `rounded-full` |
| 按钮（次） | 12px | `rounded-xl` |
| 输入框 | 12px | `rounded-xl` |
| 图标容器 | 16px | `rounded-2xl` |
| 标签/Badge | 全圆 | `rounded-full` |

### 间距规范

| 场景 | 间距 | Tailwind 类 |
|------|------|-------------|
| 页面内边距（桌面） | 32px | `p-8` |
| 卡片内边距 | 40px | `p-10` |
| 组件间距 | 24px | `gap-6` |
| 按钮内边距 | 12px 24px | `px-6 py-3` |

---

## 🖼️ 页面布局重设计

### 1. 导航栏

```
┌─────────────────────────────────────────────────────────────────┐
│  🦞 CTICloud AgentSDK    [配置] [主题]        状态: 空闲 🟢      │
└─────────────────────────────────────────────────────────────────┘
```

**设计要点：**
- 毛玻璃效果：`backdrop-blur-md bg-white/95`
- 固定顶部：`fixed top-0`
- 渐变 Logo：紫色渐变
- 状态徽章：圆角胶囊，带颜色指示

### 2. 主面板布局（重设计）

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  📞 连接控制                                              │   │
│   │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                │   │
│   │  │ 登录  │ │ 登出  │ │ 外呼  │ │ 一键  │                │   │
│   │  │  ●    │ │  ○    │ │  ○    │ │ 自测  │                │   │
│   │  └───────┘ └───────┘ └───────┘ └───────┘                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────┐   ┌─────────────────────────────┐     │
│   │  🎧 软电话控制       │   │  📋 事件日志                │     │
│   │                     │   │                             │     │
│   │  ┌─────┐  ┌─────┐   │   │  过滤: [全部 ▼]            │     │
│   │  │接听 │  │挂断 │   │   │  ─────────────────────      │     │
│   │  └─────┘  └─────┘   │   │  🔵 AGENT_STATUS            │     │
│   │                     │   │  🔵 PREVIEW_OBCALL           │     │
│   │  ┌─────┐  ┌─────┐   │   │  🟢 MAKE_CALL               │     │
│   │  │静音 │  │保持 │   │   │                             │     │
│   │  └─────┘  └─────┘   │   │                             │     │
│   └─────────────────────┘   └─────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 组件设计

### 按钮样式

```html
<!-- 主按钮 - 渐变紫蓝 -->
<button class="px-6 py-3 rounded-full font-medium text-white 
               bg-gradient-to-r from-indigo-500 to-cyan-500
               hover:shadow-lg hover:scale-105 transition-all duration-300">
  登录
</button>

<!-- 次按钮 - 白底描边 -->
<button class="px-6 py-3 rounded-full font-medium text-gray-900
               bg-white border-2 border-gray-900
               hover:bg-gray-50 transition-all duration-300">
  配置
</button>

<!-- 禁用状态 -->
<button class="px-6 py-3 rounded-full font-medium text-gray-400
               bg-gray-100 cursor-not-allowed" disabled>
  外呼
</button>

<!-- 图标按钮 -->
<button class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500
               flex items-center justify-center text-white text-xl
               hover:shadow-lg transition-all duration-300">
  <i class="fas fa-phone"></i>
</button>
```

### 卡片样式

```html
<div class="bg-white rounded-3xl p-8 md:p-10 shadow-xl">
  <div class="flex items-center mb-6">
    <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 
                rounded-2xl flex items-center justify-center flex-shrink-0 mr-4">
      <i class="fas fa-headset text-white text-2xl"></i>
    </div>
    <h3 class="text-2xl font-bold text-gray-900">连接控制</h3>
  </div>
  <!-- 卡片内容 -->
</div>
```

### 状态徽章

```html
<!-- 在线/空闲 -->
<span class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium
             bg-green-100 text-green-800">
  <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
  空闲
</span>

<!-- 离线 -->
<span class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium
             bg-gray-100 text-gray-600">
  <span class="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
  离线
</span>

<!-- 通话中 -->
<span class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium
             bg-blue-100 text-blue-800">
  <span class="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
  通话中
</span>
```

### 事件日志项

```html
<div class="flex items-center space-x-3 py-3 border-b border-gray-100 
            hover:bg-gray-50 px-4 rounded-xl transition-colors">
  <div class="w-2 h-2 rounded-full bg-blue-500"></div>
  <code class="text-sm font-mono text-indigo-600">AGENT_STATUS</code>
  <span class="text-sm text-gray-500">14:32:15</span>
  <span class="text-sm text-gray-700 flex-1 truncate">座席状态变更: 空闲</span>
</div>
```

### 配置面板（Offcanvas 重设计）

```html
<div class="offcanvas offcanvas-end w-96 bg-white rounded-l-3xl shadow-2xl">
  <div class="p-8">
    <div class="flex items-center justify-between mb-8">
      <h3 class="text-2xl font-bold text-gray-900">配置</h3>
      <button class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center
                     hover:bg-gray-200 transition-colors">
        <i class="fas fa-times text-gray-500"></i>
      </button>
    </div>
    
    <div class="space-y-6">
      <!-- 输入组 -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">baseURL</label>
        <input type="text" placeholder="https://..."
               class="w-full px-4 py-3 rounded-xl border border-gray-200
                      focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      transition-all duration-200">
      </div>
      
      <!-- ... 其他输入 -->
    </div>
    
    <!-- 应用按钮 -->
    <button class="w-full mt-8 px-6 py-4 rounded-xl font-medium text-white
                   bg-gradient-to-r from-indigo-500 to-cyan-500
                   hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
      应用配置
    </button>
  </div>
</div>
```

---

## 🌈 渐变背景方案

### 页面背景

```html
<body class="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-pink-100">
```

### 卡片区域背景

```html
<section class="py-16 bg-gradient-to-tr from-blue-200 via-purple-200 to-pink-200">
  <div class="max-w-7xl mx-auto px-8">
    <!-- 卡片网格 -->
  </div>
</section>
```

---

## 📱 响应式适配

### 断点设计

| 断点 | Tailwind | 调整 |
|------|----------|------|
| 手机 | `sm` (640px) | 单列布局，按钮全宽 |
| 平板 | `md` (768px) | 双列布局 |
| 桌面 | `lg` (1024px) | 四列按钮，侧边日志 |

### 移动端调整

```html
<!-- 手机端：单列 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- 按钮 -->
</div>

<!-- 手机端：按钮全宽 -->
<button class="w-full md:w-auto px-6 py-3 rounded-full ...">
  登录
</button>
```

---

## ✨ 动效设计

### 悬停效果

```css
/* 按钮悬停 */
.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.3);
}

/* 卡片悬停 */
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
}
```

### 状态指示动画

```css
/* 在线状态闪烁 */
.status-online::before {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 📦 实施清单

### 阶段 1：样式基础

- [ ] 引入 Tailwind CSS（或自定义 CSS 变量）
- [ ] 定义配色变量
- [ ] 定义组件样式类

### 阶段 2：组件重设计

- [ ] 导航栏：毛玻璃效果 + 渐变 Logo
- [ ] 按钮：渐变主按钮 + 描边次按钮
- [ ] 卡片：圆角 + 阴影 + 图标容器
- [ ] 状态徽章：圆角胶囊 + 颜色指示
- [ ] 配置面板：圆角 + 柔和阴影

### 阶段 3：布局调整

- [ ] 页面背景渐变
- [ ] 响应式网格
- [ ] 间距优化

### 阶段 4：动效添加

- [ ] 悬停效果
- [ ] 状态动画
- [ ] 过渡动画

---

## 🎯 设计目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 视觉现代感 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 专业感 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 易用性 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 品牌一致性 | ⭐⭐ | ⭐⭐⭐⭐ |

---

**下一步**: 是否需要我（行兵）开始实现这个 UI 设计？
