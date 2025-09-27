import type { StepType } from '../../../types/StepType';

export interface StepTypeStyle {
  tagColor: string; // AntD Tag color token
  cardClass: string; // extra classes for Card root
  ringClass: string; // ring color while dragging
  hoverClass: string; // hover class when not dragging
  titleTextClass?: string; // optional title text color
  titleBarClass?: string; // optional header/title bar extra classes
  extraCardClass?: string; // optional extra card classes (position/overflow/transition)
  draggingCardClass?: string; // optional classes when dragging
  headerHandleClass?: string; // drag handle pill on header
  iconPillClass?: string; // icon circular pill on header
  topAccentClass?: string; // thin accent bar at top
  leftAccentClass?: string; // left side accent bar
  titleTagClass?: string; // title tag pill style
}

const base: StepTypeStyle = {
  tagColor: 'default',
  cardClass: '',
  ringClass: 'ring-blue-300',
  hoverClass: 'hover:shadow-sm',
};
// 从 StepType 中剔除兜底 string，得到“已知类型”集合
type KnownStepType = Exclude<StepType, string & {}>;

export const stepTypeStyles: Partial<Record<KnownStepType, StepTypeStyle>> = {
  // 循环开始：不依赖 base，显式定义全部关键字段，并加入专属类 loop-start
  loop_start: {
    tagColor: 'blue',
    cardClass: 'rounded-2xl',
    ringClass: 'ring-blue-500',
    hoverClass: 'hover:shadow-lg',
    titleTextClass: 'text-blue-900',
    titleBarClass: '-m-2 p-3 rounded-t border-b-2 border-blue-200',
    extraCardClass: 'loop-card loop-start',
    draggingCardClass: 'loop-card-dragging',
    headerHandleClass: 'loop-header-handle',
    iconPillClass: 'loop-icon-pill',
    topAccentClass: 'loop-top-accent',
    leftAccentClass: 'loop-left-accent',
    titleTagClass: 'loop-title-tag',
  },
  // 循环结束：不依赖 base，显式定义全部关键字段，并加入专属类 loop-end（与 start 做细微差异）
  loop_end: {
    tagColor: 'blue',
    cardClass: 'rounded-2xl',
    ringClass: 'ring-blue-600',
    hoverClass: 'hover:shadow-lg',
    titleTextClass: 'text-blue-900',
    titleBarClass: '-m-2 p-3 rounded-t border-b-2 border-blue-200',
    extraCardClass: 'loop-card loop-end',
    draggingCardClass: 'loop-card-dragging',
    headerHandleClass: 'loop-header-handle',
    iconPillClass: 'loop-icon-pill',
    topAccentClass: 'loop-top-accent',
    leftAccentClass: 'loop-left-accent',
    titleTagClass: 'loop-title-tag',
  },
  smart_click: {
    ...base,
    tagColor: 'green',
    cardClass: 'bg-green-50 border-l-4 border-green-400',
    ringClass: 'ring-green-300',
    hoverClass: 'hover:shadow',
    titleTextClass: 'text-green-700',
  },
  smart_input: {
    ...base,
    tagColor: 'orange',
    cardClass: 'bg-orange-50 border-l-4 border-orange-400',
    ringClass: 'ring-orange-300',
    hoverClass: 'hover:shadow',
    titleTextClass: 'text-orange-700',
  },
  smart_scroll: {
    ...base,
    tagColor: 'purple',
    cardClass: 'bg-purple-50 border-l-4 border-purple-400',
    ringClass: 'ring-purple-300',
    hoverClass: 'hover:shadow',
    titleTextClass: 'text-purple-700',
  },
  smart_verify: {
    ...base,
    tagColor: 'geekblue',
    cardClass: 'bg-blue-50 border-l-4 border-blue-400',
    ringClass: 'ring-blue-300',
    hoverClass: 'hover:shadow',
    titleTextClass: 'text-blue-700',
  },
  smart_extract: {
    ...base,
    tagColor: 'red',
    cardClass: 'bg-red-50 border-l-4 border-red-400',
    ringClass: 'ring-red-300',
    hoverClass: 'hover:shadow',
    titleTextClass: 'text-red-700',
  },
  smart_wait: {
    ...base,
    tagColor: 'cyan',
    cardClass: 'bg-cyan-50 border-l-4 border-cyan-400',
    ringClass: 'ring-cyan-300',
    hoverClass: 'hover:shadow',
    titleTextClass: 'text-cyan-700',
  },
};

export function getStepTypeStyle(stepType: StepType | string): StepTypeStyle {
  return (stepTypeStyles as Record<string, StepTypeStyle>)[stepType] || base;
}
