import React from 'react';
import { Alert, Typography } from 'antd';
import type { PhoneGuidanceProps } from './types';

const { Paragraph } = Typography;

export const PhoneGuidance: React.FC<PhoneGuidanceProps> = () => {
  return (
    <div>
      <Paragraph>1) 打开手机：设置 → 关于手机 → 连续点击“版本号”直到提示“已处于开发者模式”。</Paragraph>
      <Paragraph>2) 返回设置 → 开发者选项：开启“USB 调试”。荣耀/华为可同时开启“仅充电模式下允许 ADB”“USB 调试（安全设置）”。</Paragraph>
      <Paragraph>3) 如之前误点“拒绝”，请在“开发者选项 → 撤销 USB 调试授权”，再关闭/开启“USB 调试”。</Paragraph>
      <Alert type="info" showIcon message="提示" description="首次连接电脑请保持手机解锁，连接方式选‘传输文件（MTP）’更稳定。" />
    </div>
  );
};
