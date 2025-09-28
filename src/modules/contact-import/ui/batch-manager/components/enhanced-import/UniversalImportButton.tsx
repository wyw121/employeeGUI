import React, { useState } from 'react';
import { Button, App } from 'antd';
import { ImportStrategyDialog } from '../../../../import-strategies/ui/ImportStrategyDialog';

interface UniversalImportButtonProps {
  /** 按钮显示文本 */
  buttonText: string;
  /** 按钮类型 */
  buttonType?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  /** 按钮大小 */
  buttonSize?: 'small' | 'middle' | 'large';
  /** 是否为危险按钮 */
  danger?: boolean;
  /** 是否为加载状态 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** VCF文件路径 */
  vcfFilePath: string;
  /** 导入成功回调 */
  onImportSuccess?: (result: any) => void;
  /** 导入失败回调 */
  onImportError?: (error: any) => void;
  /** 自定义按钮类名 */
  className?: string;
  /** 导入场景标识，用于日志和调试 */
  context?: string;
}

/**
 * 通用导入增强按钮组件
 * 
 * 基于enhanced-import模块化架构设计，提供统一的导入策略选择功能
 * 支持多种导入场景：权限测试、VCF文件导入、智能导入等
 * 
 * 特性：
 * - ✅ 集成ImportStrategyDialog，提供9种导入策略选择
 * - ✅ 支持自定义按钮样式和行为
 * - ✅ 统一的成功/失败处理机制
 * - ✅ TypeScript类型安全
 * - ✅ 遵循DDD架构约束
 * 
 * @example
 * ```tsx
 * <UniversalImportButton
 *   buttonText="测试VCF导入"
 *   buttonType="primary"
 *   vcfFilePath="/path/to/file.vcf"
 *   context="权限测试"
 *   onImportSuccess={(result) => console.log('导入成功', result)}
 *   onImportError={(error) => console.log('导入失败', error)}
 * />
 * ```
 */
export const UniversalImportButton: React.FC<UniversalImportButtonProps> = ({
  buttonText,
  buttonType = 'primary',
  buttonSize = 'middle',
  danger = false,
  loading = false,
  disabled = false,
  vcfFilePath,
  onImportSuccess,
  onImportError,
  className,
  context = 'Universal Import'
}) => {
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const { message } = App.useApp();

  const handleButtonClick = () => {
    if (!vcfFilePath) {
      message.error('请先提供VCF文件路径');
      onImportError?.({ message: 'VCF文件路径为空', context });
      return;
    }

    setShowStrategyDialog(true);
  };

  const handleImportSuccess = (result: any) => {
    message.success(`${context} - 导入成功完成！`);
    onImportSuccess?.(result);
    setShowStrategyDialog(false);
  };

  const handleImportError = (error: any) => {
    message.error(`${context} - 导入失败: ${error.message || '未知错误'}`);
    onImportError?.(error);
    setShowStrategyDialog(false);
  };

  const handleDialogClose = () => {
    setShowStrategyDialog(false);
  };

  return (
    <>
      <Button
        type={buttonType}
        size={buttonSize}
        danger={danger}
        loading={loading}
        disabled={disabled}
        className={className}
        onClick={handleButtonClick}
      >
        {buttonText}
      </Button>

      <ImportStrategyDialog
        visible={showStrategyDialog}
        onClose={handleDialogClose}
        vcfFilePath={vcfFilePath}
        onSuccess={handleImportSuccess}
      />
    </>
  );
};