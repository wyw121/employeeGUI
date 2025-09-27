import type { OverlayTheme, OverlayPopupProps } from './types';

export function getOverlayClassNames(theme: OverlayTheme | undefined) {
  if (theme === 'light') {
    return {
      className: 'overlay-surface',
      rootClassName: 'overlay-surface overlay-elevated',
    } as const;
  }
  if (theme === 'dark') {
    return {
      className: 'overlay-surface overlay-dark',
      rootClassName: 'overlay-surface overlay-dark overlay-elevated',
    } as const;
  }
  // inherit: 不注入任何覆盖层类，完全交给全局主题
  return { className: undefined, rootClassName: undefined } as const;
}

export function getPopupOverlayProps(theme: OverlayTheme | undefined): OverlayPopupProps {
  if (theme === 'light') {
    return {
      getPopupContainer: (node?: HTMLElement) => (node ? node.parentElement as HTMLElement : document.body),
      popupClassName: 'overlay-surface',
      dropdownClassName: 'overlay-surface',
      overlayClassName: 'overlay-surface',
    };
  }
  if (theme === 'dark') {
    return {
      getPopupContainer: (node?: HTMLElement) => (node ? node.parentElement as HTMLElement : document.body),
      popupClassName: 'overlay-surface overlay-dark',
      dropdownClassName: 'overlay-surface overlay-dark',
      overlayClassName: 'overlay-surface overlay-dark',
    };
  }
  return {};
}
