import { GameProvider, Point, BoardSide, BOARD_SIDE, BOARD_CELL, GAME_STATUS } from './game'

export type HintCell = {
    hint: number
}


type VariantPiece = {
    start: number, 
    end: number
}

export abstract class Hints {

    public hints: HintCell[][] = []
    public matching: boolean[] = []

    constructor(protected game: GameProvider) {}

    public init(length: number) {
        this.hints = new Array(length)
        for (let lineIndex = 0; lineIndex < length; lineIndex++) {
            this.hints[lineIndex] = []
        }
    }

    public initWith(hints: HintCell[][]) {
        this.hints = hints
    }

    public assign(fromHints: Hints) {
        this.hints = fromHints.hints
        this.reset()
    }

    public reset() {
        this.matching = new Array(this.hints.length)
    }

    protected getLongestLineLength(): number {
        return this.hints.reduce((prev, line) => Math.max(prev, line.length), 0)
    }

    /*
    Should return the length of each board row or column that each hint line 
    will be linked to. For the column hints it should return the board height, 
    for the row hints - the board width.  
    */
    protected abstract getBoardLength(): number

    /*
    Should return the cell value from the game board for the hint lineIndex and 
    board indexInLine. For the column hints lineIndex should map to the board 
    <x> and indexInLine should map to <y>. For the row hints - vice versa. 
    */
    protected abstract getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL

