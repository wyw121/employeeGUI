// Barrel 导出，以便后续逐步拆分子组件
export { default as ElementNameEditor } from './ElementNameEditor';
// 预留后续导出：hooks / 子组件 / 常量
export * from './logic/constraints';
export * from './logic/score';
export { default as adaptElementToUniversalUIType } from './toUniversalElement';
