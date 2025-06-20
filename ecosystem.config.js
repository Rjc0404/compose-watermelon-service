module.exports = {
    apps: [{
        name: "compose-watermelon-service",
        script: "./app.js",
        instances: "max", // 依据CPU核数来确定实例数量
        error_file: "./error.log",
        out_file: "/dev/null", // 忽略普通输出
        merge_logs: true,        // 合并多实例日志
        log_date_format: "YYYY-MM-DD HH:mm:ss",
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
            PORT: 8000
        }
    }]
};