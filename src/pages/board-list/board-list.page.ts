import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core'
import { OverlayEventDetail } from '@ionic/core'
import {
    NavController, PickerController, PickerColumnOption, ActionSheetController, AlertController, AlertOptions,
    IonHeader, IonToolbar, IonIcon, IonButton, IonButtons, IonTitle, IonContent, IonBackButton
} from '@ionic/angular/standalone'
import { addIcons } from 'ionicons'
import {
    add, arrowBack, arrowForward, checkmarkDoneOutline, createOutline, settingsOutline, trophy
} from 'ionicons/icons'

import { GAME_STATUS, Board, SerializedBoardData } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'

const MIN_BOARD_SIZE = 2
const DEF_BOARD_SIZE = 5
const MAX_BOARD_SIZE = 75
const ROLES = {
    APPLY: 'apply',
    CONFIRM: 'confirm',
    CANCEL: 'cancel',
    BACKUP_DATA: 'backup-data',
    RESTORE_DATA: 'restore-data',
    BACKUP_CUSTOM_BOARDS: 'backup-custom-boards'
}

@Component({
    selector: 'page-board-list',
    templateUrl: 'board-list.page.html',
    styleUrls: ['board-list.page.scss'],
    imports: [
        IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton, IonIcon
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BoardListPage {

    allBoards: Board[][]

    editing: boolean
    sliding: boolean

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
        addIcons({ arrowBack, arrowForward, createOutline, settingsOutline, trophy, checkmarkDoneOutline, add })
    }

    ionViewWillEnter() {
        // console.log('ionViewWillEnter BoardListPage')
        // slides should update if orientation changed since last time
        // void this.swiperRef.nativeElement.swiper.update()
    }

    toggleSliding(active: boolean) {
        this.sliding = active
    }

    changeSlide() {
        this.editing = false
    }

    async loadGame(board: Board) {
        this.game.initFromSaved(board, this.editing ? GAME_STATUS.SETUP : GAME_STATUS.GAME)
        await this.navCtrl.navigateForward('/board')
        this.editing = false
    }

    async createGame() {
        const picker = await this.pickerCtrl.create({
            columns: [{
                name: 'x',
                selectedIndex: DEF_BOARD_SIZE - MIN_BOARD_SIZE,
                options: getPickerColumnOptions()
            }, {
                name: 'y',
                selectedIndex: DEF_BOARD_SIZE - MIN_BOARD_SIZE,
                options: getPickerColumnOptions()
            }],
            buttons: [
                { role: ROLES.CANCEL, text: 'CANCEL' },
                { role: ROLES.APPLY, text: 'OK' }
            ]
        })
        void picker.onDidDismiss<{ x: PickerColumnOption; y: PickerColumnOption }>().then(async ({ role, data }) => {
            if (role === ROLES.APPLY) {
                this.game.initWithSize(data!.x.value as number, data!.y.value as number, GAME_STATUS.SETUP)
                // game will be initialized on the next page
                await this.navCtrl.navigateForward('/board')
                this.editing = false
            }
        })
        await picker.present()
    }

    async showSettings() {
        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Settings',
            buttons: [
                { role: ROLES.BACKUP_DATA, text: 'Backup data' },
                { role: ROLES.RESTORE_DATA, text: 'Restore data' },
                { role: ROLES.BACKUP_CUSTOM_BOARDS, text: 'Backup custom boards' }
            ]
        })
        void actionSheet.onDidDismiss().then(({ role }) => {
            switch (role) {
                case ROLES.BACKUP_DATA:
                    this.backupData()
                    break
                case ROLES.RESTORE_DATA:
                    this.restoreData()
                    break
                case ROLES.BACKUP_CUSTOM_BOARDS:
                    this.backupSavedBoards()
                    break
                default:
            }
        })
        await actionSheet.present()
    }

    backupData() {
        const data = JSON.stringify(this.game.boardDataToObject(), null, 2)
        this.saveToFile(data, 'crossbits.json')
    }

    backupSavedBoards() {
        const data = JSON.stringify(this.game.savedBoardsToObject(), null, 2)
        this.saveToFile(data, 'custom-boards.json')
    }

    restoreData() {
        const uploadInput = document.getElementById('uploadInput') as HTMLInputElement
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

    private doRestoreData(file: File | undefined) {
        if (file == null) { return }
        const reader = new FileReader()
        reader.onload = (event) => this.saveBoardDataFromTextFile(event.target?.result as string)
        reader.readAsText(file)

    }

    private saveToFile(data: string, name: string) {
        const downloadAnchor = document.getElementById('downloadAnchor') as HTMLAnchorElement
        const file = new Blob([data], { type: 'text/plain' })
        downloadAnchor.href = URL.createObjectURL(file)
        downloadAnchor.download = name
        downloadAnchor.click()
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


function getPickerColumnOptions() {
    return Array.from(
        { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 },
        (el, index) => ({
            text: (index + MIN_BOARD_SIZE).toString(),
            value: index + MIN_BOARD_SIZE
        }))
}