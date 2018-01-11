const path = require('path');
// creates index.html folder and puts it in dist folder
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const ZipPlugin = require('zip-webpack-plugin');
const env = process.env.NODE_ENV || 'dev';
const url = require('./config.js')[env].refocusUrl;
const botName = require('./package.json').name;

const config = {
  entry: './web/index.js',
  output: {
    path: path.resolve(__dirname, './web/dist'),
    filename: 'index_bundle.js',
    publicPath: '/'
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [path.resolve(__dirname, 'lib'), path.resolve(__dirname, 'web')],
        use: 'babel-loader?compact=true',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.handlebars$/,
        loader: "handlebars-loader",
        include: path.resolve(__dirname, 'web'),
      },
      {
        test: /.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
        use: "url-loader?limit=100000",
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
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'API_TOKEN': JSON.stringify(process.env.API_TOKEN),
      }
    }),
  ]
};

if(process.env.NODE_ENV === 'production'){
  config.plugins.push(
    new webpack.DefinePlugin({ //allows us to set a property on process.env
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.optimize.UglifyJsPlugin()
  );
}

module.exports = config;
