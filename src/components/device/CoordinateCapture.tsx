import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Modal,
  Button,
  Typography,
  Card,
  Row,
  Col,
  Input,
  message,
  Spin,
  Tooltip,
  Tag,
} from 'antd';
import {
  CameraOutlined,
  AimOutlined,
  CopyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface CoordinateCaptureProps {
  visible: boolean;
  onClose: () => void;
  onCoordinateSelect: (x: number, y: number) => void;
  deviceId?: string;
}

interface ScreenshotResult {
  success: boolean;
  screenshot_path?: string;
  error?: string;
}

const CoordinateCapture: React.FC<CoordinateCaptureProps> = ({
  visible,
  onClose,
  onCoordinateSelect,
  deviceId = 'emulator-5554'
}) => {
  const [loading, setLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [selectedCoordinate, setSelectedCoordinate] = useState<{x: number, y: number} | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState<{width: number, height: number}>({width: 0, height: 0});
  const [originalSize, setOriginalSize] = useState<{width: number, height: number}>({width: 0, height: 0});

  // 截图功能
  const takeScreenshot = async () => {
    setLoading(true);
    try {
      const result = await invoke('capture_device_screenshot', {
        deviceId: deviceId
      }) as ScreenshotResult;

      if (result.success && result.screenshot_path) {
        // 转换文件路径为URL
        const imageUrl = `file://${result.screenshot_path}`;
        setScreenshotUrl(imageUrl);
        message.success('截图成功！点击屏幕选择坐标');
      } else {
        message.error(result.error || '截图失败');
      }
    } catch (error) {
      console.error('截图失败:', error);
      message.error('截图失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 图片加载完成后获取尺寸
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setOriginalSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setImageSize({
      width: img.offsetWidth,
      height: img.offsetHeight
    });
  };

  // 处理图片点击事件
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || originalSize.width === 0 || originalSize.height === 0) return;

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 计算实际设备坐标（考虑图片缩放）
    const scaleX = originalSize.width / rect.width;
    const scaleY = originalSize.height / rect.height;
    
    const deviceX = Math.round(clickX * scaleX);
    const deviceY = Math.round(clickY * scaleY);

    setSelectedCoordinate({ x: deviceX, y: deviceY });
    message.success(`已选择坐标: (${deviceX}, ${deviceY})`);
  };

  // 确认选择坐标
  const handleConfirmCoordinate = () => {
    if (selectedCoordinate) {
      onCoordinateSelect(selectedCoordinate.x, selectedCoordinate.y);
      onClose();
      message.success('坐标已应用到脚本步骤');
    }
  };

  // 复制坐标到剪贴板
  const copyCoordinate = () => {
    if (selectedCoordinate) {
      navigator.clipboard.writeText(`${selectedCoordinate.x},${selectedCoordinate.y}`);
      message.success('坐标已复制到剪贴板');
    }
  };

  // 重置状态
  const resetCapture = () => {
    setScreenshotUrl('');
    setSelectedCoordinate(null);
    setImageSize({width: 0, height: 0});
    setOriginalSize({width: 0, height: 0});
  };

  // 模态框关闭时重置
  useEffect(() => {
    if (!visible) {
      resetCapture();
    }
  }, [visible]);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AimOutlined style={{ color: '#1890ff' }} />
          <span>坐标捕获工具</span>
          <Tag color="blue">{deviceId}</Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="screenshot" 
          icon={<CameraOutlined />} 
          onClick={takeScreenshot}
          loading={loading}
        >
          截图
        </Button>,
        <Button 
          key="copy" 
          icon={<CopyOutlined />} 
          onClick={copyCoordinate}
          disabled={!selectedCoordinate}
        >
          复制坐标
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          icon={<CheckCircleOutlined />}
          onClick={handleConfirmCoordinate}
          disabled={!selectedCoordinate}
        >
          确认选择
        </Button>,
      ]}
    >
      <div style={{ minHeight: 400 }}>
        {/* 操作说明 */}
        <Card size="small" style={{ marginBottom: 16, background: '#f6ffed' }}>
          <Text type="secondary">
            💡 使用说明：
            <br />
            1. 点击"截图"按钮获取当前设备屏幕
            <br />
            2. 在截图上点击要操作的位置
            <br />
            3. 确认坐标后将自动应用到脚本步骤
          </Text>
        </Card>

        {/* 坐标信息显示 */}
        {selectedCoordinate && (
          <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff' }}>
            <Row gutter={16} align="middle">
              <Col>
                <Text strong>选中坐标:</Text>
              </Col>
              <Col>
                <Tag color="blue" style={{ fontSize: 14 }}>
                  X: {selectedCoordinate.x}
                </Tag>
                <Tag color="green" style={{ fontSize: 14 }}>
                  Y: {selectedCoordinate.y}
                </Tag>
              </Col>
              <Col>
                <Input
                  value={`${selectedCoordinate.x},${selectedCoordinate.y}`}
                  readOnly
                  size="small"
                  style={{ width: 120 }}
                  addonAfter={
                    <Tooltip title="复制">
                      <CopyOutlined onClick={copyCoordinate} style={{ cursor: 'pointer' }} />
                    </Tooltip>
                  }
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* 截图显示区域 */}
        <div style={{ 
          textAlign: 'center', 
          border: '2px dashed #d9d9d9', 
          borderRadius: 8,
          padding: 16,
          minHeight: 300,
          position: 'relative'
        }}>
          {loading && (
            <div style={{ padding: 60 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text>正在截图...</Text>
              </div>
            </div>
          )}
          
          {!loading && screenshotUrl && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                ref={imageRef}
                src={screenshotUrl}
                alt="设备截图"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 400,
                  cursor: 'crosshair',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4
                }}
                onLoad={handleImageLoad}
                onClick={handleImageClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleImageClick(e as any);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="点击选择坐标"
              />
              
              {/* 坐标标记点 */}
              {selectedCoordinate && imageSize.width > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: (selectedCoordinate.x * imageSize.width / originalSize.width) - 6,
                    top: (selectedCoordinate.y * imageSize.height / originalSize.height) - 6,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#ff4d4f',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 10,
                    pointerEvents: 'none'
                  }}
                />
              )}
            </div>
          )}
          
          {!loading && !screenshotUrl && (
            <div style={{ padding: 60, color: '#999' }}>
              <CameraOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <div>
                <Text type="secondary">点击截图按钮开始捕获坐标</Text>
              </div>
            </div>
          )}
        </div>

        {/* 设备信息 */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary">
            当前设备: {deviceId} | 
            {originalSize.width > 0 && (
              ` 分辨率: ${originalSize.width}×${originalSize.height}`
            )}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default CoordinateCapture;