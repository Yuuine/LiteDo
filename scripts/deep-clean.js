#!/usr/bin/env node

/**
 * 深度清理脚本
 * 用于清理所有缓存、编译文件和构建产物
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

console.log('🧹 开始深度清理项目...\n');

// 清理目录
const dirsToClean = [
  'node_modules',
  'dist',
  'dist-ssr',
  'build',
  '.cache',
  '.parcel-cache',
  'coverage',
  '.nyc_output',
  'tmp',
  'temp',
  'src-tauri/target',
  'src-tauri/WixTools',
];

// 清理文件
const filesToClean = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.eslintcache',
  '.stylelintcache',
];

// 清理文件模式
const patternsToClean = [
  /\.db$/,
  /\.db-journal$/,
  /\.db-wal$/,
  /\.db-shm$/,
  /\.sqlite$/,
  /\.sqlite3$/,
  /\.log$/,
  /\.tmp$/,
  /\.temp$/,
];

function findFiles(dir, patterns) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // 跳过特定目录
        if (['node_modules', 'target', '.git'].includes(item.name)) {
          continue;
        }
        results.push(...findFiles(fullPath, patterns));
      } else if (item.isFile()) {
        const ext = path.extname(item.name);
        if (patterns.some(pattern => pattern.test(ext))) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // 忽略权限错误
  }
  
  return results;
}

function cleanDirectories() {
  console.log('📁 清理目录...');
  
  let cleanedCount = 0;
  
  dirsToClean.forEach(dir => {
    const fullPath = path.join(projectRoot, dir);
    
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`  ✓ 已删除: ${dir}`);
        cleanedCount++;
      } catch (error) {
        console.log(`  ✗ 删除失败: ${dir} - ${error.message}`);
      }
    }
  });
  
  if (cleanedCount === 0) {
    console.log('  ℹ️  没有需要清理的目录');
  }
  
  console.log(`  📊 共清理 ${cleanedCount} 个目录\n`);
}

function cleanFiles() {
  console.log('📄 清理文件...');
  
  let cleanedCount = 0;
  
  filesToClean.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`  ✓ 已删除: ${file}`);
        cleanedCount++;
      } catch (error) {
        console.log(`  ✗ 删除失败: ${file} - ${error.message}`);
      }
    }
  });
  
  if (cleanedCount === 0) {
    console.log('  ℹ️  没有需要清理的文件');
  }
  
  console.log(`  📊 共清理 ${cleanedCount} 个文件\n`);
}

function cleanPatternFiles() {
  console.log('🔍 清理匹配文件...');
  
  const files = findFiles(projectRoot, patternsToClean);
  
  if (files.length === 0) {
    console.log('  ℹ️  没有需要清理的匹配文件\n');
    return;
  }
  
  files.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(`  ✓ 已删除: ${path.relative(projectRoot, file)}`);
    } catch (error) {
      console.log(`  ✗ 删除失败: ${path.relative(projectRoot, file)} - ${error.message}`);
    }
  });
  
  console.log(`  📊 共清理 ${files.length} 个匹配文件\n`);
}

function showSummary() {
  console.log('✅ 清理完成！\n');
  console.log('📋 清理内容总结：');
  console.log('  • node_modules/ - Node.js 依赖');
  console.log('  • dist/ - 前端构建产物');
  console.log('  • src-tauri/target/ - Rust 编译产物');
  console.log('  • *.db, *.sqlite - 数据库文件');
  console.log('  • *.log - 日志文件');
  console.log('  • *.tmp, *.temp - 临时文件');
  console.log('  • 缓存文件和目录\n');
  
  console.log('💡 下一步操作：');
  console.log('  1. 运行 npm install 重新安装依赖');
  console.log('  2. 运行 npm run dev 启动开发服务器');
  console.log('  3. 运行 npm run build 构建项目\n');
}

// 执行清理
cleanDirectories();
cleanFiles();
cleanPatternFiles();
showSummary();
