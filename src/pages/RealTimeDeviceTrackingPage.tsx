import React from 'react';
import RealTimeDeviceMonitor from '../components/device/RealTimeDeviceMonitor';

/**
 * 实时ADB设备跟踪演示页面
 * 展示基于host:track-devices协议的事件驱动设备管理
 */
export const RealTimeDeviceTrackingPage: React.FC = () => {
  return <RealTimeDeviceMonitor />;
};

export default RealTimeDeviceTrackingPage;