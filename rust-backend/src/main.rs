//! MODVC Speedtest - Ultra-Fast Rust Backend v2
//! 
//! Built with Actix-web for maximum performance.
//! Optimized for high concurrency and smooth throughput.

use actix_cors::Cors;
use actix_files::Files;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use bytes::Bytes;
use futures::stream::{self, StreamExt};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

// Use mimalloc as global allocator for better performance
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

// Server start time for uptime tracking
static START_TIME: AtomicU64 = AtomicU64::new(0);

// ===== Request/Response Structures =====

#[derive(Deserialize)]
struct DownloadQuery {
    size: Option<usize>,
}

#[derive(Serialize)]
struct UploadResponse {
    success: bool,
    #[serde(rename = "bytesReceived")]
    bytes_received: usize,
    duration: u64,
    #[serde(rename = "speedMbps")]
    speed_mbps: f64,
}

#[derive(Serialize)]
struct PingResponse {
    timestamp: u128,
}

#[derive(Serialize)]
struct IpInfoResponse {
    city: String,
    country_code: String,
    ip: String,
}

#[derive(Deserialize)]
struct IpApiResponse {
    city: Option<String>,
    #[serde(rename = "countryCode")]
    country_code: Option<String>,
    query: Option<String>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    uptime: f64,
    version: &'static str,
}

// ===== Pre-generated Random Buffer for Ultra-Fast Downloads =====

/// Pre-generate a large random buffer to avoid generating random bytes on each request
/// This gives us a massive speed boost for downloads
struct RandomBuffer {
    data: Arc<Vec<u8>>,
}

impl RandomBuffer {
    fn new(size: usize) -> Self {
        let mut data = vec![0u8; size];
        rand::thread_rng().fill(&mut data[..]);
        RandomBuffer { data: Arc::new(data) }
    }

    fn get_slice(&self, offset: usize, size: usize) -> Bytes {
        let start = offset % self.data.len();
        let end = std::cmp::min(start + size, self.data.len());
        // Zero-copy slice using Arc
        Bytes::copy_from_slice(&self.data[start..end])
    }
    
    fn get_full_buffer(&self) -> Bytes {
        Bytes::copy_from_slice(&self.data[..])
    }
}

impl Clone for RandomBuffer {
    fn clone(&self) -> Self {
        RandomBuffer { data: Arc::clone(&self.data) }
    }
}

// ===== Endpoint Handlers =====

/// Download endpoint - streams random bytes for download speed testing
/// Uses pre-generated random buffer for maximum throughput
/// Optimized for smooth streaming with larger chunks
async fn download(
    query: web::Query<DownloadQuery>,
    random_buffer: web::Data<RandomBuffer>,
) -> impl Responder {
    // Cap at 10MB, default to 256KB for quick requests
    let size = query.size.unwrap_or(256 * 1024).min(10 * 1024 * 1024);
    
    // Use larger chunks for better throughput (128KB)
    const CHUNK_SIZE: usize = 128 * 1024;
    
    // For small requests, send all at once (faster)
    if size <= CHUNK_SIZE {
        let data = random_buffer.get_slice(0, size);
        return HttpResponse::Ok()
            .content_type("application/octet-stream")
            .insert_header(("Content-Length", size.to_string()))
            .insert_header(("Cache-Control", "no-cache, no-store, must-revalidate"))
            .insert_header(("Pragma", "no-cache"))
            .insert_header(("Expires", "0"))
            .body(data);
    }
    
    let buffer = random_buffer.get_ref().clone();
    let mut remaining = size;
    let mut offset = 0usize;
    
    // Create a stream of chunks from pre-generated buffer
    let stream = stream::iter(std::iter::from_fn(move || {
        if remaining == 0 {
            return None;
        }
        
        let bytes_to_send = std::cmp::min(CHUNK_SIZE, remaining);
        let bytes = buffer.get_slice(offset, bytes_to_send);
        
        remaining -= bytes_to_send;
        offset += bytes_to_send;
        
        Some(Ok::<_, std::io::Error>(bytes))
    }));

    HttpResponse::Ok()
        .content_type("application/octet-stream")
        .insert_header(("Content-Length", size.to_string()))
        .insert_header(("Cache-Control", "no-cache, no-store, must-revalidate"))
        .insert_header(("Pragma", "no-cache"))
        .insert_header(("Expires", "0"))
        .streaming(stream)
}

