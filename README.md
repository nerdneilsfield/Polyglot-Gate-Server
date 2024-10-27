# Polyglot-Gate-Server

[简体中文](README_ZH.md) | [English](README.md)

A fast and flexible translation gateway that routes requests to various Large Language Model (LLM) endpoints with configurable rate limiting and model-specific prompting capabilities.

## Key Features

- **Smart Routing**: Dynamic routing of translation requests to different LLM endpoints
- **Rate Limiting**: Configurable request frequency control for each LLM service
- **Custom Prompts**: Model-specific prompt customization
- **Easy Configuration**: Simple TOML-based configuration
- **Caching**: In-memory caching to improve translation speed and reduce duplicate requests
- **Multiple Interfaces**: Support for word selection translation and DeepL translation endpoints

## Quick Start

### Installation Options

1. **From Source**
```bash
git clone https://github.com/nerdneilsfield/Polyglot-Gate-Server.git
cd Polyglot-Gate-Server
go build -o Polyglot-Gate-Server main.go
```

2. **Via Go Get**
```bash
go get github.com/nerdneilsfield/Polyglot-Gate-Server
```

3. **Docker**
```bash
# Using Docker Hub
docker run -d --name polyglot-gate-server \
    -p 8080:8080 \
    -v ./config.toml:/app/config.toml \
    nerdneils/polyglot-gate-server

# Using GitHub Container Registry
docker run -d --name polyglot-gate-server \
    -p 8080:8080 \
    -v ./config.toml:/app/config.toml \
    ghcr.io/nerdneilsfield/polyglot-gate-server
```

## Usage

```bash
# Run server
Polyglot-Gate-Server run <config_file_path>

# Generate sample config
Polyglot-Gate-Server gen <output_file_path>

# Validate config
Polyglot-Gate-Server valid <config_file_path>

# Show version
Polyglot-Gate-Server version
```

## Configuration

Example configuration (config_example.toml):

```toml
[[models]]
name = "gpt-3.5-turbo"
base_url = "https://api.openai.com/v1"
type = "openai"
api_key = "your_api_key"
model_name = "gpt-3.5-turbo"
max_tokens = 1000
temperature = 0.5
prompt = "Translate the following %s text to %s: '%s'"
rate_limit = 10.0
endpoint = "/gpt-3.5-turbo"
cache_expire_hours = 72
```

Note: The `%s` placeholders in the prompt represent source language, target language, and text to translate respectively.

## API Usage

I'll help you translate the API documentation section from Chinese to English. Here's the translation:

````markdown:README_ZH.md
<details>
<summary>API Documentation</summary>

### `GET /api/v1/models` Returns a list of all supported models. Uses `Bearer Token` authentication.

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

### `POST /api/v1/translate` Translates content. Uses `Bearer Token` authentication.

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

When `force_refresh` is set to `true`, it will force refresh the cache.

### `POST /api/v1/models/[endpoint]` Translates content. Uses `Bearer Token` authentication.

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

When `force_refresh` is set to `true`, it will force refresh the cache.

### `POST /api/hcfy` Selection translation. No authentication required.

Request:

```json
{
  "name": "gpt-3.5-turbo",
  "text": "Hello, world!",
  "destination": ["中文(简体)", "English"],
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

### `POST /api/deepl/[endpoint]` Translates content using DeepL. No authentication required.

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
````

## Project Structure

```
.
├── cmd/            # Command-line interface
├── internal/       # Core logic
│   ├── configs/    # Configuration handling
│   └── server/     # Server implementation
└── docker/         # Docker-related files
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests, create issues, or suggest improvements.

## License
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
