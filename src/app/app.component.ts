import { Component } from '@angular/core'
import { Platform } from '@ionic/angular'
import { SplashScreen } from '@capacitor/core'

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html'
})
export class MyApp {
    constructor(
        platform: Platform
    ) {
        void platform.ready().then(async () => {
            await SplashScreen.hide()
        })
    }
}

