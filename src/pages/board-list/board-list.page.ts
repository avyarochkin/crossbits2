import { Component, ViewChild } from '@angular/core'
import { NavController, IonSlides, PickerController } from '@ionic/angular'

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

    public allBoards: Board[][]

    @ViewChild(IonSlides, { static: true }) slides: IonSlides

    constructor(
        public navCtrl: NavController,
        public pickerCtrl: PickerController,
        public game: GameProvider) {

        this.allBoards = this.game.allBoards
    }

    ionViewWillEnter() {
        // console.log('ionViewWillEnter BoardListPage')
        // slides should update if orientation changed since last time
        this.slides.update()
    }

    loadGame(board: Board) {
        this.game.initFromSaved(board, GAME_STATUS.GAME)
        this.navCtrl.navigateForward('/board')
    }

    editGame(board: Board) {
        this.game.initFromSaved(board, GAME_STATUS.SETUP)
        this.navCtrl.navigateForward('/board')
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
        picker.onDidDismiss().then(value => {
            if (value.role === 'apply') {
                this.game.initWithSize(value.data.x.value, value.data.y.value, GAME_STATUS.SETUP)
                // game will be initialized on the next page
                this.navCtrl.navigateForward('/board')
            }
        })
        await picker.present()
    }
}

function getPickerCOlumnOptions() {
    return Array.from(
        { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE },
        (_, index) => ({
            text: (index + MIN_BOARD_SIZE).toString(),
            value: index + MIN_BOARD_SIZE
        }))
}