/* eslint-disable @typescript-eslint/naming-convention */
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
    appId: 'com.braintrain.crossbits2',
    appName: 'CrossBits',
    webDir: 'www',
    server: {
        androidScheme: 'https'
    },
    cordova: {},
    plugins: {
        SplashScreen: {
            launchShowDuration: 1500,
            launchAutoHide: true,
            backgroundColor: '#ffffffff',
            androidScaleType: 'CENTER_CROP',
            splashFullScreen: false,
            splashImmersive: false
        }
    }
}

export default config
