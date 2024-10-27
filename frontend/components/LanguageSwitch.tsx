import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { GlobalOutlined } from '@ant-design/icons';

const { Option } = Select;

export const LanguageSwitch = () => {
  const { i18n, t } = useTranslation();

  return (
    <Select
      defaultValue={i18n.language}
      style={{ width: 100 }}
      onChange={(value) => i18n.changeLanguage(value)}
      variant="borderless"
      suffixIcon={<GlobalOutlined />}
    >
      <Option value="en">{t('translation.english')}</Option>
      <Option value="zh">{t('translation.chinese')}</Option>
    </Select>
  );
};