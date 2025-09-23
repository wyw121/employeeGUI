import React from 'react';
import { Card, Alert, Space, Button, List, Typography, Tag } from 'antd';
import { useAdbStore } from '../../application/store/adbStore';
import { DiagnosticStatus, DiagnosticCategory } from '../../domain/adb';
import { getSourceFromName, statusColor, categoryColor, normalizeTimestamp } from './logs/logUtils';
import { exportJson, exportNdjson } from './logs/exporters';
import { LogFilterBar } from './logs/LogFilterBar';
import { LogDetailsDrawer } from './logs/LogDetailsDrawer';
import { LogQuickPresets } from './logs/LogQuickPresets';

const { Text } = Typography;

export const LogConsole: React.FC = () => {
  const lastError = useAdbStore(s => s.lastError);
  const results = useAdbStore(s => s.diagnosticResults);
  const clear = useAdbStore(s => s.clearDiagnosticResults);

  // filters states
  const [keyword, setKeyword] = React.useState('');
  const [status, setStatus] = React.useState<'all' | DiagnosticStatus>('all');
  const [category, setCategory] = React.useState<'all' | DiagnosticCategory>('all');
  const [source, setSource] = React.useState<'all' | string>('all');
  const [deviceId, setDeviceId] = React.useState<'all' | string>('all');
  const [sessionId, setSessionId] = React.useState<'all' | string>('all');
  const [sortDesc, setSortDesc] = React.useState(true);

  // row expansion states
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  // details drawer
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerRecord, setDrawerRecord] = React.useState<any | undefined>(undefined);
  const openDrawer = (r: any) => { setDrawerRecord(r); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setDrawerRecord(undefined); };

  // restore persisted filters
  React.useEffect(() => {
    const raw = localStorage.getItem('adb.logConsole.filters');
    if (!raw) return;
    try {
      const v = JSON.parse(raw) as {
        keyword: string;
        status: DiagnosticStatus | 'all';
        category: DiagnosticCategory | 'all';
        source?: string | 'all';
        sortDesc: boolean;
        deviceId?: string | 'all';
        sessionId?: string | 'all';
      };
      if (typeof v.keyword === 'string') setKeyword(v.keyword);
      if (v.status === 'all' || v.status === DiagnosticStatus.SUCCESS || v.status === DiagnosticStatus.WARNING || v.status === DiagnosticStatus.ERROR) setStatus(v.status);
      if (v.category === 'all' || typeof v.category === 'string') setCategory(v.category as any);
      if (v.source && typeof v.source === 'string') setSource(v.source as any);
      if (typeof v.sortDesc === 'boolean') setSortDesc(v.sortDesc);
      if (v.deviceId && typeof v.deviceId === 'string') setDeviceId(v.deviceId as any);
      if (v.sessionId && typeof v.sessionId === 'string') setSessionId(v.sessionId as any);
    } catch {}
  }, []);

  // persist on change
  React.useEffect(() => {
    localStorage.setItem('adb.logConsole.filters', JSON.stringify({ keyword, status, category, source, sortDesc, deviceId, sessionId }));
  }, [keyword, status, category, source, sortDesc, deviceId, sessionId]);

  // options
  const categories = React.useMemo(() => {
    const set = new Set<DiagnosticCategory>();
    results.forEach(r => set.add((r as any).category ?? DiagnosticCategory.GENERAL));
    return Array.from(set);
  }, [results]);

  const sources = React.useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => {
      const src = (r as any).source as string | undefined;
      if (src) set.add(src);
      else set.add(getSourceFromName((r as any).name));
    });
    return Array.from(set);
  }, [results]);

  const deviceIds = React.useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => { const id = (r as any).deviceId as string | undefined; if (id) set.add(id); });
    return Array.from(set);
  }, [results]);

  const sessionIds = React.useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => { const id = (r as any).sessionId as string | undefined; if (id) set.add(id); });
    return Array.from(set);
  }, [results]);

  // filtering + sorting
  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const arr = results.filter(r => {
      const okKw = kw ? JSON.stringify(r).toLowerCase().includes(kw) : true;
      const okStatus = status === 'all' ? true : r.status === status;
      const cat = (r as any).category ?? DiagnosticCategory.GENERAL;
      const okCat = category === 'all' ? true : cat === category;
      const src = (r as any).source || getSourceFromName((r as any).name);
      const okSource = source === 'all' ? true : src === source;
      const okDevice = deviceId === 'all' ? true : (r as any).deviceId === deviceId;
      const okSession = sessionId === 'all' ? true : (r as any).sessionId === sessionId;
      return okKw && okStatus && okCat && okSource && okDevice && okSession;
    });
    return arr.sort((a, b) => {
      const ta = normalizeTimestamp((a as any).timestamp).getTime();
      const tb = normalizeTimestamp((b as any).timestamp).getTime();
      return sortDesc ? tb - ta : ta - tb;
    });
  }, [results, keyword, status, category, source, deviceId, sessionId, sortDesc]);

  // actions
  const handleExportJson = React.useCallback(() => { try { exportJson(filtered as any); } catch (e) { console.error(e);} }, [filtered]);
  const handleExportNdjson = React.useCallback(() => { try { exportNdjson(filtered as any); } catch (e) { console.error(e);} }, [filtered]);
  const copyFiltered = React.useCallback(async () => { try { await navigator.clipboard.writeText(JSON.stringify(filtered, null, 2)); } catch (e) { console.error(e);} }, [filtered]);
  const clearFilters = React.useCallback(() => { setKeyword(''); setStatus('all'); setCategory('all'); setSource('all'); setDeviceId('all'); setSessionId('all'); setSortDesc(true); }, []);
  const toggleExpand = React.useCallback((id: string) => { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }, []);

  // quick presets
  const onlyErrors = React.useCallback(() => { setStatus(DiagnosticStatus.ERROR); }, []);
  const onlyAdb = React.useCallback(() => { setSource('ADB'); }, []);
  const currentDevice = React.useCallback(() => {
    // 若 store 中有选中设备，则用之；否则不变
    const id = useAdbStore.getState().selectedDeviceId;
    if (id) setDeviceId(id);
  }, []);
  const resetAll = React.useCallback(() => { clearFilters(); }, [clearFilters]);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {lastError && (<Alert type="error" showIcon message="最近错误" description={String(lastError)} />)}

      <Card
        title="诊断结果"
        extra={
          <Space direction="vertical" size={8}>
            <LogQuickPresets
              onOnlyErrors={onlyErrors}
              onOnlyAdb={onlyAdb}
              onCurrentDevice={currentDevice}
              onReset={resetAll}
            />
            <LogFilterBar
            keyword={keyword}
            onKeyword={setKeyword}
            status={status}
            onStatus={setStatus}
            category={category}
            onCategory={setCategory}
            categories={categories}
            source={source}
            onSource={setSource}
            sources={sources}
            deviceId={deviceId}
            onDeviceId={setDeviceId}
            deviceIds={deviceIds}
            sessionId={sessionId}
            onSessionId={setSessionId}
            sessionIds={sessionIds}
            sortDesc={sortDesc}
            onSortDesc={setSortDesc}
            onExportJson={handleExportJson}
            onExportNdjson={handleExportNdjson}
            onCopy={copyFiltered}
            onClearFilters={clearFilters}
            onClearAll={clear}
            />
          </Space>
        }
      >
        {filtered.length === 0 ? (
          <Text type="secondary">暂无诊断数据</Text>
        ) : (
          <List
            size="small"
            dataSource={filtered}
            renderItem={(r) => (
              <List.Item>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap>
                    <Button type="link" size="small" onClick={() => openDrawer(r)} style={{ padding: 0 }}>
                      <Text strong>{(r as any).name || r.id}</Text>
                    </Button>
                    <Tag color={statusColor((r as any).status)} onClick={() => setStatus((r as any).status)} style={{ cursor: 'pointer' }}>{(r as any).status}</Tag>
                    <Tag color={categoryColor((r as any).category)} onClick={() => setCategory(((r as any).category) || 'all')} style={{ cursor: 'pointer' }}>{(r as any).category || 'general'}</Tag>
                    {(() => { const src = ((r as any).source) || getSourceFromName((r as any).name); return (
                      <Tag onClick={() => setSource(src)} style={{ cursor: 'pointer' }}>{src}</Tag>
                    ); })()}
                    {(r as any).deviceId && (
                      <Tag onClick={() => setDeviceId((r as any).deviceId)} style={{ cursor: 'pointer' }}>设备:{(r as any).deviceId}</Tag>
                    )}
                    {(r as any).sessionId && (
                      <Tag onClick={() => setSessionId((r as any).sessionId)} style={{ cursor: 'pointer' }}>会话:{(r as any).sessionId}</Tag>
                    )}
                    <Text type="secondary">{normalizeTimestamp((r as any).timestamp).toLocaleString()}</Text>
                    {(r as any).details && (
                      <Button size="small" onClick={() => toggleExpand((r as any).id)}>
                        {expanded[(r as any).id] ? '隐藏详情' : '详情'}
                      </Button>
                    )}
                  </Space>
                  <Text>{(r as any).message || JSON.stringify(r)}</Text>
                  {(r as any).details && expanded[(r as any).id] && (
                    <pre style={{ background: '#fafafa', padding: 8, borderRadius: 4, margin: 0, maxHeight: 260, overflow: 'auto' }}>
                      {(() => { try { const obj = JSON.parse((r as any).details); return JSON.stringify(obj, null, 2);} catch { return String((r as any).details);} })()}
                    </pre>
                  )}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      <LogDetailsDrawer open={drawerOpen} onClose={closeDrawer} record={drawerRecord} />
    </Space>
  );
};

export default LogConsole;
