import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'

import { GameProvider, GAME_STATUS } from '../../providers/game/game'
import { BoardPage } from '../board/page-board'

@Component({
    selector: 'page-board-size',
    templateUrl: 'page-board-size.html',
})
export class BoardSizePage {

    constructor(
        public navCtrl: NavController, 
        public navParams: NavParams,
        public game: GameProvider) {}

    ionViewDidLoad() {
    }

    public size = {
        x: 5,
        minX: 2,
        maxX: 50,
        y: 5,
        minY: 2,
        maxY: 50
    }

    public changeX(x: number) {
        this.size.x = x
    }

    public changeY(y: number) {
        this.size.y = y
    }

    public editBoard() {
        this.game.initWithSize(this.size.x, this.size.y, GAME_STATUS.SETUP)
        this.navCtrl.push(BoardPage)
    }

    public back() {
        this.navCtrl.pop()
    }
}
