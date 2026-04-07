import path from 'path';
import zlib from 'zlib';
import webpack from 'webpack';
import CompressionPlugin from 'compression-webpack-plugin';

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
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.js$/,
      minRatio: 0.8,
    }),
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.js$/,
      compressionOptions: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } } as any,
      minRatio: 0.8,
      filename: '[path][base].br',
    }),
  ],
};

export default config;
