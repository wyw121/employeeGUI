// Barrel re-exports for self-contained script types & helpers
export type { XmlSnapshot } from './self-contained/xmlSnapshot';
export {
  createXmlSnapshot,
  validateXmlSnapshot,
  generateXmlHash,
} from './self-contained/xmlSnapshot';

export type { ElementLocator } from './self-contained/elementLocator';

export type { SelfContainedStepParameters } from './self-contained/parameters';
export { migrateToSelfContainedParameters } from './self-contained/parameters';