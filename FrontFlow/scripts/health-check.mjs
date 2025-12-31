#!/usr/bin/env node

/**
 * FreeFlow Health Check Script
 * Validates build health, CORS, and React mounting
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(path, description) {
  if (existsSync(path)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing: ${path}`, 'red');
    return false;
  }
}

function checkImport(filePath, importPath, description) {
  try {
    const content = readFileSync(filePath, 'utf8');
    if (content.includes(importPath)) {
      log(`✅ ${description}`, 'green');
      return true;
    } else {
      log(`❌ ${description} - Missing import: ${importPath}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - Error reading file: ${error.message}`, 'red');
    return false;
  }
}

async function checkDevServer() {
  try {
    log('\n🔍 Checking dev server health...', 'blue');
    
    // Check if dev server is running
    const result = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5173', { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    if (result.trim() === '200') {
      log('✅ Dev server is running on port 5173', 'green');
      return true;
    } else {
      log(`❌ Dev server returned status: ${result}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Dev server is not running or not accessible', 'red');
    log('   Run: npm run dev', 'yellow');
    return false;
  }
}

async function checkCORS() {
  try {
    log('\n🌐 Checking CORS configuration...', 'blue');
    
    const viteConfig = readFileSync('vite.config.ts', 'utf8');
    if (viteConfig.includes('cors') || viteConfig.includes('proxy')) {
      log('✅ CORS/proxy configuration found in vite.config.ts', 'green');
    } else {
      log('⚠️  No explicit CORS configuration found', 'yellow');
    }
    
    return true;
  } catch (error) {
    log('❌ Error checking CORS configuration', 'red');
    return false;
  }
}

function checkReactMounting() {
  log('\n⚛️  Checking React mounting...', 'blue');
  
  const indexHtml = readFileSync('index.html', 'utf8');
  const mainTsx = readFileSync('src/main.tsx', 'utf8');
  
  const checks = [
    checkFile('index.html', 'index.html exists'),
    checkFile('src/main.tsx', 'main.tsx exists'),
    indexHtml.includes('id="root"') ? log('✅ React root element found in index.html', 'green') : log('❌ React root element missing in index.html', 'red'),
    mainTsx.includes('ReactDOM.createRoot') ? log('✅ React 18 createRoot found', 'green') : log('❌ React 18 createRoot missing', 'red'),
    mainTsx.includes('document.getElementById("root")') ? log('✅ Root element selector found', 'green') : log('❌ Root element selector missing', 'red')
  ];
  
  return checks.every(check => check !== false);
}

function checkESModules() {
  log('\n📦 Checking ES Module structure...', 'blue');
  
  const checks = [
    checkFile('src/hooks/useSpeech.js', 'useSpeech hook'),
    checkFile('src/hooks/useOrders.js', 'useOrders hook'),
    checkFile('src/components/SideMenu.jsx', 'SideMenu component'),
    checkFile('src/components/AnimatedCards.jsx', 'AnimatedCards component'),
    checkFile('src/pages/Main.jsx', 'Main page'),
    checkImport('src/components/VoicePanel.jsx', 'import { useSpeech }', 'VoicePanel uses useSpeech hook'),
    checkImport('src/pages/Main.jsx', 'import { useSpeech }', 'Main page imports useSpeech'),
    checkImport('src/pages/Main.jsx', 'import { useOrders }', 'Main page imports useOrders')
  ];
  
  return checks.every(check => check !== false);
}

function checkMotionOptimization() {
  log('\n🎬 Checking Motion optimization...', 'blue');
  
  const voicePanel = readFileSync('src/components/VoicePanel.jsx', 'utf8');
  const animatedCards = readFileSync('src/components/AnimatedCards.jsx', 'utf8');
  
  const checks = [
    voicePanel.includes('variants') ? log('✅ VoicePanel uses motion variants', 'green') : log('❌ VoicePanel missing motion variants', 'red'),
    voicePanel.includes('AnimatePresence') ? log('✅ VoicePanel uses AnimatePresence', 'green') : log('❌ VoicePanel missing AnimatePresence', 'red'),
    animatedCards.includes('staggerChildren') ? log('✅ AnimatedCards uses staggerChildren', 'green') : log('❌ AnimatedCards missing staggerChildren', 'red'),
    animatedCards.includes('whileHover') ? log('✅ AnimatedCards uses whileHover', 'green') : log('❌ AnimatedCards missing whileHover', 'red')
  ];
  
  return checks.every(check => check !== false);
}

async function main() {
  log('🚀 FreeFlow Health Check Starting...', 'bold');
  log('=====================================', 'blue');
  
  const results = {
    files: checkESModules(),
    react: checkReactMounting(),
    motion: checkMotionOptimization(),
    cors: await checkCORS(),
    devServer: await checkDevServer()
  };
  
  log('\n📊 Health Check Summary:', 'bold');
  log('========================', 'blue');
  
  Object.entries(results).forEach(([key, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} ${key.toUpperCase()}`, color);
  });
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    log('\n🎉 All health checks passed! FreeFlow is ready to rock!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some health checks failed. Please review the issues above.', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n💥 Health check failed with error: ${error.message}`, 'red');
  process.exit(1);
});