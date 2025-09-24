import type { MatchCriteria as UIMatchCriteria } from '../../../components/universal-ui/views/grid-view/panels/node-detail/types';
import {
  buildShortTitleFromCriteria as _buildShortTitleFromCriteria,
  buildShortDescriptionFromCriteria as _buildShortDescriptionFromCriteria,
} from '../../../components/universal-ui/views/grid-view/panels/node-detail/titleHelpers';

// 轻薄转发封装，确保输出与 node-detail 完全一致，便于后续集中替换/演进
export const buildShortTitleFromCriteria = (criteria: UIMatchCriteria): string => {
  return _buildShortTitleFromCriteria(criteria);
};

export const buildShortDescriptionFromCriteria = (criteria: UIMatchCriteria): string => {
  return _buildShortDescriptionFromCriteria(criteria);
};

export default {
  buildShortTitleFromCriteria,
  buildShortDescriptionFromCriteria,
};
