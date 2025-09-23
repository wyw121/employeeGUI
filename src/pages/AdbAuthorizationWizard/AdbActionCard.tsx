import React from 'react';
import { Card } from 'antd';
import type { AdbActionCardProps } from './types';

export const AdbActionCard: React.FC<AdbActionCardProps> = ({ title, extra, children }) => {
  return (
    <Card size="small" title={title} extra={extra}>
      {children}
    </Card>
  );
};
