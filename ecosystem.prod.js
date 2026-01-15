module.exports = {
  apps: [
    {
      name: "api-prod",
      script: "dist/api.js",
      instances: "max",
      exec_mode: "cluster",

      env: {
        NODE_ENV: "production",
        PORT: 8080
      },

      autorestart: true,
      max_memory_restart: "500M",

      error_file: "/var/log/myapp/api-error.log",
      out_file: "/var/log/myapp/api-out.log",
      time: true
    }
  ]
};
