import { Component, ElementRef, ViewChild } from '@angular/core'
import { NavController, PickerController, PickerColumnOption } from '@ionic/angular'

import { GAME_STATUS, Board } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'

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

    @ViewChild('swiper', { static: true }) swiperRef: ElementRef

    constructor(
        public navCtrl: NavController,
        public pickerCtrl: PickerController,
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
        this.game.initFromSaved(board, GAME_STATUS.GAME)
        await this.navCtrl.navigateForward('/board')
    }

    async editGame(board: Board) {
        this.game.initFromSaved(board, GAME_STATUS.SETUP)
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
}

function getPickerCOlumnOptions() {
    return Array.from(
        { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE },
        (el, index) => ({
            text: (index + MIN_BOARD_SIZE).toString(),
            value: index + MIN_BOARD_SIZE
        }))
}