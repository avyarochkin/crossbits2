import { Component, ViewChild } from '@angular/core'
import { NavController, Gesture, AlertController, ToastController, App, Content } from 'ionic-angular'
import { GameProvider, ColumnHints, RowHints, Point, BoardData, 
    GAME_STATUS, BOARD_CELL, BOARD_SIDE, BOARD_HINTKIND } from '../../providers/game/game'

type DragObj = {
    orientation: 'X'|'Y',
    start: Point,
    current: Point,
    value: BOARD_CELL
}

//@IonicPage()
@Component({
    selector: 'page-board',
    templateUrl: 'page-board.html',
})
export class BoardPage {

    @ViewChild('board') boardElement
    @ViewChild('scroll') scrollElement
    @ViewChild(Content) content: Content

    public boardData: BoardData
    public boardSize: Point
    public columnHints: ColumnHints
    public rowHints: RowHints
    
    constructor(
        public navCtrl: NavController, 
        public alertCtrl: AlertController,
        public toastCtrl: ToastController,
        public app: App,
        public game: GameProvider) {

        this.boardData = this.game.boardData
        this.boardSize = this.game.boardSize
        this.columnHints = this.game.columnHints
        this.rowHints = this.game.rowHints
        }

    ionViewDidLoad() {
        //console.log('ionViewDidLoad BoardPage')
        this.gesture = new Gesture(this.boardElement.nativeElement)
        this.gesture.listen()
        this.gesture.on('tap', (e) => { this.handleTap(e) })
        this.gesture.on('hold', (e) => { this.handleHold(e) })
        this.gesture.on('release', (e) => { this.handleRelease(e) })
        this.gesture.on('drag', (e) => { this.handleDrag(e) })
    }

    ionViewWillEnter() {
        let initZoomX = window.innerWidth / this.boardSize.x
        let initZoomY = window.innerHeight / this.boardSize.y
        let zoom = Math.min(initZoomX, initZoomY, 1.5)
        debugger
        //$ionicScrollDelegate.$getByHandle('boardScroll').zoomBy(zoom, true, 0)
        
        console.log('Zoom ' + zoom)
    }

    trackByIndex(index, item) {
        return index
    }


    private gesture: Gesture

    private dragObj: DragObj = null

    checkGameStatus() {
        if (this.game.boardStatus === GAME_STATUS.OVER) {
            let toast = this.toastCtrl.create({
                message: 'Congratulation!',
                duration: 1000
            })
            toast.present()
        }
    }

    boardDivToXY(div): Point {
        let attrX = div.attributes['x'], attrY = div.attributes['y']
        if (attrX && attrY) {
            return {
                x: parseInt(attrX.value),
                y: parseInt(attrY.value)
            }
        } else {
            return null
        }
    }

    toggleCellValue(value: BOARD_CELL): BOARD_CELL {
        return (value === BOARD_CELL.ON)
            ? BOARD_CELL.OFF
            : (value === BOARD_CELL.OFF)
                ? BOARD_CELL.NIL
                : BOARD_CELL.ON
    }

    toggleCell(div) {
        let xy = this.boardDivToXY(div)
        if (xy) {
            let value = this.boardData[xy.y][xy.x].value
            this.game.setBoardXY(xy.x, xy.y, this.toggleCellValue(value))
            this.checkGameStatus()
        }
    }

    dsgn(a: number, b: number): number {
        return (b === a) ? 0 : (b > a) ? 1 : -1
    }

    setCellsAtoB(A: Point, B: Point, value: number) {
        let dx = this.dsgn(A.x, B.x)
        let dy = this.dsgn(A.y, B.y)
        if (dx || dy) {
            this.game.undoData.startBlock()
            for (let x = A.x, y = A.y; (dx === 0 || x !== B.x + dx) && (dy === 0 || y !== B.y + dy); x += dx, y += dy) {
                this.game.setBoardXY(x, y, value)
            }
            this.game.undoData.endBlock()
            this.checkGameStatus()
        }
    }

    private handleSetupModeTap(kind: string, x: number, y: number, e) {
        switch (kind) {
            case BOARD_HINTKIND.TOP:
                this.editColumnHint(x, y, BOARD_SIDE.TOP)
                break
            case BOARD_HINTKIND.BOTTOM:
                this.editColumnHint(x, y, BOARD_SIDE.BOTTOM)
                break
            case BOARD_HINTKIND.LEFT:
                this.editRowHint(y, x, BOARD_SIDE.LEFT)
                break
            case BOARD_HINTKIND.RIGHT:
                this.editRowHint(y, x, BOARD_SIDE.RIGHT)
                break
        }
    }

