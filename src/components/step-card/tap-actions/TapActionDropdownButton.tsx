import React, { useState } from 'react';
import { Dropdown, Button, MenuProps, Modal, Form, InputNumber } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import { TapActionTemplates, createTapStepsBatch, createTapStepTemplate } from './tapTemplates';

export interface TapActionDropdownButtonProps {
  onSelectTemplate: (tpl: ReturnType<typeof TapActionTemplates.tapCenter> | ReturnType<typeof createTapStepsBatch>) => void;
  size?: 'small' | 'middle' | 'large';
}

const stopAll = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

export const TapActionDropdownButton: React.FC<TapActionDropdownButtonProps> = ({ onSelectTemplate, size = 'middle' }) => {
  const [openCustom, setOpenCustom] = useState(false);
  const [x, setX] = useState<number>(360);
  const [y, setY] = useState<number>(800);
  const [times, setTimes] = useState<number>(1);

  const items: MenuProps['items'] = [
    { type: 'group', label: '单步轻点', children: [
      { key: 'tapCenter', label: '👆 轻点屏幕中心', onClick: () => onSelectTemplate(TapActionTemplates.tapCenter()) },
      { key: 'longPress', label: '👆 长按屏幕中心', onClick: () => onSelectTemplate(TapActionTemplates.longPressCenter()) },
    ]},
    { type: 'group', label: '批量轻点', children: [
      { key: 'tapCenter3', label: '👆 连续轻点中心 ×3', onClick: () => onSelectTemplate(createTapStepsBatch(3)) },
      { key: 'tapCenter5', label: '👆 连续轻点中心 ×5', onClick: () => onSelectTemplate(createTapStepsBatch(5)) },
    ]},
    { type: 'divider' },
    { key: 'custom', label: '🛠️ 自定义坐标轻点…', onClick: () => setOpenCustom(true) },
  ];

  return (
    <div onClick={stopAll} onMouseDown={stopAll} onPointerDown={stopAll} onTouchStart={stopAll}>
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomLeft">
        <Button icon={<AimOutlined />} size={size}>
          👆 轻点步骤
        </Button>
      </Dropdown>

      <Modal
        title="自定义坐标轻点"
        open={openCustom}
        onCancel={() => setOpenCustom(false)}
        okText="确定"
        cancelText="取消"
        onOk={() => {
          setOpenCustom(false);
          if (times > 1) {
            onSelectTemplate(createTapStepsBatch(times, { x, y }));
          } else {
            onSelectTemplate(createTapStepTemplate({ x, y }));
          }
        }}
      >
        <Form layout="vertical">
          <Form.Item label="X 坐标">
            <InputNumber value={x} min={0} max={2160} onChange={(v) => setX(Number(v))} />
          </Form.Item>
          <Form.Item label="Y 坐标">
            <InputNumber value={y} min={0} max={3840} onChange={(v) => setY(Number(v))} />
          </Form.Item>
          <Form.Item label="次数">
            <InputNumber value={times} min={1} max={20} onChange={(v) => setTimes(Number(v))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TapActionDropdownButton;
