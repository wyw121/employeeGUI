export type StepType =
  | 'smart_find_element'
  | 'batch_match'
  | 'smart_click'
  | 'smart_input'
  | 'smart_scroll'
  | 'smart_wait'
  | 'smart_extract'
  | 'smart_verify'
  | 'loop_start'
  | 'loop_end'
  | 'contact_generate_vcf'
  | 'contact_import_to_device'
  // 兜底扩展：向后兼容未知类型（第三方扩展或历史数据）
  | (string & {});
