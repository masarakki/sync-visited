const path = require('path');
const dotenv = require('dotenv');
const webpack = require('webpack');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.aws' });

module.exports = {
  mode: process.env.NODE_ENV,
  entry: {
    background: path.resolve(__dirname, 'app/scripts.babel/background.js'),
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
    filename: '[name].js',
    path: path.resolve(__dirname, 'app/scripts/'),
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      AWS_TOPIC_ARN: process.env.NODE_ENV === 'production' ? process.env.AWS_PROD_TOPIC_ARN : process.env.AWS_DEV_TOPIC_ARN,
    }),
  ],
  devtool: 'source-map',
};
