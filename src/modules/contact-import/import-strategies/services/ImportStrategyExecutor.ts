import { invoke } from '@tauri-apps/api/core';
import invokeCompat from '../../../../api/core/tauriInvoke';
import type { ImportStrategy, ImportResult, ImportStrategySelection } from '../types';
import { ImportErrorHandler, type ImportError } from './ImportErrorHandler';
import { AutomationEngine, type AutomationResult } from '../../automation';

/**
 * 导入策略执行器
 * 根据选择的策略执行具体的 vCard 导入操作
 * 
 * 特性：
 * - ✅ 增强的错误处理和用户友好提示
 * - ✅ 自动重试机制
 * - ✅ 详细的执行日志
 * - ✅ 安全的临时文件清理
 */
export class ImportStrategyExecutor {
  private static instance: ImportStrategyExecutor;
  
  static getInstance(): ImportStrategyExecutor {
    if (!ImportStrategyExecutor.instance) {
      ImportStrategyExecutor.instance = new ImportStrategyExecutor();
    }
    return ImportStrategyExecutor.instance;
  }

  /**
   * 执行导入策略
   */
  async executeImport(selection: ImportStrategySelection): Promise<ImportResult> {
    const { selectedStrategy, vcfFilePath, deviceId, enableVerification } = selection;
    
    console.log(`🚀 开始执行导入策略: ${selectedStrategy.name}`);
    console.log(`📁 VCF文件: ${vcfFilePath}`);
    console.log(`📱 设备ID: ${deviceId}`);

    try {
      // 1. 推送VCF文件到设备
      const deviceVcfPath = await this.pushVcfToDevice(vcfFilePath, deviceId);
      
      // 2. 根据策略执行导入
      const importSuccess = await this.triggerImport(selectedStrategy, deviceVcfPath, deviceId);
      
      if (!importSuccess) {
        return {
          success: false,
          importedCount: 0,
          failedCount: 1,
          strategy: selectedStrategy,
          errorMessage: '导入触发失败'
        };
      }

      // 3. 自动化处理导入对话框（新增）
      console.log('🤖 开始自动化处理导入对话框...');
      const automationResult = await this.handleImportDialogs(deviceId);
      
      if (!automationResult.success) {
        console.warn('⚠️ 自动化对话框处理未完全成功，可能需要手动操作');
        console.warn(`自动化结果: ${automationResult.message}`);
      } else {
        console.log('✅ 自动化对话框处理成功');
      }

      // 4. 根据自动化结果调整返回值
      const finalSuccess = importSuccess && automationResult.vCardConfirmed;
      
      if (!finalSuccess) {
        return {
          success: false,
          importedCount: 0,
          failedCount: 1,
          strategy: selectedStrategy,
          errorMessage: automationResult.success 
            ? '导入触发失败' 
            : `导入对话框处理失败: ${automationResult.message}`
        };
      }

      // 3. 等待导入完成
      await this.waitForImportCompletion();

      // 4. 验证导入结果（可选）
      let verificationDetails;
      if (enableVerification && selection.verificationPhones) {
        verificationDetails = await this.verifyImportResults(
          selection.verificationPhones,
          deviceId
        );
      }

      return {
        success: true,
        importedCount: verificationDetails?.totalFound || 1,
        failedCount: 0,
        strategy: selectedStrategy,
        verificationDetails
      };

    } catch (error) {
      console.error('❌ 导入策略执行失败:', error);
      
      // 解析错误并提供用户友好信息
      const importError = ImportErrorHandler.parseError(error, {
        deviceId,
        operation: '导入联系人'
      });
      
      const errorDisplay = ImportErrorHandler.formatErrorForUser(importError);
      
      return {
        success: false,
        importedCount: 0,
        failedCount: 1,
        strategy: selectedStrategy,
        errorMessage: errorDisplay.title,
        errorDetails: {
          description: errorDisplay.description,
          suggestions: errorDisplay.actions,
          recoverable: importError.recoverable,
          type: importError.type
        }
      };
    }
  }

  /**
   * 推送VCF文件到设备
   */
  private async pushVcfToDevice(localVcfPath: string, deviceId: string): Promise<string> {
    const devicePath = '/sdcard/temp_import.vcf';
    
    console.log(`📤 推送VCF到设备: ${localVcfPath} -> ${devicePath}`);
    
    try {
      const result = await invokeCompat('safe_adb_push', {
        deviceId,
        localPath: localVcfPath,
        remotePath: devicePath
      });

      console.log(`✅ 文件推送成功: ${result}`);
      return devicePath;
    } catch (error) {
      const importError = ImportErrorHandler.parseError(error, {
        deviceId,
        operation: '文件推送'
      });
      
      console.error('❌ 文件推送失败:', importError.message);
      throw new Error(importError.userMessage);
    }

    return devicePath;
  }

