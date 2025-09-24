export { MatchingStrategyTag } from './MatchingStrategyTag';
export type { MatchingStrategy, MatchingStrategyTagProps } from './MatchingStrategyTag';

export { TestResultCopyButton } from './TestResultCopyButton';
export { TestResultDetail, TestResultTitle } from './TestResultDetail';
export { formatTestResultForCopy, copyToClipboard } from './testResultUtils';
// scroll submodule
export { ScrollDirectionSelector } from './scroll/ScrollDirectionSelector';
export type { ScrollDirection } from './scroll/ScrollDirectionSelector';
export { ScrollParamsEditor } from './scroll/ScrollParamsEditor';
export type { ScrollParams } from './scroll/ScrollParamsEditor';
// screen-actions submodule (barrel)
export * from './screen-actions';
export * from './tap-actions';