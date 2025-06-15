import { Injectable } from '@angular/core'
import { GameProvider } from '../game/game'
import { AlertOptions, OverlayEventDetail } from '@ionic/core'
import { SerializedBoardData } from '../game/game.interface'
import { AlertController } from '@ionic/angular'

const ROLES = {
    CONFIRM: 'confirm',
    CANCEL: 'cancel'
}

@Injectable()
export class SettingsProvider {
    constructor(
        public alertCtrl: AlertController,
        private readonly game: GameProvider
    ) {}

    backupData(downloadAnchor: HTMLAnchorElement) {
        const data = JSON.stringify(this.game.boardDataToObject(), null, 2)
        this.saveToFile(data, 'crossbits.json', downloadAnchor)
    }

    restoreData(uploadInput: HTMLInputElement) {
        uploadInput.value = ''
        uploadInput.onchange = async (event) => {
            const response = await this.getAlert({
                header: 'Are you sure?',
                subHeader: 'This operation will overwrite all saved data',
                buttons: [
                    { role: ROLES.CONFIRM, text: 'YES' },
                    { role: ROLES.CANCEL, text: 'NO' }
                ]
            })
            if (response.role === ROLES.CONFIRM) {
                this.doRestoreData((event.target as HTMLInputElement)?.files?.[0])
            }
        }
        uploadInput.click()
    }

    backupSavedBoards(downloadAnchor: HTMLAnchorElement) {
        const data = JSON.stringify(this.game.savedBoardsToObject(), null, 2)
        this.saveToFile(data, 'custom-boards.json', downloadAnchor)
    }

    private saveToFile(data: string, name: string, downloadAnchor: HTMLAnchorElement) {
        const file = new Blob([data], { type: 'text/plain' })
        downloadAnchor.href = URL.createObjectURL(file)
        downloadAnchor.download = name
        downloadAnchor.click()
    }

    private doRestoreData(file: File | undefined) {
        if (file == null) { return }
        const reader = new FileReader()
        reader.onload = (event) => this.saveBoardDataFromTextFile(event.target?.result as string)
        reader.readAsText(file)

    }

    private saveBoardDataFromTextFile(data: string) {
        if (data == null) { return }
        const dataObject = JSON.parse(data) as Record<string, SerializedBoardData>
        Object.entries(dataObject)
            .forEach(([key, value]) => this.game.saveBoardData(key, value))
        window.location.reload()
    }

    private async getAlert(opts: AlertOptions): Promise<OverlayEventDetail> {
        const alert = await this.alertCtrl.create(opts)
        const promise = alert.onDidDismiss()
        await alert.present()
        return promise
    }
}
