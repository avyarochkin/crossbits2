import { Component, ElementRef, OnInit, ViewChild, Output, EventEmitter, OnDestroy } from '@angular/core'
import {
    Gesture, GestureController, GestureDetail, ModalController, PickerColumnOption, PickerController
} from '@ionic/angular'

import {
    BOARD_SIDE, BOARD_CELL, BOARD_PART, GAME_STATUS, BoardSide, Point, CELL_SIZE, CELLS_IN_GROUP
} from 'src/providers/game/game.interface'
import { Hints } from 'src/providers/game/hints'
import { GameProvider } from 'src/providers/game/game'

type ColorName = 'dark' | 'semiDark' | 'medium' | 'light' | 'ultraLight' | 'lightest'
type ColorMap = Record<ColorName, string>

const SOLVE_DELAY_MSEC = 25
const PRESS_TIME_MSEC = 500

interface PanData {
    orientation?: 'X'|'Y'
    start: Point
    current: Point
    value: BOARD_CELL
}

interface SolvePos {
    x?: number
    y?: number
    kind: string
}

interface HintPoint {
    x: number
    y: number
    side: BoardSide
}

@Component({
    selector: 'board-canvas',
    template: '<canvas #canvas></canvas>',
    styles: [`
        :host {
            display: block;
        }
    `]
})
export class BoardCanvasComponent implements OnInit, OnDestroy {

    @Output('statusChange') statusChangeEmitter = new EventEmitter<GAME_STATUS>()
    @ViewChild('canvas', { static: true }) canvasRef: ElementRef<HTMLCanvasElement>

    solvePos: SolvePos | null
    hintPos: HintPoint | null
    private gesture: Gesture
    private panData: PanData | null
    private scrollingElement: HTMLElement
    private timeout: NodeJS.Timeout | null
    private colors: ColorMap

    constructor(
        public gestureCtrl: GestureController,
        public pickerCtrl: PickerController,
        public game: GameProvider,
        public modalCtrl: ModalController
    ) { }


    ngOnInit() {
        this.scrollingElement = this.canvasRef.nativeElement
        this.colors = this.createColors()
        console.log(this.colors)
        this.gesture = this.gestureCtrl.create({
            el: this.canvasRef.nativeElement,
            gestureName: 'toggle-cells',
            threshold: 0,
            onStart: (detail) => this.handleTouchStart(detail),
            onMove: (detail) => this.handlePanMove(detail),
            onEnd: (detail) => this.handleTouchEnd(detail)
        })
        this.gesture.enable(true)
        this.enableScroll(true)
        this.paint()
    }

    ngOnDestroy() {
        this.gesture.destroy()
    }


