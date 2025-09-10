import { AlertTriangle, CheckCircle, FileDown, Play, Smartphone, Upload, Users } from 'lucide-react';
import React, { useState } from 'react';
import { Contact, VcfImportResult } from '../../types';
import { VcfImportDialog } from './VcfImportDialog';

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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<VcfImportResult | null>(null);

  // 打开导入对话框
  const handleOpenImportDialog = () => {
    if (contacts.length === 0) {
      onError?.('没有联系人数据可导入');
      return;
    }
    setShowImportDialog(true);
  };

  // 处理导入完成
  const handleImportComplete = (result: VcfImportResult) => {
    setImportResult(result);
    onImportComplete?.(result);
  };

  return (
    <>
      <div className="vcf-importer-container">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 头部信息 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">VCF通讯录导入</h3>
                  <p className="text-sm text-gray-600">将联系人批量导入到设备通讯录</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{contacts.length} 个联系人</span>
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="p-6">
            {/* 联系人统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总联系人</p>
                    <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">目标设备</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {selectedDevice || '未选择'}
                    </p>
                  </div>
                  <Smartphone className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">状态</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {importResult?.success ? '导入完成' : '待导入'}
                    </p>
                  </div>
                  {importResult?.success ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <Upload className="h-8 w-8 text-orange-500" />
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleOpenImportDialog}
                disabled={contacts.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Play className="h-5 w-5" />
                <span>开始导入</span>
              </button>

              {importResult && (
                <button
                  onClick={() => setImportResult(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <FileDown className="h-5 w-5" />
                  <span>重新导入</span>
                </button>
              )}
            </div>

            {/* 导入结果显示 */}
            {importResult && (
              <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">导入结果</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    {importResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={`font-medium ${
                      importResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {importResult.success ? '导入成功' : '导入失败'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    成功: {importResult.importedContacts} / 总计: {importResult.totalContacts}
                  </div>
                </div>

                {importResult.message && (
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded text-sm">
                    <strong>详细信息:</strong> {importResult.message}
                  </div>
                )}

                {importResult.details && (
                  <div className="mt-2 p-3 bg-white border border-gray-200 rounded text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap">{importResult.details}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导入对话框 */}
      <VcfImportDialog
        visible={showImportDialog}
        contacts={contacts}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
};