    private handleGameModeTap(kind: string, x: number, y: number, e) {
        switch (kind) {
            case BOARD_HINTKIND.TOP:
            case BOARD_HINTKIND.BOTTOM:
                this.solveColumn(x)
                this.checkGameStatus()
                break
            case BOARD_HINTKIND.LEFT:
            case BOARD_HINTKIND.RIGHT:
                this.solveRow(y)
                this.checkGameStatus()
                break
            case 'data':
                this.toggleCell(e.target)
                break
        }
    }

    private handleTap(e) {

        let attrKind = e.target.attributes['kind']
        let attrX = e.target.attributes['x']
        let attrY = e.target.attributes['y']

        if (attrKind && attrX && attrY) {
            // $apply(() => {

                if (this.isSetup()) {
                    this.handleSetupModeTap(attrKind.value, attrX.value, attrY.value, e)
                } else if (this.isGame()) {
                    this.handleGameModeTap(attrKind.value, attrX.value, attrY.value, e)
                }
            // })
        }
    }


    private handleHold(e) {
        // $apply(() => {
            let attrKind = e.target.attributes['kind']

            // only single touch draws a line
            if (this.isGame() && attrKind && attrKind.value === 'data' && e.gesture.touches.length === 1) {
                let xy = this.boardDivToXY(e.target)
                this.dragObj = {
                    start: xy,
                    current: xy,
                    value: this.toggleCellValue(this.boardData[xy.y][xy.x].value),
                    orientation: null
                }
                // $ionicScrollDelegate.$getByHandle('boardScroll').freezeScroll(true)
                this.app._setDisableScroll(true)
            } else {
                this.dragObj = null
            }
        // })
    }


    private handleRelease(e) {
        this.dragObj = null
        // $ionicScrollDelegate.$getByHandle('boardScroll').freezeScroll(false)
        this.app._setDisableScroll(false)
    }


    private handleDrag(e) {
        // $apply(() => {

            let attrKind = e.target.attributes['kind']
            if (this.isGame() && attrKind && attrKind.value === 'data' && this.dragObj) {
                let touch = e.gesture.touches[0]
                let xy = this.boardDivToXY(document.elementFromPoint(touch.clientX, touch.clientY))
                let firstDrag = false

                // determine the dragging orientation
                if (xy && !this.dragObj.orientation) {
                    if (xy.x !== this.dragObj.start.x) {
                        this.dragObj.orientation = 'X'
                        firstDrag = true
                    } else if (xy.y !== this.dragObj.start.y) {
                        this.dragObj.orientation = 'Y'
                        firstDrag = true
                    }
                }

                // set all cells based on the 1st accoring to the dragging orientation
                if (xy && this.dragObj.orientation === 'X' && xy.x !== this.dragObj.current.x) {
                    // horizontal orientation - resetting y-coord
                    xy.y = this.dragObj.start.y
                    this.dragObj.current = xy
                    if (!firstDrag) {
                        this.undo()
                    }
                    if (xy.x !== this.dragObj.start.x) {
                        this.setCellsAtoB(xy, this.dragObj.start, this.dragObj.value)
                    } else {
                        this.dragObj.orientation = null
                    }
                }
                else if (xy && this.dragObj.orientation === 'Y' && xy.y !== this.dragObj.current.y) {
                    // vertical orientation - resetting x-coord
                    xy.x = this.dragObj.start.x
                    this.dragObj.current = xy
                    if (!firstDrag) {
                        this.undo()
                    }
                    if (xy.y !== this.dragObj.start.y) {
                        this.setCellsAtoB(xy, this.dragObj.start, this.dragObj.value)
                    } else {
                        this.dragObj.orientation = null
                    }

                }
            }
        // })
    }
    
    isSetup() {
        return (this.game.boardStatus === GAME_STATUS.SETUP)
    }

    isGame() {
        return (this.game.boardStatus === GAME_STATUS.GAME)
    }

    isGameOver() {
        return (this.game.boardStatus === GAME_STATUS.OVER)
    }

