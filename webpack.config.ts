import path from 'path';
import webpack from 'webpack';

const config: webpack.Configuration = {
  mode: 'production',
  entry: './src/simon42-dashboard-strategy.ts',
  output: {
    clean: true,
    filename: 'simon42-dashboard-strategy.js',
    chunkFilename: 'simon42-dashboard-strategy-[name].js',
    path: path.resolve(__dirname, 'dist'),
    // publicPath must match the HA resource URL path for async chunk loading
    publicPath: '/hacsfiles/simon42-dashboard-strategy/',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [],
};

export default config;
