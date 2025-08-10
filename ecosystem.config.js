module.exports = {
    apps: [{
        name: 'hydrology-backend',
        script: 'src/server.js',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development',
            PORT: 1423,
            MONGO_URI: 'mongodb://trungnam:TrungNamLinux%4001@127.0.0.1:27017/project-water-level-forecast'
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 1423,
            MONGO_URI: 'mongodb://trungnam:TrungNamLinux%4001@127.0.0.1:27017/project-water-level-forecast'
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        log_type: 'json',
        min_uptime: '10s',
        max_restarts: 10,
        restart_delay: 4000,
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 8000,
        node_args: '--max-old-space-size=1024'
    }]
}; 