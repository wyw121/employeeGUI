import React from 'react';
import { Card, Typography } from 'antd';

const { Text, Paragraph, Title } = Typography;

/**
 * 嵌入式 scrcpy 播放器占位组件
 * 未来可替换为 ya-webadb/ws-scrcpy + WebCodecs/Canvas 实现
 */
export const EmbeddedScrcpyPlayer: React.FC = () => {
  return (
    <Card>
      <Title level={5}>嵌入式画布（预留）</Title>
      <Paragraph type="secondary">
        这里将接入 ya-webadb/ws-scrcpy 客户端并通过 WebCodecs/Canvas 渲染实时画面。
      </Paragraph>
      <div style={{ width: '100%', height: 520, background: '#0b0f19', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text type="secondary">Embedded player placeholder</Text>
      </div>
    </Card>
  );
};

export default EmbeddedScrcpyPlayer;
