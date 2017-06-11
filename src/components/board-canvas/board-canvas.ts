import { Component, ElementRef, OnInit, ViewChild, SimpleChanges, OnChanges, Output, EventEmitter } from '@angular/core'
import { Gesture, ModalController, App } from 'ionic-angular'
import { DIRECTION_HORIZONTAL, DIRECTION_VERTICAL } from 'ionic-angular/gestures/hammer'

import { BOARD_SIDE, BOARD_CELL, BOARD_PART, GAME_STATUS, GameProvider, BoardSide, IHints, Point } from '../../providers/game/game'
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

type DragObj = {
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
    template: `<canvas #canvas></canvas>`
})
export class BoardCanvasComponent implements OnInit, OnChanges {

    @Output() statusChange = new EventEmitter<GAME_STATUS>()
    @ViewChild('canvas') canvas: ElementRef

    private gesture: Gesture
    public solvePos: SolvePos = null
    public hintPos: HintPoint = null
    private dragObj: DragObj = null

    constructor(
        public app: App,
        public game: GameProvider,
        public modalCtrl: ModalController) {}


    public ngOnInit(): void {
        this.gesture = new Gesture(this.canvas.nativeElement)
        this.gesture.listen()

        const mc = this.gesture['_hammer'] as HammerManager
        mc.get('press').set({ time: 151 })
        mc.get('pan').set({ direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL })
        // pan.recognizeWith(press)

        this.gesture.on('tap', input => this.handleTap(input))
        this.gesture.on('press', input => this.handlePress(input))
        this.gesture.on('panmove', input => this.handlePanMove(input))
        this.gesture.on('panend', input => this.handlePanEnd(input))

        this.paint()
    }

    //Called before any other life-cycle hook. Use it to inject dependencies, but avoid any serious work here.
    public ngOnChanges(changes: SimpleChanges) {
        console.log(`OnChanges: ${changes}`)
    }


