import React from 'react';
import { Button, Popover } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { MatchingStrategyTag } from '../../step-card';
import type { MatchStrategy, MatchCriteria } from '../../universal-ui/views/grid-view/panels/node-detail';
import { StrategyConfigurator } from '../../universal-ui/views/grid-view/panels/node-detail';

interface StrategyControlsProps {
  step: any;
  boundNode: any;
  onUpdate: (nextParams: any) => void;
}

export const StrategyControls: React.FC<StrategyControlsProps> = ({ step, boundNode, onUpdate }) => {
  const matching = step.parameters?.matching as any;

  const node = (() => {
    if (boundNode) return boundNode;
    const p = step.parameters || {};
    if (matching?.values) {
      return {
        id: `temp-${step.id}`,
        attrs: {
          'resource-id': matching.values['resource-id'] || p.resource_id,
          'text': matching.values['text'] || p.text,
          'content-desc': matching.values['content-desc'] || p.content_desc,
          'class': matching.values['class'] || p.class_name,
          'bounds': matching.values['bounds'] || p.bounds,
          'package': matching.values['package'],
          'checkable': matching.values['checkable'],
          'clickable': matching.values['clickable'],
          'enabled': matching.values['enabled'],
          'focusable': matching.values['focusable'],
          'scrollable': matching.values['scrollable'],
        },
      };
    }
    return null;
  })();

  const criteria: MatchCriteria = (() => {
    if (!matching) {
      return { strategy: 'standard' as MatchStrategy, fields: [], values: {}, includes: {}, excludes: {} } as MatchCriteria;
    }
    return {
      strategy: (matching.strategy || 'standard') as MatchStrategy,
      fields: matching.fields || [],
      values: matching.values || {},
      includes: matching.includes || {},
      excludes: matching.excludes || {},
      ...(matching.matchMode && { matchMode: matching.matchMode }),
      ...(matching.regexIncludes && { regexIncludes: matching.regexIncludes }),
      ...(matching.regexExcludes && { regexExcludes: matching.regexExcludes }),
    } as MatchCriteria;
  })();

  return (
    <div className="flex items-center gap-1">
      <MatchingStrategyTag strategy={step.parameters?.matching?.strategy} small />
      <Popover
        trigger={["click"]}
        placement="bottomRight"
        overlayInnerStyle={{ padding: 8, maxHeight: 440, overflowY: 'auto', width: 420 }}
        content={
          <div onClick={(e) => e.stopPropagation()} style={{ minWidth: 360 }}>
            <StrategyConfigurator
              node={node}
              criteria={criteria}
              onChange={(next) => {
                const prev = step.parameters?.matching || {};
                const nextParams = {
                  ...(step.parameters || {}),
                  matching: {
                    ...prev,
                    ...next,
                  },
                };
                onUpdate(nextParams);
              }}
            />
          </div>
        }
      >
        <Button
          size="small"
          type="default"
          icon={<SettingOutlined />}
          onClick={(e) => e.stopPropagation()}
          title="更改匹配策略"
          style={{ height: 24, padding: '0 8px' }}
        >
          策略
        </Button>
      </Popover>
    </div>
  );
};

export default StrategyControls;
