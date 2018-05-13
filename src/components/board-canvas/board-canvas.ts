import { Component, ElementRef, OnInit, ViewChild, Output, EventEmitter, OnDestroy } from '@angular/core'
import { Gesture, ModalController, App } from 'ionic-angular'
// import { DIRECTION_HORIZONTAL, DIRECTION_VERTICAL } from 'ionic-angular/gestures/hammer'

import { BOARD_SIDE, BOARD_CELL, BOARD_PART, GAME_STATUS, GameProvider, BoardSide, Point } from '../../providers/game/game'
import { IHints } from '../../providers/game/hints'
import { HintPadPage, HintPoint } from '../../pages/hint-pad/page-hint-pad'

const colors = {
    dark: '#002F4D',
    semiDark: '#0A4C76',
    mid: '#24668F',
    light: '#408EBF',
    ultraLight: '#A6C5D9',
    lightest: '#FFFFFF'
}
const cellSize = 25

type PanData = {
    orientation: 'X'|'Y',
    start: Point,
    current: Point,
    value: BOARD_CELL
}

type SolvePos = {
    x?: number,
    y?: number,
    kind: string
}


@Component({
    selector: 'board-canvas',
    template: `<canvas #canvas></canvas>`,
    styles: [`
        :host {
            display: block;
        }
    `]
})
export class BoardCanvasComponent implements OnInit, OnDestroy {

    @Output('statusChange') statusChangeEmitter = new EventEmitter<GAME_STATUS>()
    @ViewChild('canvas') canvasRef: ElementRef

    public solvePos: SolvePos = null
    public hintPos: HintPoint = null
    private gesture: Gesture
    private panData: PanData = null
    private scrollingElement: HTMLElement

    constructor(
        public app: App,
        public game: GameProvider,
        public modalCtrl: ModalController) {}


    public ngOnInit() {
        this.scrollingElement = this.canvasRef.nativeElement.closest('.scroll-content')

        this.gesture = new Gesture(this.canvasRef.nativeElement)
        this.gesture.listen()

        const mc = this.gesture['_hammer'] as HammerManager
        mc.get('press').set({ time: 201 })
        // mc.get('pan').set({ direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL })
        // pan.recognizeWith(press)

        this.gesture.on('tap', input => this.handleTap(input))
        this.gesture.on('press', input => this.handlePress(input))
        this.gesture.on('panmove', input => this.handlePanMove(input))
        this.gesture.on('panend', input => this.handlePanEnd(input))
        this.gesture.on('pressup', input => this.handlePanEnd(input))

        this.enableScroll(true)
        this.paint()
        console.log(`[BoardCanvasComponent initialized]`)
        // window.onresize = (e) => {
        //     console.log(`[window resized]`)
        // }
    }

    public ngOnDestroy() {
        // this.gesture.destroy()
        console.log(`[BoardCanvasComponent destroyed]`)
    }


    private setViewPort(ctx: CanvasRenderingContext2D, realWidth: number, realHeight: number) {

        const backingStoreRatio = ctx['webkitBackingStorePixelRatio'] || ctx['backingStorePixelRatio'] || 1
        const pxRatio = window.devicePixelRatio / backingStoreRatio
        // console.log(`pixel ratio: ${pxRatio}`)
        let el = this.canvasRef.nativeElement
        el.width = realWidth * pxRatio
        el.height = realHeight * pxRatio

        if (pxRatio !== 1) {
            ctx.imageSmoothingEnabled = false
            el.style.width = `${realWidth}px`
            el.style.height = `${realHeight}px`
            ctx.scale(pxRatio, pxRatio)
        }
    }


