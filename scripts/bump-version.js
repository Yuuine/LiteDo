import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const VERSION_FILES = [
  {
    path: 'package.json',
    type: 'json',
    pattern: /"version"\s*:\s*"([^"]+)"/,
    replace: (version) => `"version": "${version}"`,
  },
  {
    path: 'src-tauri/tauri.conf.json',
    type: 'json',
    pattern: /"version"\s*:\s*"([^"]+)"/,
    replace: (version) => `"version": "${version}"`,
  },
  {
    path: 'src-tauri/Cargo.toml',
    type: 'toml',
    pattern: /^version\s*=\s*"([^"]+)"/m,
    replace: (version) => `version = "${version}"`,
  },
  {
    path: 'src/utils/dataExport.ts',
    type: 'ts',
    pattern: /const APP_VERSION\s*=\s*'([^']+)'/,
    replace: (version) => `const APP_VERSION = '${version}'`,
  },
];

function updatePackageLockJson(newVersion) {
  const lockPath = resolve(ROOT_DIR, 'package-lock.json');
  if (!existsSync(lockPath)) {
    console.log('跳过 (文件不存在)');
    return false;
  }

  try {
    execSync('npm install --package-lock-only --ignore-scripts --silent', {
      cwd: ROOT_DIR,
      stdio: 'pipe',
    });
    return true;
  } catch (error) {
    console.warn(`警告: npm install 失败，请手动运行 npm install 更新 package-lock.json`);
    return false;
  }
}

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`无效的版本号格式: ${version}`);
  }
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function formatVersion(major, minor, patch) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(currentVersion, bumpType) {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (bumpType) {
    case 'major':
      return formatVersion(major + 1, 0, 0);
    case 'minor':
      return formatVersion(major, minor + 1, 0);
    case 'patch':
      return formatVersion(major, minor, patch + 1);
    default:
      throw new Error(`未知的版本类型: ${bumpType}`);
  }
}

function getCurrentVersion() {
  const packageJsonPath = resolve(ROOT_DIR, 'package.json');
  const content = readFileSync(packageJsonPath, 'utf-8');
  const match = content.match(/"version"\s*:\s*"([^"]+)"/);
  if (!match) {
    throw new Error('无法从 package.json 读取当前版本号');
  }
  return match[1];
}

function updateFile(filePath, currentVersion, newVersion, config) {
  const fullPath = resolve(ROOT_DIR, filePath);
  let content = readFileSync(fullPath, 'utf-8');

  if (config.isGlobal) {
    const matches = content.matchAll(config.pattern);
    const versions = [...matches].map(m => m[1]);
    if (versions.length === 0) {
      console.warn(`  警告: 在 ${filePath} 中未找到版本号`);
      return false;
    }
    const nonMatchingVersions = versions.filter(v => v !== currentVersion);
    if (nonMatchingVersions.length > 0) {
      console.warn(`  警告: ${filePath} 中存在不一致的版本号: ${nonMatchingVersions.join(', ')}`);
    }
    content = content.replace(config.pattern, config.replace(newVersion));
  } else {
    const match = content.match(config.pattern);
    if (!match) {
      console.warn(`  警告: 在 ${filePath} 中未找到版本号`);
      return false;
    }
    const fileVersion = match[1];
    if (fileVersion !== currentVersion) {
      console.warn(`  警告: ${filePath} 中的版本号 (${fileVersion}) 与当前版本 (${currentVersion}) 不一致`);
    }
    content = content.replace(config.pattern, config.replace(newVersion));
  }

  writeFileSync(fullPath, content, 'utf-8');
  return true;
}

function validateNewVersion(newVersion, currentVersion) {
  const current = parseVersion(currentVersion);
  const newV = parseVersion(newVersion);

  if (
    newV.major < current.major ||
    (newV.major === current.major && newV.minor < current.minor) ||
    (newV.major === current.major && newV.minor === current.minor && newV.patch <= current.patch)
  ) {
    console.warn(`警告: 新版本号 ${newVersion} 不大于当前版本号 ${currentVersion}`);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
版本管理工具 - LiteDo

用法:
  node scripts/bump-version.js <版本号|类型>

参数:
  版本号    直接指定新版本号 (如: 1.2.0)
  类型      版本更新类型:
            - major  主版本号 (不兼容的 API 变更)
            - minor  次版本号 (向后兼容的功能新增)
            - patch  修订号 (向后兼容的问题修复)

示例:
  node scripts/bump-version.js 1.2.0    # 直接设置为 1.2.0
  node scripts/bump-version.js minor    # 次版本号 +1
  node scripts/bump-version.js patch    # 修订号 +1
`);
    process.exit(0);
  }

  const input = args[0];
  const currentVersion = getCurrentVersion();
  let newVersion;

  if (['major', 'minor', 'patch'].includes(input)) {
    newVersion = bumpVersion(currentVersion, input);
  } else {
    newVersion = input;
    validateNewVersion(newVersion, currentVersion);
  }

  console.log(`\n版本更新: ${currentVersion} -> ${newVersion}\n`);

  let successCount = 0;
  for (const config of VERSION_FILES) {
    process.stdout.write(`  更新 ${config.path}... `);
    try {
      if (updateFile(config.path, currentVersion, newVersion, config)) {
        console.log('成功');
        successCount++;
      }
    } catch (error) {
      console.log(`失败: ${error.message}`);
    }
  }

  process.stdout.write(`  更新 package-lock.json... `);
  try {
    if (updatePackageLockJson(newVersion)) {
      console.log('成功');
      successCount++;
    }
  } catch (error) {
    console.log(`失败: ${error.message}`);
  }

  console.log(`\n完成! 成功更新 ${successCount}/${VERSION_FILES.length + 1} 个文件`);
  console.log(`\n下一步:`);
  console.log(`  1. 检查变更: git diff`);
  console.log(`  2. 提交变更: git add . && git commit -m "chore: bump version to ${newVersion}"`);
}

main();
