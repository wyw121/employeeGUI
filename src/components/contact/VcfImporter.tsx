import { AlertTriangle, CheckCircle, FileDown, Play, Smartphone, Upload, Users } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Contact, VcfImportResult, VcfVerifyResult } from '../../types';

interface VcfImporterProps {
  selectedDevice?: string;
  contacts: Contact[];
  onImportComplete?: (result: VcfImportResult) => void;
  onError?: (error: string) => void;
}

export const VcfImporter: React.FC<VcfImporterProps> = ({
  selectedDevice,
  contacts,
  onImportComplete,
  onError
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<VcfImportResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VcfVerifyResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [vcfFilePath, setVcfFilePath] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成VCF文件
  const handleGenerateVcf = async () => {
    if (contacts.length === 0) {
      onError?.('没有联系人数据可导出');
      return;
    }

    try {
      setCurrentStep('正在生成VCF文件...');
      const outputPath = `contacts_import_${Date.now()}.vcf`;

      // 模拟VCF文件生成（实际应调用真实API）
      console.log('生成VCF文件:', contacts.length, '个联系人');
      const filePath = outputPath;

      /* 实际API调用（当后端实现后启用）
      const filePath = await ContactAPI.generateVcfFile(contacts, outputPath);
      */

      setVcfFilePath(filePath);
      setCurrentStep('VCF文件生成完成');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成VCF文件失败';
      onError?.(errorMsg);
      setCurrentStep('');
    }
  };

  // 选择现有VCF文件
  const handleSelectVcfFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.vcf')) {
      // 在Web环境中File对象没有path属性，这里使用name作为标识
      setVcfFilePath(file.name);
      setCurrentStep(`已选择文件: ${file.name}`);
    } else {
      onError?.('请选择有效的VCF文件');
    }
  };

  // 执行VCF导入
  const handleVcfImport = async () => {
    if (!selectedDevice) {
      onError?.('请先选择目标设备');
      return;
    }

    if (!vcfFilePath) {
      onError?.('请先生成或选择VCF文件');
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportResult(null);
      setVerifyResult(null);

      // 步骤1：开始导入
      setCurrentStep('正在导入联系人到设备...');
      setImportProgress(25);

      // 模拟VCF导入结果（实际应调用真实API）
      const result: VcfImportResult = {
        success: true,
        totalContacts: contacts.length,
        importedContacts: contacts.length,
        failedContacts: 0,
        message: '模拟VCF导入成功',
        details: `已导入 ${contacts.length} 个联系人到设备通讯录`,
        duration: 30,
      };

      /* 实际API调用（当后端实现后启用）
      const result = await ContactAPI.importVcfContacts(selectedDevice, vcfFilePath);
      */

      setImportProgress(75);
      setCurrentStep('正在验证导入结果...');

      // 步骤2：验证导入
      const verifyRes: VcfVerifyResult = {
        success: true,
        verifiedContacts: contacts.length,
        totalExpected: contacts.length,
        verificationRate: 1.0,
        details: contacts.map(contact => ({
          contactName: contact.name,
          found: true,
          method: 'ui_structure',
        })),
      };

      /* 实际API调用（当后端实现后启用）
      const verifyRes = await ContactAPI.verifyVcfImport(selectedDevice, contacts);
      */

      setImportProgress(100);
      setCurrentStep('导入完成');

      setImportResult(result);
      setVerifyResult(verifyRes);
      onImportComplete?.(result);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'VCF导入失败';
      onError?.(errorMsg);
      setCurrentStep('导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="vcf-importer bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Smartphone className="w-6 h-6 text-blue-600 mr-2" />
        <h3 className="text-xl font-semibold text-gray-800">VCF通讯录导入</h3>
      </div>

      {/* 设备状态 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-600">目标设备:</span>
            <span className="ml-2 text-sm text-gray-800">
              {selectedDevice || '未选择设备'}
            </span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 text-blue-600 mr-1" />
            <span className="text-sm text-gray-600">{contacts.length} 个联系人</span>
          </div>
        </div>
      </div>

      {/* VCF文件准备 */}
      <div className="mb-6 space-y-4">
        <h4 className="text-lg font-medium text-gray-700">步骤1: 准备VCF文件</h4>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateVcf}
            disabled={contacts.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-4 h-4 mr-2" />
            从联系人生成VCF
          </button>

          <button
            onClick={handleSelectVcfFile}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            选择现有VCF文件
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".vcf"
          style={{ display: 'none' }}
        />

        {vcfFilePath && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-green-700">
                VCF文件已准备: {vcfFilePath}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 导入执行 */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-700 mb-4">步骤2: 执行导入</h4>

        <button
          onClick={handleVcfImport}
          disabled={!selectedDevice || !vcfFilePath || isImporting}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-5 h-5 mr-2" />
          {isImporting ? '正在导入...' : '开始VCF导入'}
        </button>

        {/* 导入进度 */}
        {isImporting && (
          <div className="mt-4 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{currentStep}</p>
          </div>
        )}
      </div>

      {/* 导入结果 */}
      {importResult && (
        <div className="mb-4 p-4 border rounded-lg">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center">
            {importResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            )}
            导入结果
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">总联系人:</span>
              <span className="ml-2 font-medium">{importResult.totalContacts}</span>
            </div>
            <div>
              <span className="text-gray-600">成功导入:</span>
              <span className="ml-2 font-medium text-green-600">
                {importResult.importedContacts}
              </span>
            </div>
            <div>
              <span className="text-gray-600">导入失败:</span>
              <span className="ml-2 font-medium text-red-600">
                {importResult.failedContacts}
              </span>
            </div>
            <div>
              <span className="text-gray-600">执行时间:</span>
              <span className="ml-2 font-medium">
                {importResult.duration ? `${importResult.duration}秒` : '未知'}
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-600">{importResult.message}</p>

          {importResult.details && (
            <details className="mt-2">
              <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                查看详细信息
              </summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-40">
                {importResult.details}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* 验证结果 */}
      {verifyResult && (
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            验证结果
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-600">验证成功:</span>
              <span className="ml-2 font-medium text-green-600">
                {verifyResult.verifiedContacts}
              </span>
            </div>
            <div>
              <span className="text-gray-600">验证率:</span>
              <span className="ml-2 font-medium">
                {Math.round(verifyResult.verificationRate * 100)}%
              </span>
            </div>
          </div>

          {verifyResult.details.length > 0 && (
            <details>
              <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                查看验证详情 ({verifyResult.details.length} 项)
              </summary>
              <div className="mt-2 max-h-40 overflow-auto">
                {verifyResult.details.map((detail) => (
                  <div key={`${detail.contactName}-${detail.method}`} className="flex items-center justify-between py-1 px-2 text-xs border-b last:border-b-0">
                    <span className="flex-1">{detail.contactName}</span>
                    <span className="flex items-center">
                      {detail.found ? (
                        <CheckCircle className="w-3 h-3 text-green-600 mr-1" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-red-600 mr-1" />
                      )}
                      <span className="text-gray-500">({detail.method})</span>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default VcfImporter;