    private setViewPort(ctx: CanvasRenderingContext2D, realWidth: number, realHeight: number) {

        const backingStoreRatio = ctx['webkitBackingStorePixelRatio'] || ctx['backingStorePixelRatio'] || 1
        const pxRatio = window.devicePixelRatio / backingStoreRatio
        // console.log(`pixel ratio: ${pxRatio}`)
        let el = this.canvas.nativeElement
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

        const ctx = this.canvas.nativeElement.getContext('2d') as CanvasRenderingContext2D

        const halfCellSize = cellSize / 2

        const maxBoardX = this.game.boardData[0].length
        const maxBoardY = this.game.boardData.length
        const maxColHintY = this.game.columnHints.getMaxY()
        const maxRowHintX = this.game.rowHints.getMaxX()

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

        ctx.fillStyle = colors.semiDark
        // common top and bottom rectangle
        ctx.fillRect(pxRowHintWidth, 0, pxBoardWidth, pxColHintHeight)
        ctx.fillRect(pxRowHintWidth, pxColHintHeight + pxBoardHeight, pxBoardWidth, pxColHintHeight)

        // column hints: highlight and text

        for (let x = 0; x < this.game.columnHints.col.length; x++) {

            ctx.fillStyle = colors.light
            // highlight top hint column while solving
            if (this.solvingColAt(x, BOARD_PART.HINT_TOP)) {
                ctx.fillRect(pxRowHintWidth + x * cellSize, 0, cellSize, pxColHintHeight)
            }
            // highlight bottom hint column while solving
            if (this.solvingColAt(x, BOARD_PART.HINT_BOTTOM)) {
                ctx.fillRect(pxRowHintWidth + x * cellSize, pxColHintHeight + pxBoardHeight, cellSize, pxColHintHeight)
            }

            ctx.fillStyle = this.game.columnHints.matching[x] ? colors.lightest : colors.ultraLight
            // add text for top and bottom hint in one common loop
            for (let y = 0; y < maxColHintY; y++) {

                const topHint = this.game.columnHints.getHint(x, y, BOARD_SIDE.TOP)
                if (topHint) {
                    ctx.fillText(topHint,
                        pxRowHintWidth + x * cellSize + halfCellSize,
                        y * cellSize + halfCellSize)
                }

                const bottomHint = this.game.columnHints.getHint(x, y, BOARD_SIDE.BOTTOM)
                if (bottomHint) {
                    ctx.fillText(bottomHint,
                        pxRowHintWidth + x * cellSize + halfCellSize,
                        pxColHintHeight + pxBoardHeight + y * cellSize + halfCellSize)
                }
            }
        }

        // ROW HINTS

        ctx.fillStyle = colors.semiDark
        // common left and right rectangle
        ctx.fillRect(0, pxColHintHeight, pxRowHintWidth, pxBoardHeight)
        ctx.fillRect(pxRowHintWidth + pxBoardWidth, pxColHintHeight, pxRowHintWidth, pxBoardHeight)

        // row hints: highlight and text

        for (let y = 0; y < this.game.rowHints.row.length; y++) {

            ctx.fillStyle = colors.light
            // highlight left hint row while solving
            if (this.solvingRowAt(y, BOARD_PART.HINT_LEFT)) {
                ctx.fillRect(0, pxColHintHeight + y * cellSize, pxRowHintWidth, cellSize)
            }
            // highlight right hint row while solving
            if (this.solvingRowAt(y, BOARD_PART.HINT_RIGHT)) {
                ctx.fillRect(pxRowHintWidth + pxBoardWidth, pxColHintHeight + y * cellSize, pxRowHintWidth, cellSize)
            }

            ctx.fillStyle = this.game.rowHints.matching[y] ? colors.lightest : colors.ultraLight
            // add text for left and right hint in one common loop
            for (let x = 0; x < maxRowHintX; x++) {

                const leftHint = this.game.rowHints.getHint(x, y, BOARD_SIDE.LEFT)
                if (leftHint) {
                    ctx.fillText(leftHint,
                        x * cellSize + halfCellSize,
                        pxColHintHeight + y * cellSize + halfCellSize)
                }

                const rightHint = this.game.rowHints.getHint(x, y, BOARD_SIDE.RIGHT)
                if (rightHint) {
                    ctx.fillText(rightHint,
                        pxRowHintWidth + pxBoardWidth + x * cellSize + halfCellSize,
                        pxColHintHeight + y * cellSize + halfCellSize)
                }
            }
        }

        // BOARD

        ctx.fillStyle = colors.mid
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


    private getBoardPos(input: HammerInput) {

        const rect = input.target.getBoundingClientRect()
        const offsetX = input.center.x - rect.left
        const offsetY = input.center.y - rect.top
        // console.log(`offsetXY: ${offsetX}:${offsetY}`);

        const maxBoardX = this.game.boardData[0].length
        const maxBoardY = this.game.boardData.length
        const maxColHintY = this.game.columnHints.getMaxY()
        const maxRowHintX = this.game.rowHints.getMaxX()

        const x = Math.trunc(offsetX / cellSize)
        const y = Math.trunc(offsetY / cellSize)

        if (y < maxColHintY) {
            if (x >= maxRowHintX && x < maxRowHintX + maxBoardX) {
                return { x: x - maxRowHintX, y: y, kind: BOARD_PART.HINT_TOP }
            }
        } else if (y < maxColHintY + maxBoardY) {
            if (x < maxRowHintX) {
                return { x: x, y: y - maxColHintY, kind: BOARD_PART.HINT_LEFT }
            } else if (x < maxRowHintX + maxBoardX) {
                return { x: x - maxRowHintX, y: y - maxColHintY, kind: BOARD_PART.DATA }
            } else {
                return { x: x - maxRowHintX - maxBoardX, y: y - maxColHintY, kind: BOARD_PART.HINT_RIGHT }
            }
        } else {
            if (x >= maxRowHintX && x < maxRowHintX + maxBoardX) {
                return { x: x - maxRowHintX, y: y - maxColHintY - maxBoardY, kind: BOARD_PART.HINT_BOTTOM }
            }
        }
        return null
    }


    private handleTap(input: HammerInput) {
        console.log(`[tap event]`)

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


    private disableScroll(input: HammerInput, disable: boolean) {
        const e = input.target.offsetParent as HTMLElement
        e.style.overflow = disable ? 'hidden' : 'scroll'
    }


    private handlePress(input: HammerInput) {
        console.log(`[press event]`)

        const boardPos = this.getBoardPos(input)

        if (this.isGame() && boardPos && boardPos.kind === BOARD_PART.DATA) {
            // console.log(`(start dragging)`)
            this.dragObj = {
                start: boardPos,
                current: boardPos,
                value: this.toggledCellValue(this.game.boardData[boardPos.y][boardPos.x].value),
                orientation: null
            }
            this.disableScroll(input, true)
        } else {
            this.dragObj = null
        }
    }


    private handlePanMove(input: HammerInput) {
        console.log(`[pan move event]`)

        const boardPos = this.getBoardPos(input)

        if (this.dragObj && this.isGame() && boardPos && boardPos.kind === BOARD_PART.DATA) {
            // console.log(`(dragging)`)

            let firstDrag = false

            // determine the dragging orientation
            if (!this.dragObj.orientation) {
                if (boardPos.x !== this.dragObj.start.x) {
                    this.dragObj.orientation = 'X'
                    firstDrag = true
                } else if (boardPos.y !== this.dragObj.start.y) {
                    this.dragObj.orientation = 'Y'
                    firstDrag = true
                }
            }

            // set all cells based on the 1st one according to the dragging orientation
            if (this.dragObj.orientation === 'X' && boardPos.x !== this.dragObj.current.x) {
                // horizontal orientation - resetting y-coordinate
                boardPos.y = this.dragObj.start.y
                this.dragObj.current = boardPos
                if (!firstDrag) {
                    this.game.undoData.undo()
                }
                if (boardPos.x !== this.dragObj.start.x) {
                    this.setCellsAtoB(boardPos, this.dragObj.start, this.dragObj.value)
                } else {
                    this.dragObj.orientation = null
                }
            }
            else if (this.dragObj.orientation === 'Y' && boardPos.y !== this.dragObj.current.y) {
                // vertical orientation - resetting x-coordinate
                boardPos.x = this.dragObj.start.x
                this.dragObj.current = boardPos
                if (!firstDrag) {
                    this.game.undoData.undo()
                }
                if (boardPos.y !== this.dragObj.start.y) {
                    this.setCellsAtoB(boardPos, this.dragObj.start, this.dragObj.value)
                } else {
                    this.dragObj.orientation = null
                }
            }
        }
    }


    public handlePanEnd(input: HammerInput) {
        console.log(`[pan end event]`)
        if (this.dragObj) {
            this.dragObj = null
            this.disableScroll(input, false)
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
            this.game.undoData.startBlock()
            for (let x = A.x, y = A.y; (dx === 0 || x !== B.x + dx) && (dy === 0 || y !== B.y + dy); x += dx, y += dy) {
                this.game.setBoardXY(x, y, value)
            }
            this.game.undoData.endBlock()
            this.checkGameStatus()
            this.paint()
        }
    }


    private checkGameStatus() {
        if (this.game.boardStatus === GAME_STATUS.OVER) {
            this.game.finishBoard()
            this.paint()
            this.statusChange.emit(this.game.boardStatus)
        }
    }


    private solveCol(x: number, kind: string) {
        if (!this.solvePos) {
            this.solvePos = { x: x, kind: kind }
            this.paint()
            setTimeout(() => {
                this.game.columnHints.solveCol(x)
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
                this.game.rowHints.solveRow(y)
                this.checkGameStatus()
                this.solvePos = null
                this.paint()
            }, 25)
        }
    }


    private editHint(x: number, y: number, side: BoardSide, hints: IHints) {

        this.hintPos = { x: x, y: y, side: side }

        const modal = this.modalCtrl.create(HintPadPage, {
            pos: this.hintPos,
            hints: hints
        })
        modal.onDidDismiss(() => { this.hintPos = null })
        modal.present({ animate: false })
    }


    public hintPadAt(x: number, y: number, side: BoardSide): boolean {
        return this.hintPos ? this.hintPos.x === x && this.hintPos.y === y && this.hintPos.side === side : false
    }


    public solvingColAt(x: number, kind: string): boolean {
        return this.solvePos ? this.solvePos.kind === kind && this.solvePos.x === x : false
    }


    public solvingRowAt(y: number, kind: string): boolean {
        return this.solvePos ? this.solvePos.kind === kind && this.solvePos.y === y : false
    }


    public undo() {
        this.game.undoData.undo()
        this.paint()
    }


    public redo() {
        this.game.undoData.redo()
        this.paint()
    }

    public clear() {
        this.game.resetBoard()
        this.paint()
    }
}
