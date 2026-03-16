# 脚本使用指南

本文档介绍 LiteDo 项目中提供的自动化脚本及其使用方法。

## 目录

- [版本管理脚本](#版本管理脚本)
- [发布前清理脚本](#发布前清理脚本)
- [深度清理脚本](#深度清理脚本)
- [npm scripts 快捷命令](#npm-scripts-快捷命令)

---

## 版本管理脚本

**文件路径**: `scripts/bump-version.js`

### 功能说明

自动更新项目中所有版本号定义，确保版本一致性。脚本会同时更新以下文件：

| 文件 | 说明 |
|------|------|
| `package.json` | Node.js 项目配置 |
| `package-lock.json` | 依赖锁定文件 |
| `src-tauri/tauri.conf.json` | Tauri 应用配置 |
| `src-tauri/Cargo.toml` | Rust 项目配置 |
| `src/utils/dataExport.ts` | 导出功能中的版本常量 |

### 使用方法

#### 直接指定版本号

```bash
node scripts/bump-version.js 1.2.0
```

#### 使用语义化版本类型

```bash
# 修订号 +1 (修复 bug)
node scripts/bump-version.js patch
# 1.1.2 -> 1.1.3

# 次版本号 +1 (新增功能，向后兼容)
node scripts/bump-version.js minor
# 1.1.2 -> 1.2.0

# 主版本号 +1 (重大变更，不兼容)
node scripts/bump-version.js major
# 1.1.2 -> 2.0.0
```

#### 通过 npm scripts

```bash
npm run version 1.2.0
npm run version:patch
npm run version:minor
npm run version:major
```

### 输出示例

```
版本更新: 1.1.2 -> 1.1.3

  更新 package.json... 成功
  更新 src-tauri/tauri.conf.json... 成功
  更新 src-tauri/Cargo.toml... 成功
  更新 src/utils/dataExport.ts... 成功
  更新 package-lock.json... 成功

完成! 成功更新 5/5 个文件

下一步:
  1. 检查变更: git diff
  2. 提交变更: git add . && git commit -m "chore: bump version to 1.1.3"
```

---

## 发布前清理脚本

**文件路径**: `scripts/clean-before-release.js`

### 功能说明

在发布前清理测试数据和临时文件，确保不会意外提交到 Git 仓库。

### 清理内容

| 类型 | 文件模式 |
|------|----------|
| 数据库文件 | `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`, `*.sqlite`, `*.sqlite3` |
| 日志文件 | `*.log`, `logs/**` |
| 临时文件 | `*.tmp`, `*.temp`, `tmp/**`, `temp/**` |
| 构建产物 | `dist/**`, `src-tauri/target/**` |
| 缓存文件 | `.cache/**`, `.eslintcache`, `.stylelintcache` |

### 使用方法

```bash
node scripts/clean-before-release.js
```

或通过 npm scripts：

```bash
npm run clean
```

### 输出示例

```
🧹 开始清理测试数据...

发现 3 个文件需要清理：

✓ 已删除: test.db
✓ 已删除: debug.log
✓ 已删除: temp.tmp

✅ 清理完成！共删除 3 个文件

📋 检查 .gitignore 配置...

✅ .gitignore 配置完整

🎉 准备工作完成，可以安全提交到 Git 仓库了！
```

---

## 深度清理脚本

**文件路径**: `scripts/deep-clean.js`

### 功能说明

深度清理项目，删除所有缓存、编译文件和构建产物。适用于解决构建问题或准备全新环境。

### 清理内容

| 类型 | 内容 |
|------|------|
| 依赖目录 | `node_modules/` |
| 构建产物 | `dist/`, `dist-ssr/`, `build/` |
| Rust 编译产物 | `src-tauri/target/`, `src-tauri/WixTools/` |
| 缓存目录 | `.cache/`, `.parcel-cache/`, `coverage/`, `.nyc_output/` |
| 锁文件 | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` |
| 数据库文件 | `*.db`, `*.sqlite` 等 |
| 日志文件 | `*.log` |
| 临时文件 | `*.tmp`, `*.temp` |

### 使用方法

```bash
node scripts/deep-clean.js
```

或通过 npm scripts：

```bash
npm run clean:deep
```

### 输出示例

```
🧹 开始深度清理项目...

📁 清理目录...
  ✓ 已删除: node_modules
  ✓ 已删除: dist
  ✓ 已删除: src-tauri/target
  📊 共清理 3 个目录

📄 清理文件...
  ✓ 已删除: package-lock.json
  📊 共清理 1 个文件

🔍 清理匹配文件...
  ℹ️  没有需要清理的匹配文件

✅ 清理完成！

📋 清理内容总结：
  • node_modules/ - Node.js 依赖
  • dist/ - 前端构建产物
  • src-tauri/target/ - Rust 编译产物
  • *.db, *.sqlite - 数据库文件
  • *.log - 日志文件
  • *.tmp, *.temp - 临时文件
  • 缓存文件和目录

💡 下一步操作：
  1. 运行 npm install 重新安装依赖
  2. 运行 npm run dev 启动开发服务器
  3. 运行 npm run build 构建项目
```

---

## npm scripts 快捷命令

在 `package.json` 中定义的快捷命令：

| 命令 | 说明 |
|------|------|
| `npm run version <版本号>` | 设置指定版本号 |
| `npm run version:patch` | 修订号 +1 |
| `npm run version:minor` | 次版本号 +1 |
| `npm run version:major` | 主版本号 +1 |
| `npm run clean` | 发布前清理 |
| `npm run clean:deep` | 深度清理 |
| `npm run clean:all` | 执行深度清理和发布前清理 |

---

## 常见工作流程

### 发布新版本

```bash
# 1. 更新版本号
npm run version:patch

# 2. 清理测试数据
npm run clean

# 3. 检查变更
git diff

# 4. 提交变更
git add .
git commit -m "chore: bump version to x.x.x"

# 5. 构建发布
npm run tauri build
```

### 解决构建问题

```bash
# 1. 深度清理
npm run clean:deep

# 2. 重新安装依赖
npm install

# 3. 重新构建
npm run build
```
