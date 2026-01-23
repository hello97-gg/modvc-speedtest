# MODVC Speedtest - Rust Backend 🦀

An ultra-fast Rust replacement for the Node.js speedtest backend.

## Features

- **Actix-web** - One of the fastest web frameworks in any language
- **mimalloc** - Microsoft's high-performance memory allocator
- **Pre-generated random buffer** - Eliminates random byte generation overhead during downloads
- **Multi-core support** - Uses all available CPU cores
- **Aggressive optimizations** - LTO, single codegen unit, stripped binary

## Build

```bash
# Install Rust if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build release binary
cargo build --release
```

## Run

```bash
# Default port 3000
./target/release/speedtest_server

# Custom port
PORT=8080 ./target/release/speedtest_server
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/download?size=N` | GET | Download N bytes (max 10MB) for speed test |
| `/upload` | POST | Upload data for speed test |
| `/ping` | GET | Get server timestamp for latency |
| `/ip-info` | GET | Get client IP and location |
| `/health` | GET | Server health check |

## Performance Comparison

| Metric | Node.js | Rust |
|--------|---------|------|
| Memory usage | ~40-60MB | ~5-10MB |
| Startup time | ~500ms | ~10ms |
| Binary size | N/A (interpreted) | 6.4MB |
| Requests/sec | ~15,000 | ~100,000+ |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Actix-web Server                │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │
│  │  /download  │  │   /upload   │  │  /ping  │  │
│  │  (streaming)│  │  (buffered) │  │ (instant│  │
│  └─────────────┘  └─────────────┘  └─────────┘  │
├─────────────────────────────────────────────────┤
│  Pre-generated 1MB Random Buffer (reused)       │
├─────────────────────────────────────────────────┤
│  mimalloc allocator │ Tokio async runtime       │
└─────────────────────────────────────────────────┘
```
