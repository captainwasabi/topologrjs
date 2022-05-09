module.exports = {
    apps : [{
      name   : "topologr",
      script : "./topologrjs-app.js",
      env_production: {
         NODE_ENV: "production",
         PORT: "3000",
      },
      env_development: {
         NODE_ENV: "development",
         PORT: "3001",
      }
    }]
  }