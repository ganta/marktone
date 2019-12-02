const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const environment = process.env.NODE_ENV || "development";

module.exports = {
    mode: environment,
    devtool: "inline-source-map",

    entry: {
        content: "./src/app/content.tsx",
        background: "./src/app/background.ts"
    },

    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "js/[name].js"
    },

    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: "css/[name].css",
            chunkFilename: "css/[id].css"
        }),
        new CopyPlugin([
            { from: 'src/manifest.json', to: '.' },
            { from: 'src/icons/', to: 'icons' }
        ])
    ],

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: environment === "development"
                        }
                    },
                    "css-loader",
                    "sass-loader"
                ]
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: process.env.NODE_ENV === "development"
                        }
                    },
                    "css-loader"
                ]
            }
        ]
    }
};
