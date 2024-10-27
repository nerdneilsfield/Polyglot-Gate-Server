FROM alpine:latest

COPY polyglot-gate-server /app/polyglot-gate-server
COPY config_example.toml /app/config.toml

ENTRYPOINT ["polyglot-gate-server", "run", "/app/config.toml"]