import {
    Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, Renderer2, ViewChild
} from '@angular/core'
import { debounceTime, filter, fromEvent, Subject, takeUntil, tap } from 'rxjs'

import { GameProvider } from 'src/providers/game/game'
import {
    BOARD_CELL, BOARD_PART, BOARD_SIDE, BoardSide, CELLS_IN_GROUP, CELL_SIZE, CELL_X_PADDING, GAME_STATUS,
    HALF_CELL_SIZE, Point
} from 'src/providers/game/game.interface'
import { HintPoint } from 'src/providers/game/hints.interface'

const PRESS_TIME_MSEC = 500

export type ColorMode = 'light-dark' | 'light-crosses' | 'dark-light' | 'dark-crosses'
export type ColorName = 'dark' | 'semiDark' | 'medium' | 'light' | 'ultraLight' | 'lightest'
export type ColorMap = Record<ColorName, string>

interface SolvePos {
    x?: number
    y?: number
    kind: string
}

interface PaintOpts {
    pxRowHintWidth: number
    pxColHintHeight: number
    pxBoardWidth: number
    pxBoardHeight: number
    pxCanvasWidth: number
    pxCanvasHeight: number
    maxBoardX: number
    maxBoardY: number
    maxColHintY: number
    maxRowHintX: number
    isFilledDark: boolean
    hasEmptyCross: boolean
}


export type HybridTouchEvent = TouchEvent | MouseEvent
/** Interface event object emitted by `scrollChange` */
export interface IScrollChangeEvent {
    enable?: boolean
}

@Component({
    template: ''
})
export abstract class BoardCanvasComponent implements OnInit, OnDestroy {
    @Input() colorMode: ColorMode = 'light-dark'

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

    protected getBoardPos(event: HybridTouchEvent) {
        const eventPos = getEventPos(event)
        const target = this.canvasRef.nativeElement
        const rect = target.getBoundingClientRect()
        const scaleX = rect.width / target.clientWidth
        const scaleY = rect.height / target.clientHeight
        const offsetX = (eventPos.x - rect.left) / scaleX
        const offsetY = (eventPos.y - rect.top) / scaleY

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
        const opts = this.calcPaintOpts()
        this.setViewPort(ctx, opts)
        this.setTextAttr(ctx)
        this.paintColumnHints(ctx, opts)
        this.paintRowHints(ctx, opts)
        this.paintBoard(ctx, opts)
        if (!this.isGameOver()) {
            this.paintGrid(ctx, opts)
        }
    }

    private calcPaintOpts(): PaintOpts {
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

        const isFilledDark = this.colorMode.startsWith('dark')
        const hasEmptyCross = this.colorMode.endsWith('crosses')

        return {
            pxRowHintWidth, pxColHintHeight, pxBoardWidth, pxBoardHeight, pxCanvasWidth, pxCanvasHeight,
            maxBoardX, maxBoardY, maxColHintY, maxRowHintX, isFilledDark, hasEmptyCross
        }
    }

    private setTextAttr(ctx: CanvasRenderingContext2D) {
        ctx.font = '15px sans-serif'
        // align hint text in the center of its cell
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
    }

    private paintColumnHints(ctx: CanvasRenderingContext2D, opts: PaintOpts) {
        ctx.fillStyle = this.colors.semiDark
        // common top and bottom rectangle
        ctx.fillRect(
            opts.pxRowHintWidth,
            0,
            opts.pxBoardWidth,
            opts.pxColHintHeight
        )
        ctx.fillRect(
            opts.pxRowHintWidth,
            opts.pxColHintHeight + opts.pxBoardHeight,
            opts.pxBoardWidth,
            opts.pxColHintHeight
        )

        for (let x = 0; x < opts.maxBoardX; x++) {
            this.paintColumnHintSolvingHighlight(ctx, x, opts)
            this.paintColumnHintFocusHighlight(ctx, x, opts)
            this.paintColumnHintText(ctx, x, opts)
        }
    }

    private paintColumnHintSolvingHighlight(ctx: CanvasRenderingContext2D, x: number, opts: PaintOpts) {
        ctx.fillStyle = this.colors.light
        // highlight top hint column while solving
        if (this.solvingColAt(x, BOARD_PART.HINT_TOP)) {
            ctx.fillRect(
                opts.pxRowHintWidth + x * CELL_SIZE,
                0,
                CELL_SIZE,
                opts.pxColHintHeight
            )
        }
        // highlight bottom hint column while solving
        if (this.solvingColAt(x, BOARD_PART.HINT_BOTTOM)) {
            ctx.fillRect(
                opts.pxRowHintWidth + x * CELL_SIZE,
                opts.pxColHintHeight + opts.pxBoardHeight,
                CELL_SIZE,
                opts.pxColHintHeight
            )
        }
    }

