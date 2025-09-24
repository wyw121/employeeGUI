import {
  AndroidOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  InputNumber,
  message,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Tag,
  Typography,
} from "antd";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { XiaohongshuService } from "../../services/xiaohongshuService";
import { useAdb } from "../../application/hooks/useAdb";
import { Device, DeviceStatus } from "../../domain/adb/entities/Device";
import type { VcfImportResult } from "../../types/Contact";

const { Text, Title } = Typography;
const { Step } = Steps;
const { Option } = Select;

// 使用共享的 VcfImportResult 类型

interface XiaohongshuFollowResult {
  totalAttempts: number;
  successfulFollows: number;
  errors: string[];
  duration: number;
}

interface XiaohongshuAutoFollowProps {
  importResults?: VcfImportResult[];
  selectedDevice?: string; // 设备ID
  onWorkflowComplete?: (result: XiaohongshuFollowResult) => void;
  onError?: (error: string) => void;
}

interface FollowConfig {
  maxPages: number;
  followInterval: number;
  skipExisting: boolean;
  returnToHome: boolean;
}

export const XiaohongshuAutoFollow: React.FC<XiaohongshuAutoFollowProps> = ({
  importResults,
  selectedDevice: propSelectedDevice,
  onWorkflowComplete,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followConfig, setFollowConfig] = useState<FollowConfig>({
    maxPages: 3,
    followInterval: 2000,
    skipExisting: true,
    returnToHome: true,
  });
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [followResult, setFollowResult] =
    useState<XiaohongshuFollowResult | null>(null);

  // 使用统一的ADB接口 - 遵循DDD架构约束
  const {
    devices,
    selectedDevice,
    selectDevice,
    isLoading: adbLoading,
    refreshDevices,
    connectToEmulators,
    initialize,
    onlineDevices,
  } = useAdb();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化ADB环境
  useEffect(() => {
    const initializeAdb = async () => {
      try {
        await initialize();
        await refreshDevices();
      } catch (error) {
        console.error("ADB初始化失败:", error);
        onError?.(`ADB初始化失败: ${error}`);
      }
    };

    initializeAdb();
  }, [initialize, refreshDevices, onError]);

  // 自动选择设备
  useEffect(() => {
    if (propSelectedDevice && devices.length > 0) {
      const foundDevice = devices.find((d) => d.id === propSelectedDevice);
      if (foundDevice) {
        selectDevice(foundDevice.id);
      }
    } else if (devices.length > 0 && !selectedDevice) {
      // 自动选择第一个在线设备
      const firstOnlineDevice = onlineDevices[0];
      if (firstOnlineDevice) {
        selectDevice(firstOnlineDevice.id);
      }
    }
  }, [
    propSelectedDevice,
    devices,
    selectedDevice,
    selectDevice,
    onlineDevices,
  ]);

  // 刷新设备列表
  const handleRefreshDevices = useCallback(async () => {
    try {
      await refreshDevices();
      message.success("设备列表已刷新");
    } catch (error) {
      console.error("刷新设备失败:", error);
      message.error("刷新设备失败");
    }
  }, [refreshDevices]);

  // 开始关注流程
  const handleStartFollow = useCallback(async () => {
    if (!selectedDevice) {
      message.error("请选择一个设备");
      return;
    }

    if (!importResults || importResults.length === 0) {
      message.error("没有可关注的用户");
      return;
    }

    setIsFollowing(true);
    setProgress(0);
    setStatusMessage("开始初始化小红书服务...");

    try {
      console.log("🔍 DEBUG: selectedDevice:", selectedDevice);

      // 使用新架构的设备ID
      await XiaohongshuService.initializeService(selectedDevice.id);

      setStatusMessage("开始执行关注操作...");
      setCurrentStep(1);

      const result = await XiaohongshuService.autoFollowContacts({
        max_pages: followConfig.maxPages,
        follow_interval: followConfig.followInterval,
        skip_existing: followConfig.skipExisting,
        return_to_home: followConfig.returnToHome,
      });

      // 转换结果格式
      const convertedResult: XiaohongshuFollowResult = {
        totalAttempts: result.pages_processed || 0,
        successfulFollows: result.total_followed || 0,
        errors:
          result.details
            ?.filter((d) => !d.follow_success)
            .map((d) => d.error || "Unknown error") || [],
        duration: result.duration || 0,
      };

      setFollowResult(convertedResult);
      setCurrentStep(2);
      setStatusMessage(
        `关注完成: 成功关注 ${convertedResult.successfulFollows} 个用户`
      );

      message.success(`成功关注 ${convertedResult.successfulFollows} 个用户！`);

      onWorkflowComplete?.(convertedResult);
    } catch (error) {
      console.error("关注操作失败:", error);
      const errorMessage = `关注操作失败: ${error}`;
      setStatusMessage(errorMessage);
      message.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsFollowing(false);
      setProgress(100);
    }
  }, [
    selectedDevice,
    importResults,
    followConfig,
    onWorkflowComplete,
    onError,
  ]);

  // 停止关注
  const handleStopFollow = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsFollowing(false);
    setStatusMessage("用户已停止关注操作");
    message.info("已停止关注操作");
  }, []);

  // 渲染设备选择器
  const renderDeviceSelector = () => (
    <Card title="设备选择" size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Select
            style={{ flex: 1 }}
            placeholder="选择设备"
            value={selectedDevice?.id}
            onChange={(deviceId) => selectDevice(deviceId)}
            loading={adbLoading}
          >
            {devices.map((device) => (
              <Option key={device.id} value={device.id}>
                <Space>
                  <AndroidOutlined />
                  <span>{device.getDisplayName()}</span>
                  <Tag color={device.isOnline() ? "green" : "red"}>
                    {device.isOnline() ? "在线" : "离线"}
                  </Tag>
                </Space>
              </Option>
            ))}
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshDevices}
            loading={adbLoading}
          >
            刷新
          </Button>
        </div>

        {devices.length === 0 && (
          <Alert
            message="未检测到设备"
            description="请确保设备已连接并启用USB调试"
            type="warning"
            showIcon
          />
        )}

        {selectedDevice && (
          <Alert
            message={`已选择设备: ${selectedDevice.getDisplayName()}`}
            type="success"
            showIcon
          />
        )}
      </Space>
    </Card>
  );

  // 渲染配置面板
  const renderConfigPanel = () => (
    <Card title="关注配置" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div>
            <Text>最大页面数:</Text>
            <InputNumber
              min={1}
              max={10}
              value={followConfig.maxPages}
              onChange={(value) =>
                setFollowConfig({ ...followConfig, maxPages: value || 3 })
              }
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>
        </Col>
        <Col span={12}>
          <div>
            <Text>关注间隔(毫秒):</Text>
            <InputNumber
              min={1000}
              max={10000}
              step={500}
              value={followConfig.followInterval}
              onChange={(value) =>
                setFollowConfig({
                  ...followConfig,
                  followInterval: value || 2000,
                })
              }
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>
        </Col>
        <Col span={12}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text>跳过已关注:</Text>
            <Switch
              checked={followConfig.skipExisting}
              onChange={(checked) =>
                setFollowConfig({ ...followConfig, skipExisting: checked })
              }
            />
          </div>
        </Col>
        <Col span={12}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text>完成后返回首页:</Text>
            <Switch
              checked={followConfig.returnToHome}
              onChange={(checked) =>
                setFollowConfig({ ...followConfig, returnToHome: checked })
              }
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // 渲染操作面板
  const renderActionPanel = () => (
    <Card title="操作控制" size="small" style={{ marginBottom: 16 }}>
      <Space>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleStartFollow}
          disabled={
            !selectedDevice ||
            !importResults ||
            importResults.length === 0 ||
            isFollowing
          }
          loading={isFollowing}
        >
          开始关注
        </Button>
        <Button danger onClick={handleStopFollow} disabled={!isFollowing}>
          停止关注
        </Button>
      </Space>

      {importResults && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">共 {importResults.length} 个用户待关注</Text>
        </div>
      )}
    </Card>
  );

  // 渲染进度面板
  const renderProgressPanel = () => (
    <Card title="关注进度" size="small" style={{ marginBottom: 16 }}>
      <Steps current={currentStep} size="small" style={{ marginBottom: 16 }}>
        <Step title="准备" icon={<SettingOutlined />} />
        <Step title="执行" icon={<HeartOutlined />} />
        <Step title="完成" icon={<CheckCircleOutlined />} />
      </Steps>

      <Progress percent={progress} status={isFollowing ? "active" : "normal"} />

      {statusMessage && (
        <Alert
          message={statusMessage}
          type={isFollowing ? "info" : "success"}
          style={{ marginTop: 8 }}
        />
      )}

      {followResult && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>关注结果</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Tag color="blue">总尝试: {followResult.totalAttempts}</Tag>
            </Col>
            <Col span={8}>
              <Tag color="green">成功: {followResult.successfulFollows}</Tag>
            </Col>
            <Col span={8}>
              <Tag color="red">失败: {followResult.errors.length}</Tag>
            </Col>
          </Row>
          {followResult.errors.length > 0 && (
            <Alert
              message="错误详情"
              description={followResult.errors.join("; ")}
              type="error"
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>
        <HeartOutlined /> 小红书自动关注
      </Title>
      <Divider />

      {renderDeviceSelector()}
      {renderConfigPanel()}
      {renderActionPanel()}
      {renderProgressPanel()}
    </div>
  );
};

export default XiaohongshuAutoFollow;
