const path = require('path');
const dotenv = require('dotenv');
const webpack = require('webpack');
const JsonPlugin = require('generate-json-webpack-plugin');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.aws' });

const isProd = process.env.NODE_ENV === 'production';
const outputDir = isProd ? path.resolve(__dirname, 'prod') : path.resolve(__dirname, 'dev');

const appName = isProd ? 'sync-visited' : 'sync-visited (dev)';

module.exports = {
  mode: process.env.NODE_ENV,
  entry: {
    'scripts/background.js': path.resolve(__dirname, 'src/background.js'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  output: {
    filename: '[name]',
    path: outputDir,
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      AWS_TOPIC_ARN: isProd ? process.env.AWS_PROD_TOPIC_ARN : process.env.AWS_DEV_TOPIC_ARN,
    }),
    new JsonPlugin('manifest.json', {
      manifest_version: 2,
      version: '2.0.0',
      name: appName,
      description: 'sync visited urls',
      background: { scripts: ['scripts/background.js'] },
      permissions: ['gcm', 'background', 'history', 'storage'],
      browser_action: { default_title: appName },
    }, null, 2),
  ],
  devtool: 'inline-source-map',
};
