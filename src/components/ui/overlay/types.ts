export type OverlayTheme = 'inherit' | 'light' | 'dark';

export interface OverlayThemeProps {
  theme?: OverlayTheme; // inherit = 跟随全局；light = 白底深字；dark = 黑底浅字
}

export interface OverlayPopupProps {
  getPopupContainer?: (triggerNode?: HTMLElement) => HTMLElement;
  popupClassName?: string;
  dropdownClassName?: string; // Dropdown/Cascader
  overlayClassName?: string;  // Tooltip/Popover
}
