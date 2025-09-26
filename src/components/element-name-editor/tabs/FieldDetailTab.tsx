import React from 'react';
import { Alert, Card, Col, Row, Space, Tag, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { UIElement } from '../../../modules/ElementNameMapper';
import usePrecisionAnalysis from '../hooks/usePrecisionAnalysis';
import useElementNameEditorState from '../hooks/useElementNameEditorState';
// UI 令牌统一管理（避免魔法字符串 & 便于主题切换）
import { colors, cardStyles, textStyles, tagStyles } from './uiTokens';

const { Text: AntText } = Typography; // alias if needed

interface FieldDetailTabProps {
  element: UIElement;
  getCurrentDisplayName: () => string;
  existingMapping: any;
}

const FieldDetailTab: React.FC<FieldDetailTabProps> = ({ element, getCurrentDisplayName, existingMapping }) => {
  const { precisionAnalysis, sortedFields, adbCommands, cachedMapping } = usePrecisionAnalysis(element);
  const cachedValues = cachedMapping ? {
    displayName: cachedMapping.displayName,
    lastUpdated: cachedMapping.lastUpdated,
    usageCount: cachedMapping.usageCount
  } : null;

  if (!precisionAnalysis) return null;

  return (
    <div
      style={{
        padding: '16px',
        background: colors.surfaceDark,
        borderRadius: '8px',
        color: '#fff'
      }}
    >
      <Alert
        message={<div style={{ color: '#fff' }}><strong>🎯 ADB 自动化精准度: {precisionAnalysis.overallScore}%</strong></div>}
        description={
          <div style={{ marginTop: '8px', color: textStyles.subtle.color }}>
            <AntText style={{ color: textStyles.subtle.color }}>
              最佳策略: {precisionAnalysis.bestStrategy?.name || '暂无可用策略'}
            </AntText>
            {precisionAnalysis.overallScore >= 90 && (
              <Tag color="success" style={{ marginLeft: '8px' }}>🟢 极高精准度 - 推荐生产使用</Tag>
            )}
            {precisionAnalysis.overallScore >= 70 && precisionAnalysis.overallScore < 90 && (
              <Tag color="warning" style={{ marginLeft: '8px' }}>🟡 中等精准度 - 建议添加重试</Tag>
            )}
            {precisionAnalysis.overallScore < 70 && (
              <Tag color="error" style={{ marginLeft: '8px' }}>🔴 较低精准度 - 需要优化策略</Tag>
            )}
          </div>
        }
        type={precisionAnalysis.overallScore >= 70 ? 'success' : 'warning'}
        showIcon
        style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: '#fff' }}
      />

      <div style={{ marginTop: '16px' }}>
        <Row gutter={16}>
          <Col span={14}>
            <Card 
              title={
                <Space style={{ color: '#fff' }}>
                  <span>🔎</span>
                  原始XML字段
                  <Tag color="cyan">用于匹配识别</Tag>
                  <Tag color="blue">{sortedFields.length} 个字段</Tag>
                </Space>
              }
              size="small"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
              headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
              bodyStyle={{ background: colors.surface }}
            >
              <Alert
                message={<AntText style={{ color: '#fff' }}><strong>📋 字段用途说明</strong></AntText>}
                description={<div style={{ color: textStyles.subtle.color, fontSize: '12px', marginTop: '4px' }}><AntText style={{ color: textStyles.subtle.color }}>这些是从Android应用界面提取的<strong>原始XML属性</strong>，系统使用这些字段来<strong>识别和定位</strong>界面元素。字段稳定性越高，定位越准确。</AntText></div>}
                type="info"
                showIcon
                style={{ marginBottom: '12px', background: colors.accentInfoBg, border: `1px solid ${colors.accentBlue}` }}
              />
              <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="dark-scrollbar">
                {sortedFields.map(({ key, value, stability }, index) => (
                  <div
                    key={key}
                    style={{
                      marginBottom: '12px',
                      padding: '12px',
                      background: index < 3 ? colors.accentInfoBg : '#333',
                      border: `1px solid ${stability?.level === 'high' ? colors.accentGreen : stability?.level === 'medium' ? colors.accentOrange : colors.accentRed}`,
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Space>
                        <span style={{ background: index < 3 ? colors.accentBlue : '#666', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>#{index + 1}</span>
                        <AntText strong style={{ color: '#fff', fontSize: '14px' }}>{key}</AntText>
                        <Tag color={stability?.level === 'high' ? 'green' : stability?.level === 'medium' ? 'orange' : 'red'} style={tagStyles.small}>{stability?.score || 0}% 稳定性</Tag>
                      </Space>
                    </div>
                    <div
                      style={{
                        background: colors.surfaceAlt,
                        padding: '8px 10px',
                        borderRadius: '4px',
                        fontFamily: 'Monaco, Consolas, monospace',
                        fontSize: '12px',
                        wordBreak: 'break-all',
                        marginBottom: '8px',
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      <AntText copyable={{ text: String(value) }} style={textStyles.codeValue}>{String(value)}</AntText>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {stability?.level === 'high' && <Tag color="success" style={tagStyles.small}>🔥 高价值字段</Tag>}
                      {key === 'resource_id' && <Tag color="purple" style={tagStyles.small}>🎯 最佳定位</Tag>}
                      {key === 'text' && value && String(value).length < 10 && <Tag color="cyan" style={tagStyles.small}>📝 精简文本</Tag>}
                      {index < 3 && <Tag color="gold" style={tagStyles.small}>⭐ 推荐优先级</Tag>}
                      <Tag style={{ ...tagStyles.tiny, background: colors.surfaceAlt, color: '#999' }}>匹配字段</Tag>
                    </div>
                    {stability && stability.risks?.length > 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <AntText type="secondary" style={{ fontSize: '10px', color: '#999' }}>
                          ⚠️ 风险: {stability.risks.slice(0, 2).join(', ')}
                        </AntText>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </Col>
          <Col span={10}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card 
                title={<Space style={{ color: '#fff' }}><span>✏️</span> 自定义显示名称 <Tag color="orange">用户定义</Tag></Space>}
                size="small"
                style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}` }}
                bodyStyle={{ background: colors.surface }}
              >
                <div style={{ padding: '12px', background: colors.accentInfoBg, borderRadius: '6px', border: `1px solid ${colors.accentBlue}`, marginBottom: '12px' }}>
                  <div style={{ marginBottom: '8px' }}><AntText type="secondary" style={{ color: textStyles.subtle.color, fontSize: '11px' }}>当前显示名称</AntText></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AntText strong style={{ color: '#fff', fontSize: '16px' }}>{getCurrentDisplayName()}</AntText>
                    <Tag color="blue" style={{ fontSize: '10px' }}>{existingMapping ? '已保存' : '临时生成'}</Tag>
                  </div>
                  {existingMapping && (
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <AntText style={{ color: textStyles.subtle.color, fontSize: '11px' }}>使用 {existingMapping.usageCount} 次</AntText>
                      <AntText style={{ color: textStyles.subtle.color, fontSize: '11px' }}>{new Date(existingMapping.lastUsedAt).toLocaleString()}</AntText>
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px', background: colors.surfaceAlt, borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                  <AntText style={{ color: textStyles.subtle.color, fontSize: '12px' }}>
                    <strong>💡 工作原理：</strong><br/>1. 系统使用左侧XML字段匹配识别元素<br/>2. 用户看到的是右侧自定义显示名称<br/>3. 两者完全分离，互不干扰<br/><br/>
                    <strong>🔄 实时同步：</strong>当前显示名称 = "{getCurrentDisplayName()}"
                  </AntText>
                </div>
              </Card>
              {cachedValues && (
                <Card title={<Space style={{ color: '#fff' }}><span>💾</span> 映射缓存详情 <Tag color="purple">已存储</Tag></Space>} size="small" style={{ background: colors.surface, border: `1px solid ${colors.border}` }} headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}` }} bodyStyle={{ background: colors.surface }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '8px', background: colors.accentInfoBg, borderRadius: '4px', border: `1px solid ${colors.accentBlue}` }}>
                      <AntText type="secondary" style={{ color: textStyles.subtle.color, fontSize: '11px' }}>📝 存储的显示名称</AntText>
                      <div><AntText strong style={{ color: '#fff', fontSize: '14px' }}>{cachedValues.displayName}</AntText></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#333', borderRadius: '4px' }}>
                      <div><AntText style={{ color: textStyles.subtle.color, fontSize: '11px' }}>📊 使用频次: {cachedValues.usageCount}</AntText></div>
                      <div><AntText style={{ color: textStyles.subtle.color, fontSize: '11px' }}>🕐 最后使用: {cachedValues.lastUpdated}</AntText></div>
                    </div>
                    <div style={{ padding: '8px', background: colors.surfaceAlt, borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                      <AntText style={{ color: textStyles.subtle.color, fontSize: '10px' }}>💡 说明：此名称映射基于左侧XML字段特征进行匹配，当系统遇到相似特征的元素时会自动应用该显示名称。</AntText>
                    </div>
                  </div>
                </Card>
              )}
              <Card title={<Space style={{ color: '#fff' }}><span>🤖</span> AI 优化建议 <Tag color="green">智能分析</Tag></Space>} size="small" style={{ background: colors.surface, border: `1px solid ${colors.border}` }} headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}` }} bodyStyle={{ background: colors.surface }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {precisionAnalysis.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: rec.includes('✅')
                          ? '#0f4429' // success bg (特例保留)
                          : rec.includes('⚠️')
                            ? colors.accentWarningBg
                            : rec.includes('❌')
                              ? '#5c1c1c'
                              : colors.surfaceAlt,
                        border: `1px solid ${rec.includes('✅')
                          ? colors.accentGreen
                          : rec.includes('⚠️')
                            ? colors.accentOrange
                            : rec.includes('❌')
                              ? colors.accentRed
                              : colors.border}`,
                        color: '#fff'
                      }}
                    >
                      {rec}
                    </div>
                  ))}
                </div>
              </Card>
              {adbCommands.length > 0 && (
                <Card title={<Space style={{ color: '#fff' }}><span>⚡</span> 推荐 ADB 命令 <Tag color="blue">{adbCommands.length} 条</Tag></Space>} size="small" style={{ background: colors.surface, border: `1px solid ${colors.border}` }} headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}` }} bodyStyle={{ background: colors.surface }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {adbCommands.slice(0, 3).map((cmd, index) => (
                      <div key={index} style={{ paddingBottom: '8px', borderBottom: '1px solid #404040' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <Tag color="blue">{cmd.type.toUpperCase()}</Tag>
                          <AntText type="secondary" style={{ fontSize: '11px', color: textStyles.subtle.color }}>成功率: {(cmd.reliability * 100).toFixed(0)}%</AntText>
                        </div>
                        <div style={{ background: colors.surfaceAlt, padding: '4px 6px', borderRadius: '3px', fontFamily: 'Monaco, Consolas, monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                          <AntText copyable={{ text: cmd.command }} style={textStyles.codeValue}>{cmd.command}</AntText>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </Col>
        </Row>
        <Card title={<Space style={{ color: '#fff' }}><EditOutlined /> 实时优化编辑 <Tag color="orange">实验功能</Tag></Space>} size="small" style={{ marginTop: '16px', background: colors.surface, border: `1px solid ${colors.border}` }} headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}` }} bodyStyle={{ background: colors.surface }}>
          <Alert
            message={<AntText style={{ color: '#fff' }}>实时编辑功能</AntText>}
            description={<AntText style={{ color: textStyles.subtle.color }}>修改下方字段值，系统将实时更新精准度评分和ADB命令建议。注意：这里的修改仅用于测试，不会保存到缓存中。</AntText>}
            type="info"
            showIcon
            style={{ marginBottom: '12px', background: colors.accentInfoBg, border: `1px solid ${colors.accentBlue}` }}
          />
          <AntText type="secondary" style={{ fontSize: '12px', color: textStyles.subtle.color }}>此功能正在开发中，将提供实时的字段编辑和精准度分析能力...</AntText>
        </Card>
      </div>
    </div>
  );
};

export default FieldDetailTab;
