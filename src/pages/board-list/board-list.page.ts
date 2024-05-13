import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core'
import {
    NavController, PickerController, PickerColumnOption, ActionSheetController, AlertController, AlertOptions
} from '@ionic/angular'

import { GAME_STATUS, Board, SavedBoardData } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { OverlayEventDetail } from '@ionic/core'

const MIN_BOARD_SIZE = 2
const DEF_BOARD_SIZE = 5
const MAX_BOARD_SIZE = 50

@Component({
    selector: 'page-board-list',
    templateUrl: 'board-list.page.html',
    styleUrls: ['board-list.page.scss']
})
export class BoardListPage {

    allBoards: Board[][]

    editing: boolean

    @ViewChild('swiper', { static: true }) swiperRef: ElementRef

    constructor(
        public navCtrl: NavController,
        public pickerCtrl: PickerController,
        public alertCtrl: AlertController,
        public actionSheetCtrl: ActionSheetController,
        public cdr: ChangeDetectorRef,
        public game: GameProvider
    ) {
        this.allBoards = this.game.allBoards
    }

    ionViewWillEnter() {
        // console.log('ionViewWillEnter BoardListPage')
        // slides should update if orientation changed since last time
        // void this.swiperRef.nativeElement.swiper.update()
    }

    async loadGame(board: Board) {
        this.game.initFromSaved(board, this.editing ? GAME_STATUS.SETUP : GAME_STATUS.GAME)
        await this.navCtrl.navigateForward('/board')
    }

    async createGame() {
        const picker = await this.pickerCtrl.create({
            columns: [{
                name: 'x',
                selectedIndex: DEF_BOARD_SIZE - MIN_BOARD_SIZE,
                options: getPickerCOlumnOptions()
            }, {
                name: 'y',
                selectedIndex: DEF_BOARD_SIZE - MIN_BOARD_SIZE,
                options: getPickerCOlumnOptions()
            }],
            buttons: [
                { role: 'cancel', text: 'CANCEL' },
                { role: 'apply', text: 'OK' }
            ]
        })
        void picker.onDidDismiss<{ x: PickerColumnOption; y: PickerColumnOption }>().then(async ({ role, data }) => {
            if (role === 'apply') {
                this.game.initWithSize(data!.x.value as number, data!.y.value as number, GAME_STATUS.SETUP)
                // game will be initialized on the next page
                await this.navCtrl.navigateForward('/board')
            }
        })
        await picker.present()
    }

    async showSettings() {
        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Settings',
            buttons: [
                { role: 'backup', text: 'Backup data' },
                { role: 'restore', text: 'Restore data' }
            ]
        })
        void actionSheet.onDidDismiss().then(({ role }) => {
            switch (role) {
                case 'backup':
                    this.backupData()
                    break
                case 'restore':
                    this.restoreData()
                    break
                default:
            }
        })
        await actionSheet.present()
    }

    backupData() {
        const downloadAnchor = document.getElementById('downloadAnchor') as HTMLAnchorElement
        const data = JSON.stringify(this.game.boardDataToObject(), null, 2)
        const file = new Blob([data], { type: 'text/plain' })
        downloadAnchor.href = URL.createObjectURL(file)
        downloadAnchor.download = 'crossbits.json'
        downloadAnchor.click()
    }

    restoreData() {
        const uploadInput = document.getElementById('uploadInput') as HTMLInputElement
        uploadInput.value = ''
        uploadInput.onchange = async (event) => {
            const response = await this.getAlert({
                header: 'Are you sure?',
                subHeader: 'This operation will overwrite all saved data',
                buttons: [
                    { role: 'confirm', text: 'YES' },
                    { role: 'cancel', text: 'NO' }
                ]
            })
            if (response.role === 'confirm') {
                this.doRestoreData((event.target as HTMLInputElement)?.files?.[0])
            }
        }
        uploadInput.click()
    }

    private doRestoreData(file: File | undefined) {
        if (file == null) { return }
        const reader = new FileReader()
        reader.onload = (event) => this.saveBoardDataFromTextFile(event.target?.result as string)
        reader.readAsText(file)

    }

    private saveBoardDataFromTextFile(data: string) {
        if (data == null) { return }
        const dataObject = JSON.parse(data) as Record<string, SavedBoardData>
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


function getPickerCOlumnOptions() {
    return Array.from(
        { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE },
        (el, index) => ({
            text: (index + MIN_BOARD_SIZE).toString(),
            value: index + MIN_BOARD_SIZE
        }))
}