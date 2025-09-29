import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete, Button, Input, Space, Tag, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../../../theme';
import { getThemeAwareTextStyles } from '../../themes/styles';

export interface IndustryTagCellProps {
  /** 当前分类值 */
  value?: string | null;
  /** 分类选项 */
  options: string[];
  /** 保存分类 */
  onSave?: (next?: string | null) => Promise<void> | void;
  /** 请求刷新分类选项 */
  onRefreshOptions?: () => Promise<void> | void;
  /** 是否禁用编辑 */
  disabled?: boolean;
}

const normalize = (value?: string | null): string | undefined => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const IndustryTagCell: React.FC<IndustryTagCellProps> = ({
  value,
  options,
  onSave,
  onRefreshOptions,
  disabled = false,
}) => {
  const { mode } = useTheme();
  const textStyles = getThemeAwareTextStyles(mode);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string>(() => value ?? '');
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const inputRef = useRef<InputRef>(null);

  const normalizedCurrent = useMemo(() => normalize(value), [value]);
  const autocompleteOptions = useMemo(
    () => options.map((label) => ({ value: label })),
    [options]
  );

  useEffect(() => {
    if (!editing) {
      setInputValue(value ?? '');
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      onRefreshOptions?.();
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [editing, onRefreshOptions]);

  const exitEditing = useCallback(() => {
    setEditing(false);
    setInputValue(value ?? '');
    setSaving(false);
  }, [value]);

  const commit = useCallback(
    async (nextRaw?: string | null) => {
      if (!onSave) {
        exitEditing();
        return;
      }
      const nextNormalized = normalize(nextRaw);
      if (nextNormalized === normalizedCurrent) {
        exitEditing();
        return;
      }
      try {
        setSaving(true);
        await onSave(nextNormalized);
      } finally {
        exitEditing();
      }
    },
    [exitEditing, normalizedCurrent, onSave]
  );

  const handleSelect = useCallback(
    async (next: string) => {
      setSelecting(true);
      await commit(next);
      setSelecting(false);
    },
    [commit]
  );

  const handleBlur = useCallback(async () => {
    if (selecting) {
      return;
    }
    await commit(inputValue);
  }, [commit, inputValue, selecting]);

  const handlePressEnter = useCallback(async () => {
    await commit(inputValue);
  }, [commit, inputValue]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitEditing();
      }
    },
    [exitEditing]
  );

  const startEditing = useCallback(
    (initial?: string) => {
      if (disabled) return;
      setInputValue(initial ?? (value ?? ''));
      setEditing(true);
    },
    [disabled, value]
  );

  const clearValue = useCallback(
    async (event?: React.MouseEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      await commit(undefined);
    },
    [commit]
  );

  const renderView = () => (
    <Space size={4} align="center">
      <Tooltip title="双击编辑，点击关闭清除">
        <Tag
          color={normalizedCurrent ? 'blue' : undefined}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', ...textStyles.secondaryText }}
          closable={!!normalizedCurrent && !disabled}
          onClose={clearValue}
          onDoubleClick={() => startEditing()}
        >
          {normalizedCurrent ?? '未分类'}
        </Tag>
      </Tooltip>
      {!disabled && (
        <Space size={0}>
          <Tooltip title="编辑分类">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                startEditing();
              }}
            />
          </Tooltip>
          <Tooltip title="新增分类">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                startEditing('');
              }}
            />
          </Tooltip>
        </Space>
      )}
    </Space>
  );

  const renderEditor = () => (
    <AutoComplete
      value={inputValue}
      options={autocompleteOptions}
      onChange={(val) => setInputValue(val)}
      onSelect={handleSelect}
      style={{ minWidth: 160 }}
    >
      <Input
        ref={inputRef}
        size="small"
        value={inputValue}
        placeholder="输入或选择分类"
        onChange={(event) => setInputValue(event.target.value)}
        onPressEnter={handlePressEnter}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={saving}
        suffix={saving ? <LoadingOutlined /> : undefined}
        allowClear
      />
    </AutoComplete>
  );

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        minWidth: 120,
      }}
      onDoubleClick={() => startEditing()}
    >
      {editing ? renderEditor() : renderView()}
    </div>
  );
};

export default React.memo(IndustryTagCell);
