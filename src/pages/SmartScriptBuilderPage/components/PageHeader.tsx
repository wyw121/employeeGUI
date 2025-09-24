import React from "react";
import { Row, Col, Typography, Space, Select, Button, Divider, Tag } from "antd";
import { AndroidOutlined, SyncOutlined, RocketOutlined } from "@ant-design/icons";
import { Device, DeviceStatus } from "../../../domain/adb/entities/Device";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface PageHeaderProps {
  devices: Device[];
  currentDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  onRefreshDevices: () => void;
  onQuickAddApp?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  devices,
  currentDeviceId,
  onDeviceChange,
  onRefreshDevices,
  onQuickAddApp,
}) => {
  return (
    <div className="mb-6">
      <Row align="middle" justify="space-between">
        <Col>
          <Title level={2} className="mb-2">
            🤖 智能脚本构建器
          </Title>
          <Paragraph type="secondary">
            基于AI的智能自动化脚本构建系统，支持页面识别、元素智能定位、操作验证和智能恢复
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Text type="secondary">目标设备:</Text>
            <Select
              placeholder="选择设备"
              value={currentDeviceId || undefined}
              onChange={onDeviceChange}
              style={{ width: 240 }}
              loading={devices.length === 0}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <Space style={{ padding: "0 8px 4px" }}>
                    <Button
                      type="text"
                      icon={<SyncOutlined />}
                      onClick={onRefreshDevices}
                      size="small"
                    >
                      刷新设备
                    </Button>
                  </Space>
                </>
              )}
            >
              {devices.map((device) => (
                <Option key={device.id} value={device.id}>
                  <Space>
                    <AndroidOutlined
                      style={{
                        color:
                          device.status === DeviceStatus.ONLINE
                            ? "#52c41a"
                            : "#d9d9d9",
                      }}
                    />
                    <Text>{device.name || device.id}</Text>
                    <Tag
                      color={
                        device.status === DeviceStatus.ONLINE
                          ? "success"
                          : "default"
                      }
                    >
                      {device.status === DeviceStatus.ONLINE ? "在线" : "离线"}
                    </Tag>
                  </Space>
                </Option>
              ))}
            </Select>
            <Button
              icon={<RocketOutlined />}
              onClick={onQuickAddApp}
              disabled={!currentDeviceId}
            >
              快速添加应用
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default PageHeader;