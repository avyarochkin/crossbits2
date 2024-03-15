import { Component } from '@angular/core'
import { Platform } from '@ionic/angular'
import { SplashScreen } from '@capacitor/core'
import { register } from 'swiper/element/bundle'

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html'
})
export class MyApp {
    constructor(
        platform: Platform
    ) {
        register()
        void platform.ready().then(async () => {
            await SplashScreen.hide()
        })
    }
}

