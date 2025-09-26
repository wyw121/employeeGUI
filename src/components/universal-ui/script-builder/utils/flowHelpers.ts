// Flow 相关纯函数：从 FlowScriptBuilder 抽离

export function convertFlowStepToScriptType(stepId: string): string {
  if (stepId.includes('open_app')) return 'open_app';
  if (stepId.includes('click') || stepId.includes('tap')) return 'tap';
  if (stepId.includes('search')) return 'input';
  return 'tap';
}

export function getAppFromStepId(stepId: string): string {
  if (stepId.includes('xhs')) return 'com.xingin.xhs';
  if (stepId.includes('wechat')) return 'com.tencent.mm';
  return '';
}
