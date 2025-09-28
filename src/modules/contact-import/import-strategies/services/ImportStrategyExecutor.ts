import { invoke } from '@tauri-apps/api/core';
import type { ImportStrategy, ImportResult, ImportStrategySelection } from '../types';

/**
 * 导入策略执行器
 * 根据选择的策略执行具体的 vCard 导入操作
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
      return {
        success: false,
        importedCount: 0,
        failedCount: 1,
        strategy: selectedStrategy,
        errorMessage: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 推送VCF文件到设备
   */
  private async pushVcfToDevice(localVcfPath: string, deviceId: string): Promise<string> {
    const devicePath = '/sdcard/temp_import.vcf';
    
    console.log(`📤 推送VCF到设备: ${localVcfPath} -> ${devicePath}`);
    
    const result = await invoke('adb_push_file', {
      deviceId,
      localPath: localVcfPath,
      remotePath: devicePath
    });

    if (!(result as any).success) {
      throw new Error(`文件推送失败: ${(result as any).message}`);
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
    
    const result = await invoke('adb_start_activity', {
      deviceId,
      action: 'android.intent.action.VIEW',
      dataUri: `file://${vcfPath}`,
      mimeType,
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
    
    const result = await invoke('adb_start_activity', {
      deviceId,
      action: 'android.intent.action.VIEW',
      dataUri: `file://${vcfPath}`,
      mimeType,
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
        const result = await invoke('adb_query_contact_by_phone', {
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
      await invoke('adb_shell_command', {
        deviceId,
        command: 'rm -f /sdcard/temp_import.vcf'
      });
      
      console.log('🧹 清理临时文件完成');
    } catch (error) {
      console.warn('清理临时文件时出错:', error);
    }
  }
}