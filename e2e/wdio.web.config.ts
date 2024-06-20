import { config as mainConfig } from './wdio.config.js'

export const config = {
    ...mainConfig,
    specs: ['./**/*.e2e.ts'],
    services: (mainConfig.services ?? []).concat([
        [
            'chromedriver',
            {
                args: [
                    '--use-fake-ui-for-media-stream',
                    '--use-fake-device-for-media-stream'
                ]
            }
        ]
    ]),
    // For all capabilities check
    // http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
    capabilities: [
        {
            maxInstances: 1,
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: ['--window-size=500,1000'],
                // See https://chromedriver.chromium.org/mobile-emulation
                // For more details
                mobileEmulation: {
                    deviceMetrics: { width: 390, height: 844, pixelRatio: 3 },
                    // eslint-disable-next-line max-len
                    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
                },
                prefs: {
                    'profile.default_content_setting_values.media_stream_camera': 1,
                    'profile.default_content_setting_values.media_stream_mic': 1,
                    'profile.default_content_setting_values.notifications': 1
                }
            }
        }
    ]
}
