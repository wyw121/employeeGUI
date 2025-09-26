import React from 'react';
import { Input, Button, Space, Alert, Typography } from 'antd';
import { SearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { VisualElementCategory, VisualUIElement } from '../../../types';

const { Title, Text } = Typography;

export interface LeftControlPanelProps {
  searchText: string;
  setSearchText: (v: string) => void;
  showOnlyClickable: boolean;
  setShowOnlyClickable: (v: boolean) => void;
  hideCompletely: boolean;
  setHideCompletely: (v: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectionManager: any;
  finalElements: VisualUIElement[];
  categories: VisualElementCategory[];
}

export const LeftControlPanel: React.FC<LeftControlPanelProps> = ({
  searchText,
  setSearchText,
  showOnlyClickable,
  setShowOnlyClickable,
  hideCompletely,
  setHideCompletely,
  selectedCategory,
  setSelectedCategory,
  selectionManager,
  finalElements,
  categories
}) => {
  return (
    <div style={{width:'clamp(120px,10vw,140px)',minWidth:120,borderRight:'1px solid #f0f0f0',paddingRight:6,flex:'0 0 clamp(120px,10vw,140px)',flexShrink:0}}>
      <Space direction="vertical" style={{width:'100%'}} size={12}>
        <Input placeholder="搜索..." prefix={<SearchOutlined/>} value={searchText} onChange={e=>setSearchText(e.target.value)} size="small" style={{fontSize:12}} />
        <div>
          <Space direction="vertical" style={{width:'100%'}} size={12}>
            <Space align="center" size={8}>
              <input type="checkbox" checked={showOnlyClickable} onChange={e=>setShowOnlyClickable(e.target.checked)} />
              <Text style={{fontSize:13}}>只显示可点击元素</Text>
            </Space>
            <div>
              <Space align="start" size={8}>
                <input type="checkbox" checked={hideCompletely} onChange={e=>setHideCompletely(e.target.checked)} style={{marginTop:2}} />
                <div style={{flex:1,lineHeight:1.4}}>
                  <Text style={{fontSize:13}}>完全隐藏元素<br/><Text type="secondary" style={{fontSize:11,lineHeight:1.2}}>（否则半透明显示）</Text></Text>
                </div>
              </Space>
            </div>
            {selectionManager.hiddenElements.length>0 && (
              <div style={{padding:8,background:'#f6ffed',border:'1px solid #b7eb8f',borderRadius:4,fontSize:12}}>
                <Space direction="vertical" size={4} style={{width:'100%'}}>
                  <Text style={{fontSize:12,color:'#52c41a'}}>
                    已隐藏 {selectionManager.hiddenElements.length} 个元素 {hideCompletely? '（完全隐藏）':'（半透明显示）'}
                  </Text>
                  <Button size="small" type="link" onClick={selectionManager.restoreAllElements} style={{padding:0,height:'auto',fontSize:11}}>恢复所有隐藏元素</Button>
                </Space>
              </div>
            )}
          </Space>
        </div>
        <div>
          <Title level={5} style={{fontSize:13,marginBottom:8}}>分类</Title>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <Button type={selectedCategory==='all'?'primary':'default'} size="small" onClick={()=>setSelectedCategory('all')} style={{textAlign:'left',fontSize:11,height:28,padding:'0 6px'}}>
              <AppstoreOutlined/> 全部 ({finalElements.length})
            </Button>
            {categories.map(category => (
              <Button key={category.name} type={selectedCategory===category.name?'primary':'default'} size="small" onClick={()=>setSelectedCategory(category.name)} style={{textAlign:'left',fontSize:11,height:28,padding:'0 6px',borderColor:category.color,backgroundColor: selectedCategory===category.name?category.color:undefined}} title={`${category.name} (${category.elements.length})`}>
                {category.icon} {category.name.length>4? category.name.substring(0,4)+'...':category.name} ({category.elements.length})
              </Button>
            ))}
          </div>
        </div>
        <div style={{width:'100%'}}>
          <Alert message="统计" type="info" description={<div style={{fontSize:11,lineHeight:1.3}}>
            <div>总数: {finalElements.length}</div>
            <div>可见: {finalElements.filter(e=>!selectionManager.isElementHidden(e.id)).length}</div>
            <div>隐藏: {finalElements.filter(e=>selectionManager.isElementHidden(e.id)).length}</div>
            <div>可点击: {finalElements.filter(e=>e.clickable && !selectionManager.isElementHidden(e.id)).length}</div>
            <div>重要: {finalElements.filter(e=>e.importance==='high' && !selectionManager.isElementHidden(e.id)).length}</div>
          </div>} />
        </div>
        {selectionManager.hiddenElements.length>0 && (
          <Alert message={<span>🙈 已隐藏 {selectionManager.hiddenElements.length} 个元素</span>} description="隐藏的元素仍会显示但呈现半透明状态，60秒后自动恢复" type="warning" showIcon closable={false} />
        )}
      </Space>
    </div>
  );
};
