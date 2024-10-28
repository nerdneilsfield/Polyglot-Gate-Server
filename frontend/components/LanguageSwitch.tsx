import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { GlobalOutlined } from '@ant-design/icons';

export const LanguageSwitch = () => {
  const { i18n, t } = useTranslation();

  return (
    <Select
      defaultValue={i18n.language}
      style={{ width: 100 }}
      onChange={(value) => i18n.changeLanguage(value)}
      variant="borderless"
      suffixIcon={<GlobalOutlined />}
      options={[
        { value: 'en', label: t('translation.english') },
        { value: 'zh', label: t('translation.chinese') },
        { value: 'zh-TW', label: t('translation.chinese_traditional') },
        { value: 'ja', label: t('translation.japanese') },
        { value: 'ko', label: t('translation.korean') },
        { value: 'classical_chinese', label: t('translation.classical_chinese') }
      ]}
    />
  );
};
