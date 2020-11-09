module.exports = {
  apps: [{
    name: "Hull SFDC Events Custom Objects",
    script: "dist/index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "450M",
    env: {
      NODE_ENV: "staging",
    },
    env_production: {
      NODE_ENV: "production",
    },
  }],
};