    private paint() {

        const ctx = this.canvasRef.nativeElement.getContext('2d') as CanvasRenderingContext2D

        const halfCellSize = cellSize / 2

        const maxBoardX = this.game.boardData[0].length
        const maxBoardY = this.game.boardData.length
        const maxColHintY = this.game.columnHints.getMaxIndexInLine()
        const maxRowHintX = this.game.rowHints.getMaxIndexInLine()

        const pxRowHintWidth = maxRowHintX * cellSize
        const pxColHintHeight = maxColHintY * cellSize
        const pxBoardWidth = maxBoardX * cellSize
        const pxBoardHeight = maxBoardY * cellSize
        const pxCanvasWidth = pxRowHintWidth * 2 + pxBoardWidth
        const pxCanvasHeight = pxColHintHeight * 2 + pxBoardHeight

        this.setViewPort(ctx, pxCanvasWidth, pxCanvasHeight)

        ctx.font = '15px sans-serif'
        // align hint text in the center of its cell
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // COLUMN HINTS

        ctx.fillStyle = this.isSetup() ? colors.mid : colors.semiDark
        // common top and bottom rectangle
        ctx.fillRect(pxRowHintWidth, 0, pxBoardWidth, pxColHintHeight)
        ctx.fillRect(pxRowHintWidth, pxColHintHeight + pxBoardHeight, pxBoardWidth, pxColHintHeight)

        // column hints: highlight and text

        for (let x = 0; x < maxBoardX; x++) {

            ctx.fillStyle = colors.light
            // highlight top hint column while solving
            if (this.solvingColAt(x, BOARD_PART.HINT_TOP)) {
                ctx.fillRect(pxRowHintWidth + x * cellSize, 0, cellSize, pxColHintHeight)
            }
            // highlight bottom hint column while solving
            if (this.solvingColAt(x, BOARD_PART.HINT_BOTTOM)) {
                ctx.fillRect(pxRowHintWidth + x * cellSize, pxColHintHeight + pxBoardHeight, cellSize, pxColHintHeight)
            }

            // add text and focus highlight for top and bottom hint cells in one common loop
            for (let y = 0; y < maxColHintY; y++) {

                ctx.fillStyle = colors.light
                // focus highlights
                if (this.hintPadAt(x, y, BOARD_SIDE.TOP)) {
                    ctx.fillRect(pxRowHintWidth + x * cellSize, y * cellSize, cellSize, cellSize)
                }
                if (this.hintPadAt(x, y, BOARD_SIDE.BOTTOM)) {
                    ctx.fillRect(pxRowHintWidth + x * cellSize, pxColHintHeight + pxBoardHeight + y * cellSize, cellSize, cellSize)
                }

                ctx.fillStyle = this.game.columnHints.matching[x] ? colors.lightest : colors.ultraLight
                // cell text
                const topHint = this.game.columnHints.getHintXY(x, y, BOARD_SIDE.TOP)
                if (topHint) {
                    ctx.fillText(topHint,
                        pxRowHintWidth + x * cellSize + halfCellSize,
                        y * cellSize + halfCellSize)
                }
                const bottomHint = this.game.columnHints.getHintXY(x, y, BOARD_SIDE.BOTTOM)
                if (bottomHint) {
                    ctx.fillText(bottomHint,
                        pxRowHintWidth + x * cellSize + halfCellSize,
                        pxColHintHeight + pxBoardHeight + y * cellSize + halfCellSize)
                }
            }
        }

        // ROW HINTS

        ctx.fillStyle = this.isSetup() ? colors.mid : colors.semiDark
        // common left and right rectangle
        ctx.fillRect(0, pxColHintHeight, pxRowHintWidth, pxBoardHeight)
        ctx.fillRect(pxRowHintWidth + pxBoardWidth, pxColHintHeight, pxRowHintWidth, pxBoardHeight)

        // row hints: highlight and text

        for (let y = 0; y < maxBoardY; y++) {

            ctx.fillStyle = colors.light
            // highlight left hint row while solving
            if (this.solvingRowAt(y, BOARD_PART.HINT_LEFT)) {
                ctx.fillRect(0, pxColHintHeight + y * cellSize, pxRowHintWidth, cellSize)
            }
            // highlight right hint row while solving
            if (this.solvingRowAt(y, BOARD_PART.HINT_RIGHT)) {
                ctx.fillRect(pxRowHintWidth + pxBoardWidth, pxColHintHeight + y * cellSize, pxRowHintWidth, cellSize)
            }

            // add text and focus highlight for left and right hint cells in one common loop
            for (let x = 0; x < maxRowHintX; x++) {

                ctx.fillStyle = colors.light
                // focus highlights
                if (this.hintPadAt(x, y, BOARD_SIDE.LEFT)) {
                    ctx.fillRect(x * cellSize, pxColHintHeight + y * cellSize, cellSize, cellSize)
                }
                if (this.hintPadAt(x, y, BOARD_SIDE.RIGHT)) {
                    ctx.fillRect(pxRowHintWidth + pxBoardWidth + x * cellSize, pxColHintHeight + y * cellSize, cellSize, cellSize)
                }

                ctx.fillStyle = this.game.rowHints.matching[y] ? colors.lightest : colors.ultraLight
                // cell text
                const leftHint = this.game.rowHints.getHintXY(x, y, BOARD_SIDE.LEFT)
                if (leftHint) {
                    ctx.fillText(leftHint,
                        x * cellSize + halfCellSize,
                        pxColHintHeight + y * cellSize + halfCellSize)
                }
                const rightHint = this.game.rowHints.getHintXY(x, y, BOARD_SIDE.RIGHT)
                if (rightHint) {
                    ctx.fillText(rightHint,
                        pxRowHintWidth + pxBoardWidth + x * cellSize + halfCellSize,
                        pxColHintHeight + y * cellSize + halfCellSize)
                }
            }
        }

        // BOARD

        ctx.fillStyle = this.isSetup() ? colors.semiDark : colors.mid
        // common board rectangle
        ctx.fillRect(pxRowHintWidth, pxColHintHeight, pxBoardWidth, pxBoardHeight)

        // set on and off cells
        for (let y = 0; y < this.game.boardData.length; y++) {
            for (let x = 0; x < this.game.boardData[y].length; x++) {
                switch (this.game.boardData[y][x].value) {
                case BOARD_CELL.ON:
                    ctx.fillStyle = colors.light
                    break
                case BOARD_CELL.OFF:
                    ctx.fillStyle = colors.dark
                    break
                default:
                    continue
                }
                ctx.fillRect(pxRowHintWidth + x * cellSize, pxColHintHeight + y * cellSize, cellSize, cellSize)
            }
        }

        // GRID

        if (!this.isGameOver()) {
            ctx.strokeStyle = colors.dark

            // add horizontal lines for all hints and the board in one loop
            for (let y = 0; y < maxBoardY + maxColHintY * 2; y++) {
                ctx.beginPath()
                // set double line width to separate the hints and the board as well as for each 5th line on the board
                ctx.lineWidth =
                    y === maxColHintY ||
                    y === maxColHintY + maxBoardY ||
                    y > maxColHintY && y < maxColHintY + maxBoardY && (y - maxColHintY) % 5 === 0
                    ? 2 : 1
                ctx.moveTo(0, y * cellSize)
                ctx.lineTo(pxCanvasWidth, y * cellSize)
                ctx.stroke()
            }

            // add vertical lines for all hints and the board in one loop
            for (let x = 0; x < maxBoardX + maxRowHintX * 2; x++) {
                ctx.beginPath()
                // set double line width to separate the hints and the board as well as for each 5th line on the board
                ctx.lineWidth =
                    x === maxRowHintX ||
                    x === maxRowHintX + maxBoardX ||
                    x > maxRowHintX && x < maxRowHintX + maxBoardX && (x - maxRowHintX) % 5 === 0
                    ? 2 : 1
                ctx.moveTo(x * cellSize, 0)
                ctx.lineTo(x * cellSize, pxCanvasHeight)
                ctx.stroke()
            }
        }
    }


