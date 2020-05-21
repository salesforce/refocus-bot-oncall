/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const path = require('path');
// creates index.html folder and puts it in dist folder
const HtmlWebpackPlugin = require('html-webpack-plugin');
const dotenv = require('dotenv-webpack');
const LodashPlugin = require('lodash-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const env = require('./config.js').env;
const url = require('./config.js')[env].refocusUrl;
const botName = require('./package.json').name;
const TerserPlugin = require('terser-webpack-plugin');

const config = {
  entry: './web/index.js',
  output: {
    path: path.resolve(__dirname, './web/dist'),
    filename: 'index_bundle.js',
    publicPath: '/'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({})],
  },
  resolve: {
    alias: {
      handlebars: 'handlebars/dist/handlebars.min.js',
      moment: 'moment/min/moment.min.js'
    }
  },


  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: [/(node_modules|bower_components)/, path.resolve(__dirname, 'web/dist')],
        include: [path.resolve(__dirname, 'lib'), path.resolve(__dirname, 'web')],
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        loader: ['style-loader', 'css-loader']
      },
      {
        test: /\.handlebars$/,
        loader: 'handlebars-loader',
        include: path.resolve(__dirname, 'web'),
      },
      {
        test: /.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
        loader: 'url-loader?limit=100000',
        include: path.resolve(__dirname, 'web'),
      },
    ]
  },

  node: {
    fs: 'empty'
  },

  devServer: {
    historyApiFallback: true
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: 'web/index.html',
      url: url + '/v1/',
      name: botName,
    }),
    new ZipPlugin({
      filename: 'bot.zip',
      include: [/\.js$/, /\.html$/],
      exclude: ['public']
    }),
    new dotenv({
      path: './.env',
      safe: false,
      systemvars: true
    }),
    new LodashPlugin(),
  ],
};
if (process.env.NODE_ENV !== 'production') {
  config.optimization.minimize = false;
}
module.exports = config;
