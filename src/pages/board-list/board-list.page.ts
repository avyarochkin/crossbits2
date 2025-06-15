import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core'
import {
    NavController, PickerController, PickerColumnOption,
    IonHeader, IonToolbar, IonIcon, IonButton, IonButtons, IonTitle, IonContent, IonBackButton
} from '@ionic/angular/standalone'
import { addIcons } from 'ionicons'
import { add, arrowBack, arrowForward, trophy } from 'ionicons/icons'

import { GAME_STATUS, Board } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'

const MIN_BOARD_SIZE = 2
const DEF_BOARD_SIZE = 5
const MAX_BOARD_SIZE = 75
const ROLES = {
    APPLY: 'apply',
    CANCEL: 'cancel'
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
        public game: GameProvider
    ) {
        this.allBoards = this.game.allBoards
        addIcons({ arrowBack, arrowForward, trophy, add })
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
}


function getPickerColumnOptions() {
    return Array.from(
        { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 },
        (el, index) => ({
            text: (index + MIN_BOARD_SIZE).toString(),
            value: index + MIN_BOARD_SIZE
        }))
}