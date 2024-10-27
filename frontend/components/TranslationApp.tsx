import { useState } from 'react';
import { App, Card, Form, Input, Switch, Select, Button, Space, message } from 'antd';
import { CopyOutlined, ReloadOutlined, SaveOutlined, ClearOutlined } from '@ant-design/icons';
import type { Model, TranslationResponse } from '../types';
import { TokenManager } from '../utils/tokenManager';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './TranslationApp.css'

const { TextArea } = Input;
const { Option } = Select;

function TranslationApp() {
    const { t, i18n } = useTranslation();
    const [token, setToken] = useState<string>('');
    const [forceRefresh, setForceRefresh] = useState(false);
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<TranslationResponse[]>([]);
    const [expirationTime, setExpirationTime] = useState<Date | null>(null);

    const [modelForm] = Form.useForm();
    const [translateForm] = Form.useForm();

    const { message } = App.useApp();

    // 添加语言切换功能
    const toggleLanguage = () => {
        const nextLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
        i18n.changeLanguage(nextLang);
    };

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

    const fetchModels = async (values: { token: string, forceRefresh: boolean }) => {
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
                    setForceRefresh(values.forceRefresh);
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
                            force_refresh: forceRefresh,
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
            padding: '24px',
            maxWidth: '800px',  // 设置最大宽度
            margin: '0 auto',   // 水平居中
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

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <span>{t('settings.forceRefresh')}</span>
                                <Form.Item name="forceRefresh" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </Space>

                            <Form.Item style={{ marginBottom: 0 }}>
                                <Space>
                                    <Button
                                        onClick={loadTokenFromStorage}
                                        icon={<ReloadOutlined />}
                                    >
                                        {t('settings.loadToken')}
                                    </Button>
                                    <Button
                                        onClick={saveTokenToStorage}
                                        type="primary"
                                        icon={<SaveOutlined />}
                                    >
                                        {t('settings.saveToken')}
                                    </Button>
                                    <Button
                                        onClick={resetToken}
                                        danger
                                        icon={<ClearOutlined />}
                                    >
                                        {t('settings.resetToken')}
                                    </Button>
                                </Space>
                            </Form.Item>


                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button type="primary" htmlType="submit">
                                    {t('settings.loadModels')}
                                </Button>
                            </Form.Item>
                        </div>
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

                        <Space>
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
                                </Select>
                            </Form.Item>
                        </Space>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {t('translation.translate')}
                            </Button>
                        </Form.Item>
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
        </div>
    );
}

export default TranslationApp;