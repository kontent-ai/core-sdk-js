const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProd = (args) => {
    return args.mode === 'production'
}

const outputFolder = (args) => path.resolve(__dirname, 'dist/_bundles');
const bundleFilename = (args) => {
    return 'kontent-core.umd' + (isProd(args) ? '.min.js' : '.js');
}

module.exports = (env, args) => ({
    mode: args.mode,
    entry: {
        'index': './lib/index.ts',
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    externals: [{
        'rxjs': {
            commonjs: 'rxjs',
            commonjs2: 'rxjs',
            amd: 'rxjs',
            root: 'rxjs'
        },
        'rxjs/operators': {
            commonjs: 'rxjs/operators',
            commonjs2: 'rxjs/operators',
            amd: 'rxjs/operators',
            root: ['rxjs', 'operators']
        },
    }],
    output: {
        path: outputFolder(args),
        filename: bundleFilename(args),
        libraryTarget: 'umd',
        umdNamedDefine: true,
        library: 'kontentCore'
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                include: [
                    path.resolve(__dirname, 'lib'),
                ],
                options: {
                    configFile: require.resolve('./tsconfig.webpack.json')
                }
            },
          {
            test: /\.js?$/,
            loader: 'babel-loader',
          }
        ],
      },
    performance: { hints: 'error' },
    plugins: [
        new BundleAnalyzerPlugin({
            generateStatsFile: true,
            analyzerMode: 'json',
            reportFilename: (isProd(args) ? 'report.min' : 'report') + '.json',
            statsFilename: (isProd(args) ? 'stats.min' : 'stats') + '.json'
        })
    ]
});


