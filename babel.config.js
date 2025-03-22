module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-transform-remove-debugger'],
      process.env.NODE_ENV === 'production' && [
        'babel-plugin-transform-remove-console',
        { exclude: ['error', 'warn'] }
      ]
    ].filter(Boolean)
  };
}; 