# 项目清理和维护脚本

## 🧹 清理脚本

### 功能
`clean-before-release.js` 脚本用于在发布前清理测试数据和临时文件。

### 使用方法

```bash
# 手动运行清理
npm run clean

# 构建时自动清理（已配置 prebuild 钩子）
npm run build
```

### 清理内容

脚本会自动清理以下文件：

#### 数据库文件
- `*.db` - SQLite 数据库文件
- `*.db-journal` - SQLite 日志文件
- `*.db-wal` - SQLite WAL 文件
- `*.db-shm` - SQLite 共享内存文件
- `*.sqlite` - SQLite 数据库文件
- `*.sqlite3` - SQLite3 数据库文件

#### 日志文件
- `*.log` - 所有日志文件
- `logs/` - 日志目录

#### 临时文件
- `*.tmp` - 临时文件
- `*.temp` - 临时文件
- `tmp/` - 临时目录
- `temp/` - 临时目录

#### 构建产物
- `dist/` - 前端构建输出
- `src-tauri/target/` - Rust 构建输出

#### 缓存文件
- `.cache/` - 缓存目录
- `.eslintcache` - ESLint 缓存
- `.stylelintcache` - Stylelint 缓存

## 📋 .gitignore 配置

项目已配置完整的 `.gitignore` 文件，确保以下内容不会上传到 Git：

### 已忽略的内容
- ✅ 依赖目录 (`node_modules/`)
- ✅ 构建产物 (`dist/`, `src-tauri/target/`)
- ✅ 数据库文件 (`*.db`, `*.sqlite`)
- ✅ 日志文件 (`*.log`)
- ✅ 临时文件 (`*.tmp`, `*.temp`)
- ✅ 环境变量 (`.env`)
- ✅ 编辑器配置 (`.vscode/`, `.idea/`)
- ✅ 系统文件 (`.DS_Store`, `Thumbs.db`)
- ✅ 压缩文件 (`*.zip`, `*.tgz`)

### 特殊配置
- `screenshots/*.png` - 忽略截图文件，但保留 `screenshots/README.md`
- `RELEASE_GUIDE.md` - 发布指南仅本地使用，不上传

## 🔍 检查清单

在提交代码前，请确保：

- [ ] 运行 `npm run clean` 清理测试数据
- [ ] 检查 `.gitignore` 配置是否完整
- [ ] 确认没有提交敏感信息（API密钥、密码等）
- [ ] 确认没有提交数据库文件
- [ ] 确认没有提交日志文件
- [ ] 确认没有提交临时文件

## 🚀 发布流程

1. **清理测试数据**
   ```bash
   npm run clean
   ```

2. **检查 Git 状态**
   ```bash
   git status
   ```

3. **添加文件**
   ```bash
   git add .
   ```

4. **提交更改**
   ```bash
   git commit -m "chore: clean up before release"
   ```

5. **构建发布版本**
   ```bash
   npm run tauri build
   ```

6. **推送到 GitHub**
   ```bash
   git push origin main
   ```

## ⚠️ 注意事项

### 不要提交的文件

以下文件包含用户数据或测试数据，**绝对不要**提交到 Git：

- `litedo.db` - 应用数据库
- `operation.log` - 操作日志
- `debug.log` - 调试日志
- `system.log` - 系统日志

### 数据存储位置

应用运行时，数据存储在系统应用数据目录：

- **Windows**: `%APPDATA%\com.litedo.desktop\`
- **macOS**: `~/Library/Application Support/com.litedo.desktop/`
- **Linux**: `~/.config/com.litedo.desktop/`

这些目录中的文件不会影响 Git 仓库，因为它们在项目目录之外。

## 🛠️ 故障排除

### 问题：清理脚本无法删除文件

**解决方案**：
1. 确保文件没有被其他程序占用
2. 关闭正在运行的应用
3. 以管理员权限运行脚本

### 问题：Git 仍然追踪某些文件

**解决方案**：
1. 检查 `.gitignore` 配置
2. 从 Git 缓存中移除文件：
   ```bash
   git rm --cached <file>
   git commit -m "chore: remove tracked file"
   ```

### 问题：构建产物被提交

**解决方案**：
1. 运行清理脚本
2. 从 Git 中移除：
   ```bash
   git rm -r --cached dist/
   git rm -r --cached src-tauri/target/
   git commit -m "chore: remove build artifacts"
   ```

## 📚 相关文档

- [README.md](../README.md) - 项目主文档
- [RELEASE_GUIDE.md](../RELEASE_GUIDE.md) - 发布指南
- [CHANGELOG.md](../CHANGELOG.md) - 更新日志