    private setViewPort(ctx: CanvasRenderingContext2D, realWidth: number, realHeight: number) {
        // eslint-disable-next-line dot-notation
        const backingStoreRatio = (ctx['webkitBackingStorePixelRatio'] as number)
            // eslint-disable-next-line dot-notation
            || (ctx['backingStorePixelRatio'] as number)
            || 1
        const pxRatio = window.devicePixelRatio / backingStoreRatio
        // console.log(`pixel ratio: ${pxRatio}`)
        const el = this.canvasRef.nativeElement
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

        const halfCellSize = CELL_SIZE / 2

        const maxBoardX = this.game.boardData[0]?.length
        const maxBoardY = this.game.boardData.length
        const maxColHintY = this.game.columnHints.getMaxIndexInLine()
        const maxRowHintX = this.game.rowHints.getMaxIndexInLine()

        const pxRowHintWidth = maxRowHintX * CELL_SIZE
        const pxColHintHeight = maxColHintY * CELL_SIZE
        const pxBoardWidth = maxBoardX * CELL_SIZE
        const pxBoardHeight = maxBoardY * CELL_SIZE
        const pxCanvasWidth = pxRowHintWidth * 2 + pxBoardWidth
        const pxCanvasHeight = pxColHintHeight * 2 + pxBoardHeight

        this.setViewPort(ctx, pxCanvasWidth, pxCanvasHeight)

        ctx.font = '15px sans-serif'
        // align hint text in the center of its cell
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // COLUMN HINTS

        ctx.fillStyle = this.isSetup() ? this.colors.medium : this.colors.semiDark
        // common top and bottom rectangle
        ctx.fillRect(
            pxRowHintWidth,
            0,
            pxBoardWidth,
            pxColHintHeight
        )
        ctx.fillRect(
            pxRowHintWidth,
            pxColHintHeight + pxBoardHeight,
            pxBoardWidth,
            pxColHintHeight
        )

        // column hints: highlight and text

        for (let x = 0; x < maxBoardX; x++) {

            ctx.fillStyle = this.colors.light
            // highlight top hint column while solving
            if (this.solvingColAt(x, BOARD_PART.HINT_TOP)) {
                ctx.fillRect(
                    pxRowHintWidth + x * CELL_SIZE,
                    0,
                    CELL_SIZE,
                    pxColHintHeight
                )
            }
            // highlight bottom hint column while solving
            if (this.solvingColAt(x, BOARD_PART.HINT_BOTTOM)) {
                ctx.fillRect(
                    pxRowHintWidth + x * CELL_SIZE,
                    pxColHintHeight + pxBoardHeight,
                    CELL_SIZE,
                    pxColHintHeight
                )
            }

            // add text and focus highlight for top and bottom hint cells in one common loop
            for (let y = 0; y < maxColHintY; y++) {

                ctx.fillStyle = this.colors.light
                // focus highlights
                if (this.hintPadAt(x, y, BOARD_SIDE.TOP)) {
                    ctx.fillRect(
                        pxRowHintWidth + x * CELL_SIZE,
                        y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    )
                }
                if (this.hintPadAt(x, y, BOARD_SIDE.BOTTOM)) {
                    ctx.fillRect(
                        pxRowHintWidth + x * CELL_SIZE,
                        pxColHintHeight + pxBoardHeight + y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    )
                }

                ctx.fillStyle = this.game.columnHints.matching[x] ? this.colors.lightest : this.colors.ultraLight
                // cell text
                const topHint = this.game.columnHints.getHintXY(x, y, BOARD_SIDE.TOP)
                if (topHint) {
                    ctx.fillText(
                        topHint,
                        pxRowHintWidth + x * CELL_SIZE + halfCellSize,
                        y * CELL_SIZE + halfCellSize
                    )
                }
                const bottomHint = this.game.columnHints.getHintXY(x, y, BOARD_SIDE.BOTTOM)
                if (bottomHint) {
                    ctx.fillText(
                        bottomHint,
                        pxRowHintWidth + x * CELL_SIZE + halfCellSize,
                        pxColHintHeight + pxBoardHeight + y * CELL_SIZE + halfCellSize
                    )
                }
            }
        }

        // ROW HINTS

        ctx.fillStyle = this.isSetup() ? this.colors.medium : this.colors.semiDark
        // common left and right rectangle
        ctx.fillRect(
            0,
            pxColHintHeight,
            pxRowHintWidth,
            pxBoardHeight
        )
        ctx.fillRect(
            pxRowHintWidth + pxBoardWidth,
            pxColHintHeight,
            pxRowHintWidth,
            pxBoardHeight
        )

        // row hints: highlight and text

        for (let y = 0; y < maxBoardY; y++) {

            ctx.fillStyle = this.colors.light
            // highlight left hint row while solving
            if (this.solvingRowAt(y, BOARD_PART.HINT_LEFT)) {
                ctx.fillRect(
                    0,
                    pxColHintHeight + y * CELL_SIZE,
                    pxRowHintWidth,
                    CELL_SIZE
                )
            }
            // highlight right hint row while solving
            if (this.solvingRowAt(y, BOARD_PART.HINT_RIGHT)) {
                ctx.fillRect(
                    pxRowHintWidth + pxBoardWidth,
                    pxColHintHeight + y * CELL_SIZE,
                    pxRowHintWidth,
                    CELL_SIZE
                )
            }

            // add text and focus highlight for left and right hint cells in one common loop
            for (let x = 0; x < maxRowHintX; x++) {

                ctx.fillStyle = this.colors.light
                // focus highlights
                if (this.hintPadAt(x, y, BOARD_SIDE.LEFT)) {
                    ctx.fillRect(
                        x * CELL_SIZE,
                        pxColHintHeight + y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    )
                }
                if (this.hintPadAt(x, y, BOARD_SIDE.RIGHT)) {
                    ctx.fillRect(
                        pxRowHintWidth + pxBoardWidth + x * CELL_SIZE,
                        pxColHintHeight + y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    )
                }

                ctx.fillStyle = this.game.rowHints.matching[y] ? this.colors.lightest : this.colors.ultraLight
                // cell text
                const leftHint = this.game.rowHints.getHintXY(x, y, BOARD_SIDE.LEFT)
                if (leftHint) {
                    ctx.fillText(
                        leftHint,
                        x * CELL_SIZE + halfCellSize,
                        pxColHintHeight + y * CELL_SIZE + halfCellSize
                    )
                }
                const rightHint = this.game.rowHints.getHintXY(x, y, BOARD_SIDE.RIGHT)
                if (rightHint) {
                    ctx.fillText(
                        rightHint,
                        pxRowHintWidth + pxBoardWidth + x * CELL_SIZE + halfCellSize,
                        pxColHintHeight + y * CELL_SIZE + halfCellSize
                    )
                }
            }
        }

        // BOARD

        ctx.fillStyle = this.isSetup() ? this.colors.semiDark : this.colors.medium
        // common board rectangle
        ctx.fillRect(
            pxRowHintWidth,
            pxColHintHeight,
            pxBoardWidth,
            pxBoardHeight
        )

        // set on and off cells
        for (let y = 0; y < this.game.boardData.length; y++) {
            for (let x = 0; x < this.game.boardData[y].length; x++) {
                switch (this.game.boardData[y][x].value) {
                    case BOARD_CELL.ON:
                        ctx.fillStyle = this.colors.light
                        break
                    case BOARD_CELL.OFF:
                        ctx.fillStyle = this.colors.dark
                        break
                    default:
                        continue
                }
                ctx.fillRect(
                    pxRowHintWidth + x * CELL_SIZE,
                    pxColHintHeight + y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                )
            }
        }

        // GRID

        if (!this.isGameOver()) {
            ctx.strokeStyle = this.colors.dark

            // add horizontal lines for all hints and the board in one loop
            for (let y = 0; y < maxBoardY + maxColHintY * 2; y++) {
                ctx.beginPath()
                // set double line width to separate the hints and the board as well as for each 5th line on the board
                ctx.lineWidth =
                    y === maxColHintY ||
                    y === maxColHintY + maxBoardY ||
                    y > maxColHintY && y < maxColHintY + maxBoardY && (y - maxColHintY) % CELLS_IN_GROUP === 0
                        ? 2 : 1
                ctx.moveTo(0, y * CELL_SIZE)
                ctx.lineTo(pxCanvasWidth, y * CELL_SIZE)
                ctx.stroke()
            }

            // add vertical lines for all hints and the board in one loop
            for (let x = 0; x < maxBoardX + maxRowHintX * 2; x++) {
                ctx.beginPath()
                // set double line width to separate the hints and the board as well as for each 5th line on the board
                ctx.lineWidth =
                    x === maxRowHintX ||
                    x === maxRowHintX + maxBoardX ||
                    x > maxRowHintX && x < maxRowHintX + maxBoardX && (x - maxRowHintX) % CELLS_IN_GROUP === 0
                        ? 2 : 1
                ctx.moveTo(x * CELL_SIZE, 0)
                ctx.lineTo(x * CELL_SIZE, pxCanvasHeight)
                ctx.stroke()
            }
        }
    }

