var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin'); //creates index.html folder and puts it in dist folder
var webpack = require('webpack');
var ZipPlugin = require('zip-webpack-plugin');
var env = process.env.NODE_ENV || 'dev';
var url = require('./config.js')[env].refocusUrl;
const botName = require('./package.json').name;

var config = {

	entry: './web/index.js',

	output: {
		path: path.resolve(__dirname, './web/dist'),
		filename: 'index_bundle.js',
		publicPath: '/'
	},

	module: {
		rules: [
			{test: /\.(js|jsx)$/, use: 'babel-loader?compact=true'}, //code transformer (if file is .js)
			{test: /\.css$/, use: ['style-loader', 'css-loader']},
			{test: /\.handlebars$/, loader: "handlebars-loader"},
			{test: /.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/, use: "url-loader?limit=100000"},
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
				'SFDC_USERNAME': JSON.stringify(process.env.SFDC_USERNAME),
				'SFDC_PASSWORD': JSON.stringify(process.env.SFDC_PASSWORD),
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