    private paintColumnHintFocusHighlight(ctx: CanvasRenderingContext2D, x: number, opts: PaintOpts) {
        // add focus highlight for top and bottom hint cells in one common loop
        for (let y = 0; y < opts.maxColHintY; y++) {
            ctx.fillStyle = this.colors.medium
            // focus highlights
            if (this.hintPadAt(x, y, BOARD_SIDE.TOP)) {
                ctx.fillRect(
                    opts.pxRowHintWidth + x * CELL_SIZE,
                    y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                )
            }
            if (this.hintPadAt(x, y, BOARD_SIDE.BOTTOM)) {
                ctx.fillRect(
                    opts.pxRowHintWidth + x * CELL_SIZE,
                    opts.pxColHintHeight + opts.pxBoardHeight + y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                )
            }
        }
    }

    private paintColumnHintText(ctx: CanvasRenderingContext2D, x: number, opts: PaintOpts) {
        // add text for top and bottom hint cells in one common loop
        for (let y = 0; y < opts.maxColHintY; y++) {
            ctx.fillStyle = this.isSetup()
                ? this.colors.lightest
                : this.game.columnHints.matching[x] ? this.colors.lightest : this.colors.light
            // cell text
            const topHint = this.game.columnHints.getHintAt({ x, y, side: BOARD_SIDE.TOP })
            if (topHint) {
                ctx.fillText(
                    topHint,
                    opts.pxRowHintWidth + x * CELL_SIZE + HALF_CELL_SIZE,
                    y * CELL_SIZE + HALF_CELL_SIZE
                )
            }
            const bottomHint = this.game.columnHints.getHintAt({ x, y, side: BOARD_SIDE.BOTTOM })
            if (bottomHint) {
                ctx.fillText(
                    bottomHint,
                    opts.pxRowHintWidth + x * CELL_SIZE + HALF_CELL_SIZE,
                    opts.pxColHintHeight + opts.pxBoardHeight + y * CELL_SIZE + HALF_CELL_SIZE
                )
            }
        }
    }

    private paintRowHints(ctx: CanvasRenderingContext2D, opts: PaintOpts) {
        ctx.fillStyle = this.colors.semiDark
        // common left and right rectangle
        ctx.fillRect(
            0,
            opts.pxColHintHeight,
            opts.pxRowHintWidth,
            opts.pxBoardHeight
        )
        ctx.fillRect(
            opts.pxRowHintWidth + opts.pxBoardWidth,
            opts.pxColHintHeight,
            opts.pxRowHintWidth,
            opts.pxBoardHeight
        )

        for (let y = 0; y < opts.maxBoardY; y++) {
            this.paintRowHintSolvingHighlight(ctx, y, opts)
            this.paintRowHintFocusHighlight(ctx, y, opts)
            this.paintRowHintText(ctx, y, opts)
        }
    }

    private paintRowHintSolvingHighlight(ctx: CanvasRenderingContext2D, y: number, opts: PaintOpts) {
        ctx.fillStyle = this.colors.light
        // highlight left hint row while solving
        if (this.solvingRowAt(y, BOARD_PART.HINT_LEFT)) {
            ctx.fillRect(
                0,
                opts.pxColHintHeight + y * CELL_SIZE,
                opts.pxRowHintWidth,
                CELL_SIZE
            )
        }
        // highlight right hint row while solving
        if (this.solvingRowAt(y, BOARD_PART.HINT_RIGHT)) {
            ctx.fillRect(
                opts.pxRowHintWidth + opts.pxBoardWidth,
                opts.pxColHintHeight + y * CELL_SIZE,
                opts.pxRowHintWidth,
                CELL_SIZE
            )
        }
    }

    private paintRowHintFocusHighlight(ctx: CanvasRenderingContext2D, y: number, opts: PaintOpts) {
        // add focus highlight for left and right hint cells in one common loop
        for (let x = 0; x < opts.maxRowHintX; x++) {

            ctx.fillStyle = this.colors.medium
            // focus highlights
            if (this.hintPadAt(x, y, BOARD_SIDE.LEFT)) {
                ctx.fillRect(
                    x * CELL_SIZE,
                    opts.pxColHintHeight + y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                )
            }
            if (this.hintPadAt(x, y, BOARD_SIDE.RIGHT)) {
                ctx.fillRect(
                    opts.pxRowHintWidth + opts.pxBoardWidth + x * CELL_SIZE,
                    opts.pxColHintHeight + y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                )
            }
        }
    }