    private getBoardPos(input: HammerInput) {

        const rect = input.target.getBoundingClientRect()        
        const scaleX = rect.width / input.target.clientWidth
        const scaleY = rect.height / input.target.clientHeight
        const offsetX = (input.center.x - rect.left) / scaleX
        const offsetY = (input.center.y - rect.top) / scaleY

        const maxBoardX = this.game.boardData[0].length
        const maxBoardY = this.game.boardData.length
        const maxColHintY = this.game.columnHints.getMaxIndexInLine()
        const maxRowHintX = this.game.rowHints.getMaxIndexInLine()

        const x = Math.trunc(offsetX / cellSize)
        const y = Math.trunc(offsetY / cellSize)

        if (y < maxColHintY) {
            // top hints
            if (x >= maxRowHintX && x < maxRowHintX + maxBoardX) {
                return { 
                    x: x - maxRowHintX, 
                    y: y, 
                    kind: BOARD_PART.HINT_TOP 
                }
            }
        } else if (y < maxColHintY + maxBoardY) {
            // left hints or board data or right hints
            if (x < maxRowHintX) {
                return { 
                    x: x, 
                    y: y - maxColHintY, 
                    kind: BOARD_PART.HINT_LEFT 
                }
            } else if (x < maxRowHintX + maxBoardX) {
                return { 
                    x: x - maxRowHintX, 
                    y: y - maxColHintY, 
                    kind: BOARD_PART.DATA 
                }
            } else {
                return { 
                    x: x - maxRowHintX - maxBoardX, 
                    y: y - maxColHintY, 
                    kind: BOARD_PART.HINT_RIGHT 
                }
            }
        } else {
            // bottom hints
            if (x >= maxRowHintX && x < maxRowHintX + maxBoardX) {
                return { 
                    x: x - maxRowHintX, 
                    y: y - maxColHintY - maxBoardY, 
                    kind: BOARD_PART.HINT_BOTTOM 
                }
            }
        }
        // outside of tappable area
        return null
    }


