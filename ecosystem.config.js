module.exports = {
  apps: [

    /* =======================
       Proxy Server (Port 3000)
       Main Entry Point
    ======================= */
    {
      name: "proxy",
      cwd: "./proxy",
      script: "index.js",

      env: {
        NODE_ENV: "production"
      },

      autorestart: true,
      max_memory_restart: "200M"
    },

    /* =======================
       Dashboard (Port 1000)
    ======================= */
    {
      name: "dashboard",
      cwd: "./dashboard",
      script: "server.js",

      env: {
        NODE_ENV: "production"
      },

      autorestart: true,
      max_memory_restart: "100M"
    },

    /* =======================
       homecare (Main App)
    ======================= */
    {
      name: "homecare-backend",
      cwd: "./app/homecare/server",
      script: "index.js",

      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
        PORT: 2001
      },

      autorestart: true,
      max_memory_restart: "500M",

    },

    {
      name: "homecare-frontend",
      cwd: "./app/homecare",
      script: "node_modules/vite/bin/vite.js",
      args: ["--port", "1001", "--host", "0.0.0.0"],

      env: {
        NODE_ENV: "development"
      },

      autorestart: true,
      max_memory_restart: "300M"
    },

    //  =======================
    //   repair (Frontend Dev)
    // =======================
    {
      name: "repair-frontend",
      cwd: "./app/react-tsx-repair-system",
      script: "node_modules/next/dist/bin/next",
      args: ["dev", "-p", "1002"],

      env: {
        NODE_ENV: "development"
      },

      autorestart: true,
      max_memory_restart: "300M"
    },
    //  =======================
    //   AutoPO (Express App)
    // =======================
    {
      name: "autopo-backend",
      cwd: "./app/AutoPO",
      script: "app.js",

      env: {
        NODE_ENV: "production",
        PORT: 1003
      },
    },
      //  =======================
    //   AutoPO (Express App)
    // =======================
    {
      name: "ycsales-Frontend",
      cwd: "./app/ycsalescrm",
      script: "app.js",

      env: {
        NODE_ENV: "production",
        PORT: 1004
      },

      autorestart: true,
      max_memory_restart: "300M"
    }
  ]
};
