import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, Renderer2, ViewChild } from '@angular/core'
import { debounceTime, filter, fromEvent, Subject, takeUntil, tap } from 'rxjs'

import { GameProvider } from 'src/providers/game/game'
import {
    BOARD_CELL, BOARD_PART, BOARD_SIDE, BoardSide, CELLS_IN_GROUP, CELL_SIZE, GAME_STATUS
} from 'src/providers/game/game.interface'
import { HintPoint } from 'src/providers/game/hints.interface'

const PRESS_TIME_MSEC = 500

type ColorName = 'dark' | 'semiDark' | 'medium' | 'light' | 'ultraLight' | 'lightest'
type ColorMap = Record<ColorName, string>

interface SolvePos {
    x?: number
    y?: number
    kind: string
}

/** Interface event object emitted by `scrollChange` */
export interface IScrollChangeEvent {
    enable?: boolean
}

@Component({
    template: ''
})
export abstract class BoardCanvasComponent implements OnInit, OnDestroy {

    @Output() readonly statusChange = new EventEmitter<GAME_STATUS>()
    /** Emits when scrolling capability should change */
    @Output() readonly scrollChange = new EventEmitter<IScrollChangeEvent>()
    @ViewChild('canvas', { static: true }) canvasRef: ElementRef<HTMLCanvasElement>

    solvePos: SolvePos | null
    hintPos: HintPoint | null
    private readonly colors: ColorMap
    private readonly ngUnsubscribe = new Subject<void>()

    constructor(
        protected readonly renderer: Renderer2,
        protected readonly game: GameProvider
    ) {
        this.colors = this.createColors()
    }

    ngOnInit() {
        this.setupTouchEvents()
        this.scrollChange.emit({ enable: true })
        this.paint()
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next()
        this.ngUnsubscribe.complete()
    }

    isGame(): boolean {
        return (this.game.boardStatus === GAME_STATUS.GAME)
    }

    isSetup(): boolean {
        return (this.game.boardStatus === GAME_STATUS.SETUP)
    }

    isGameOver() {
        return (this.game.boardStatus === GAME_STATUS.OVER)
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

    update() {
        this.paint()
    }

    checkGameStatus(emit = true) {
        if (this.game.boardStatus === GAME_STATUS.OVER) {
            this.game.finishBoard()
            this.paint()
            if (emit) {
                this.statusChange.emit(this.game.boardStatus)
            }
        }
        this.game.saveBoard()
    }

    protected getBoardPos(event: TouchEvent) {
        const target = this.canvasRef.nativeElement
        const touch = event.changedTouches[0]
        const rect = target.getBoundingClientRect()
        const scaleX = rect.width / target.clientWidth
        const scaleY = rect.height / target.clientHeight
        const offsetX = (touch.clientX - rect.left) / scaleX
        const offsetY = (touch.clientY - rect.top) / scaleY

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

    protected paint() {
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

        ctx.fillStyle = this.isSetup() ? this.colors.light : this.colors.semiDark
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

                ctx.fillStyle = this.colors.lightest
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

                ctx.fillStyle = this.isSetup()
                    ? this.colors.dark
                    : this.game.columnHints.matching[x] ? this.colors.lightest : this.colors.ultraLight
                // cell text
                const topHint = this.game.columnHints.getHintAt({ x, y, side: BOARD_SIDE.TOP })
                if (topHint) {
                    ctx.fillText(
                        topHint,
                        pxRowHintWidth + x * CELL_SIZE + halfCellSize,
                        y * CELL_SIZE + halfCellSize
                    )
                }
                const bottomHint = this.game.columnHints.getHintAt({ x, y, side: BOARD_SIDE.BOTTOM })
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

        ctx.fillStyle = this.isSetup() ? this.colors.light : this.colors.semiDark
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

                ctx.fillStyle = this.colors.lightest
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

                ctx.fillStyle = this.isSetup()
                    ? this.colors.dark
                    : this.game.columnHints.matching[x] ? this.colors.lightest : this.colors.ultraLight
                // cell text
                const leftHint = this.game.rowHints.getHintAt({ x, y, side: BOARD_SIDE.LEFT })
                if (leftHint) {
                    ctx.fillText(
                        leftHint,
                        x * CELL_SIZE + halfCellSize,
                        pxColHintHeight + y * CELL_SIZE + halfCellSize
                    )
                }
                const rightHint = this.game.rowHints.getHintAt({ x, y, side: BOARD_SIDE.RIGHT })
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
                        ctx.fillStyle = this.colors.ultraLight
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

    protected setViewPort(ctx: CanvasRenderingContext2D, realWidth: number, realHeight: number) {
        // eslint-disable-next-line dot-notation
        const backingStoreRatio = (ctx['webkitBackingStorePixelRatio'] as number)
            // eslint-disable-next-line dot-notation
            || (ctx['backingStorePixelRatio'] as number)
            || 1
        const pxRatio = window.devicePixelRatio / backingStoreRatio
        // console.log(`pixel ratio: ${pxRatio}`)
        const canvasEl = this.canvasRef.nativeElement
        canvasEl.width = Math.round(realWidth * pxRatio)
        canvasEl.height = Math.round(realHeight * pxRatio)

        if (pxRatio !== 1) {
            ctx.imageSmoothingEnabled = false
            this.renderer.setStyle(canvasEl, 'width', `${realWidth}px`)
            this.renderer.setStyle(canvasEl, 'height', `${realHeight}px`)
            ctx.scale(pxRatio, pxRatio)
        }
    }

    private solvingColAt(x: number, kind: string): boolean {
        return this.solvePos ? this.solvePos.kind === kind && this.solvePos.x === x : false
    }

    private solvingRowAt(y: number, kind: string): boolean {
        return this.solvePos ? this.solvePos.kind === kind && this.solvePos.y === y : false
    }

    private hintPadAt(x: number, y: number, side: BoardSide): boolean {
        return this.hintPos ? this.hintPos.x === x && this.hintPos.y === y && this.hintPos.side === side : false
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

    protected setupTouchEvents() {
        const canvasEl = this.canvasRef.nativeElement
        // indicates that user touched and not moved / released finger
        let tapping = false

        fromEvent<TouchEvent>(canvasEl, 'touchstart')
            .pipe(
                tap(() => tapping = true),
                debounceTime(PRESS_TIME_MSEC),
                filter(() => tapping),
                takeUntil(this.ngUnsubscribe)
            )
            .subscribe(event => {
                tapping = false
                this.handleLongPress(event)
            })

        fromEvent<TouchEvent>(canvasEl, 'touchmove')
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(event => {
                tapping = false
                this.handlePanMove(event)
            })

        fromEvent<TouchEvent>(canvasEl, 'touchend')
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(event => {
                if (tapping) {
                    this.handleTap(event)
                    tapping = false
                }
                this.handlePanEnd()
            })
    }

    protected abstract handleTap(event: TouchEvent): void
    protected abstract handleLongPress(event: TouchEvent): void
    protected abstract handlePanMove(event: TouchEvent): void
    protected abstract handlePanEnd(): void
}
