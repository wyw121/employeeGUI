import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Typography, Space, Input, Button, Alert } from 'antd';
import { useWsConnection } from './embedded/useWsConnection';
import { useWebCodecsDecoder } from './embedded/useWebCodecsDecoder';
import { useCanvasRenderer } from './embedded/useCanvasRenderer';
import { useInputController } from './embedded/useInputController';

const { Text, Paragraph, Title } = Typography;

export const EmbeddedScrcpyPlayer: React.FC = () => {
  const [wsUrl, setWsUrl] = useState<string>(localStorage.getItem('scrcpy.wsUrl') || '');
  const [error, setError] = useState<string | null>(null);

  const { status, socketRef, send } = useWsConnection(wsUrl ? { url: wsUrl } : undefined);
  const { supported, init, decode, close } = useWebCodecsDecoder();
  const { canvasRef, draw } = useCanvasRenderer();
  const { handleClick } = useInputController(send);

  // 持久化 wsUrl
  useEffect(() => { localStorage.setItem('scrcpy.wsUrl', wsUrl); }, [wsUrl]);

  // 初始化解码器
  useEffect(() => {
    if (!supported) return;
    init((frame) => draw(frame), (e) => setError(String(e?.message ?? e)));
    return () => { close(); };
  }, [supported]);

  // 从 WebSocket 接收视频数据并解码（示意：假设服务端发送 EncodedVideoChunk 原始字节）
  useEffect(() => {
    const ws = socketRef.current;
    if (!ws) return;
    ws.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      // 真实协议需要从二进制中解析出 timestamp、type、data 等，本处提供一个最小示例：
      try {
        const now = performance.now();
        const chunk = new EncodedVideoChunk({
          timestamp: Math.floor(now * 1000),
          type: 'key',
          data: new Uint8Array(ev.data),
        });
        decode(chunk);
      } catch (e) {
        // 忽略解析错误，提示一次
        setError('解码数据失败：需要对接实际 ws-scrcpy 协议');
      }
    };
  }, [socketRef.current]);

  const statusText = useMemo(() => {
    if (status.state === 'idle') return '未连接';
    if (status.state === 'connecting') return '连接中…';
    if (status.state === 'connected') return '已连接';
    return `错误：${status.error}`;
  }, [status]);

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Title level={5}>嵌入式镜像（实验性）</Title>
        {!supported && (
          <Alert type="warning" showIcon message="当前环境不支持 WebCodecs" description="请使用支持 WebCodecs 的运行环境（Chromium 版本较新）。" />
        )}
        {error && (
          <Alert type="error" showIcon message="解码或连接错误" description={error} />
        )}
        <Space wrap>
          <Input style={{ width: 360 }} placeholder="ws://127.0.0.1:8000/device/<id>" value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} />
          <Text type="secondary">状态：{statusText}</Text>
        </Space>
        <div style={{ width: '100%', height: 520, background: '#0b0f19', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas ref={canvasRef} width={720} height={1280} onClick={handleClick} style={{ width: '100%', height: '100%' }} />
        </div>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          说明：这是一个最小的嵌入式渲染通路骨架，需与实际 ws-scrcpy 服务端协议对齐（参数协商、chunk 封装、输入映射等）。
        </Paragraph>
      </Space>
    </Card>
  );
};

export default EmbeddedScrcpyPlayer;