    private handleTap(input: HammerInput) {
        //console.log(`[tap event]`)

        const boardPos = this.getBoardPos(input)

        if (boardPos) {
            input.preventDefault()
            if (this.isGame()) {
                // handle tap in game mode
                switch (boardPos.kind) {
                    case BOARD_PART.HINT_TOP:
                    case BOARD_PART.HINT_BOTTOM:
                        this.solveCol(boardPos.x, boardPos.kind)
                        break
                    case BOARD_PART.HINT_LEFT:
                    case BOARD_PART.HINT_RIGHT:
                        this.solveRow(boardPos.y, boardPos.kind)
                        break
                    case BOARD_PART.DATA:
                        this.toggleCell(boardPos.x, boardPos.y)
                        break
                }
            } else if (this.isSetup()) {
                // handle tap in setup mode
                switch (boardPos.kind) {
                    case BOARD_PART.HINT_TOP:
                        this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.TOP, this.game.columnHints)
                        break
                    case BOARD_PART.HINT_BOTTOM:
                        this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.BOTTOM, this.game.columnHints)
                        break
                    case BOARD_PART.HINT_LEFT:
                        this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.LEFT, this.game.rowHints)
                        break
                    case BOARD_PART.HINT_RIGHT:
                        this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.RIGHT, this.game.rowHints)
                        break
                }
            }
        }
    }


    private enableScroll(enable: boolean) {
        if (this.scrollingElement) {
            this.scrollingElement.style.overflow = enable ?  'scroll' : 'hidden'
        }
    }


    private handlePress(input: HammerInput) {
        //console.log(`[press event]`)

        const boardPos = this.getBoardPos(input)
        const singleTouch = !(input.srcEvent instanceof TouchEvent) || input.srcEvent.touches.length === 1

        if (this.isGame() && singleTouch && boardPos && boardPos.kind === BOARD_PART.DATA) {
            // console.log(`(start panning)`)
            this.panData = {
                start: boardPos,
                current: boardPos,
                value: this.toggledCellValue(this.game.boardData[boardPos.y][boardPos.x].value),
                orientation: null // will be determined later
            }
            this.enableScroll(false)
        } else {
            this.panData = null
        }
    }


    private handlePanMove(input: HammerInput) {
        //console.log(`[pan move event]`)

        const boardPos = this.getBoardPos(input)

        if (this.panData && this.isGame() && boardPos && boardPos.kind === BOARD_PART.DATA) {
            // console.log(`(panning)`)

            let firstPan = false

            // determine the panning orientation
            if (!this.panData.orientation) {
                if (boardPos.x !== this.panData.start.x) {
                    this.panData.orientation = 'X'
                    firstPan = true
                } else if (boardPos.y !== this.panData.start.y) {
                    this.panData.orientation = 'Y'
                    firstPan = true
                }
            }

            // set all cells based on the 1st one according to the panning orientation
            if (this.panData.orientation === 'X' && boardPos.x !== this.panData.current.x) {
                // horizontal orientation - resetting y-coordinate
                boardPos.y = this.panData.start.y
                this.panData.current = boardPos
                if (!firstPan) {
                    this.game.undoStack.undo()
                }
                if (boardPos.x !== this.panData.start.x) {
                    this.setCellsAtoB(boardPos, this.panData.start, this.panData.value)
                } else {
                    this.panData.orientation = null
                }
            }
            else if (this.panData.orientation === 'Y' && boardPos.y !== this.panData.current.y) {
                // vertical orientation - resetting x-coordinate
                boardPos.x = this.panData.start.x
                this.panData.current = boardPos
                if (!firstPan) {
                    this.game.undoStack.undo()
                }
                if (boardPos.y !== this.panData.start.y) {
                    this.setCellsAtoB(boardPos, this.panData.start, this.panData.value)
                } else {
                    this.panData.orientation = null
                }
            }
        }
    }


    private handlePanEnd(input: HammerInput) {
        //console.log(`[pan end event]`)
        if (this.panData) {
            this.panData = null
            this.enableScroll(true)
        }
    }


    private isSetup(): boolean {
        return (this.game.boardStatus === GAME_STATUS.SETUP)
    }


    private isGame(): boolean {
        return (this.game.boardStatus === GAME_STATUS.GAME)
    }


    public isGameOver() {
        return (this.game.boardStatus === GAME_STATUS.OVER)
    }


    private toggleCell(x: number, y: number) {
        const value = this.game.boardData[y][x].value
        this.game.setBoardXY(x, y, this.toggledCellValue(value))
        this.checkGameStatus()
        this.paint()
    }


    private toggledCellValue(value: BOARD_CELL): BOARD_CELL {
        return (value === BOARD_CELL.ON)
            ? BOARD_CELL.OFF
            : (value === BOARD_CELL.OFF)
                ? BOARD_CELL.NIL
                : BOARD_CELL.ON
    }


    private setCellsAtoB(A: Point, B: Point, value: BOARD_CELL) {
        const dx = Math.sign(B.x - A.x)
        const dy = Math.sign(B.y - A.y)
        if (dx !== 0 || dy !== 0) {
            this.game.undoStack.startBlock()
            for (let x = A.x, y = A.y; (dx === 0 || x !== B.x + dx) && (dy === 0 || y !== B.y + dy); x += dx, y += dy) {
                this.game.setBoardXY(x, y, value)
            }
            this.game.undoStack.endBlock()
            this.checkGameStatus()
            this.paint()
        }
    }


    private checkGameStatus() {
        if (this.game.boardStatus === GAME_STATUS.OVER) {
            this.game.finishBoard()
            this.paint()
            this.statusChangeEmitter.emit(this.game.boardStatus)
        }
        this.game.saveBoard()
    }


    private solveCol(x: number, kind: string) {
        if (!this.solvePos) {
            this.solvePos = { x: x, kind: kind }
            this.paint()
            setTimeout(() => {
                this.game.solveColumn(x)
                this.checkGameStatus()
                this.solvePos = null
                this.paint()
            }, 25)
        }
    }


    private solveRow(y: number, kind: string) {
        if (!this.solvePos) {
            this.solvePos = { y: y, kind: kind }
            this.paint()
            setTimeout(() => {
                this.game.solveRow(y)
                this.checkGameStatus()
                this.solvePos = null
                this.paint()
            }, 25)
        }
    }


    private editHint(x: number, y: number, side: BoardSide, hints: IHints) {

        this.hintPos = { x: x, y: y, side: side }
        this.paint()

        const modal = this.modalCtrl.create(HintPadPage, {
            pos: this.hintPos,
            posChanged: () => this.paint(),
            hints: hints
        }, { 
            enableBackdropDismiss: false 
        })
        modal.onDidDismiss(() => {
            this.hintPos = null
            this.paint()
        })
        modal.present({ animate: false })
    }


    private hintPadAt(x: number, y: number, side: BoardSide): boolean {
        return this.hintPos ? this.hintPos.x === x && this.hintPos.y === y && this.hintPos.side === side : false
    }


    private solvingColAt(x: number, kind: string): boolean {
        return this.solvePos ? this.solvePos.kind === kind && this.solvePos.x === x : false
    }


    private solvingRowAt(y: number, kind: string): boolean {
        return this.solvePos ? this.solvePos.kind === kind && this.solvePos.y === y : false
    }


    public undo() {
        this.game.undoStack.undo()
        this.paint()
    }


    public redo() {
        this.game.undoStack.redo()
        this.paint()
    }

    public clear() {
        this.game.resetBoard()
        this.paint()
    }
}
