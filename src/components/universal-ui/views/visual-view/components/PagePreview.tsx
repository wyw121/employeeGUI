import React from 'react';
import { Typography } from 'antd';
import type { VisualUIElement } from '../types/visual-types';
import type { VisualElementCategory } from '../../../types';
import { analyzeAppAndPageInfo } from '../utils/appAnalysis';
import { convertVisualToUIElement } from '../utils/elementTransform';
import type { UIElement } from '../../../../../api/universalUIAPI';

const { Title } = Typography;

export interface PagePreviewProps {
  finalElements: VisualUIElement[];
  filteredElements: VisualUIElement[];
  categories: VisualElementCategory[];
  hideCompletely: boolean;
  xmlContent: string;
  deviceFramePadding: number;
  selectionManager: any;
  selectedElementId: string;
}

export const PagePreview: React.FC<PagePreviewProps> = ({
  finalElements,
  filteredElements,
  categories,
  hideCompletely,
  xmlContent,
  deviceFramePadding,
  selectionManager,
  selectedElementId
}) => {
  if (finalElements.length === 0) {
    return (
      <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #d1d5db',borderRadius:8,background:'#f9fafb'}}>
        <span style={{color:'#999'}}>等待页面分析数据...</span>
      </div>
    );
  }

  const maxX = Math.max(...finalElements.map(e=>e.position.x + e.position.width));
  const maxY = Math.max(...finalElements.map(e=>e.position.y + e.position.height));
  const maxPreviewWidth = Math.min(window.innerWidth * 0.5, 600);
  const availableWidth = maxPreviewWidth - 40;
  const maxDeviceWidth = availableWidth - deviceFramePadding * 2 - 32;
  let scale = maxDeviceWidth / (maxX || maxDeviceWidth);
  scale = Math.max(0.2, Math.min(2.0, scale));
  const scaledWidth = maxX * scale;
  const scaledHeight = maxY * scale;
  const { appName, pageName } = analyzeAppAndPageInfo(xmlContent);

  return (
    <div style={{width:'100%',border:'1px solid #4b5563',borderRadius:8,background:'#1f2937',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'12px',borderBottom:'1px solid #374151',background:'#111827'}}>
        <Title level={5} style={{textAlign:'center',margin:0,color:'#e5e7eb',fontWeight:'bold'}}>
          📱 {appName}的{pageName}
        </Title>
        <div style={{textAlign:'center',fontSize:12,color:'#9ca3af',marginTop:4}}>
          设备分辨率: {maxX} × {maxY} | 缩放比例: {(scale*100).toFixed(0)}%
        </div>
      </div>
      <div style={{padding:16,position:'relative',background:'#1f2937',overflow:'hidden',display:'flex',justifyContent:'center'}}>
        <div style={{width: scaledWidth + deviceFramePadding*2, height: scaledHeight + deviceFramePadding*2, position:'relative', background:'#000', borderRadius:20, padding: deviceFramePadding, boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>
          <div style={{width:scaledWidth,height:scaledHeight,position:'relative',background:'#fff',borderRadius:12,overflow:'hidden'}}>
            {filteredElements.map(element => {
              const category = categories.find(cat => cat.name === element.category);
              const elementLeft = element.position.x * scale;
              const elementTop = element.position.y * scale;
              const elementWidth = Math.max(element.position.width * scale, 1);
              const elementHeight = Math.max(element.position.height * scale, 1);
              const displayState = selectionManager.getElementDisplayState(element.id);
              return (
                <div
                  key={element.id}
                  title={`${element.userFriendlyName}: ${element.description}`}
                  style={{position:'absolute',left:elementLeft,top:elementTop,width:elementWidth,height:elementHeight,backgroundColor:category?.color||'#8b5cf6',opacity: !hideCompletely && displayState.isHidden ? 0.1 : displayState.isPending ? 1 : element.clickable ? 0.7 : 0.4,border: displayState.isPending ? '2px solid #52c41a' : displayState.isHovered ? '2px solid #faad14' : element.clickable ? '1px solid #fff':'1px solid rgba(255,255,255,0.3)',borderRadius: Math.min(elementWidth,elementHeight)>10?2:1,cursor: !hideCompletely && displayState.isHidden ? 'default' : element.clickable? 'pointer':'default',transition:'all .2s ease',zIndex: displayState.isPending?50:displayState.isHovered?30:element.clickable?10:5,transform: displayState.isPending?'scale(1.1)':displayState.isHovered?'scale(1.05)':'scale(1)', boxShadow: displayState.isPending?'0 4px 16px rgba(82,196,26,0.4)':displayState.isHovered?'0 2px 8px rgba(0,0,0,0.2)':'none', filter: !hideCompletely && displayState.isHidden ? 'grayscale(100%) blur(1px)':'none'}}
                  onClick={e=>{ if(!element.clickable || (!hideCompletely && displayState.isHidden)) return; e.stopPropagation(); const uiElement = convertVisualToUIElement(element, selectedElementId) as unknown as UIElement; selectionManager.handleElementClick(uiElement,{x:e.clientX,y:e.clientY}); }}
                  onMouseEnter={()=>{ if(displayState.isHidden) return; selectionManager.handleElementHover(element.id); }}
                  onMouseLeave={()=>{ if(displayState.isHidden) return; selectionManager.handleElementHover(null); }}
                >
                  {elementWidth>40 && elementHeight>20 && element.text && (
                    <div style={{fontSize:Math.max(8, Math.min(12, elementHeight/3)), color:'#fff', textShadow:'0 1px 2px rgba(0,0,0,0.8)', padding:'1px 2px', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', lineHeight:1.2}}>
                      {element.text.substring(0,10)}
                    </div>
                  )}
                </div>
              );
            })}
            {scaledWidth > 200 && (
              <>
                {[0.25,0.5,0.75].map((r,i)=>(<div key={`v-${i}`} style={{position:'absolute',left:scaledWidth*r,top:0,bottom:0,width:1,background:'rgba(156,163,175,0.1)',pointerEvents:'none'}}/>))}
                {[0.25,0.5,0.75].map((r,i)=>(<div key={`h-${i}`} style={{position:'absolute',top:scaledHeight*r,left:0,right:0,height:1,background:'rgba(156,163,175,0.1)',pointerEvents:'none'}}/>))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
