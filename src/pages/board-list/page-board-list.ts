import { Component } from '@angular/core'
import { NavController } from 'ionic-angular'

import { BoardPage } from '../board/page-board'
import { GameProvider, GAME_STATUS } from '../../providers/game/game'


//@IonicPage()
@Component({
    selector: 'page-board-list',
    templateUrl: 'page-board-list.html',
})
export class BoardListPage {

    allBoards: any

    constructor(
        public navCtrl: NavController, 
        public game: GameProvider) {}

    ionViewDidLoad() {
        this.allBoards = this.game.allBoards
        console.log('ionViewDidLoad BoardListPage')
    }

    loadGame(board) {
        this.game.initFromSaved(board, GAME_STATUS.GAME)
        this.navCtrl.push(BoardPage)
    }


    editGame(board) {
        this.game.initFromSaved(board, GAME_STATUS.SETUP)
        this.navCtrl.push(BoardPage)
    }

}
