import { Component } from '@angular/core'
import { register } from 'swiper/element/bundle'

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html'
})
export class MyApp {
    constructor() {
        register()
    }
}

