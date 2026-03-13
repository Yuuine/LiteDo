# LiteDo - 轻量级待办事项应用

<div align="center">

<img src="./screenshots/logo.svg" alt="LiteDo Logo" width="200">

**简洁、高效的 Windows 桌面待办事项管理工具**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/yuuine/litedo/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](https://github.com/yuuine/litedo/releases)

</div>

## ✨ 功能特性

### 核心功能

- 📝 **待办事项管理** - 快速添加、编辑、删除和完成任务
- 📅 **日期筛选** - 按日期查看任务，支持日历选择
- 🎨 **主题自定义** - 9种预设主题色 + 自定义颜色
- ⚙️ **灵活配置** - 自定义待办事项字数限制（10-200字）

### 其他功能

- 📊 **任务统计** - 实时显示任务完成情况
- 📋 **操作日志** - 记录所有用户操作
- 🐛 **调试日志** - 详细的系统运行日志
- 🎯 **系统日志** - 记录所有系统交互操作

</div>

## 🚀 快速开始

### 下载安装

前往 [Releases](https://github.com/yuuine/litedo/releases) 页面下载对应平台的安装包：

#### Windows

- **MSI 安装包**：`LiteDo_1.0.0_x64_en-US.msi`
- **NSIS 安装包**：`LiteDo_1.0.0_x64-setup.exe`

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/yuuine/litedo.git
cd litedo

# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建发布版本
npm run tauri build
```

## 🛠️ 技术栈

### 前端

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Pinia** - Vue 状态管理
- **Vite** - 前端构建工具

### 后端

- **Tauri 2.0** - 构建更小、更快、更安全的桌面应用
- **Rust** - 系统编程语言
- **SQLite** - 轻量级数据库

### 开发工具

- **Vue DevTools** - Vue 调试工具
- **Rust Analyzer** - Rust 语言服务器

## 📁 项目结构

```
LiteDo/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── stores/            # Pinia 状态管理
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型定义
│   └── styles/            # 样式文件
├── src-tauri/             # Tauri 后端
│   ├── src/               # Rust 源码
│   ├── icons/             # 应用图标
│   └── Cargo.toml         # Rust 配置
├── dist/                  # 构建输出
└── package.json           # 项目配置
```

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 编写前端代码
- 遵循 Vue 3 组合式 API 风格
- Rust 代码遵循官方规范
- 提交信息遵循 [约定式提交](https://www.conventionalcommits.org/)

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的版本更新历史。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢以下开源项目：

- [Tauri](https://tauri.app/) - 构建桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理
- [Vite](https://vitejs.dev/) - 前端构建工具

***

<div align="center">

Made with ❤️ by Yuuine

</div>
