import { Component } from '@angular/core'
import { IonContent, IonButton, IonModal } from '@ionic/angular/standalone'
import config from '/package.json'
import { RouterLink } from '@angular/router'

const CONFIG = config as Record<string, string>

@Component({
    selector: 'start',
    templateUrl: './start.page.html',
    styleUrls: ['./start.page.scss'],
    imports: [IonModal, IonButton,
        IonContent, IonButton, RouterLink
    ]
})
export class StartPage {
    version = CONFIG.version
}