    private paintRowHintText(ctx: CanvasRenderingContext2D, y: number, opts: PaintOpts) {
        // add text for left and right hint cells in one common loop
        for (let x = 0; x < opts.maxRowHintX; x++) {
            ctx.fillStyle = this.isSetup()
                ? this.colors.lightest
                : this.game.rowHints.matching[y] ? this.colors.lightest : this.colors.light
            // cell text
            const leftHint = this.game.rowHints.getHintAt({ x, y, side: BOARD_SIDE.LEFT })
            if (leftHint) {
                ctx.fillText(
                    leftHint,
                    x * CELL_SIZE + HALF_CELL_SIZE,
                    opts.pxColHintHeight + y * CELL_SIZE + HALF_CELL_SIZE
                )
            }
            const rightHint = this.game.rowHints.getHintAt({ x, y, side: BOARD_SIDE.RIGHT })
            if (rightHint) {
                ctx.fillText(
                    rightHint,
                    opts.pxRowHintWidth + opts.pxBoardWidth + x * CELL_SIZE + HALF_CELL_SIZE,
                    opts.pxColHintHeight + y * CELL_SIZE + HALF_CELL_SIZE
                )
            }
        }
    }

    private paintBoard(ctx: CanvasRenderingContext2D, opts: PaintOpts) {
        ctx.fillStyle = this.isSetup() ? this.colors.dark : this.colors.medium
        // common board rectangle
        ctx.fillRect(
            opts.pxRowHintWidth,
            opts.pxColHintHeight,
            opts.pxBoardWidth,
            opts.pxBoardHeight
        )
        this.paintCells(ctx, opts)
        if (opts.hasEmptyCross) {
            this.paintCellCrosses(ctx, opts)
        }
    }

    private paintCells(ctx: CanvasRenderingContext2D, opts: PaintOpts) {
        for (let y = 0; y < this.game.boardData.length; y++) {
            for (let x = 0; x < this.game.boardData[y].length; x++) {
                switch (this.game.boardData[y][x].value) {
                    case BOARD_CELL.ON:
                        ctx.fillStyle = opts.isFilledDark ? this.colors.dark : this.colors.lightest
                        break
                    case BOARD_CELL.OFF:
                        ctx.fillStyle = opts.hasEmptyCross
                            ? this.colors.medium
                            : opts.isFilledDark ? this.colors.light : this.colors.dark
                        break
                    default:
                        continue
                }
                ctx.fillRect(
                    opts.pxRowHintWidth + x * CELL_SIZE,
                    opts.pxColHintHeight + y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                )
            }
        }
    }

    private paintCellCrosses(ctx: CanvasRenderingContext2D, opts: PaintOpts) {
        ctx.strokeStyle = this.colors.semiDark
        ctx.lineCap = 'round'
        ctx.lineWidth = 3
        for (let y = 0; y < this.game.boardData.length; y++) {
            for (let x = 0; x < this.game.boardData[y].length; x++) {
                if (this.game.boardData[y][x].value === BOARD_CELL.OFF) {
                    ctx.beginPath()
                    const p1 = {
                        x: opts.pxRowHintWidth + x * CELL_SIZE + CELL_X_PADDING,
                        y: opts.pxColHintHeight + y * CELL_SIZE + CELL_X_PADDING
                    }
                    const p2 = {
                        x: p1.x + CELL_SIZE - 2 * CELL_X_PADDING,
                        y: p1.y + CELL_SIZE - 2 * CELL_X_PADDING
                    }
                    ctx.moveTo(p1.x, p1.y)
                    ctx.lineTo(p2.x, p2.y)
                    ctx.moveTo(p1.x, p2.y)
                    ctx.lineTo(p2.x, p1.y)
                    ctx.stroke()
                }
            }
        }
    }

