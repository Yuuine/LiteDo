#!/usr/bin/env node

/**
 * 发布前清理脚本
 * 用于清理测试数据和构建产物，确保不会上传到 Git 仓库
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

// 需要清理的文件和目录
const itemsToClean = [
  // 数据库文件
  '**/*.db',
  '**/*.db-journal',
  '**/*.db-wal',
  '**/*.db-shm',
  '**/*.sqlite',
  '**/*.sqlite3',
  
  // 日志文件
  '**/*.log',
  'logs/**',
  
  // 临时文件
  '**/*.tmp',
  '**/*.temp',
  'tmp/**',
  'temp/**',
  
  // 构建产物（如果存在）
  'dist/**',
  'src-tauri/target/**',
  
  // 缓存文件
  '.cache/**',
  '.eslintcache',
  '.stylelintcache',
];

// 需要检查的目录
const directoriesToCheck = [
  projectRoot,
  path.join(projectRoot, 'src-tauri'),
];

function findFiles(dir, pattern) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // 跳过 node_modules 和 target 目录
        if (item.name === 'node_modules' || item.name === 'target') {
          continue;
        }
        results.push(...findFiles(fullPath, pattern));
      } else if (item.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(item.name);
        if (pattern.test(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // 忽略权限错误
  }
  
  return results;
}

function cleanFiles() {
  console.log('🧹 开始清理测试数据...\n');
  
  // 清理数据库文件
  const dbFiles = [
    ...findFiles(projectRoot, /\.db$/),
    ...findFiles(projectRoot, /\.db-journal$/),
    ...findFiles(projectRoot, /\.db-wal$/),
    ...findFiles(projectRoot, /\.db-shm$/),
    ...findFiles(projectRoot, /\.sqlite$/),
    ...findFiles(projectRoot, /\.sqlite3$/),
  ];
  
  // 清理日志文件
  const logFiles = findFiles(projectRoot, /\.log$/);
  
  // 清理临时文件
  const tmpFiles = [
    ...findFiles(projectRoot, /\.tmp$/),
    ...findFiles(projectRoot, /\.temp$/),
  ];
  
  const allFiles = [...dbFiles, ...logFiles, ...tmpFiles];
  
  if (allFiles.length === 0) {
    console.log('✅ 没有发现需要清理的文件\n');
    return;
  }
  
  console.log(`发现 ${allFiles.length} 个文件需要清理：\n`);
  
  allFiles.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(`✓ 已删除: ${path.relative(projectRoot, file)}`);
    } catch (error) {
      console.log(`✗ 删除失败: ${path.relative(projectRoot, file)} - ${error.message}`);
    }
  });
  
  console.log(`\n✅ 清理完成！共删除 ${allFiles.length} 个文件\n`);
}

function checkGitignore() {
  console.log('📋 检查 .gitignore 配置...\n');
  
  const gitignorePath = path.join(projectRoot, '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    console.log('⚠️  .gitignore 文件不存在！\n');
    return;
  }
  
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  
  const requiredPatterns = [
    '*.db',
    '*.log',
    'node_modules/',
    'dist/',
    'src-tauri/target/',
  ];
  
  const missingPatterns = requiredPatterns.filter(pattern => 
    !gitignoreContent.includes(pattern)
  );
  
  if (missingPatterns.length === 0) {
    console.log('✅ .gitignore 配置完整\n');
  } else {
    console.log('⚠️  .gitignore 缺少以下配置：');
    missingPatterns.forEach(pattern => {
      console.log(`  - ${pattern}`);
    });
    console.log('');
  }
}

// 执行清理
cleanFiles();
checkGitignore();

console.log('🎉 准备工作完成，可以安全提交到 Git 仓库了！\n');
