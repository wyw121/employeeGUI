import type { MatchCriteriaDTO, MatchResultDTO } from '../../domain/page-analysis/repositories/IUiMatcherRepository';

export interface StrategyTestResult {
  success: boolean;
  output: string;
  matchResult?: MatchResultDTO;
  criteria?: MatchCriteriaDTO;
  error?: string;
}
