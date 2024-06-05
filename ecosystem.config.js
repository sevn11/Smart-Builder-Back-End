module.exports = {
  apps: [
    {
      name: 'smart-builder-backend',
      script: 'dist/main.js', // Path to the main file of your built NestJS app
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
