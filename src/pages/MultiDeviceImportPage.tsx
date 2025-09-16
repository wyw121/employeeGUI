import React from 'react';
import { Layout, Typography, Divider } from 'antd';
import MultiDeviceImportDemo from '../components/MultiDeviceImportDemo';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const MultiDeviceImportPage: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ 
          background: '#fff', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            padding: '32px 24px 24px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px 8px 0 0',
            color: 'white'
          }}>
            <Title level={1} style={{ color: 'white', margin: 0 }}>
              🌟 多设备兼容VCF导入系统
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 0, fontSize: '16px' }}>
              支持华为、小米、OPPO、vivo、三星等多品牌Android设备的通讯录导入
            </Paragraph>
          </div>
          
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '32px' }}>
              <Title level={3} style={{ color: '#1890ff' }}>🎯 功能特点</Title>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div style={{ 
                  padding: '20px', 
                  border: '1px solid #e8e8e8', 
                  borderRadius: '8px',
                  background: '#fafafa'
                }}>
                  <Title level={4} style={{ color: '#52c41a', marginBottom: '8px' }}>
                    🔄 智能策略选择
                  </Title>
                  <Paragraph style={{ marginBottom: 0 }}>
                    自动检测设备品牌，按优先级尝试最适合的导入方式，无需手动配置
                  </Paragraph>
                </div>
                
                <div style={{ 
                  padding: '20px', 
                  border: '1px solid #e8e8e8', 
                  borderRadius: '8px',
                  background: '#fafafa'
                }}>
                  <Title level={4} style={{ color: '#1890ff', marginBottom: '8px' }}>
                    📱 多品牌兼容
                  </Title>
                  <Paragraph style={{ marginBottom: 0 }}>
                    内置10+种导入策略，覆盖华为、小米、OPPO、vivo、三星等主流品牌
                  </Paragraph>
                </div>
                
                <div style={{ 
                  padding: '20px', 
                  border: '1px solid #e8e8e8', 
                  borderRadius: '8px',
                  background: '#fafafa'
                }}>
                  <Title level={4} style={{ color: '#fa8c16', marginBottom: '8px' }}>
                    🚀 一键导入
                  </Title>
                  <Paragraph style={{ marginBottom: 0 }}>
                    只需选择设备和VCF文件，系统自动处理所有兼容性问题
                  </Paragraph>
                </div>
              </div>
            </div>

            <Divider />

            <MultiDeviceImportDemo />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default MultiDeviceImportPage;