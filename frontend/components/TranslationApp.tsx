import { useState } from 'react';
import { App, Card, Form, Input, Switch, Select, Button, Space} from 'antd';
import { CopyOutlined, ReloadOutlined, SaveOutlined, ClearOutlined, TranslationOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import type { Model, TranslationResponse } from '../types';
import { TokenManager } from '../utils/tokenManager';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './TranslationApp.css'

const { TextArea } = Input;
const { Option } = Select;

// TODO: 优化对手机的支持！

interface TranslationAppProps {
    isMobile: boolean;
}


function TranslationApp({ isMobile }: TranslationAppProps) {
    const { t } = useTranslation();
    const [token, setToken] = useState<string>('');
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<TranslationResponse[]>([]);
    const [expirationTime, setExpirationTime] = useState<Date | null>(null);

    const [modelForm] = Form.useForm();
    const [translateForm] = Form.useForm();

    const { message } = App.useApp();

    // 加载 token
    const loadTokenFromStorage = () => {
        console.log('loadTokenFromStorage');
        const { token, isExpired } = TokenManager.getToken();
        if (token) {
            modelForm.setFieldsValue({ token });
            if (isExpired) {
                message.warning(t('messages.tokenExpired'));
                TokenManager.clearToken();
            } else {
                message.success(t('messages.tokenLoaded'));
                updateExpirationTime();
                fetchModels({ token });
            }
        } else {
            message.info(t('messages.noTokenFound'));
        }
    };

    // 保存 token
    const saveTokenToStorage = () => {
        const token = modelForm.getFieldValue('token');
        const expirationHours = modelForm.getFieldValue('expirationHours') || 24;

        if (token) {
            TokenManager.saveToken(token, expirationHours);
            updateExpirationTime();
            message.success(t('messages.tokenSaved'));
        } else {
            message.warning(t('messages.noTokenToSave'));
        }
    };

    // 重置 token
    const resetToken = () => {
        modelForm.setFieldsValue({ token: '' });
        TokenManager.clearToken();
        setExpirationTime(null);
        message.success(t('messages.tokenReset'));
    };

    // 更新过期时间显示
    const updateExpirationTime = () => {
        const expTime = TokenManager.getExpirationTime();
        setExpirationTime(expTime);
    };

    // 组件加载时自动加载 token
    useEffect(() => {
        loadTokenFromStorage();
    }, []);

    const fetchModels = async (values: { token: string }) => {
        try {
            const response = await fetch('/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${values.token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                // 确保 data 是数组
                const models = data.models_by_name;
                if (Array.isArray(models)) {
                    setModels(models);
                    setToken(values.token);
                    console.log(models);
                    message.success(t('messages.modelsLoaded'));
                } else {
                    message.error(t('messages.invalidResponse'));
                }
            } else {
                message.error(t('messages.modelsLoadFailed'));
            }
        } catch (error) {
            message.error(t('messages.modelsLoadFailed'));
            console.error('Error:', error);
        }
    };

    const handleTranslate = async (values: {
        selectedModels: string[];
        text: string;
        from: string;
        to: string;
        forceRefresh: boolean;
    }) => {
        if (!token) {
            message.error(t('messages.pleaseLoadModelsFirst'));
            return;
        }

        const { selectedModels, text, from, to } = values;

        if (!selectedModels?.length) {
            message.warning(t('messages.pleaseSelectAtLeastOneModel'));
            return;
        }

        setLoading(true);
        setResults([]);

        try {
            const translations = await Promise.all(
                selectedModels.map(model => {
                    const model_name = model;
                    return fetch('/api/v1/translate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            text,
                            from,
                            to,
                            model_name,
                            force_refresh: values.forceRefresh,
                        })
                    }).then(res => res.json())
                })
            );

            setResults(translations.map((translation) => ({
                model_name: translation.model_name,
                translated_text: translation.translated_text
            })));
        } catch (error) {
            message.error(t('messages.translationFailed'));
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: isMobile ? '16px' : '24px',
            background: '#fff',
            borderRadius: isMobile ? '12px' : '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            width: isMobile ? '100%' : '90%'
        }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Models Form */}
                <Card title={t('settings.loadModels')}>
                    <Form
                        form={modelForm}
                        onFinish={fetchModels}
                        initialValues={{ expirationHours: 72 * 10 }}
                        layout="vertical"
                    >
                        <Form.Item
                            name="token"
                            label={t('settings.token')}
                            rules={[{ required: true, message: t('settings.tokenRequired') }]}
                        >
                            <Input.Password placeholder="Enter your API token" />
                        </Form.Item>

                        <Space
                            direction="vertical"
                            style={{
                                width: '100%',
                                gap: '8px'
                            }}
                        >
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadTokenFromStorage}
                                block
                            >
                                {t('settings.loadToken')}
                            </Button>
                            <Button
                                onClick={saveTokenToStorage}
                                type="primary"
                                icon={<SaveOutlined />}
                                block
                            >
                                {t('settings.saveToken')}
                            </Button>
                            <Button
                                onClick={resetToken}
                                danger
                                icon={<ClearOutlined />}
                                block
                            >
                                {t('settings.resetToken')}
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                            >
                                <CloudDownloadOutlined />
                                {t('settings.loadModels')}
                            </Button>
                        </Space>
                    </Form>
                </Card>

                {/* Translation Form */}
                <Card title={t('translation.title')}>
                    <Form
                        form={translateForm}
                        onFinish={handleTranslate}
                        layout="vertical"
                        disabled={!token} // 如果没有token，禁用翻译表单
                    >
                        <Form.Item
                            name="selectedModels"
                            label={t('translation.selectModels')}
                            rules={[{ required: true, message: t('translation.pleaseSelectAtLeastOneModel') }]}
                        >
                            <Select mode="multiple" placeholder={t('translation.selectModelsPlaceholder')}>
                                {Array.isArray(models) && models.map(model => (
                                    <Option key={model} value={model}>
                                        {model}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="text"
                            label={t('translation.sourceText')}
                            rules={[{ required: true, message: t('translation.sourceTextRequired') }]}
                        >
                            <TextArea rows={4} placeholder={t('translation.sourceTextPlaceholder')} />
                        </Form.Item>

                        <Space wrap style={{
                            width: '100%',
                            justifyContent: isMobile ? 'center' : 'flex-start',
                            gap: isMobile ? '8px' : '12px'
                        }}>
                            <Form.Item
                                name="from"
                                label={t('translation.sourceLanguage')}
                                rules={[{ required: true, message: t('translation.sourceLanguageRequired') }]}
                            >
                                <Select style={{ width: 120 }}>
                                    <Option value="english">{t('translation.english')}</Option>
                                    <Option value="简体中文">{t('translation.chinese')}</Option>
                                    <Option value="french">{t('translation.french')}</Option>
                                    <Option value="german">{t('translation.german')}</Option>
                                    <Option value="italian">{t('translation.italian')}</Option>
                                    <Option value="korean">{t('translation.korean')}</Option>
                                    <Option value="japanese">{t('translation.japanese')}</Option>
                                    <Option value="portuguese">{t('translation.portuguese')}</Option>
                                    <Option value="russian">{t('translation.russian')}</Option>
                                    <Option value="spanish">{t('translation.spanish')}</Option>
                                    <Option value="tibetan">{t('translation.tibetan')}</Option>
                                    <Option value="繁体中文">{t('translation.chinese_traditional')}</Option>
                                    <Option value="粤语">{t('translation.cantonese')}</Option>
                                    <Option value="文言文">{t('translation.classical_chinese')}</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="to"
                                label={t('translation.targetLanguage')}
                                rules={[{ required: true, message: t('translation.targetLanguageRequired') }]}
                            >
                                <Select style={{ width: 120 }}>
                                    <Option value="简体中文">{t('translation.chinese')}</Option>
                                    <Option value="english">{t('translation.english')}</Option>
                                    <Option value="french">{t('translation.french')}</Option>
                                    <Option value="german">{t('translation.german')}</Option>
                                    <Option value="italian">{t('translation.italian')}</Option>
                                    <Option value="korean">{t('translation.korean')}</Option>
                                    <Option value="japanese">{t('translation.japanese')}</Option>
                                    <Option value="portuguese">{t('translation.portuguese')}</Option>
                                    <Option value="russian">{t('translation.russian')}</Option>
                                    <Option value="spanish">{t('translation.spanish')}</Option>
                                    <Option value="tibetan">{t('translation.tibetan')}</Option>
                                    <Option value="繁体中文">{t('translation.chinese_traditional')}</Option>
                                    <Option value="粤语">{t('translation.cantonese')}</Option>
                                    <Option value="文言文">{t('translation.classical_chinese')}</Option>
                                </Select>
                            </Form.Item>
                        </Space>

                        <Space
                            direction="vertical"
                            style={{
                                width: '100%',
                                gap: '16px'
                            }}
                        >
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                            >
                                <TranslationOutlined />
                                {t('translation.translate')}
                            </Button>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '8px'
                            }}>
                                <span>{t('settings.forceRefresh')}</span>
                                <Form.Item name="forceRefresh" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                        </Space>
                    </Form>
                </Card>

                {/* Results */}
                {results.length > 0 && (
                    <Card title={t('translation.resultsTitle')}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            {results.map((result, index) => (
                                <Card
                                    key={index}
                                    size="small"
                                    title={result.model_name}
                                    style={{
                                        width: '100%',
                                        visibility: result.translated_text !== '' ? 'visible' : 'hidden',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <div style={{
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        lineHeight: '1.6',
                                        marginBottom: '32px' // 为底部按钮留出空间
                                    }}>
                                        {result.translated_text}
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '12px',
                                        right: '12px'
                                    }}>
                                        <Button
                                            type="text"
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                                navigator.clipboard.writeText(result.translated_text)
                                                    .then(() => {
                                                        message.success(t('translation.copied'));
                                                    })
                                                    .catch(() => {
                                                        message.error(t('translation.copyFailed'));
                                                    });
                                            }}
                                        >
                                            {t('translation.copy')}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </Space>
                    </Card>
                )}
            </Space>
        </div >
    );
}

export default TranslationApp;