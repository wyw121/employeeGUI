import React from 'react';
import type { Platform } from '../../types';
import { PLATFORMS } from '../../constants';

interface PlatformSelectorProps {
  selectedPlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  availablePlatforms?: Platform[];
  disabled?: boolean;
  className?: string;
}

/**
 * 平台选择器组件
 * 统一的平台选择UI，支持下拉菜单形式
 */
export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onPlatformChange,
  availablePlatforms = ['xiaohongshu', 'douyin'],
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`${className}`}>
      <label htmlFor="platform-select" className="block text-sm font-medium text-gray-700 mb-2">
        选择平台
      </label>
      <select
        id="platform-select"
        value={selectedPlatform}
        onChange={(e) => onPlatformChange(e.target.value as Platform)}
        disabled={disabled}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {availablePlatforms.map((platform) => {
          const config = PLATFORMS[platform];
          return (
            <option key={platform} value={platform}>
              {config.icon} {config.name}
            </option>
          );
        })}
      </select>
    </div>
  );
};