    private getBoardPos(detail: GestureDetail) {
        const target = this.canvasRef.nativeElement
        const rect = target.getBoundingClientRect()
        const scaleX = rect.width / target.clientWidth
        const scaleY = rect.height / target.clientHeight
        const offsetX = (detail.currentX - rect.left) / scaleX
        const offsetY = (detail.currentY - rect.top) / scaleY

        const maxBoardX = this.game.boardData[0].length
        const maxBoardY = this.game.boardData.length
        const maxColHintY = this.game.columnHints.getMaxIndexInLine()
        const maxRowHintX = this.game.rowHints.getMaxIndexInLine()

        const x = Math.trunc(offsetX / CELL_SIZE)
        const y = Math.trunc(offsetY / CELL_SIZE)

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
        } else if (x >= maxRowHintX && x < maxRowHintX + maxBoardX) {
            // bottom hints
            return {
                x: x - maxRowHintX,
                y: y - maxColHintY - maxBoardY,
                kind: BOARD_PART.HINT_BOTTOM
            }
        }
        // outside of tappable area
        return null
    }

    private handleTouchStart(detail: GestureDetail) {
        this.timeout = setTimeout(() => {
            this.handlePress(detail)
            this.timeout = null
        }, PRESS_TIME_MSEC)
    }

    private handleTouchEnd(detail: GestureDetail) {
        if (this.timeout != null) {
            clearTimeout(this.timeout)
            this.timeout = null
            this.handleTap(detail)
        }
        this.handlePanEnd()
    }

    private handleTap(detail: GestureDetail) {
        console.log('[tap event]')

        const boardPos = this.getBoardPos(detail)

        if (boardPos) {
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
                    default:
                }
            } else if (this.isSetup()) {
                // handle tap in setup mode
                switch (boardPos.kind) {
                    case BOARD_PART.HINT_TOP:
                        void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.TOP, this.game.columnHints)
                        break
                    case BOARD_PART.HINT_BOTTOM:
                        void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.BOTTOM, this.game.columnHints)
                        break
                    case BOARD_PART.HINT_LEFT:
                        void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.LEFT, this.game.rowHints)
                        break
                    case BOARD_PART.HINT_RIGHT:
                        void this.editHint(boardPos.x, boardPos.y, BOARD_SIDE.RIGHT, this.game.rowHints)
                        break
                    default:
                }
            }
        }
    }

    private enableScroll(enable: boolean) {
        if (this.scrollingElement != null) {
            this.scrollingElement.style.overflow = enable ?  'scroll' : 'hidden'
        }
    }

    private handlePress(detail: GestureDetail) {
        console.log('[press event]')

        const boardPos = this.getBoardPos(detail)
        const singleTouch = !(detail.event instanceof TouchEvent) || detail.event.touches.length === 1

        if (this.isGame() && singleTouch && boardPos && boardPos.kind === BOARD_PART.DATA) {
            console.log('(start panning)')
            this.panData = {
                start: boardPos,
                current: boardPos,
                value: this.toggledCellValue(this.game.boardData[boardPos.y][boardPos.x].value),
                orientation: undefined // will be determined later
            }
            this.enableScroll(false)
        } else {
            this.panData = null
        }
    }

    private handlePanMove(detail: GestureDetail) {
        const boardPos = this.getBoardPos(detail)

        if (this.panData && this.isGame() && boardPos && boardPos.kind === BOARD_PART.DATA) {
            console.log('(panning)')

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
                    this.panData.orientation = undefined
                }
            } else if (this.panData.orientation === 'Y' && boardPos.y !== this.panData.current.y) {
                // vertical orientation - resetting x-coordinate
                boardPos.x = this.panData.start.x
                this.panData.current = boardPos
                if (!firstPan) {
                    this.game.undoStack.undo()
                }
                if (boardPos.y !== this.panData.start.y) {
                    this.setCellsAtoB(boardPos, this.panData.start, this.panData.value)
                } else {
                    this.panData.orientation = undefined
                }
            }
        }
    }

    private handlePanEnd() {
        console.log('(pan end event)')
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


    isGameOver() {
        return (this.game.boardStatus === GAME_STATUS.OVER)
    }

    private toggleCell(x: number, y: number) {
        const { value } = this.game.boardData[y][x]
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

    private setCellsAtoB(pointA: Point, pointB: Point, value: BOARD_CELL) {
        const dx = Math.sign(pointB.x - pointA.x)
        const dy = Math.sign(pointB.y - pointA.y)
        if (dx !== 0 || dy !== 0) {
            this.game.undoStack.startBlock()
            for (
                let x = pointA.x, y = pointA.y;
                (dx === 0 || x !== pointB.x + dx) && (dy === 0 || y !== pointB.y + dy);
                x += dx, y += dy
            ) {
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
            }, SOLVE_DELAY_MSEC)
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
            }, SOLVE_DELAY_MSEC)
        }
    }

    private async editHint(x: number, y: number, side: BoardSide, hints: Hints) {
        this.hintPos = { x: x, y: y, side: side }
        this.paint()

        const hint = hints.getHintXY(x, y, side)
        const selectedIndex = (hint) ? parseInt(hint, 10) : 0

        const picker = await this.pickerCtrl.create({
            columns: [{
                name: 'valueColumn',
                selectedIndex,
                options: Array.from(
                    { length: hints.getBoardLength() + 1 },
                    (el, index) => ({
                        text: index.toString(),
                        value: index
                    })
                )
            }],
            buttons: [
                { role: 'cancel', text: 'CANCEL' },
                { role: 'apply', text: 'OK' }
            ]
        })
        void picker.onDidDismiss<{ valueColumn: PickerColumnOption }>().then(detail => {
            if (detail.role === 'apply') {
                const value = detail.data!.valueColumn.value as number
                hints.setHintXY(x, y, side, value > 0 ? value.toString() : null)

                this.hintPos = null
                this.paint()
            }
        })
        await picker.present()
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

    private createColors(): ColorMap {
        const colorMap: ColorMap = {
            dark: 'dark',
            semiDark: 'semi-dark',
            medium: 'medium',
            light: 'light',
            ultraLight: 'ultra-light',
            lightest: 'lightest'
        }
        Object.entries(colorMap).forEach(([color, cssSuffix]) => {
            colorMap[color] = getComputedStyle(document.body).getPropertyValue(`--ion-color-${cssSuffix}`)
        })
        return colorMap
    }

    undo() {
        this.game.undoStack.undo()
        this.paint()
    }

    redo() {
        this.game.undoStack.redo()
        this.paint()
    }

    clear() {
        this.game.resetBoard()
        this.paint()
    }
}
