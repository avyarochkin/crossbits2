import { Component, ElementRef, ViewChild } from '@angular/core'
import { NavController, AlertController, ToastController } from '@ionic/angular'
import { Point, BoardData, GAME_STATUS } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { BoardCanvasComponent } from 'src/components/board-canvas/board-canvas'


@Component({
    selector: 'page-board',
    templateUrl: 'board.page.html',
    styleUrls: ['board.page.scss']
})
export class BoardPage {
    @ViewChild('scroll', { static: true }) scroller: ElementRef<HTMLElement>
    @ViewChild(BoardCanvasComponent, { static: true }) board: BoardCanvasComponent

    public boardData: BoardData
    public boardSize: Point

    public zoom = 1
    public minZoom = 1

    constructor(
        public navCtrl: NavController,
        public alertCtrl: AlertController,
        public toastCtrl: ToastController,
        public game: GameProvider)
    {
        this.boardData = this.game.boardData
        this.boardSize = this.game.boardSize
    }

    public ionViewWillEnter() {
        let initZoomX = window.innerWidth / this.board.canvasRef.nativeElement.clientWidth
        let initZoomY = window.innerHeight / this.board.canvasRef.nativeElement.clientHeight
        this.zoom = Math.min(initZoomX, initZoomY, 1)
        this.minZoom = this.zoom
        console.log(`Initial zoom: ${this.zoom}`)
    }

    public back() {
        this.navCtrl.pop()
    }

    public zoomIn() {
        this.zoom = this.zoom * 1.2
    }

    public zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, this.minZoom)
    }

    public async save() {
        this.game.saveCurrentBoard()
        let toast = await this.toastCtrl.create({
            message: 'Saved',
            position: 'top',
            animated: true,
            duration: 1000
        })
        toast.onDidDismiss().then(() => {
            this.navCtrl.navigateRoot('/')
        })
        await toast.present()
    }

    public async delete() {
        let confirm = await this.alertCtrl.create({
            header: 'Delete this board?',
            cssClass:'popup-dark',
            buttons: [{
                text: 'Keep',
                role: 'cancel'
            },{
                text: 'Delete',
                handler: () => {
                    this.game.deleteCurrentBoard()
                    this.navCtrl.navigateRoot('/')
                }
            }]
        })
        await confirm.present()
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

    public async clear() {
        let confirm = await this.alertCtrl.create({
            header: 'Clear this board?',
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
        await confirm.present()
    }

    public async statusChange(status: GAME_STATUS) {
        if (status === GAME_STATUS.OVER) {
            this.zoom = this.minZoom
            const toast = await this.toastCtrl.create({
                message: 'Solved!',
                position: 'top',
                animated: true,
                duration: 1000
            })
            await toast.present()
        }
    }
}