  /**
   * 根据策略触发导入
   */
  private async triggerImport(
    strategy: ImportStrategy,
    deviceVcfPath: string,
    deviceId: string
  ): Promise<boolean> {
    switch (strategy.triggerMethod) {
      case 'VIEW_X_VCARD':
        return this.triggerViewIntent(deviceId, deviceVcfPath, 'text/x-vcard');
        
      case 'VIEW_VCARD':
        return this.triggerViewIntent(deviceId, deviceVcfPath, 'text/vcard');
        
      case 'DIRECT_ACTIVITY':
        if (!strategy.activityComponent) {
          throw new Error('直接导入策略缺少组件信息');
        }
        return this.triggerDirectActivity(
          deviceId, 
          deviceVcfPath, 
          strategy.activityComponent,
          strategy.mimeType
        );
        
      default:
        throw new Error(`不支持的触发方式: ${strategy.triggerMethod}`);
    }
  }

  /**
   * 触发VIEW Intent导入
   */
  private async triggerViewIntent(
    deviceId: string,
    vcfPath: string,
    mimeType: string
  ): Promise<boolean> {
    console.log(`🔄 触发VIEW Intent: ${mimeType}`);
    
    const result = await invokeCompat('adb_start_activity', {
      deviceId: deviceId,
      action: 'android.intent.action.VIEW',
      dataUri: `file://${vcfPath}`,
      mimeType: mimeType,
      component: null
    });

    return (result as any).success;
  }

  /**
   * 触发直接Activity导入
   */
  private async triggerDirectActivity(
    deviceId: string,
    vcfPath: string,
    component: string,
    mimeType: string
  ): Promise<boolean> {
    console.log(`🎯 直接触发Activity: ${component}`);
    
    const result = await invokeCompat('adb_start_activity', {
      deviceId: deviceId,
      action: 'android.intent.action.VIEW',
      dataUri: `file://${vcfPath}`,
      mimeType: mimeType,
      component
    });

    return (result as any).success;
  }

  /**
   * 等待导入完成
   */
  private async waitForImportCompletion(): Promise<void> {
    // 等待导入过程完成，实际项目中可以通过监听日志或UI状态判断
    console.log('⏳ 等待导入完成...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * 验证导入结果
   */
  private async verifyImportResults(
    verificationPhones: string[],
    deviceId: string
  ) {    
    console.log(`🔍 验证导入结果，检查 ${verificationPhones.length} 个号码...`);
    
    const sampledContacts = [];
    let totalFound = 0;

    for (const phone of verificationPhones) {
      try {
        const result = await invokeCompat('adb_query_contact_by_phone', {
          deviceId,
          phoneNumber: phone
        });

        const resultData = result as any;
        if (resultData.success && resultData.contacts && resultData.contacts.length > 0) {
          sampledContacts.push(resultData.contacts[0]);
          totalFound++;
        }
      } catch (error) {
        console.warn(`验证号码 ${phone} 时出错:`, error);
      }
    }

    console.log(`✅ 验证完成: 找到 ${totalFound}/${verificationPhones.length} 个联系人`);

    return {
      sampledContacts,
      totalFound
    };
  }

  /**
   * 清理临时文件
   */
  async cleanup(deviceId: string): Promise<void> {
    try {
      await invokeCompat('safe_adb_shell_command', {
        deviceId,
        shellCommand: 'rm -f /sdcard/temp_import.vcf'
      });
      
      console.log('🧹 清理临时文件完成');
    } catch (error) {
      const importError = ImportErrorHandler.parseError(error, {
        deviceId,
        operation: '清理临时文件'
      });
      
      console.warn('清理临时文件时出错:', importError.message);
      // 清理失败不影响主流程，只记录警告
    }
  }

  /**
   * 处理导入过程中的对话框（新增）
   * 自动化处理"仅此一次"和"vCard确认"对话框
   */
  private async handleImportDialogs(deviceId: string): Promise<AutomationResult> {
    try {
      console.log('🚀 启动自动化对话框处理引擎...');
      
      // 创建自动化引擎实例
      const automationEngine = new AutomationEngine(deviceId, {
        timeout: 8000,        // 8秒超时
        retryInterval: 300,   // 300ms间隔检查
        maxRetries: 25        // 最多25次重试
      });

      // 执行自动化处理
      const result = await automationEngine.executeAutomation();
      
      console.log(`🎯 自动化执行结果:`, {
        success: result.success,
        vCardConfirmed: result.vCardConfirmed,
        completedDialogs: result.completedDialogs.length,
        duration: `${result.duration}ms`,
        attempts: result.totalAttempts
      });

      // 打印详细的点击结果
      if (result.completedDialogs.length > 0) {
        console.log('📋 对话框处理详情:');
        result.completedDialogs.forEach((dialog, index) => {
          console.log(`  ${index + 1}. ${dialog.dialogType}: ${dialog.success ? '✅ 成功' : '❌ 失败'}`);
          if (dialog.error) {
            console.log(`     错误: ${dialog.error}`);
          }
        });
      }

      return result;
    } catch (error) {
      console.error('❌ 自动化对话框处理失败:', error);
      
      // 返回失败结果
      return {
        success: false,
        completedDialogs: [],
        totalAttempts: 0,
        duration: 0,
        vCardConfirmed: false,
        message: `自动化处理异常: ${(error as Error).message}`
      };
    }
  }
}