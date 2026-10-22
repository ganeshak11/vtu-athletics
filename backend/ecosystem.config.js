module.exports = {
  apps: [
    {
      name: 'vtu-athletics-backend',
      script: 'dist/server.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      exp_backoff_restart_delay: 100,
      listen_timeout: 8000,
      kill_timeout: 5000,
      merge_logs: true,
      time: true,
    },
  ],
};