    /*
    Should set the game board cell to the given value. The cell should be
    located via the hint lineIndex and the board indexInLine, which should be
    mapped to the board <x,y> exactly as in getBoardDataValue().
    */
    protected abstract setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL)

    public getMaxIndexInLine(): number {
        let maxIndexInLine = Math.floor((this.getBoardLength() + 1) / 2)
        return Math.min(this.getLongestLineLength() + ((this.game.boardStatus === GAME_STATUS.SETUP) ? 1 : 0), maxIndexInLine)
    }

    public checkLine(lineIndex: number) {
        let chainLength = 0, hintIndex = 0, match = true
        let boardLength = this.getBoardLength(), hintLine = this.hints[lineIndex]

        for (let indexInLine = 0; match && indexInLine < boardLength; indexInLine++) {
            if (this.getBoardDataValue(lineIndex, indexInLine) === BOARD_CELL.ON) {
                chainLength++
                if (indexInLine === boardLength - 1 || this.getBoardDataValue(lineIndex, indexInLine + 1) !== BOARD_CELL.ON) {
                    match = (hintIndex < hintLine.length && hintLine[hintIndex].hint === chainLength)
                    hintIndex++
                }
            } else {
                chainLength = 0
            }
        }
        this.matching[lineIndex] = match && (hintIndex === hintLine.length)
    }

    public allLinesMatch(enforceChecks: boolean): boolean {
        let matching = true
        for (let lineIndex = 0; lineIndex < this.matching.length; lineIndex++) {
            if (enforceChecks) this.checkLine(lineIndex)
            matching = matching && this.matching[lineIndex]
        }
        return matching
    }

    protected getHint(lineIndex, indexInLine: number): string {
        return (indexInLine >= 0 && indexInLine < this.hints[lineIndex].length) 
            ? this.hints[lineIndex][indexInLine].hint.toString() 
            : ''
    }

    public getHints() {
        return this.hints
    }

    public abstract getHintXY(x: number, y: number, side: BoardSide): string
    public abstract setHintXY(x: number, y: number, side: BoardSide, value: string): Point

    // try to solve the board line based on the hint values
    public solveLine(lineIndex: number) {
        let self = this
        let dataLength = this.getBoardLength() // height
        let hintLength = self.hints[lineIndex].length

        /*
        This variable holds one particular variant of all pieces that can be
        allocated in column "x" according to its hint. The variable represents
        an array of pairs: { piece start index; piece end index }.
        When building various variants this variable gets initially populated
        with the first variant and then gets updated to match the next variant.
        */
        let variant = Array<VariantPiece>(hintLength)

        /*
        This variable holds the common result after applying all variants.
        All cells that stay on or off across all variants will be on or off
        in the solution.
        */
        let solution = Array<BOARD_CELL>(dataLength)

        /*
        This variable holds a copy of the target board line
        */
        let boardLine = Array<BOARD_CELL>(dataLength)

        /* 
        Copies the target board line to a local array to achieve better lookup
        performance (33% faster)
        */
        function createBoardLine() {
            for (let indexInLine = 0; indexInLine < dataLength; indexInLine++) {
                boardLine[indexInLine] = self.getBoardDataValue(lineIndex, indexInLine)
            }
        }

        /*
        Tries to build a valid variant by starting with the hint [startIndex]
        and placing the first piece into the column at [offset]. Then places
        all remaining pieces according to the next hints to the next possible
        places.
        Returns "true" if could build a valid variant and "false" if not.
        buildVariant(0, 0) builds the first possible variant for all hints.
        */
        function buildVariant(startIndex: number, offset: number): boolean {
            for (let indexInLine = startIndex; indexInLine < hintLength; indexInLine++) {
                let pieceEnd = offset + self.hints[lineIndex][indexInLine].hint - 1

                // if the piece goes beyond column limit, the building is not possible
                if (pieceEnd >= dataLength) return false

                variant[indexInLine] = {
                    start: offset,
                    end: pieceEnd
                }
                // next piece should start by skipping 1 cell after this one
                offset = pieceEnd + 2
            }
            // all pieces are built successfully
            return true
        }

        /*
        Tries to build the next variant based on the current state of <variant>
        variable. Tries to shift the last piece forward, then second last and
        so on as long as the variant remains valid.
        If <variant> variable is not initialized, tries to build the first one.
        Returns "true" if could build a valid variant and "false" if not.
        */
        function buildNextVariant(): boolean {
            // if not initialized, build the first variant
            if (!variant[0]) {
                return buildVariant(0, 0)
            }
            // try to shift a piece one cell forward starting with the last one
            for (let startIndex = hintLength - 1; startIndex >= 0; startIndex--) {
                if (buildVariant(startIndex, variant[startIndex].start + 1)) return true
            }
            // all pieces are shifted to their last position - cannot build a new variant
            return false
        }

        /*
        Checks if <variant> conflicts with any column cells set to on/off.
        Returns "true" if conflict found and "false" if not.
        */
        function variantConflictsWithBoard(): boolean {
            let variantIndex = 0, conflict = false
            for (let indexInLine = 0; indexInLine < dataLength && !conflict; indexInLine++) {
                if (variantIndex >= hintLength || indexInLine < variant[variantIndex].start) {
                    // check conflict with cells outside of variant pieces
                    conflict = (boardLine[indexInLine] === BOARD_CELL.ON)
                } else if (indexInLine <= variant[variantIndex].end) {
                    // check conflict with cells inside the variant pieces
                    conflict = (boardLine[indexInLine] === BOARD_CELL.OFF)
                    // moving to the next piece
                    if (indexInLine === variant[variantIndex].end) {
                        variantIndex++
                    }
                }
            }
            //console.log(`${variant.map(item => { return `${item.start}:${item.end}` })} - ${conflict ? 'conflict' : 'OK'}`)
            return conflict
        }

        /*
        Applies <variant> to <solution>. All cells that stay on or off across
        all variants will be set to on or off in the solution.
        Returns "true" if the solution has any cells set to on or off, 
        i.e. if the solution is applicable.
        */
        function applyVariantToSolution(): boolean {
            let variantIndex = 0
            let solutionApplicable = false
            for (let solutionIndex = 0; solutionIndex < dataLength; solutionIndex++) {
                let value = solution[solutionIndex]
                if (variantIndex >= hintLength || solutionIndex < variant[variantIndex].start) {
                    // apply to cells outside of variant pieces
                    value = (value === undefined || value === BOARD_CELL.OFF) ? BOARD_CELL.OFF : BOARD_CELL.NIL
                } else if (solutionIndex <= variant[variantIndex].end) {
                    // apply to cells inside the variant pieces
                    value = (value === undefined || value === BOARD_CELL.ON) ? BOARD_CELL.ON : BOARD_CELL.NIL
                    // moving to the next piece
                    if (solutionIndex === variant[variantIndex].end) {
                        variantIndex++
                    }
                }
                solution[solutionIndex] = value
                // if at least one cell is set or unset, the solution is applicable
                solutionApplicable = solutionApplicable || (value !== BOARD_CELL.NIL)
            }
            //console.log(`Solution: ${solution}`)
            return solutionApplicable
        }

        /*
        Applies <solution> to the board column.
        Copies only the cells set to on or off.
        */
        function applySolutionToBoard() {
            for (let solutionIndex = 0; solutionIndex < dataLength; solutionIndex++) {
                let value = solution[solutionIndex]
                if (value === BOARD_CELL.OFF || value === BOARD_CELL.ON) {
                    self.setBoardDataValue(lineIndex, solutionIndex, value)
                }
            }
        }

        // main algorithm (self explanatory)
        let variantsFound = 0
        let givenUp = (hintLength === 0)
        let time = performance.now()

        createBoardLine()
        while (!givenUp && buildNextVariant()) {
            if (!variantConflictsWithBoard()) {
                variantsFound++
                givenUp = !applyVariantToSolution() || performance.now() - time >= 60000
            }
        }
        if (!givenUp) {
            applySolutionToBoard()
        }

        // logging stats
        time = (performance.now() - time) / 1000
        if (givenUp) {
            console.log(`Given up after ${variantsFound.toLocaleString()} variant(s) in ${time.toFixed(3)}s`)
        } else if (variantsFound > 0) {
            console.log(`${variantsFound.toLocaleString()} variant(s) found in ${time.toFixed(3)}s`)
        } else {
            console.warn(`No variants found in ${time.toFixed(3)}s`)
        }
    } // solveLine

} // class Hints