    isNewBoard() {
        return (this.game.boardIndex >= this.game.savedBoards.length)
    }

    hintPad = new HintPad()

    // $ionicModal.fromTemplateUrl('templates/hint_pad.html', {
    //     scope: $scope,
    //     animation: 'fade-in'
    // }).then(function(ctrl) {
    //     $scope.hintPad.ctrl = ctrl
    // })


    editColumnHint(x: number, y: number, side: string) {

        this.hintPad.getHint = (x: number, y: number, side: string) => {
            return this.columnHints.getHint(x, y, side)
        }

        this.hintPad.setHint = function(x: number, y: number, side: string, hint: string) {
            return this.columnHints.setHint(x, y, side, hint)
        }

        this.hintPad.canMove = (dir: string) => {
            switch (dir) {
                case 'U': return this.hintPad.y > 0
                case 'D': return this.hintPad.y < this.columnHints.getMaxY() - 1
                case 'L': return this.hintPad.x > 0
                case 'R': return this.hintPad.x < this.columnHints.col.length - 1
            }
            return false
        }

        this.hintPad.init(x, y, side)
    }


    editRowHint(y: number, x: number, side: string) {

        this.hintPad.getHint = (x: number, y: number, side: string) => {
            return this.rowHints.getHint(y, x, side)
        }

        this.hintPad.setHint = (x: number, y: number, side: string, hint: string) => {
            return this.rowHints.setHint(y, x, side, hint)
        }

        this.hintPad.canMove = (dir: string) => {
            switch (dir) {
                case 'U': return this.hintPad.y > 0
                case 'D': return this.hintPad.y < this.rowHints.row.length - 1
                case 'L': return this.hintPad.x > 0
                case 'R': return this.hintPad.x < this.rowHints.getMaxX() - 1
            }
            return false
        }

        this.hintPad.init(x, y, side)
    }


    solveColumn(x: number) {
        this.columnHints.solveCol(x)
    }


    solveRow(y: number) {
        this.rowHints.solveRow(y)
    }


    back() {
        this.navCtrl.pop()
    }


    save() {
        this.game.saveCurrentBoard()
        let toast = this.toastCtrl.create({
            message: 'Saved',
            duration: 500,
            position: 'middle'
        })
        toast.onDidDismiss(() => {
            this.navCtrl.popToRoot()
        })
    }


    delete() {
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


    canUndo() {
        return this.game.undoData.canUndo()
    }


    canRedo() {
        return this.game.undoData.canRedo()
    }


    clear() {
        let confirm = this.alertCtrl.create({
            title: 'Clear this board?',
            cssClass:'popup-dark',
            buttons: [{
                text: 'No',
                role: 'cancel'
            },{
                text: 'Yes',
                handler: () => {
                    this.game.resetBoard(this.boardData[0].length, this.boardData.length)
                }
            }]
        })
        confirm.present()
    }


    undo() {
        this.game.undoData.undo()
    }


    redo() {
        this.game.undoData.redo()
    }

} // BoardPage



interface IHintCtrl {
    show()
}

class HintPad  {

    value = 0
    min = 0
    max = 50
    x = 0
    y = 0
    side: string
    ctrl: IHintCtrl

    getHint: (x, y, side) => string
    setHint: (x, y, side, value) => { x, y }
    canMove: (dir) => boolean

    init(x, y, side) {
        this.x = parseInt(x)
        this.y = parseInt(y)
        this.side = side

        this.setFromHints()
        this.ctrl.show()
    }

    at(x, y, side) {
        return x === this.x && y === this.y && side === this.side
    }

    private dirIndex = 'UDLR'
    private dX = [0, 0, -1, 1]
    private dY = [-1, 1, 0, 0]

    move(dir) {
        let index = this.dirIndex.indexOf(dir)
        if (index >= 0) {
            this.x += this.dX[index]
            this.y += this.dY[index]
            this.setFromHints()
        }
    }

    setFromHints() {
        let hint = this.getHint(this.x, this.y, this.side)
        this.value = (hint) ? parseInt(hint) : 0
        console.log('hint-pad[' + this.x + ',' + this.y + '] set to ' + this.value)
    }

    change() {
        if (this.setHint) {
            // $apply()
            let xy = this.setHint(this.x, this.y, this.side, this.value)
            this.x = xy.x
            this.y = xy.y
        }
    }
} // HintPad