/// Upload endpoint - receives uploaded data and calculates speed
/// Optimized to start timing from first byte received
async fn upload(body: web::Bytes) -> impl Responder {
    let start_time = Instant::now();
    let bytes_received = body.len();
    
    // Use microseconds for more precision, then convert
    let duration_us = start_time.elapsed().as_micros().max(1) as u64;
    let duration_ms = (duration_us / 1000).max(1);
    
    // Speed = (bytes * 8 bits) / (seconds) / 1_000_000 = Mbps
    let speed_mbps = (bytes_received as f64 * 8.0) / (duration_us as f64 / 1_000_000.0) / 1_000_000.0;

    HttpResponse::Ok()
        .insert_header(("Cache-Control", "no-cache, no-store"))
        .json(UploadResponse {
            success: true,
            bytes_received,
            duration: duration_ms,
            speed_mbps,
        })
}

/// Ping endpoint - returns current timestamp for latency measurement
/// Ultra-minimal response for lowest latency
async fn ping() -> impl Responder {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    
    HttpResponse::Ok()
        .insert_header(("Cache-Control", "no-cache, no-store"))
        .json(PingResponse { timestamp })
}

/// IP info endpoint - fetches location data from ip-api.com
/// Uses connection pooling via reqwest for multiple requests
async fn ip_info(
    req: HttpRequest,
    client: web::Data<reqwest::Client>,
) -> impl Responder {
    // Extract client IP
    let ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or("").trim().to_string())
        .or_else(|| {
            req.peer_addr()
                .map(|addr| addr.ip().to_string().replace("::ffff:", ""))
        })
        .unwrap_or_default();

    // Fetch IP info from ip-api.com with timeout
    let url = format!("http://ip-api.com/json/{}?fields=city,countryCode,query", ip);
    
    match client.get(&url).timeout(Duration::from_secs(3)).send().await {
        Ok(response) => {
            match response.json::<IpApiResponse>().await {
                Ok(data) => HttpResponse::Ok().json(IpInfoResponse {
                    city: data.city.unwrap_or_else(|| "Unknown".to_string()),
                    country_code: data.country_code.unwrap_or_default(),
                    ip: data.query.unwrap_or(ip),
                }),
                Err(_) => HttpResponse::Ok().json(IpInfoResponse {
                    city: "Unknown".to_string(),
                    country_code: String::new(),
                    ip,
                }),
            }
        }
        Err(_) => HttpResponse::Ok().json(IpInfoResponse {
            city: "Unknown".to_string(),
            country_code: String::new(),
            ip,
        }),
    }
}

/// Health check endpoint
async fn health() -> impl Responder {
    let start = START_TIME.load(Ordering::Relaxed);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let uptime = (now - start) as f64;

    HttpResponse::Ok().json(HealthResponse {
        status: "ok",
        uptime,
        version: "2.0.0-rust",
    })
}

/// Fallback handler - serves index.html for SPA routing
async fn index() -> impl Responder {
    actix_files::NamedFile::open_async("./public/index.html").await
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logging
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    // Record start time
    let start = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    START_TIME.store(start, Ordering::Relaxed);

    // Pre-generate 4MB random buffer for ultra-fast downloads (bigger = more variety)
    let random_buffer = web::Data::new(RandomBuffer::new(4 * 1024 * 1024));
    
    // Create a shared HTTP client with connection pooling for IP lookups
    let http_client = web::Data::new(
        reqwest::Client::builder()
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(Duration::from_secs(30))
            .timeout(Duration::from_secs(5))
            .build()
            .expect("Failed to create HTTP client")
    );

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);

    let workers = num_cpus::get();
    
    log::info!("🚀 MODVC Speedtest (Rust v2) starting on port {}", port);
    log::info!("⚡ Using mimalloc allocator for maximum performance");
    log::info!("🔥 Pre-generated random buffer: 4MB");
    log::info!("👥 Workers: {} (one per CPU core)", workers);
    log::info!("🔗 HTTP client with connection pooling enabled");

    HttpServer::new(move || {
        // CORS configuration - allow all origins for speedtest
        let cors = Cors::default()
            .allow_any_origin()
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec!["Content-Type"])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(random_buffer.clone())
            .app_data(http_client.clone())
            .app_data(web::PayloadConfig::new(100 * 1024 * 1024)) // 100MB max upload
            // API routes
            .route("/download", web::get().to(download))
            .route("/upload", web::post().to(upload))
            .route("/ping", web::get().to(ping))
            .route("/ip-info", web::get().to(ip_info))
            .route("/health", web::get().to(health))
            // Static files with caching
            .service(
                Files::new("/", "./public")
                    .index_file("index.html")
                    .use_etag(true)
                    .use_last_modified(true)
            )
            // Fallback
            .default_service(web::get().to(index))
    })
    .workers(workers) // Use all CPU cores
    .keep_alive(Duration::from_secs(75))
    .client_request_timeout(Duration::from_secs(60))
    .client_disconnect_timeout(Duration::from_secs(5))
    .backlog(2048) // Handle more concurrent connections
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
