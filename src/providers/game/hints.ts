import { Point, BOARD_SIDE, BOARD_CELL, GAME_STATUS } from './game.interface'
import { GameProvider } from './game'
import { HintCell, HintPoint } from './hints.interface'
import { LineSolver } from './line-solver'
import { combinations } from './game.utils'

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
    Should return **true** if the value got really changed
    */
    abstract setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL): boolean

    /*
    Should return the highest index in the selected hint line, which value can
    be edited. Usually this is the index of the first zero-value element in this
    hint line or index of he last element if all elements have non-zero values.
    */
    getMaxEditableIndexAt(lineIndex: number): number {
        return Math.min(
            this.hints[lineIndex].length,
            this.getMaxIndexInLine() - 1
        )
    }

    getMaxIndexInLine(): number {
        const maxIndexInLine = Math.floor((this.getBoardLength() + 1) / 2)
        return Math.min(
            this.getLongestLineLength() + ((this.game.boardStatus === GAME_STATUS.SETUP) ? 1 : 0),
            maxIndexInLine
        )
    }

    /*
    Should return a numeric hint value at the given position.
    */
    getHintValueAt(pos: HintPoint): number {
        const hintStr = this.getHintAt(pos)
        return (hintStr) ? parseInt(hintStr, 10) : 0
    }

    /*
    Should return the number of "free" board cells along the given hint line
    at the given position. The free cells are the cells not reserved by all
    hint values along this line.
    */
    getHintLineLeftTotalAt(pos: HintPoint): number {
        const hintLine = this.getHintLineAt(pos)
        const selectedValue = this.getHintValueAt(pos)
        const usedTotal = hintLine
            .reduce((prev, curr) => prev + curr.hint, 0)
            + hintLine.length
            - (selectedValue > 0 ? selectedValue + 1 : 0)
        return Math.max(this.getBoardLength() - usedTotal, 0)
    }

    getNumberOfCombinations(lineIndex: number) {
        const hintSum = this.hints[lineIndex].reduce((prev, curr) => prev + curr.hint, 0)
        const hintCount = this.hints[lineIndex].length
        const emptyCells = this.getBoardLength() - hintSum - hintCount + 1
        return combinations(hintCount + emptyCells, hintCount)
    }

    checkLine(lineIndex: number, strict = false): boolean {
        let chainLength = 0
        let hintIndex = 0
        let match = true
        const boardLength = this.getBoardLength()
        const hintLine = this.hints[lineIndex]

        for (let indexInLine = 0; match && indexInLine < boardLength; indexInLine++) {
            const currentValue = this.getBoardDataValue(lineIndex, indexInLine)
            if (strict && currentValue === BOARD_CELL.NIL) {
                match = false
            } else if (currentValue === BOARD_CELL.ON) {
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
        return this.matching[lineIndex]
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

    abstract getHintAt(pos: HintPoint): string
    abstract setHintAt(pos: HintPoint, value: string | null): Point
    abstract getHintLineAt(pos: Point): HintCell[]

    abstract nextEditableHintPos(pos: HintPoint): Point
    abstract previousEditableHintPos(pos: HintPoint): Point

    solveLine(lineIndex: number): number[] {
        return this.solver.solveLine(this, lineIndex)
    }
} // class Hints


export class ColumnHints extends Hints  {

    getBoardLength(): number {
        return this.game.boardData.length
    }

    getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL {
        return this.game.boardData[indexInLine][lineIndex].value
    }

    setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL): boolean {
        const changedValue = this.game.setBoardData(indexInLine, lineIndex, value)
        if (changedValue != null) {
            this.game.rowHints.checkLine(indexInLine)
        }
        return changedValue != null
    }

    getHintAt(pos: HintPoint): string {
        let y = pos.y
        if (pos.side === BOARD_SIDE.TOP) {
            y -= this.getMaxIndexInLine() - this.hints[pos.x].length
        }
        return this.getHint(pos.x, y)
    }

    setHintAt(pos: HintPoint, value: string): Point {
        const x = pos.x
        let y = pos.y
        const newPos = { x, y }
        let last = false

        if (pos.side === BOARD_SIDE.TOP) {
            y -= this.getMaxIndexInLine() - this.hints[x].length
            if (y < 0) {
                this.hints[x].splice(0, 0, { hint: 0 })
                y = 0
            }
            last = (!y)
            newPos.y = y + this.getMaxIndexInLine() - this.hints[x].length
        } else {
            if (y >= this.hints[x].length) {
                this.hints[x].push({ hint: 0 })
                y = this.hints[x].length - 1
            }
            last = (y === this.hints[x].length - 1)
            newPos.y = y
        }

        if (value) {
            this.hints[x][y].hint = parseInt(value, 10)
        } else if (last) {
            this.hints[x].splice(y, 1)
        }
        this.game.setBoardSize()

        return newPos
    }

    getHintLineAt(pos: Point): HintCell[] {
        return this.hints[pos.x]
    }

    nextEditableHintPos(pos: HintPoint): Point {
        const { x, y } = pos
        const minIndex = 0
        const maxIndex = this.getMaxIndexInLine() - 1
        const hintsWidth = this.hints.length
        switch (pos.side) {
            case BOARD_SIDE.BOTTOM:
                if (y < this.getMaxEditableIndexAt(x)) {
                    return { x, y: y + 1 }
                } else if (x < hintsWidth - 1) {
                    return { x: x + 1, y: minIndex }
                } else {
                    return { x: 0, y: minIndex }
                }

            case BOARD_SIDE.TOP:
                if (y > maxIndex - this.getMaxEditableIndexAt(x)) {
                    return { x, y: y - 1 }
                } else if (x < hintsWidth - 1) {
                    return { x: x + 1, y: maxIndex }
                } else {
                    return { x: 0, y: maxIndex }
                }

            default:
                return pos
        }
    }

    previousEditableHintPos(pos: HintPoint): Point {
        const { x, y } = pos
        const minIndex = 0
        const maxIndex = this.getMaxIndexInLine() - 1
        const hintsWidth = this.hints.length
        switch (pos.side) {
            case BOARD_SIDE.BOTTOM:
                if (y > minIndex) {
                    return { x, y: y - 1 }
                } else if (x > 0) {
                    return { x: x - 1, y: this.getMaxEditableIndexAt(x - 1) }
                } else {
                    return { x: hintsWidth - 1, y: this.getMaxEditableIndexAt(hintsWidth - 1) }
                }

            case BOARD_SIDE.TOP:
                if (y < maxIndex) {
                    return { x, y: y + 1 }
                } else if (x > 0) {
                    return { x: x - 1, y: maxIndex - this.getMaxEditableIndexAt(x - 1) }
                } else {
                    return { x: hintsWidth - 1, y: maxIndex - this.getMaxEditableIndexAt(hintsWidth - 1) }
                }

            default:
                return pos
        }
    }
}


export class RowHints extends Hints {

    getBoardLength(): number {
        return this.game.boardData[0]?.length
    }

    getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL {
        return this.game.boardData[lineIndex][indexInLine].value
    }

    setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL): boolean {
        const changedValue = this.game.setBoardData(lineIndex, indexInLine, value)
        if (changedValue != null) {
            this.game.columnHints.checkLine(indexInLine)
        }
        return changedValue != null
    }

    getHintAt(pos: HintPoint): string {
        let x = pos.x
        if (pos.side === BOARD_SIDE.LEFT) {
            x -= this.getMaxIndexInLine() - this.hints[pos.y].length
        }
        return this.getHint(pos.y, x)
    }

    setHintAt(pos: HintPoint, value: string): Point {
        let x = pos.x
        const y = pos.y
        const newPos = { x, y }
        let last = false

        if (pos.side === BOARD_SIDE.LEFT) {
            x -= this.getMaxIndexInLine() - this.hints[y].length
            if (x < 0) {
                this.hints[y].splice(0, 0, { hint: 0 })
                x = 0
            }
            last = (!x)
            newPos.x = x + this.getMaxIndexInLine() - this.hints[y].length
        } else {
            if (x >= this.hints[y].length) {
                this.hints[y].push({ hint: 0 })
                x = this.hints[y].length - 1
            }
            last = (x === this.hints[y].length - 1)
            newPos.x = x
        }

        if (value) {
            this.hints[y][x].hint = parseInt(value, 10)
        } else if (last) {
            this.hints[y].splice(x, 1)
        }
        this.game.setBoardSize()

        return newPos
    }

    getHintLineAt(pos: Point): HintCell[] {
        return this.hints[pos.y]
    }

    nextEditableHintPos(pos: HintPoint): Point {
        const { x, y } = pos
        const minIndex = 0
        const maxIndex = this.getMaxIndexInLine() - 1
        const hintsWidth = this.hints.length
        switch (pos.side) {
            case BOARD_SIDE.RIGHT:
                if (x < this.getMaxEditableIndexAt(y)) {
                    return { x: x + 1, y }
                } else if (y < hintsWidth - 1) {
                    return { x: minIndex, y: y + 1 }
                } else {
                    return { x: minIndex, y: 0 }
                }

            case BOARD_SIDE.LEFT:
                if (x > maxIndex - this.getMaxEditableIndexAt(y)) {
                    return { x: x - 1, y }
                } else if (y < hintsWidth - 1) {
                    return { x: maxIndex, y: y + 1 }
                } else {
                    return { x: maxIndex, y: 0 }
                }

            default:
                return pos
        }
    }

    previousEditableHintPos(pos: HintPoint): Point {
        const { x, y } = pos
        const minIndex = 0
        const maxIndex = this.getMaxIndexInLine() - 1
        const hintsWidth = this.hints.length
        switch (pos.side) {
            case BOARD_SIDE.RIGHT:
                if (x > minIndex) {
                    return { x: x - 1, y }
                } else if (y > 0) {
                    return { x: this.getMaxEditableIndexAt(y - 1), y: y - 1 }
                } else {
                    return { x: this.getMaxEditableIndexAt(hintsWidth - 1), y: hintsWidth - 1 }
                }

            case BOARD_SIDE.LEFT:
                if (x < maxIndex) {
                    return { x: x + 1, y }
                } else if (y > 0) {
                    return { x: maxIndex - this.getMaxEditableIndexAt(y - 1), y: y - 1 }
                } else {
                    return { x: maxIndex - this.getMaxEditableIndexAt(hintsWidth - 1), y: hintsWidth - 1 }
                }

            default:
                return pos
        }
    }
}
