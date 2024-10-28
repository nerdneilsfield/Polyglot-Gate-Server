// src/App.tsx
import { Layout } from 'antd';
import TranslationApp from './components/TranslationApp';
import { LanguageSwitch } from './components/LanguageSwitch';
import { GitHubFooter } from './components/Footer';
import { useState, useEffect } from 'react';
const { Header, Content, Footer } = Layout;

// TODO: 优化对手机的支持！

function MainApp() {

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: isMobile ? '0 12px' : '0 24px',
        height: isMobile ? '50px' : '64px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <LanguageSwitch />
      </Header>
      
      <Content style={{
        marginTop: isMobile ? '56px' : '64px',
        padding: isMobile ? '12px' : '24px',
        minHeight: isMobile ? 'calc(100vh - 56px - 70px)' : 'calc(100vh - 64px - 70px)'
      }}>
        <TranslationApp isMobile={isMobile} />
      </Content>

      <Footer style={{
      background: '#fff',
        padding: isMobile ? '16px 12px' : '24px',
        borderTop: '1px solid #f0f0f0',
        height: 'auto'
      }}>
        <GitHubFooter isMobile={isMobile} />
      </Footer>
    </Layout>
  );
}

export default MainApp;