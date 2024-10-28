import { useTranslation } from 'react-i18next';
import { GithubOutlined } from '@ant-design/icons';

const CURRENT_YEAR = new Date().getFullYear();
const GITHUB_URL = 'https://github.com/nerdneilsfield/Polyglot-Gate-Server';

interface GitHubFooterProps {
    isMobile: boolean;
}

export const GitHubFooter = ({ isMobile }: GitHubFooterProps) => {
  const { t } = useTranslation();

  return (
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isMobile ? '8px' : '12px',
      }}>
<div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'rgba(0, 0, 0, 0.65)',
              fontSize: isMobile ? '20px' : '24px',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              padding: isMobile ? '6px' : '8px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#1890ff';
              e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'rgba(0, 0, 0, 0.65)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <GithubOutlined />
          </a>
        </div>
        
        <div style={{
          color: 'rgba(0, 0, 0, 0.45)',
          fontSize: isMobile ? '12px' : '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          textAlign: 'center'
        }}>
          <span>{t('footer.copyright')}</span>
          <span>© {CURRENT_YEAR} Qi Deng</span>
        </div>
    </div>
  );
};