import React from 'react';

/**
 * HOC: 强制为任意覆盖层组件（Modal/Popover/Tooltip/Dropdown/Drawer）添加 overlay-surface 类
 * 目标：避免遗漏 className/overlayClassName，保证白底深字与一致的箭头/边框/阴影。
 * 使用方式：
 *   const ModalWithSurface = withOverlaySurface(Modal);
 *   <ModalWithSurface open={...} title="..." />
 */
export function withOverlaySurface<T extends { className?: string; rootClassName?: string; overlayClassName?: string }>(
  Comp: React.ComponentType<T>
) {
  return function OverlaySurfaceComp(props: T) {
    const composed: T = {
      ...props,
      className: [props.className, 'overlay-surface'].filter(Boolean).join(' '),
      rootClassName: [props.rootClassName, 'overlay-surface overlay-elevated'].filter(Boolean).join(' '),
      overlayClassName: [
        // 覆盖层（Popover/Tooltip/Dropdown 等）
        (props as any).overlayClassName,
        'overlay-surface'
      ].filter(Boolean).join(' ')
    } as T;
    return <Comp {...composed} />;
  };
}

/**
 * Hook 版本：返回统一的 overlay props，便于在已有组件中展开使用
 * 适用：不便于包 HOC 的场景
 */
export function useOverlaySurfaceProps() {
  return {
    className: 'overlay-surface',
    rootClassName: 'overlay-surface overlay-elevated',
    overlayClassName: 'overlay-surface'
  } as const;
}
