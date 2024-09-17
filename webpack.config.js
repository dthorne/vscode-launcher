import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: "development",
  devtool: "inline-source-map",
  target: "node",
  entry: {
    main: "./src/index.ts",
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name]-bundle.js" // <--- Will be compiled to this single file
  },
  resolve: {
    extensions: [".ts", ".ts", ".js"],
  },
  module: {
    rules: [
      { 
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  }
};
