const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(
        {
            ...env,
            babel: {
                dangerouslyAddModulePathsToTranspile: ['react-native-reanimated']
            }
        },
        argv
    );

    // Customize the config before returning it.
    // Add aliases for native modules that don't work on web
    config.resolve.alias = {
        ...config.resolve.alias,
        'react-native-maps': path.resolve(__dirname, 'src/mocks/react-native-maps-web.js'),
    };

    return config;
};
