module.exports = {
    module: {
        rules: [
            {
                test: /\.(wasm)$/,
                type: "javascript/auto",
                use: {
                    loader: "file-loader",
                    options: {
                        outputPath: "/", //set this whatever path you desire
                        name: "[name]-[hash].[ext]",
                        esModule: false
                    }
                }
            },
        ]
    },
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'aframe-physical-vr-character-controller.min.js'
    },
    optimization: {
        minimize: true
    },
    devtool: 'source-map',
    resolve: {
        fallback: {
            fs: false
        }
    }
};