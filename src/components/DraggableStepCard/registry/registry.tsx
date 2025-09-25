import React from 'react';
import type { StepUIExtension, SmartScriptStepLike, StepUIContext, StepMeta } from './types';
import { SmartScrollControls } from '../components/SmartScrollControls';
import { ContactSourceSelector } from '../components/ContactSourceSelector';
import { ContactDeviceSelector } from '../components/ContactDeviceSelector';
import { Tag } from 'antd';
import { SmartClickControls } from '../components/SmartClickControls';
import { SmartInputControls } from '../components/SmartInputControls';
// 元信息表，集中 UI 标签、图标、颜色定义
const META_MAP: Record<string, StepMeta> = {
  smart_find_element: { icon: '🎯', name: '智能元素查找', color: 'blue', category: '定位' },
  batch_match: { icon: '🔍', name: '批量匹配', color: 'purple', category: '定位' },
  smart_click: { icon: '👆', name: '智能点击', color: 'green', category: '交互' },
  smart_input: { icon: '✏️', name: '智能输入', color: 'orange', category: '输入' },
  smart_scroll: { icon: '📜', name: '智能滚动', color: 'purple', category: '导航' },
  smart_wait: { icon: '⏰', name: '智能等待', color: 'cyan', category: '控制' },
  smart_extract: { icon: '📤', name: '智能提取', color: 'red', category: '数据' },
  smart_verify: { icon: '✅', name: '智能验证', color: 'geekblue', category: '验证' },
  loop_start: { icon: '🔄', name: '循环开始', color: 'blue', category: '循环' },
  loop_end: { icon: '🏁', name: '循环结束', color: 'blue', category: '循环' },
  // 兼容旧命名 generate_vcf
  generate_vcf: { icon: '📇', name: '生成VCF文件', color: 'gold', category: '通讯录' },
  contact_generate_vcf: { icon: '📇', name: '生成VCF文件', color: 'gold', category: '通讯录' },
  contact_import_to_device: { icon: '⚙️', name: '导入联系人到设备', color: 'orange', category: '通讯录' },
};

const smartScrollExt: StepUIExtension = {
  renderHeaderExtras: (step, ctx) => (
    <SmartScrollControls
      step={step as any}
      onUpdate={(partial) => ctx.onUpdateStepParameters?.(step.id, {
        ...step.parameters,
        ...partial,
      })}
    />
  ),
};

const smartClickExt: StepUIExtension = {
  renderHeaderExtras: (step, ctx) => (
    <SmartClickControls
      step={step as any}
      onUpdate={(partial) => ctx.onUpdateStepParameters?.(step.id, {
        ...step.parameters,
        ...partial,
      })}
    />
  ),
};

const smartInputExt: StepUIExtension = {
  renderHeaderExtras: (step, ctx) => (
    <SmartInputControls
      step={step as any}
      onUpdate={(partial) => ctx.onUpdateStepParameters?.(step.id, {
        ...step.parameters,
        ...partial,
      })}
    />
  ),
};

const contactGenerateVcfExt: StepUIExtension = {
  renderBodyExtras: (step, ctx) => (
    <ContactSourceSelector step={step} onUpdateStepParameters={ctx.onUpdateStepParameters} />
  ),
};

const contactImportToDeviceExt: StepUIExtension = {
  renderBodyExtras: (step, ctx) => (
    <ContactDeviceSelector step={step} devices={ctx.devices} />
  ),
};

const registryMap: Record<string, StepUIExtension> = {
  smart_scroll: smartScrollExt,
  smart_click: smartClickExt,
  smart_input: smartInputExt,
  contact_generate_vcf: contactGenerateVcfExt,
  contact_import_to_device: contactImportToDeviceExt,
};

export function getStepUIExtension(stepType: string): StepUIExtension | undefined {
  return registryMap[stepType];
}

// ---- Meta & Tag/Summary rendering ----

const KEYEVENT_META: StepMeta = { icon: '🔑', name: '系统按键', color: 'gold', category: '系统' };

export function getStepMeta(step: SmartScriptStepLike): StepMeta {
  const type = String(step.step_type).toLowerCase();
  if (type === 'keyevent') return KEYEVENT_META;
  return META_MAP[step.step_type] || { icon: '⚙️', name: '未知操作', color: 'default', category: '其他' };
}

export function renderStepTag(step: SmartScriptStepLike) {
  const meta = getStepMeta(step);
  const label = meta.name === '系统按键' ? '🔑 系统按键' : meta.name;
  return <Tag color={meta.color}>{label}</Tag>;
}

export function renderStepSummary(step: SmartScriptStepLike) {
  const meta = getStepMeta(step);
  return `类型: ${meta.category}`;
}
