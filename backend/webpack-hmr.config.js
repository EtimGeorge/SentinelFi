const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = function(options) {
  return {
    ...options,
    externals: {
      ...options.externals,
      bcrypt: 'commonjs bcrypt', // Tell webpack to treat bcrypt as an external dependency
    },
    resolve: {
      ...options.resolve,
      plugins: [
        ...(options.resolve && options.resolve.plugins || []),
        new TsconfigPathsPlugin({ configFile: './tsconfig.json' }),
      ],
    },
  };
};