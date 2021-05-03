const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProd = (args) => {
    return args.mode === 'production'
}

const outputFolder = (args) => path.resolve(__dirname, 'dist/umd');
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


