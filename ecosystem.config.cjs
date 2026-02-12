module.exports = {
  apps: [
    {
      name: "signal-engine",
      script: "scripts/vps_signal_engine.mjs",
      interpreter: "node",
      node_args: "--env-file=.env.local",
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      time: true,
      env: {
        NODE_ENV: "production",
        ENGINE_HEARTBEAT_MS: "30000",
        ENGINE_RESYNC_MS: "300000",
        ENGINE_RECONNECT_BASE_MS: "2000",
        ENGINE_RECONNECT_MAX_MS: "30000",
        ENGINE_REST_POLL_MS: "2000",
      },
    },
  ],
};
