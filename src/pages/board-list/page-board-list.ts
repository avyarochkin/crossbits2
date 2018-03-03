import { Component, ViewChild } from '@angular/core'
import { NavController, Slides } from 'ionic-angular'

import { BoardPage } from '../board/page-board'
import { BoardSizePage } from '../board-size/page-board-size'
import { GameProvider, GAME_STATUS, Board } from '../../providers/game/game'


//@IonicPage()
@Component({
    selector: 'page-board-list',
    templateUrl: 'page-board-list.html'
})
export class BoardListPage {

    public allBoards: Board[][]

    @ViewChild(Slides) slides: Slides
    
    constructor(
        public navCtrl: NavController, 
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
        this.navCtrl.push(BoardPage)
    }


    editGame(board: Board) {
        this.game.initFromSaved(board, GAME_STATUS.SETUP)
        this.navCtrl.push(BoardPage)
    }

    createGame() {
        this.navCtrl.push(BoardSizePage)
        // game will be initialized on the next page
    }

}
