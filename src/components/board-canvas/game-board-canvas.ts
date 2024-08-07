import { Component, EventEmitter, Output, Renderer2 } from '@angular/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

import { BOARD_CELL, BOARD_PART, Point } from 'src/providers/game/game.interface'
import { GameProvider } from 'src/providers/game/game'
import { BoardCanvasComponent } from './board-canvas'

const SOLVE_DELAY_MSEC = 25

interface PanData {
    orientation?: 'X' | 'Y'
    start: Point
    current: Point
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
        // console.log('[press event]')

        const boardPos = this.getBoardPos(event)

        if (this.isGame() && boardPos?.kind === BOARD_PART.DATA) {
            // console.log('(start panning)')
            this.panData = {
                start: boardPos,
                current: boardPos,
                value: this.toggledCellValue(this.game.boardData[boardPos.y][boardPos.x].value),
                orientation: undefined // will be determined later
            }
            void Haptics.impact({ style: ImpactStyle.Medium })
            this.scrollChange.emit({ enable: false })
        } else {
            this.panData = null
        }
    }

    protected handlePanMove(event: TouchEvent) {
        // console.log('[pan move event]')
        const boardPos = this.getBoardPos(event)
        if (boardPos == null || this.isGameOver() || this.panData == null) { return }

        if (boardPos.kind === BOARD_PART.DATA) {
            // console.log('(panning)')

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
                    this.panMove.emit(event.changedTouches[0])
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
                    this.panMove.emit(event.changedTouches[0])
                } else {
                    this.panData.orientation = undefined
                }
            }
        }
    }

    protected handlePanEnd() {
        // console.log('(pan end event)')
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
