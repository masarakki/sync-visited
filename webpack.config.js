const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.aws' });

module.exports = {
  mode: 'development',
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
  devtool: 'source-map',
};
