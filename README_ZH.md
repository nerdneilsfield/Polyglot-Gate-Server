# Polyglot-Gate-Server

[简体中文](README_ZH.md) | [English](README.md)

Polyglot-Gate-Server 是一个快速灵活的翻译网关,可以将请求路由到各种 LLM (大型语言模型) 端点,并具有可配置的速率限制和模型特定的提示功能。

## 功能特点

- 灵活路由: 将翻译请求路由到不同的 LLM 端点
- 可配置的速率限制: 控制对各个 LLM 服务的请求频率
- 模型特定提示: 为不同的 LLM 模型定制特定的提示
- 简单配置: 使用 TOML 格式的配置文件进行设置
- 缓存支持: 支持使用内存缓存提高翻译速度，减少重复请求
- 支持划词翻译和 DeepL 翻译端口

## 安装

### 从源码编译 

```
git clone https://github.com/nerdneilsfield/Polyglot-Gate-Server.git
cd Polyglot-Gate-Server
go build -o Polyglot-Gate-Server main.go
```

### 使用 `go get` 安装

```
go install -u github.com/nerdneilsfield/Polyglot-Gate-Server@latest
```

### 直接下载编译好的文件

从 [Release](https://github.com/nerdneilsfield/Polyglot-Gate-Server/releases) 页面下载编译好的文件。


### 使用 Docker

提供了两个 docker 镜像:

- `nerdneils/polyglot-gate-server`
- `ghcr.io/nerdneilsfield/polyglot-gate-server`


## 使用方法

Polyglot-Gate-Server 提供了以下命令:

1. 运行服务器:
   ```
   Polyglot-Gate-Server run <config_file_path>
   ```

2. 生成示例配置文件:
   ```
   Polyglot-Gate-Server gen <output_file_path>
   ```

3. 验证配置文件:
   ```
   Polyglot-Gate-Server valid <config_file_path>
   ```

4. 查看版本信息:
   ```
   Polyglot-Gate-Server version
   ```

### 使用 Docker 运行

```
docker run -d --name polyglot-gate-server -p 8080:8080 -v ./config.toml:/app/config.toml nerdneils/polyglot-gate-server
```

```
docker run -d --name polyglot-gate-server -p 8080:8080 -v ./config.toml:/app/config.toml ghcr.io/nerdneilsfield/polyglot-gate-server
```

### 使用 Docker Compose 运行

从 [docker-compose.yml](./docker-compose.yml) 文件中可以看到如何配置和运行 Polyglot-Gate-Server。

## 配置

一个完整的配置文件示例可以参考 [config_example.toml](./config_example.toml)。

```toml
[[models]]
name = "gpt-3.5-turbo"
base_url = "https://api.openai.com/v1"
type = "openai"
api_key = "your_api_key"
model_name = "gpt-3.5-turbo"
max_tokens = 1000
temperature = 0.5
prompt = "Translate the following %s text to %s: '%s', only return the translated text"
rate_limit = 10.0 # requests per second
endpoint = "/gpt-3.5-turbo"
cache_expire_hours = 72 # hours
```

注意 `prompt` 中的 `%s` 会被替换为划词翻译的源语言、目标语言和划词内容。必须要包含这三个占位符。


## API

<details>
<summary>API 文档</summary>

### `GET /api/v1/models` 返回所有支持的模型列表。使用 `Bearer Token` 认证。

Response:

```json
{
  "models_by_endpoint": [
    "/gpt-3.5-turbo"
  ],
  "models_by_name": [
    "gpt-3.5-turbo"
  ]
}
```

### `POST /api/v1/translate` 翻译内容。使用 `Bearer Token` 认证。

Request:

```json
{
  "text": "Hello, world!",
  "from": "English",
  "to": "中文(简体)",
  "model_name": "gpt-3.5-turbo",
  "force_refresh": false
}
```

Response:

```json
{
  "translated_text": "你好，世界！",
  "model_name": "gpt-3.5-turbo"
}
```

其中 `force_refresh` 为 `true` 时，会强制刷新缓存。

### `POST /api/v1/models/[endpoint]` 翻译内容。使用 `Bearer Token` 认证。

Request:

```json
{
  "text": "Hello, world!",
  "from": "English",
  "to": "中文(简体)",
  "model_name": "gpt-3.5-turbo",
  "force_refresh": false
}
```

Response:

```json
{
  "translated_text": "你好，世界！"
}
```

其中 `force_refresh` 为 `true` 时，会强制刷新缓存。


### `POST /api/hcfy` 划词翻译。不需要认证。

Request:

```json
{
  "name": "gpt-3.5-turbo",
  "text": "Hello, world!",
  "destination": ["中文(简体)", "英语"],
  "source": "auto"
}
```

Response:

```json
{
  "text": "你好，世界！",
  "from": "English",
  "to": "中文(简体)",
  "result": ["你好，世界！"]
}
```

### `POST /api/deeplx/[endpoint]` 使用 DeepL 翻译内容。不需要认证。

Request:

```json
{
  "text": "Hello, world!",
  "source_lang": "auto",
  "target_lang": "ZH"
}
```

Response:

```json
{
  "code": 200,
  "msg": "success",
  "data": "你好，世界！",
  "source_lang": "auto",
  "target_lang": "ZH",
  "alternatives": []
}
```
</details>

## 开发

项目使用 Go 语言开发,主要结构如下:

- `cmd/`: 包含命令行接口相关代码
- `internal/`: 包含内部包和核心逻辑
  - `configs/`: 处理配置文件的加载和验证
  - `server/`: 实现服务器逻辑

## 贡献

欢迎贡献代码、报告问题或提出改进建议。请查看我们的贡献指南以获取更多信息。

## 许可证

```
MIT License

Copyright (c) 2024 DengQi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=nerdneilsfield/Polyglot-Gate-Server&type=Date)](https://star-history.com/#nerdneilsfield/Polyglot-Gate-Server&Date)
