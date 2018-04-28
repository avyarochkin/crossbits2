import { Component, ViewChild } from '@angular/core'
import { NavController, AlertController, ToastController } from 'ionic-angular'
import { GameProvider, Point, BoardData, GAME_STATUS } from '../../providers/game/game'
import { BoardCanvasComponent } from '../../components/board-canvas/board-canvas'


@Component({
    selector: 'page-board',
    templateUrl: 'page-board.html',
})
export class BoardPage {

    @ViewChild(BoardCanvasComponent) board: BoardCanvasComponent

    public boardData: BoardData
    public boardSize: Point

    public zoom = 1
    public minZoom = 1

    constructor(
        public navCtrl: NavController, 
        public alertCtrl: AlertController,
        public toastCtrl: ToastController,
        public game: GameProvider) {

        this.navCtrl.swipeBackEnabled = false

        this.boardData = this.game.boardData
        this.boardSize = this.game.boardSize
    }


    public ionViewWillEnter() {
        let initZoomX = window.innerWidth / this.board.canvasRef.nativeElement.clientWidth
        let initZoomY = window.innerHeight / this.board.canvasRef.nativeElement.clientHeight
        this.zoom = Math.min(initZoomX, initZoomY, 1)
        this.minZoom = this.zoom
        console.log(`Zoom: ${this.zoom}`)
    }


    public back() {
        this.navCtrl.pop()
    }


    public save() {
        this.game.saveCurrentBoard()
        let toast = this.toastCtrl.create({
            message: 'Saved',
            position: 'middle',
            duration: 1000
        })
        toast.onDidDismiss(() => {
            this.navCtrl.popToRoot()
        })
        toast.present()
    }


    public delete() {
        let confirm = this.alertCtrl.create({
            title: 'Delete this board?',
            cssClass:'popup-dark',
            buttons: [{
                text: 'Keep',
                role: 'cancel'
            },{
                text: 'Delete',
                handler: () => {
                    this.game.deleteCurrentBoard()
                    this.navCtrl.popToRoot()
                }
            }]
        })
        confirm.present()
    }


    public isSetup(): boolean {
        return (this.game.boardStatus === GAME_STATUS.SETUP)
    }


    public isGame(): boolean {
        return (this.game.boardStatus === GAME_STATUS.GAME)
    }


    public isNewBoard() {
        return (this.game.savedBoardIndex >= this.game.savedBoards.length)
    }


    public canUndo() {
        return this.isGame() && this.game.undoStack.canUndo()
    }


    public canRedo() {
        return this.isGame() && this.game.undoStack.canRedo()
    }


    public clear() {
        let confirm = this.alertCtrl.create({
            title: 'Clear this board?',
            cssClass:'popup-dark',
            buttons: [{
                text: 'No',
                role: 'cancel'
            },{
                text: 'Yes',
                handler: () => {
                    this.board.clear()
                }
            }]
        })
        confirm.present()
    }


    public statusChange(status: GAME_STATUS) {
        if (status === GAME_STATUS.OVER) {
            this.zoom = this.minZoom
            const toast = this.toastCtrl.create({
                message: 'Solved!',
                position: 'middle',
                duration: 1000
            })
            toast.present()
        }
    }

} // BoardPage
