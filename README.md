<p align="center">
  <img src="https://test.modvc.org/og-image.svg" alt="MODVC Speed Test" width="600">
</p>

<p align="center">
  <a href="https://test.modvc.org"><img src="https://img.shields.io/badge/🌐_Live_Demo-test.modvc.org-10B981?style=for-the-badge" alt="Live Demo"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Backend-Rust_🦀-orange?style=for-the-badge" alt="Rust"></a>
</p>

<h1 align="center">⚡ MODVC Speed Test</h1>

<p align="center">
  <strong>Ultra-fast internet speed test powered by Rust</strong><br>
  Test your download speed, upload speed, and latency in seconds.
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🚀 **Blazing Fast** | Rust backend with Actix-web, one of the fastest web frameworks |
| 📊 **Real-time Updates** | Live speed and data transfer display during tests |
| 🎯 **Accurate Results** | Rolling average algorithm for stable measurements |
| 📱 **Responsive** | Works perfectly on desktop and mobile |
| 🔒 **No Ads** | Clean, distraction-free interface |
| 🌐 **Open Source** | MIT licensed, free to use and modify |

## 🖥️ Live Demo

**👉 [test.modvc.org](https://test.modvc.org)**

<p align="center">
  <img src="https://img.shields.io/badge/Download-✓-10B981" alt="Download">
  <img src="https://img.shields.io/badge/Upload-✓-10B981" alt="Upload">
  <img src="https://img.shields.io/badge/Latency-✓-10B981" alt="Latency">
</p>

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MODVC Speed Test                      │
├─────────────────────────────────────────────────────────┤
│  Frontend (HTML/CSS/JS)                                  │
│  ├── Real-time speed display                            │
│  ├── Rolling average calculations                        │
│  └── Responsive dark theme UI                           │
├─────────────────────────────────────────────────────────┤
│  Rust Backend (Actix-web)                               │
│  ├── /download  - Stream random bytes (up to 10MB)     │
│  ├── /upload    - Receive upload data                   │
│  ├── /ping      - Latency measurement                   │
│  ├── /ip-info   - Client location lookup                │
│  └── /health    - Server status                         │
├─────────────────────────────────────────────────────────┤
│  Performance Optimizations                               │
│  ├── mimalloc allocator                                 │
│  ├── Pre-generated 4MB random buffer                    │
│  ├── Connection pooling for external APIs               │
│  └── Multi-core worker threads                          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (for PM2, optional)

### Build & Run

```bash
# Clone the repository
git clone https://github.com/hello97-gg/modvc-speedtest.git
cd modvc-speedtest/rust-backend

# Build release binary
cargo build --release

# Run the server
./target/release/speedtest_server

# Or with custom port
PORT=8080 ./target/release/speedtest_server
```

### Production Deployment (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save and enable startup
pm2 save
pm2 startup
```

## 📊 Performance

| Metric | Node.js | Rust |
|--------|---------|------|
| Memory Usage | ~55 MB | **~6-30 MB** |
| Startup Time | ~500ms | **~10ms** |
| Binary Size | N/A | **6.4 MB** |
| Requests/sec | ~15,000 | **100,000+** |

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/download?size=N` | GET | Download N bytes (max 10MB) |
| `/upload` | POST | Upload data for speed test |
| `/ping` | GET | Server timestamp for latency |
| `/ip-info` | GET | Client IP and location |
| `/health` | GET | Server health check |

## 📁 Project Structure

```
modvc-speedtest/
├── rust-backend/
│   ├── src/
│   │   └── main.rs          # Rust server
│   ├── public/
│   │   ├── index.html       # Frontend
│   │   ├── style.css        # Styles
│   │   └── speedtest.js     # Speed test logic
│   └── Cargo.toml           # Rust dependencies
├── ecosystem.config.js      # PM2 configuration
├── nginx.conf               # Nginx config
├── LICENSE                  # MIT License
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [test.modvc.org](https://test.modvc.org)
- **MODVC**: [play.modvc.org](https://play.modvc.org)
- **GitHub**: [github.com/hello97-gg/modvc-speedtest](https://github.com/hello97-gg/modvc-speedtest)

---

<p align="center">
  Made with ❤️ by <a href="https://play.modvc.org">MODVC</a>
</p>
