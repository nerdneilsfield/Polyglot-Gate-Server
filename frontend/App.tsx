import { useState } from 'react';
import { App, Card, Form, Input, Switch, Select, Button, Space, message } from 'antd';
import { CopyOutlined, ReloadOutlined, SaveOutlined, ClearOutlined } from '@ant-design/icons';
import type { Model, TranslationResponse } from './types';
import { TokenManager } from './utils/tokenManager';
import { useEffect } from 'react';


const { TextArea } = Input;
const { Option } = Select;

function MainApp() {
    const [token, setToken] = useState<string>('');
    const [forceRefresh, setForceRefresh] = useState(false);
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
                message.warning('Token expired');
                TokenManager.clearToken();
            } else {
                message.success('Token loaded');
                updateExpirationTime();
            }
        } else {
            message.info('No token found');
        }
    };

    // 保存 token
    const saveTokenToStorage = () => {
        const token = modelForm.getFieldValue('token');
        const expirationHours = modelForm.getFieldValue('expirationHours') || 24;

        if (token) {
            TokenManager.saveToken(token, expirationHours);
            updateExpirationTime();
            message.success('Token saved');
        } else {
            message.warning('No token to save');
        }
    };

    // 重置 token
    const resetToken = () => {
        modelForm.setFieldsValue({ token: '' });
        TokenManager.clearToken();
        setExpirationTime(null);
        message.success('Token reset');
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
                    message.success('Models loaded successfully');
                } else {
                    message.error('Invalid response format');
                }
            } else {
                message.error('Failed to fetch models');
            }
        } catch (error) {
            message.error('Failed to fetch models');
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
            message.error('Please load models first');
            return;
        }

        const { selectedModels, text, from, to } = values;

        if (!selectedModels?.length) {
            message.warning('Please select at least one model');
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
            message.error('Translation failed');
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
                <Card title="Load Models">
                    <Form
                        form={modelForm}
                        onFinish={fetchModels}
                        initialValues={{ expirationHours: 72 * 10 }}
                        layout="vertical"
                    >
                        <Form.Item
                            name="token"
                            label="API Token"
                            rules={[{ required: true, message: 'Please enter your API token' }]}
                        >
                            <Input.Password placeholder="Enter your API token" />
                        </Form.Item>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <span>Force Refresh</span>
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
                                    Load Token
                                </Button>
                                <Button
                                    onClick={saveTokenToStorage}
                                    type="primary"
                                    icon={<SaveOutlined />}
                                >
                                    Save Token
                                </Button>
                                <Button
                                    onClick={resetToken}
                                    danger
                                    icon={<ClearOutlined />}
                                >
                                        Reset Token
                                    </Button>
                                </Space>
                            </Form.Item>


                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button type="primary" htmlType="submit">
                                    Load Models
                                </Button>
                            </Form.Item>
                        </div>
                    </Form>
                </Card>

                {/* Translation Form */}
                <Card title="Translation">
                    <Form
                        form={translateForm}
                        onFinish={handleTranslate}
                        layout="vertical"
                        disabled={!token} // 如果没有token，禁用翻译表单
                    >
                        <Form.Item
                            name="selectedModels"
                            label="Select Models"
                            rules={[{ required: true, message: 'Please select at least one model' }]}
                        >
                            <Select mode="multiple" placeholder="Select models">
                                {Array.isArray(models) && models.map(model => (
                                    <Option key={model} value={model}>
                                        {model}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="text"
                            label="Text to Translate"
                            rules={[{ required: true, message: 'Please enter text to translate' }]}
                        >
                            <TextArea rows={4} placeholder="Enter text to translate" />
                        </Form.Item>

                        <Space>
                            <Form.Item
                                name="from"
                                label="From"
                                rules={[{ required: true, message: 'Please select source language' }]}
                            >
                                <Select style={{ width: 120 }}>
                                    <Option value="english">English</Option>
                                    <Option value="简体中文">Chinese</Option>
                                    <Option value="french">French</Option>
                                    <Option value="german">German</Option>
                                    <Option value="italian">Italian</Option>
                                    <Option value="korean">Korean</Option>
                                    <Option value="japanese">Japanese</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="to"
                                label="To"
                                rules={[{ required: true, message: 'Please select target language' }]}
                            >
                                <Select style={{ width: 120 }}>
                                    <Option value="简体中文">Chinese</Option>
                                    <Option value="english">English</Option>
                                    <Option value="french">French</Option>
                                    <Option value="german">German</Option>
                                    <Option value="italian">Italian</Option>
                                    <Option value="korean">Korean</Option>
                                    <Option value="japanese">Japanese</Option>
                                </Select>
                            </Form.Item>
                        </Space>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Translate
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                {/* Results */}
                {results.length > 0 && (
                    <Card title="Translation Results">
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
                                                        message.success('已复制到剪贴板');
                                                    })
                                                    .catch(() => {
                                                        message.error('复制失败');
                                                    });
                                            }}
                                        >
                                            复制
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

export default MainApp;