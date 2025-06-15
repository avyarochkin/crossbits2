import { Component } from '@angular/core'
import {
    IonContent, IonButton, IonModal, IonActionSheet, IonHeader, IonToolbar, IonButtons, IonIcon
} from '@ionic/angular/standalone'
import config from '/package.json'
import { RouterLink } from '@angular/router'
import { IonActionSheetCustomEvent, OverlayEventDetail } from '@ionic/core'
import { SettingsProvider } from '../../providers/settings/settings'
import { addIcons } from 'ionicons'
import { close } from 'ionicons/icons'

const CONFIG = config as Record<string, string>

const ROLES = {
    BACKUP_DATA: 'backup-data',
    RESTORE_DATA: 'restore-data',
    BACKUP_CUSTOM_BOARDS: 'backup-custom-boards'
}

@Component({
    selector: 'start',
    templateUrl: './start.page.html',
    styleUrls: ['./start.page.scss'],
    imports: [
        IonIcon, IonButtons, IonToolbar, IonHeader, IonModal, IonActionSheet, IonButton,
        IonContent, IonButton, RouterLink
    ]
})
export class StartPage {
    readonly version = CONFIG.version
    readonly settingsButtons = [
        { role: ROLES.BACKUP_DATA, text: 'Backup data' },
        { role: ROLES.RESTORE_DATA, text: 'Restore data' },
        { role: ROLES.BACKUP_CUSTOM_BOARDS, text: 'Backup custom boards' }
    ]

    constructor(
        private readonly settings: SettingsProvider
    ) {
        addIcons({ close })
    }

    callSettings(event: IonActionSheetCustomEvent<OverlayEventDetail>) {
        const downloadAnchor = document.getElementById('downloadAnchor') as HTMLAnchorElement
        const uploadInput = document.getElementById('uploadInput') as HTMLInputElement

        switch (event.detail.role) {
            case ROLES.BACKUP_DATA:
                this.settings.backupData(downloadAnchor)
                break
            case ROLES.RESTORE_DATA:
                this.settings.restoreData(uploadInput)
                break
            case ROLES.BACKUP_CUSTOM_BOARDS:
                this.settings.backupSavedBoards(downloadAnchor)
                break
            default:
        }
    }
}
