import { Component, EventEmitter, Output, Renderer2 } from '@angular/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

import { BOARD_CELL, BOARD_PART, Point } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { BoardCanvasComponent } from './board-canvas'

const SOLVE_DELAY_MSEC = 25

interface PanData {
    orientation?: 'X' | 'Y'
    start: Point
    current: Point | null
    value: BOARD_CELL
}

@Component({
    selector: 'board-canvas',
    template: '<canvas #canvas></canvas>',
    styles: [`
        :host, canvas {
            display: block;
            width: fit-content;
        }
    `]
})
export class GameBoardCanvasComponent extends BoardCanvasComponent {

    /** Emits `Touch` object during panning */
    @Output() readonly panMove = new EventEmitter<Touch>
    /** Emits at the end of panning */
    @Output() readonly panEnd = new EventEmitter<void>

    private panData: PanData | null

    constructor(
        protected readonly renderer: Renderer2,
        protected readonly game: GameProvider
    ) {
        super(renderer, game)
    }

    protected handleTap(event: TouchEvent) {
        const boardPos = this.getBoardPos(event)
        if (boardPos == null || this.isGameOver()) { return }
        // console.log('[tap event]')

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
    }

    protected handleLongPress(event: TouchEvent) {
        const boardPos = this.getBoardPos(event)
        if (this.isGame() && boardPos?.kind === BOARD_PART.DATA) {
            this.panData = {
                start: boardPos,
                // initially unset to let the logic toggle a cell at start pos
                current: null,
                value: this.toggledCellValue(this.game.boardData[boardPos.y][boardPos.x].value),
                orientation: 'X'
            }
            // toggle first cell even before moving pointer
            this.handlePanMove(event)
            void Haptics.impact({ style: ImpactStyle.Medium })
            // lock scrolling when toggling lines of cells
            this.scrollChange.emit({ enable: false })
        } else {
            this.panData = null
        }
    }

    protected handlePanMove(event: TouchEvent) {
        const boardPos = this.getBoardPos(event)
        if (boardPos == null || this.isGameOver() || this.panData == null) { return }

        if (boardPos.kind === BOARD_PART.DATA) {
            // determine the panning orientation
            const dx = Math.abs(boardPos.x - this.panData.start.x)
            const dy = Math.abs(boardPos.y - this.panData.start.y)
            if (dx > dy) {
                this.panData.orientation = 'X'
            } else if (dy > dx) {
                this.panData.orientation = 'Y'
            } else {
                // keeping orientation unchanged
            }

            // set all cells based on the 1st one according to the panning orientation
            if (this.panData.orientation === 'X' && boardPos.x !== this.panData.current?.x) {
                // horizontal orientation - resetting y-coordinate
                boardPos.y = this.panData.start.y
                this.setPanningLine(this.panData, boardPos)
                this.panMove.emit(event.changedTouches[0])
            } else if (this.panData.orientation === 'Y' && boardPos.y !== this.panData.current?.y) {
                // vertical orientation - resetting x-coordinate
                boardPos.x = this.panData.start.x
                this.setPanningLine(this.panData, boardPos)
                this.panMove.emit(event.changedTouches[0])
            } else {
                // has not moved in the current orientation
            }
        }
    }

    private setPanningLine(panData: PanData, boardPos: Point) {
        // skip undo when setting cells first time during panning
        if (panData.current != null) {
            this.game.undoStack.undo()
        }
        panData.current = boardPos
        this.setCellsAtoB(boardPos, panData.start, panData.value)
    }

    protected handlePanEnd() {
        if (this.panData != null) {
            this.panData = null
            this.scrollChange.emit({ enable: true })
        }
        this.panEnd.emit()
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
        this.game.undoStack.startBlock()
        for (
            let x = pointA.x, y = pointA.y;
            (dx === 0 || x !== pointB.x + dx) && (dy === 0 || y !== pointB.y + dy);
            x += dx, y += dy
        ) {
            this.game.setBoardXY(x, y, value)
            // if pointA == pointB, exit after setting the first cell
            if (dx === 0 && dy === 0) { break }
        }
        this.game.undoStack.endBlock()
        this.checkGameStatus()
        this.paint()
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
}
