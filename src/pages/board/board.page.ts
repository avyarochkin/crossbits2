import { Component, ElementRef, ViewChild } from '@angular/core'
import { NavController, AlertController, ToastController } from '@ionic/angular'
import { Point, BoardData, GAME_STATUS, SOLUTION_STATUS } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { BoardCanvasComponent } from 'src/components/board-canvas/board-canvas'

const ZOOM_FACTOR = 1.2
const TOAST_DATA = {
    [SOLUTION_STATUS.FINISHED]: { icon: 'trophy', message: 'Solved!' },
    [SOLUTION_STATUS.UNFINISHED]: { icon: 'hand-left', message: 'Cannot solve automatically' },
    [SOLUTION_STATUS.GAVE_UP]: { icon: 'sad', message: 'Gave up. Finish manually' },
    [SOLUTION_STATUS.NO_SOLUTION]: { icon: 'skull', message: 'No solution. Fix the hints' }
}

@Component({
    selector: 'page-board',
    templateUrl: 'board.page.html',
    styleUrls: ['board.page.scss']
})
export class BoardPage {
    @ViewChild('scroll', { static: true }) scroller: ElementRef<HTMLElement>
    @ViewChild('boardCanvas', { static: false }) board: BoardCanvasComponent

    boardData: BoardData
    boardSize: Point

    zoom = 1
    minZoom = 1
    solvingBoard = false

    constructor(
        public navCtrl: NavController,
        public alertCtrl: AlertController,
        public toastCtrl: ToastController,
        public game: GameProvider
    ) {
        this.boardData = this.game.boardData
        this.boardSize = this.game.boardSize
    }

    ionViewWillEnter() {
        const initZoomX = window.innerWidth / this.board.canvasRef.nativeElement.clientWidth
        const initZoomY = window.innerHeight / this.board.canvasRef.nativeElement.clientHeight
        this.zoom = Math.min(initZoomX, initZoomY, 1)
        this.minZoom = this.zoom
    }

    async back() {
        await this.navCtrl.pop()
    }

    zoomIn() {
        this.zoom = this.zoom * ZOOM_FACTOR
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / ZOOM_FACTOR, this.minZoom)
    }

    async save() {
        this.game.saveCurrentBoard()
        const toast = await this.toastCtrl.create({
            icon: 'checkmark-circle',
            message: 'Saved',
            position: 'top',
            animated: true,
            duration: 1000
        })
        void toast.onDidDismiss().then(async () => {
            await this.navCtrl.navigateRoot('/')
        })
        await toast.present()
    }

    async delete() {
        const confirm = await this.alertCtrl.create({
            header: 'Delete this board?',
            cssClass: 'popup-dark',
            buttons: [{
                text: 'Keep',
                role: 'cancel'
            },{
                text: 'Delete',
                handler: async () => {
                    this.game.deleteCurrentBoard()
                    await this.navCtrl.navigateRoot('/')
                }
            }]
        })
        await confirm.present()
    }

    isSetup(): boolean {
        return (this.game.boardStatus === GAME_STATUS.SETUP)
    }

    isGame(): boolean {
        return (this.game.boardStatus === GAME_STATUS.GAME)
    }

    isNewBoard() {
        return (this.game.savedBoardIndex >= this.game.savedBoards.length)
    }

    canUndo() {
        return this.isGame() && this.game.undoStack.canUndo()
    }

    canRedo() {
        return this.isGame() && this.game.undoStack.canRedo()
    }

    async clear() {
        const confirm = await this.alertCtrl.create({
            header: 'Clear this board?',
            cssClass: 'popup-dark',
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

    async statusChange(status: GAME_STATUS) {
        if (status === GAME_STATUS.OVER) {
            this.zoom = this.minZoom
            await this.showSolutionToast(SOLUTION_STATUS.FINISHED)
        }
    }

    async solveBoard() {
        this.solvingBoard = true
        const result = await this.game.solveGame(() => {
            this.board.update()
        })
        this.board.checkGameStatus(false)
        this.solvingBoard = false
        await this.showSolutionToast(result)
    }

    private async showSolutionToast(result: SOLUTION_STATUS) {
        const toast = await this.toastCtrl.create({
            icon: TOAST_DATA[result].icon,
            message: TOAST_DATA[result].message,
            position: 'top',
            animated: true,
            duration: 2000
        })
        await toast.present()

    }
}
