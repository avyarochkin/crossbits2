import { Point, BoardSide, BOARD_SIDE, BOARD_CELL, GAME_STATUS } from './game.interface'
import { GameProvider } from './game'
import { HintCell } from './hints.interface'
import { LineSolver } from './solver'

export abstract class Hints {

    hints: HintCell[][] = []
    matching: boolean[] = []

    private readonly solver = new LineSolver()

    constructor(protected game: GameProvider) {}

    init(length: number) {
        this.hints = new Array<HintCell[]>(length)
        for (let lineIndex = 0; lineIndex < length; lineIndex++) {
            this.hints[lineIndex] = []
        }
    }

    initWith(hints: HintCell[][]) {
        this.hints = hints
    }

    assign(fromHints: Hints) {
        this.hints = fromHints.hints
        this.reset()
    }

    reset() {
        this.matching = new Array<boolean>(this.hints.length)
        this.solver.reset()
    }

    protected getLongestLineLength(): number {
        return this.hints.reduce((prev, line) => Math.max(prev, line.length), 0)
    }

    /*
    Should return the length of each board row or column that each hint line
    will be linked to. For the column hints it should return the board height,
    for the row hints - the board width.
    */
    abstract getBoardLength(): number

    /*
    Should return the cell value from the game board for the hint lineIndex and
    board indexInLine. For the column hints lineIndex should map to the board
    <x> and indexInLine should map to <y>. For the row hints - vice versa.
    */
    abstract getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL

    /*
    Should set the game board cell to the given value. The cell should be
    located via the hint lineIndex and the board indexInLine, which should be
    mapped to the board <x,y> exactly as in getBoardDataValue().
    */
    abstract setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL)

    getMaxIndexInLine(): number {
        const maxIndexInLine = Math.floor((this.getBoardLength() + 1) / 2)
        return Math.min(
            this.getLongestLineLength() + ((this.game.boardStatus === GAME_STATUS.SETUP) ? 1 : 0),
            maxIndexInLine
        )
    }

    checkLine(lineIndex: number) {
        let chainLength = 0, hintIndex = 0, match = true
        const boardLength = this.getBoardLength(), hintLine = this.hints[lineIndex]

        for (let indexInLine = 0; match && indexInLine < boardLength; indexInLine++) {
            if (this.getBoardDataValue(lineIndex, indexInLine) === BOARD_CELL.ON) {
                chainLength++
                if (indexInLine === boardLength - 1
                    || this.getBoardDataValue(lineIndex, indexInLine + 1) !== BOARD_CELL.ON
                ) {
                    match = (hintIndex < hintLine.length && hintLine[hintIndex].hint === chainLength)
                    hintIndex++
                }
            } else {
                chainLength = 0
            }
        }
        this.matching[lineIndex] = match && (hintIndex === hintLine.length)
    }

    allLinesMatch(enforceChecks: boolean): boolean {
        let matching = true
        for (let lineIndex = 0; lineIndex < this.matching.length; lineIndex++) {
            if (enforceChecks) {
                this.checkLine(lineIndex)
            }
            matching = matching && this.matching[lineIndex]
        }
        return matching
    }

    protected getHint(lineIndex: number, indexInLine: number): string {
        return (indexInLine >= 0 && indexInLine < this.hints[lineIndex].length)
            ? this.hints[lineIndex][indexInLine].hint.toString()
            : ''
    }

    getHints() {
        return this.hints
    }

    abstract getHintXY(x: number, y: number, side: BoardSide): string
    abstract setHintXY(x: number, y: number, side: BoardSide, value: string | null): Point

    solveLine(lineIndex: number) {
        this.solver.solveLine(this, lineIndex)
    }
} // class Hints


export class ColumnHints extends Hints  {

    getBoardLength(): number {
        return this.game.boardData.length
    }

    getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL {
        return this.game.boardData[indexInLine][lineIndex].value
    }

    setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL) {
        this.game.setBoardData(indexInLine, lineIndex, value)
        this.game.rowHints.checkLine(indexInLine)
    }

    getHintXY(x: number, y: number, side: BoardSide): string {
        if (side === BOARD_SIDE.TOP) {
            y -= this.getMaxIndexInLine() - this.hints[x].length
        }
        return this.getHint(x, y)
    }

    setHintXY(x: number, y: number, side: BoardSide, value: string): Point {
        const result = { x: x, y: y }
        let last = false

        if (side === BOARD_SIDE.TOP) {
            y -= this.getMaxIndexInLine() - this.hints[x].length
            if (y < 0) {
                this.hints[x].splice(0, 0, { hint: 0 })
                y = 0
            }
            last = (!y)
            result.y = y + this.getMaxIndexInLine() - this.hints[x].length
        } else {
            if (y >= this.hints[x].length) {
                this.hints[x].push({ hint: 0 })
                y = this.hints[x].length - 1
            }
            last = (y === this.hints[x].length - 1)
            result.y = y
        }

        if (value) {
            this.hints[x][y].hint = parseInt(value, 10)
        } else if (last) {
            this.hints[x].splice(y, 1)
        }
        this.game.setBoardSize()

        return result
    }

}


export class RowHints extends Hints {

    getBoardLength(): number {
        return this.game.boardData[0]?.length
    }

    getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL {
        return this.game.boardData[lineIndex][indexInLine].value
    }

    setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL) {
        this.game.setBoardData(lineIndex, indexInLine, value)
        this.game.columnHints.checkLine(indexInLine)
    }

    getHintXY(x: number, y: number, side: BoardSide): string {
        if (side === BOARD_SIDE.LEFT) {
            x -= this.getMaxIndexInLine() - this.hints[y].length
        }
        return this.getHint(y, x)
    }

    setHintXY(x: number, y: number, side: BoardSide, value: string): Point {
        const result = { x: x, y: y }
        let last = false

        if (side === BOARD_SIDE.LEFT) {
            x -= this.getMaxIndexInLine() - this.hints[y].length
            if (x < 0) {
                this.hints[y].splice(0, 0, { hint: 0 })
                x = 0
            }
            last = (!x)
            result.x = x + this.getMaxIndexInLine() - this.hints[y].length
        } else {
            if (x >= this.hints[y].length) {
                this.hints[y].push({ hint: 0 })
                x = this.hints[y].length - 1
            }
            last = (x === this.hints[y].length - 1)
            result.x = x
        }

        if (value) {
            this.hints[y][x].hint = parseInt(value, 10)
        } else if (last) {
            this.hints[y].splice(x, 1)
        }
        this.game.setBoardSize()

        return result
    }
}
