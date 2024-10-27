// src/App.tsx
import { Layout } from 'antd';
import TranslationApp from './components/TranslationApp';
import { LanguageSwitch } from './components/LanguageSwitch';

const { Header, Content } = Layout;

function MainApp() {
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
        padding: '0 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <LanguageSwitch />
      </Header>
      
      <Content style={{
        marginTop: 64,
        padding: '24px',
        minHeight: 'calc(100vh - 64px)'
      }}>
        <TranslationApp />
      </Content>
    </Layout>
  );
}

export default MainApp;