export class ColumnHints extends Hints  {

    protected getBoardLength(): number {
        return this.game.boardData.length
    }

    protected getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL {
        return this.game.boardData[indexInLine][lineIndex].value
    }

    protected setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL) {
        this.game.setBoardData(indexInLine, lineIndex, value)
        this.game.rowHints.checkLine(indexInLine)
    }

    public getHintXY(x: number, y: number, side: BoardSide): string {
        if (side === BOARD_SIDE.TOP) {
            y -= this.getMaxIndexInLine() - this.hints[x].length
        }
        return this.getHint(x, y)
    }

    public setHintXY(x: number, y: number, side: BoardSide, value: string): Point {
        let result = { x: x, y: y }
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
            this.hints[x][y].hint = parseInt(value)
        } else if (last) {
            this.hints[x].splice(y, 1)
        }
        this.game.setBoardSize()

        return result
    }

}



export class RowHints extends Hints {

    protected getBoardLength(): number {
        return this.game.boardData[0].length
    }

    protected getBoardDataValue(lineIndex: number, indexInLine: number): BOARD_CELL {
        return this.game.boardData[lineIndex][indexInLine].value
    }

    protected setBoardDataValue(lineIndex: number, indexInLine: number, value: BOARD_CELL) {
        this.game.setBoardData(lineIndex, indexInLine, value)
        this.game.columnHints.checkLine(indexInLine)
    }

    public getHintXY(x: number, y: number, side: BoardSide): string {
        if (side === BOARD_SIDE.LEFT) {
            x -= this.getMaxIndexInLine() - this.hints[y].length
        }
        return this.getHint(y, x)
    }

    public setHintXY(x: number, y: number, side: BoardSide, value): Point {
        let result = { x: x, y: y }
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
            this.hints[y][x].hint = parseInt(value)
        } else if (last) {
            this.hints[y].splice(x, 1)
        }
        this.game.setBoardSize()

        return result
    }

}
