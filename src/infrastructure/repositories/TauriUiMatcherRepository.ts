import { invoke, isTauri } from '@tauri-apps/api/core';
import { IUiMatcherRepository, MatchCriteriaDTO, MatchResultDTO } from '../../domain/page-analysis/repositories/IUiMatcherRepository';

export class TauriUiMatcherRepository implements IUiMatcherRepository {
  async matchByCriteria(deviceId: string, criteria: MatchCriteriaDTO): Promise<MatchResultDTO> {
    if (!isTauri()) {
      // 浏览器环境：返回模拟结果
      return { ok: false, message: '非Tauri环境无法执行真机匹配' };
    }
    try {
      const res = await invoke('match_element_by_criteria', { deviceId, criteria });
      return res as MatchResultDTO;
    } catch (error) {
      console.error('match_element_by_criteria 调用失败:', error);
      return { ok: false, message: String(error) };
    }
  }
}
