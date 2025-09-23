import React, { useMemo } from 'react';
import { Space, Button, Tooltip, Dropdown, MenuProps, message, Typography, Tag, Modal, Input } from 'antd';
import { CheckSquareOutlined, ClearOutlined, UsbOutlined, DesktopOutlined, CloudDownloadOutlined, SwapOutlined, ScissorOutlined, CopyOutlined } from '@ant-design/icons';
import type { TrackedDevice } from '../../infrastructure/RealTimeDeviceTracker';

export interface SelectionBarProps {
  devices: TrackedDevice[]; // 当前筛选后的设备列表
  selectedIds: string[];    // 当前选中设备ID集合
  onChange: (next: string[]) => void; // 选中集合变更
}

const toCsv = (rows: Array<Record<string, any>>): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
};

const downloadFile = (content: string | Blob, filename: string, mime = 'text/plain') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

  // Preset helpers (module scope to avoid TDZ when used in useState initializer)
  type Preset = { name: string; ids: string[] };
  const loadPresets = (): Preset[] => {
    try { const raw = localStorage.getItem('adb.monitor.selectionPresets'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  };
  const savePresets = (list: Preset[]) => {
    try { localStorage.setItem('adb.monitor.selectionPresets', JSON.stringify(list)); } catch {}
  };

export const SelectionBar: React.FC<SelectionBarProps> = ({ devices, selectedIds, onChange }) => {
  const idSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedDevices = useMemo(() => devices.filter(d => idSet.has(d.id)), [devices, idSet]);
  const [presetModalOpen, setPresetModalOpen] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');
  const [manageOpen, setManageOpen] = React.useState(false);
  const [presets, setPresets] = React.useState<Preset[]>(() => loadPresets());
  const [presetEdits, setPresetEdits] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const refreshEditsFromPresets = (list: Preset[]) => {
    setPresetEdits(list.map(p => p.name));
  };

  const selectAll = () => onChange(devices.map(d => d.id));
  const selectOnline = () => onChange(devices.filter(d => d.status === 'device' || d.status === 'online').map(d => d.id));
  const selectUsb = () => onChange(devices.filter(d => d.connection_type === 'usb').map(d => d.id));
  const selectEmu = () => onChange(devices.filter(d => d.connection_type === 'emulator').map(d => d.id));
  const selectUnauthorized = () => onChange(devices.filter(d => d.status === 'unauthorized').map(d => d.id));
  const selectOffline = () => onChange(devices.filter(d => d.status === 'offline').map(d => d.id));
  const clear = () => onChange([]);
  const invert = () => {
    const all = new Set(devices.map(d => d.id));
    const next: string[] = [];
    all.forEach(id => { if (!idSet.has(id)) next.push(id); });
    onChange(next);
  };
  const selectOnlineUsb = () => onChange(devices.filter(d => (d.status === 'device' || d.status === 'online') && d.connection_type === 'usb').map(d => d.id));
  const copyIds = async () => {
    if (!selectedDevices.length) return message.info('请先选择设备');
    try {
      await navigator.clipboard.writeText(selectedDevices.map(d => d.id).join('\n'));
      message.success('已复制选中设备ID');
    } catch (e) {
      message.error('复制失败');
    }
  };

  const exportItems: MenuProps['items'] = [
    {
      key: 'json',
      label: '导出 JSON',
      onClick: () => {
        if (!selectedDevices.length) return message.info('请先选择设备');
        const data = selectedDevices.map(d => ({ id: d.id, status: d.status, connection_type: d.connection_type }));
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        downloadFile(JSON.stringify(data, null, 2), `selected-devices-${ts}.json`, 'application/json');
      }
    },
    {
      key: 'csv',
      label: '导出 CSV',
      onClick: () => {
        if (!selectedDevices.length) return message.info('请先选择设备');
        const data = selectedDevices.map(d => ({ id: d.id, status: d.status, connection_type: d.connection_type }));
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        downloadFile(toCsv(data), `selected-devices-${ts}.csv`, 'text/csv');
      }
    }
  ];

  const exportFilteredItems: MenuProps['items'] = [
    {
      key: 'json-all',
      label: '导出筛选(JSON)',
      onClick: () => {
        const data = devices.map(d => ({ id: d.id, status: d.status, connection_type: d.connection_type }));
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        downloadFile(JSON.stringify(data, null, 2), `filtered-devices-${ts}.json`, 'application/json');
      }
    },
    {
      key: 'csv-all',
      label: '导出筛选(CSV)',
      onClick: () => {
        const data = devices.map(d => ({ id: d.id, status: d.status, connection_type: d.connection_type }));
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        downloadFile(toCsv(data), `filtered-devices-${ts}.csv`, 'text/csv');
      }
    }
  ];

  const applyPreset = (p: Preset) => {
    onChange(p.ids.filter(id => devices.some(d => d.id === id)));
  };

  const exportPresets = () => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadFile(JSON.stringify(presets, null, 2), `device-selection-presets-${ts}.json`, 'application/json');
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('格式错误：应为数组');
      const incoming: Preset[] = [];
      for (const item of data) {
        if (!item || typeof item.name !== 'string' || !Array.isArray(item.ids)) throw new Error('格式错误：预设项无效');
        const ids = item.ids.filter((x: any) => typeof x === 'string');
        incoming.push({ name: item.name, ids });
      }
      // merge by name (union ids)
      const map = new Map<string, Set<string>>();
      presets.forEach(p => map.set(p.name, new Set(p.ids)));
      incoming.forEach(p => {
        const cur = map.get(p.name) ?? new Set<string>();
        p.ids.forEach(id => cur.add(id));
        map.set(p.name, cur);
      });
      const merged: Preset[] = Array.from(map.entries()).map(([name, set]) => ({ name, ids: Array.from(set) }));
      savePresets(merged); setPresets(merged);
      message.success(`已导入并合并 ${incoming.length} 个预设`);
    } catch (e: any) {
      console.error(e);
      message.error(`导入失败：${e?.message || '未知错误'}`);
    }
  };

  const presetMenu: MenuProps['items'] = [
    { type: 'group', label: '选择预设' },
    ...presets.map((p, idx) => ({
      key: `preset-${idx}`,
      label: p.name,
      onClick: () => applyPreset(p)
    })),
    { type: 'divider' },
    {
      key: 'save',
      label: '保存当前选中为预设...',
      onClick: () => setPresetModalOpen(true)
    },
    {
      key: 'exportPresets',
      label: '导出全部预设(JSON)',
      onClick: exportPresets
    },
    {
      key: 'importPresets',
      label: '导入预设(JSON)...',
      onClick: () => fileInputRef.current?.click()
    },
    {
      key: 'manage',
      label: '管理预设...',
      onClick: () => { refreshEditsFromPresets(presets); setManageOpen(true); }
    },
    {
      key: 'deleteAll',
      label: '清空所有预设',
      danger: true,
      onClick: () => { savePresets([]); setPresets([]); message.success('已清空预设'); }
    }
  ];

  return (
    <Space wrap>
      <Tooltip title="全选（当前筛选）">
        <Button icon={<CheckSquareOutlined />} onClick={selectAll}>全选</Button>
      </Tooltip>
      <Tooltip title="仅选在线">
        <Button icon={<CheckSquareOutlined />} type="primary" onClick={selectOnline}>在线</Button>
      </Tooltip>
      <Tooltip title="仅选 在线 且 USB">
        <Button icon={<ScissorOutlined />} onClick={selectOnlineUsb}>在线&USB</Button>
      </Tooltip>
      <Tooltip title="仅选 USB">
        <Button icon={<UsbOutlined />} onClick={selectUsb}>USB</Button>
      </Tooltip>
      <Tooltip title="仅选 模拟器">
        <Button icon={<DesktopOutlined />} onClick={selectEmu}>模拟器</Button>
      </Tooltip>
      <Tooltip title="仅选 在线 且 模拟器">
        <Button onClick={() => onChange(devices.filter(d => (d.status === 'device' || d.status === 'online') && d.connection_type === 'emulator').map(d => d.id))}>在线&模拟器</Button>
      </Tooltip>
      <Tooltip title="仅选 未授权">
        <Button onClick={selectUnauthorized}>未授权</Button>
      </Tooltip>
      <Tooltip title="仅选 离线">
        <Button onClick={selectOffline}>离线</Button>
      </Tooltip>
      <Tooltip title="反选（当前筛选）">
        <Button icon={<SwapOutlined />} onClick={invert}>反选</Button>
      </Tooltip>
      <Tooltip title="清空选择">
        <Button icon={<ClearOutlined />} danger onClick={clear} disabled={selectedIds.length === 0}>清空</Button>
      </Tooltip>
      <Tooltip title="复制选中设备ID到剪贴板">
        <Button icon={<CopyOutlined />} onClick={copyIds} disabled={selectedIds.length === 0}>复制ID</Button>
      </Tooltip>
      <Dropdown menu={{ items: exportItems }} disabled={selectedIds.length === 0}>
        <Button icon={<CloudDownloadOutlined />}>
          导出选中（{selectedIds.length}）
        </Button>
      </Dropdown>
      <Dropdown menu={{ items: exportFilteredItems }}>
        <Button icon={<CloudDownloadOutlined />}>
          导出筛选（{devices.length}）
        </Button>
      </Dropdown>
      <Dropdown menu={{ items: presetMenu }}>
        <Button>选择预设</Button>
      </Dropdown>
      <Typography.Text type="secondary">
        已选 {selectedIds.length} / 共 {devices.length}
      </Typography.Text>
      <Space size={4}>
        <Tag color="green">在线 {selectedDevices.filter(d => d.status === 'device' || d.status === 'online').length}</Tag>
        <Tag>USB {selectedDevices.filter(d => d.connection_type === 'usb').length}</Tag>
        <Tag>模拟器 {selectedDevices.filter(d => d.connection_type === 'emulator').length}</Tag>
        <Tag color="gold">未授权 {selectedDevices.filter(d => d.status === 'unauthorized').length}</Tag>
        <Tag>离线 {selectedDevices.filter(d => d.status === 'offline').length}</Tag>
      </Space>

      <Modal
        title="保存为选择预设"
        open={presetModalOpen}
        onCancel={() => setPresetModalOpen(false)}
        onOk={() => {
          const name = presetName.trim();
          if (!name) return message.info('请输入预设名称');
          const list = [...presets];
          const exists = list.findIndex(p => p.name === name);
          const next: Preset = { name, ids: selectedIds };
          if (exists >= 0) list[exists] = next; else list.push(next);
          savePresets(list); setPresets(list);
          setPresetModalOpen(false);
          setPresetName('');
          message.success('已保存预设');
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">将保存当前选中设备ID集合为本地预设</Typography.Text>
          <Input placeholder="预设名称" value={presetName} onChange={e => setPresetName(e.target.value)} />
        </Space>
      </Modal>

      {/* Hidden file input for importing presets */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
          // reset value to allow re-selecting the same file next time
          e.currentTarget.value = '';
        }}
      />

      <Modal
        title="管理选择预设"
        open={manageOpen}
        onCancel={() => setManageOpen(false)}
        onOk={() => { setManageOpen(false); }}
      >
        {presets.length === 0 ? (
          <Typography.Text type="secondary">暂无预设</Typography.Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {presets.map((p, idx) => (
              <Space key={p.name} style={{ display: 'flex', justifyContent: 'space-between' }} align="center">
                <Input
                  style={{ flex: 1 }}
                  value={presetEdits[idx] ?? p.name}
                  onChange={e => setPresetEdits(ed => { const cp = [...ed]; cp[idx] = e.target.value; return cp; })}
                />
                <Space>
                  <Button
                    type="primary"
                    onClick={() => {
                      const newName = (presetEdits[idx] ?? '').trim();
                      if (!newName) return message.info('名称不能为空');
                      if (presets.some((x, i) => i !== idx && x.name === newName)) return message.error('已存在同名预设');
                      const list = presets.map((x, i) => i === idx ? { ...x, name: newName } : x);
                      savePresets(list); setPresets(list);
                      message.success('已重命名');
                    }}
                  >保存</Button>
                  <Button
                    danger
                    onClick={() => {
                      const list = presets.filter((_, i) => i !== idx);
                      savePresets(list); setPresets(list);
                      message.success('已删除');
                      // 同步编辑状态
                      setPresetEdits(ed => ed.filter((_, i) => i !== idx));
                    }}
                  >删除</Button>
                </Space>
              </Space>
            ))}
          </Space>
        )}
      </Modal>
    </Space>
  );
};

export default SelectionBar;
