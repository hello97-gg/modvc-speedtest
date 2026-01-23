module.exports = {
    apps: [{
        name: 'modvc-speedtest',
        script: './rust-backend/target/release/speedtest_server',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '100M',
        cwd: '/home/ubuntu/speedtest/rust-backend',
        env: {
            PORT: 3000,
            RUST_LOG: 'info'
        }
    }]
};
