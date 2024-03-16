/* eslint-disable @typescript-eslint/naming-convention */
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
    appId: 'io.ionic.starter',
    appName: 'crossbits2',
    webDir: 'www',
    server: {
        androidScheme: 'https'
    },
    cordova: {
        preferences: {
            webviewbounce: 'false',
            UIWebViewBounce: 'false',
            DisallowOverscroll: 'true',
            'android-minSdkVersion': '16',
            BackupWebStorage: 'none',
            SplashMaintainAspectRatio: 'true',
            FadeSplashScreenDuration: '300',
            SplashShowOnlyFirstTime: 'false',
            SplashScreen: 'screen',
            SplashScreenDelay: '3000',
            BackgroundColor: '0xFF002F4D'
        }
    }
}

export default config