    private paintGrid(ctx: CanvasRenderingContext2D, opts: PaintOpts) {
        ctx.strokeStyle = this.colors.dark

        // add horizontal lines for all hints and the board in one loop
        for (let y = 0; y < opts.maxBoardY + opts.maxColHintY * 2; y++) {
            ctx.beginPath()
            // set double line width to separate the hints and the board as well as for each 5th line on the board
            ctx.lineWidth =
                y === opts.maxColHintY ||
                    y === opts.maxColHintY + opts.maxBoardY ||
                    y > opts.maxColHintY &&
                        y < opts.maxColHintY + opts.maxBoardY &&
                        (y - opts.maxColHintY) % CELLS_IN_GROUP === 0
                    ? 2 : 1
            ctx.moveTo(0, y * CELL_SIZE)
            ctx.lineTo(opts.pxCanvasWidth, y * CELL_SIZE)
            ctx.stroke()
        }

        // add vertical lines for all hints and the board in one loop
        for (let x = 0; x < opts.maxBoardX + opts.maxRowHintX * 2; x++) {
            ctx.beginPath()
            // set double line width to separate the hints and the board as well as for each 5th line on the board
            ctx.lineWidth =
                x === opts.maxRowHintX ||
                    x === opts.maxRowHintX + opts.maxBoardX ||
                    x > opts.maxRowHintX &&
                        x < opts.maxRowHintX + opts.maxBoardX &&
                        (x - opts.maxRowHintX) % CELLS_IN_GROUP === 0
                    ? 2 : 1
            ctx.moveTo(x * CELL_SIZE, 0)
            ctx.lineTo(x * CELL_SIZE, opts.pxCanvasHeight)
            ctx.stroke()
        }
    }

    protected setViewPort(ctx: CanvasRenderingContext2D, opts: PaintOpts) {
        // eslint-disable-next-line dot-notation
        const backingStoreRatio = (ctx['webkitBackingStorePixelRatio'] as number)
            // eslint-disable-next-line dot-notation
            || (ctx['backingStorePixelRatio'] as number)
            || 1
        const pxRatio = window.devicePixelRatio / backingStoreRatio
        // console.log(`pixel ratio: ${pxRatio}`)
        const canvasEl = this.canvasRef.nativeElement
        canvasEl.width = Math.round(opts.pxCanvasWidth * pxRatio)
        canvasEl.height = Math.round(opts.pxCanvasHeight * pxRatio)

        if (pxRatio !== 1) {
            ctx.imageSmoothingEnabled = false
            this.renderer.setStyle(canvasEl, 'width', `${opts.pxCanvasWidth}px`)
            this.renderer.setStyle(canvasEl, 'height', `${opts.pxCanvasHeight}px`)
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
        const eventNames = 'ontouchstart' in window
            ? { start: 'touchstart', move: 'touchmove', end: 'touchend' }
            : { start: 'mousedown', move: 'mousemove', end: 'mouseup' }

        const canvasEl = this.canvasRef.nativeElement
        const touchStart$ = fromEvent<HybridTouchEvent>(canvasEl, eventNames.start, { passive: false })
        const touchMove$ = fromEvent<HybridTouchEvent>(canvasEl, eventNames.move, { passive: false })
        const touchEnd$ = fromEvent<HybridTouchEvent>(canvasEl, eventNames.end, { passive: false })
        // indicates that user touched and not moved / released finger
        let tapEvent: HybridTouchEvent | null = null

        // observing 1-touch short and long press
        touchStart$.pipe(
            filter(event => getNumberOfTouches(event) === 1),
            tap(event => tapEvent = event),
            debounceTime(PRESS_TIME_MSEC),
            filter(() => tapEvent != null),
            takeUntil(this.ngUnsubscribe)
        ).subscribe(event => {
            tapEvent = null
            this.handleLongPress(event)
        })

        // observing "1-touch -> 2-touch" mutations to avoid tap/zoom conflicts
        touchMove$.pipe(
            filter(event => getNumberOfTouches(event) > 1),
            takeUntil(this.ngUnsubscribe)
        ).subscribe(() => {
            tapEvent = null
        })

        // observing 1-touch move
        touchMove$.pipe(
            filter(event => getNumberOfTouches(event) === 1),
            takeUntil(this.ngUnsubscribe)
        ).subscribe(event => {
            tapEvent = null
            this.handlePanMove(event)
        })

        // observing touch end to register a 1-touch tap
        touchEnd$.pipe(
            takeUntil(this.ngUnsubscribe)
        ).subscribe(() => {
            if (tapEvent != null) {
                this.handleTap(tapEvent)
                tapEvent = null
            }
            this.handlePanEnd()
        })
    }

    protected abstract handleTap(event: HybridTouchEvent): void
    protected abstract handleLongPress(event: HybridTouchEvent): void
    protected abstract handlePanMove(event: HybridTouchEvent): void
    protected abstract handlePanEnd(): void
}

export function getEventPos(event: HybridTouchEvent): Point {
    return 'touches' in event
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
        : { x: event.clientX, y: event.clientY }

}

export function getNumberOfTouches(event: HybridTouchEvent): number {
    return 'touches' in event ? event.touches.length : 1
}