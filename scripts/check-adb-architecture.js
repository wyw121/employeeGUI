#!/usr/bin/env node
/**
 * ADB 架构合规性检查脚本
 * 检测项目中是否存在分散的 ADB 设备状态管理模式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 检查规则配置
const RULES = {
  // 禁止的模式
  FORBIDDEN_PATTERNS: [
    {
      pattern: /useState.*<.*Device\[\].*>/g,
      message: '发现分散的设备状态管理：useState<Device[]>',
      severity: 'error'
    },
    {
      pattern: /useDevices(?!\(\))/g, // useDevices 但不是 useDevices()
      message: '使用了已废弃的 useDevices Hook',
      severity: 'error'
    },
    {
      pattern: /useAdbDevices/g,
      message: '使用了已废弃的 useAdbDevices Hook',
      severity: 'error'
    },
    {
      pattern: /useAdbDiagnostic/g,
      message: '使用了已废弃的 useAdbDiagnostic Hook',
      severity: 'error'
    },
    {
      pattern: /useDeviceMonitor/g,
      message: '使用了已废弃的 useDeviceMonitor Hook',
      severity: 'error'
    },
    {
      pattern: /import.*adbService/g,
      message: '直接导入了 adbService，应使用 useAdb() 统一接口',
      severity: 'warning'
    },
    {
      pattern: /import.*AdbDiagnosticService/g,
      message: '直接导入了 AdbDiagnosticService，应使用 useAdb() 统一接口',
      severity: 'warning'
    }
  ],

  // 推荐的模式
  RECOMMENDED_PATTERNS: [
    {
      pattern: /useAdb\(\)/g,
      message: '✅ 正确使用统一的 useAdb() 接口',
      severity: 'info'
    },
    {
      pattern: /useAdbStore/g,
      message: '✅ 使用统一的状态管理',
      severity: 'info'
    }
  ],

  // 允许的例外情况
  ALLOWED_EXCEPTIONS: [
    {
      file: /ContactImportManager\.tsx$/,
      pattern: /useState.*DeviceContactGroup/,
      reason: '设备联系人分组是合理的UI状态'
    },
    {
      file: /ContactImportWizard\.tsx$/,
      pattern: /useState.*<.*Device.*\[\].*>/,
      reason: '设备选择UI的临时状态，符合架构设计'
    },
    {
      file: /useRealTimeDevices\.ts$/,
      pattern: /useState.*<.*TrackedDevice\[\].*>/,
      reason: 'RealTimeDevices Hook管理TrackedDevice[]是合理的'
    }
  ]
};

// 需要检查的文件扩展名
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// 排除的目录
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', '.git', 'src-tauri'];

class ArchitectureChecker {
  constructor() {
    this.violations = [];
    this.recommendations = [];
    this.stats = {
      filesChecked: 0,
      totalViolations: 0,
      errorViolations: 0,
      warningViolations: 0
    };
  }

  /**
   * 检查单个文件
   */
  checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(path.dirname(__dirname), filePath);
    
    this.stats.filesChecked++;

    // 检查禁止的模式
    for (const rule of RULES.FORBIDDEN_PATTERNS) {
      // ✅ 先移除注释行，再进行匹配检查
      const codeOnlyContent = content.split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
        })
        .join('\n');
        
      const matches = codeOnlyContent.match(rule.pattern);
      if (matches) {
        // 检查是否是允许的例外
        const isAllowed = RULES.ALLOWED_EXCEPTIONS.some(exception => {
          const fileMatches = exception.file.test(filePath);
          if (!fileMatches) return false;
          
          // 如果没有指定 pattern，只检查文件名
          if (!exception.pattern) return true;
          
          // 检查是否匹配例外模式
          return exception.pattern.test(codeOnlyContent);
        });

        if (!isAllowed) {
          this.violations.push({
            file: relativePath,
            rule: rule.message,
            severity: rule.severity,
            matches: matches.length,
            lines: this.findMatchingLines(content, rule.pattern)
          });

          if (rule.severity === 'error') {
            this.stats.errorViolations++;
          } else if (rule.severity === 'warning') {
            this.stats.warningViolations++;
          }
          this.stats.totalViolations++;
        }
      }
    }

    // 检查推荐的模式
    for (const rule of RULES.RECOMMENDED_PATTERNS) {
      const matches = content.match(rule.pattern);
      if (matches) {
        this.recommendations.push({
          file: relativePath,
          rule: rule.message,
          matches: matches.length
        });
      }
    }
  }

  /**
   * 找到匹配的行号
   */
  findMatchingLines(content, pattern) {
    const lines = content.split('\n');
    const matchingLines = [];
    
    lines.forEach((line, index) => {
      // ✅ 跳过注释行和已注释掉的代码
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
        return;
      }
      
      if (pattern.test(line)) {
        matchingLines.push({
          number: index + 1,
          content: line.trim()
        });
      }
    });
    
    return matchingLines;
  }

  /**
   * 递归扫描目录
   */
  scanDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(item)) {
          this.scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (EXTENSIONS.includes(ext)) {
          this.checkFile(fullPath);
        }
      }
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n🔍 ADB 架构合规性检查报告');
    console.log('='.repeat(50));

    // 统计信息
    console.log(`\n📊 检查统计:`);
    console.log(`   已检查文件: ${this.stats.filesChecked}`);
    console.log(`   总违规数量: ${this.stats.totalViolations}`);
    console.log(`   错误数量: ${this.stats.errorViolations}`);
    console.log(`   警告数量: ${this.stats.warningViolations}`);

    // 违规详情
    if (this.violations.length > 0) {
      console.log(`\n❌ 发现的问题:`);
      
      this.violations.forEach((violation, index) => {
        const icon = violation.severity === 'error' ? '🚫' : '⚠️';
        console.log(`\n${icon} ${violation.rule}`);
        console.log(`   文件: ${violation.file}`);
        console.log(`   匹配数量: ${violation.matches}`);
        
        if (violation.lines && violation.lines.length > 0) {
          console.log(`   问题行:`);
          violation.lines.forEach(line => {
            console.log(`     第 ${line.number} 行: ${line.content}`);
          });
        }
      });
    } else {
      console.log(`\n✅ 未发现架构违规问题！`);
    }

    // 推荐模式统计
    if (this.recommendations.length > 0) {
      console.log(`\n✅ 正确使用的模式:`);
      
      const patternCounts = {};
      this.recommendations.forEach(rec => {
        if (!patternCounts[rec.rule]) {
          patternCounts[rec.rule] = 0;
        }
        patternCounts[rec.rule] += rec.matches;
      });

      Object.entries(patternCounts).forEach(([rule, count]) => {
        console.log(`   ${rule}: ${count} 次使用`);
      });
    }

    // 架构统一度评估
    console.log(`\n📈 架构统一度评估:`);
    const unificationScore = this.calculateUnificationScore();
    console.log(`   统一度评分: ${unificationScore.toFixed(1)}%`);
    
    if (unificationScore >= 95) {
      console.log(`   评级: 🟢 优秀 - 架构高度统一`);
    } else if (unificationScore >= 85) {
      console.log(`   评级: 🟡 良好 - 存在少量分散模式`);
    } else {
      console.log(`   评级: 🔴 需要改进 - 存在较多分散模式`);
    }

    // 建议
    console.log(`\n💡 改进建议:`);
    if (this.stats.errorViolations > 0) {
      console.log(`   1. 立即修复 ${this.stats.errorViolations} 个严重错误`);
    }
    if (this.stats.warningViolations > 0) {
      console.log(`   2. 考虑修复 ${this.stats.warningViolations} 个警告问题`);
    }
    if (this.stats.totalViolations === 0) {
      console.log(`   🎉 架构已完全统一，继续保持！`);
    }

    console.log('\n' + '='.repeat(50));

    // 返回是否通过检查
    return this.stats.errorViolations === 0;
  }

  /**
   * 计算架构统一度评分
   */
  calculateUnificationScore() {
    if (this.stats.filesChecked === 0) return 100;
    
    // 基础分100分，每个错误扣5分，每个警告扣2分
    let score = 100;
    score -= this.stats.errorViolations * 5;
    score -= this.stats.warningViolations * 2;
    
    return Math.max(0, score);
  }

  /**
   * 运行检查
   */
  run() {
    console.log('🚀 开始 ADB 架构合规性检查...\n');
    
    const srcDir = path.join(path.dirname(__dirname), 'src');
    if (!fs.existsSync(srcDir)) {
      console.error('❌ 找不到 src 目录');
      process.exit(1);
    }

    this.scanDirectory(srcDir);
    const passed = this.generateReport();

    // 根据检查结果设置退出码
    process.exit(passed ? 0 : 1);
  }
}

// 运行检查器
const checker = new ArchitectureChecker();
checker.run();