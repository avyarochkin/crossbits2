import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core'
import { NgClass } from '@angular/common'
import {
    NavController, AlertController, ToastController, IonContent, IonButton, IonButtons, IonIcon, IonFooter,
    IonToolbar, IonSpinner
} from '@ionic/angular/standalone'
import { addIcons } from 'ionicons'
import {
    addCircleOutline, arrowRedoOutline, arrowUndoOutline, banOutline, bulbOutline, checkmarkCircle, handLeft,
    removeCircleOutline, sad, skull, trashOutline, trophy
} from 'ionicons/icons'

import { Point, BoardData, GAME_STATUS, SOLUTION_STATUS } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { BoardCanvasComponent, IScrollChangeEvent } from 'src/components/board-canvas/board-canvas'
import { SetupBoardCanvasComponent } from 'src/components/board-canvas/setup-board-canvas'
import { GameBoardCanvasComponent } from 'src/components/board-canvas/game-board-canvas'
import { ZoomableDirective } from 'src/directives/zoomable/zoomable'

const ZOOM_FACTOR = 1.2
const TOAST_DATA = {
    [SOLUTION_STATUS.FINISHED]: { icon: 'trophy', message: 'Solved!' },
    [SOLUTION_STATUS.UNFINISHED]: { icon: 'hand-left', message: 'Cannot solve automatically' },
    [SOLUTION_STATUS.GAVE_UP]: { icon: 'sad', message: 'Gave up. Finish manually' },
    [SOLUTION_STATUS.NO_SOLUTION]: { icon: 'skull', message: 'No solution. Fix the hints' }
}

const AUTO_SCROLL_AREA_WIDTH = 50
const AUTO_SCROLL_SPEED_FACTOR = 100
const AUTO_SCROLL_INTERVAL = 100

@Component({
    selector: 'page-board',
    templateUrl: 'board.page.html',
    styleUrls: ['board.page.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgClass,
        IonFooter, IonToolbar, IonContent, IonButton, IonButtons, IonIcon, IonSpinner,
        GameBoardCanvasComponent, SetupBoardCanvasComponent, ZoomableDirective
    ]
})
export class BoardPage {
    @ViewChild('content', { static: true, read: ElementRef }) contentRef: ElementRef<HTMLIonContentElement>
    @ViewChild('boardCanvas', { static: false }) board: BoardCanvasComponent

    boardData: BoardData
    boardSize: Point

    zoom = 1
    minZoom = 1
    maxZoom = 1
    solvingBoard = false
    scrollEnabled = true

    private contentEl: HTMLIonContentElement
    private scroller: HTMLElement
    private scrollTimer: NodeJS.Timeout | undefined

    constructor(
        private readonly cdr: ChangeDetectorRef,
        private readonly navCtrl: NavController,
        private readonly alertCtrl: AlertController,
        private readonly toastCtrl: ToastController,
        private readonly game: GameProvider
    ) {
        this.boardData = this.game.boardData
        this.boardSize = this.game.boardSize
        addIcons({
            addCircleOutline, removeCircleOutline, banOutline, arrowUndoOutline, arrowRedoOutline,
            bulbOutline, checkmarkCircle, trashOutline, trophy, handLeft, sad, skull
        })
    }

    async ionViewWillEnter() {
        this.contentEl = this.contentRef.nativeElement
        this.scroller = await this.contentEl.getScrollElement()
        const initZoomX = window.innerWidth / this.board.canvasRef.nativeElement.clientWidth
        const initZoomY = window.innerHeight / this.board.canvasRef.nativeElement.clientHeight
        this.zoom = Math.min(initZoomX, initZoomY, 1)
        this.minZoom = this.zoom
        this.cdr.detectChanges()
    }

    async back() {
        await this.navCtrl.pop()
    }

    canZoomIn() {
        return this.zoom < this.maxZoom
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * ZOOM_FACTOR, this.maxZoom)
    }

    canZoomOut() {
        return this.zoom > this.minZoom
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / ZOOM_FACTOR, this.minZoom)
    }

    zoomChange(value: number) {
        this.zoom = value
        this.cdr.detectChanges()
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
                    this.cdr.detectChanges()
                }
            }]
        })
        await confirm.present()
    }

    statusChange(status: GAME_STATUS) {
        if (status === GAME_STATUS.OVER) {
            this.zoom = this.minZoom
            this.cdr.detectChanges()
            void this.showSolutionToast(SOLUTION_STATUS.FINISHED)
        }
    }

    scrollChange(event: IScrollChangeEvent) {
        if (event.enable != null) {
            this.scrollEnabled = event.enable
            this.cdr.detectChanges()
        }
    }

    panMove(event: PointerEvent) {
        // calculates horizontal scroll speed: positive if panning approaches
        // right edge and negative if panning approaches left edge
        const scrollSpeedX = scrollSpeed(this.contentEl.clientWidth - event.clientX)
            ?? scrollSpeed(-event.clientX)
            ?? 0
        // calculates vertical scroll speed: positive if panning approaches
        // bottom edge and negative if panning approaches top edge
        const scrollSpeedY = scrollSpeed(this.contentEl.clientHeight - event.clientY)
            ?? scrollSpeed(-event.clientY)
            ?? 0

        // check if auto-scroll should start with calculated scroll speed
        if (scrollSpeedX !== 0 || scrollSpeedY !== 0) {
            // stop previous auto-scroll as it may have an outdated speed
            if (this.scrollTimer != null) {
                clearInterval(this.scrollTimer)
            }
            // scroll repeatedly with fixed intervals
            // and newly calculated speed until panning ends
            this.scrollTimer = setInterval(() => {
                this.scroller.scrollBy({ left: scrollSpeedX, top: scrollSpeedY, behavior: 'smooth' })
            }, AUTO_SCROLL_INTERVAL)
        } else {
            // stop scrolling if calculated speed drops to 0
            this.panEnd()
        }
    }

    panEnd() {
        clearInterval(this.scrollTimer)
        this.scrollTimer = undefined
    }

    async solveBoard() {
        this.solvingBoard = true
        this.cdr.detectChanges()
        const result = await this.game.solveGame(() => {
            this.board.update()
        })
        this.board.checkGameStatus(false)
        this.solvingBoard = false
        this.cdr.detectChanges()
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

/**
 * Calculates required scroll speed based on the distance to the edge.
 * The shorter this distance, the higher the speed
 * @param distance distance to board edge
 * @returns calculated scroll speed
 * (for negative distance returns negative scroll speed)
 */
function scrollSpeed(distance: number): number | null {
    return distance < AUTO_SCROLL_AREA_WIDTH && distance > -AUTO_SCROLL_AREA_WIDTH
        ? Math.round(AUTO_SCROLL_SPEED_FACTOR / distance)
        : null
}
