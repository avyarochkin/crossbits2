import { Injectable } from '@angular/core'
import { LocalStorageProvider } from '../local-storage/local-storage'
import { staticBoards } from './data'
import { HintPadPage } from '../../pages/hint-pad/page-hint-pad'

export enum BOARD_CELL {
        NIL = -1,
        OFF = 0,
        ON = 1
}
export enum GAME_STATUS {
        SETUP,
        GAME,
        OVER
}

export type BoardSide = 'L' | 'R' | 'T' | 'B'

export const
    BOARD_SIDE = {
        LEFT: <BoardSide> 'L',
        RIGHT: <BoardSide> 'R',
        TOP: <BoardSide> 'T',
        BOTTOM: <BoardSide> 'B'
    },
    BOARD_PART = {
        HINT_TOP: 'top-hint',
        HINT_BOTTOM: 'bottom-hint',
        HINT_LEFT: 'left-hint',
        HINT_RIGHT: 'right-hint',
        DATA: 'data'
    },
    BOARD_KEY = 'board',
    SOLVED_KEY= 'solved'


export type Point = {
    x: number,
    y: number
}

export type HintCell = {
    hint: number
}

type BoardDataItem = {
    value: number
}
export type BoardData = BoardDataItem[][]

export type Board = {
    nr: string,
    boardData: BoardData,
    columnHints: ColumnHints,
    rowHints: RowHints,
    static: boolean,
    solved?: boolean
}

export type SavedBoardData = {
    boardData: BoardData,
    solved: boolean
}

export type SerializedBoard = {
    boardData: BoardData,
    columnHints: { hints: HintCell [][] },
    rowHints: { hints: HintCell[][] },
    static: boolean
}


@Injectable()
export class GameProvider {

    columnHints: ColumnHints
    rowHints: RowHints
    undoData: UndoData

    constructor(
        public localStorage: LocalStorageProvider) {

        this.columnHints = new ColumnHints(this)
        this.rowHints = new RowHints(this)
        this.undoData = new UndoData(this)

        // initialize all static boards
        this.allBoards = this.initAllBoards()
        // append saved boards to static boards
        this.loadSavedBoards()
    }

    allBoards: Board[][] = []
    savedBoards: SerializedBoard[] = []

    sourceBoard: Board
    savedBoardIndex = 0
    boardStatus: GAME_STATUS = GAME_STATUS.OVER
    boardSize: Point = { x: 0, y: 0 }

    boardData: BoardData = []

    loadSavedBoards() {
        let board: SerializedBoard
        let index = 0
        do {
            board = this.localStorage.getObject(BOARD_KEY.concat(index.toString())) as SerializedBoard
            if (board) {
                this.savedBoards.push(board)
                index++
            }
        } while (board)
        this.allBoards.push(this.savedBoards as Board[])
    }

    initAllBoards(): Board[][] {
        return staticBoards.map((stage) => {
            return stage.map((board) => {
                let boardData: BoardData = []
                let boardSolved = false
                let width = board.columnHintData.length
                let height = board.rowHintData.length

                let savedData = this.localStorage.getObject(SOLVED_KEY.concat(board.nr)) as SavedBoardData

                if (savedData) {
                    boardData = savedData.boardData
                    boardSolved = savedData.solved
                } else {
                    for (let y = 0; y < height; y++) {
                        boardData.push(new Array())
                        for (let x = 0; x < width; x++) {
                            boardData[y].push({value: BOARD_CELL.NIL})
                        }
                    }
                }

                let columnHints = new ColumnHints(this)
                columnHints.hints = board.columnHintData.map(function(col) {
                    return col.map((value) => {
                        return { hint: value }
                    })
                })

                let rowHints = new RowHints(this)
                rowHints.hints = board.rowHintData.map(function(row) {
                    return row.map((value) => {
                        return { hint: value }
                    })
                })

                return {
                    nr: board.nr,
                    boardData: boardData,
                    columnHints: columnHints,
                    rowHints: rowHints,
                    static: true,
                    solved: boardSolved
                }
            })
        })
    }


    // todo should go to controller
    setBoardSize() {
        let width = this.boardData[0].length, height = this.boardData.length
        this.boardSize.x = width * 26 + Math.floor(width / 5) + this.rowHints.getMaxIndexInLine() * 26 * 2
        this.boardSize.y = height * 26 + Math.floor(height / 5) + this.columnHints.getMaxIndexInLine() * 26 * 2
        // console.log(`board size ${boardSize.x}:${boardSize.y}`)
    }

    setBoardData(y: number, x: number, value: BOARD_CELL) {
        this.undoData.addItem({
            y: y,
            x: x,
            was: this.boardData[y][x].value,
            is: value
        })
        return this.boardData[y][x].value = value
    }

    checkGame(check: boolean) {
        if (this.boardStatus === GAME_STATUS.GAME) {
            let allColsMatch = this.columnHints.allLinesMatch(check)
            let allRowsMatch = this.rowHints.allLinesMatch(check)
            if (allColsMatch && allRowsMatch) {
                this.boardStatus = GAME_STATUS.OVER
                this.sourceBoard.solved = true
                console.log(`Game solved!`)
            }
        }
    }

    saveBoard(board?: Board) {
        if (!board) board = this.sourceBoard
        this.localStorage.setObject(SOLVED_KEY.concat(board.nr), { 
            boardData: board.boardData, 
            solved: board.solved 
        })
    }

    resetBoard(width?: number, height?: number) {
        width = width || this.boardData[0].length
        height = height || this.boardData.length

        this.boardData.splice(0, this.boardData.length)
        for (let y = 0; y < height; y++) {
            this.boardData.push(new Array())
            for (let x = 0; x < width; x++) {
                this.boardData[y].push({ value: BOARD_CELL.NIL })
            }
        }
        this.columnHints.reset()
        this.rowHints.reset()
        this.undoData.reset()
        if (this.sourceBoard) {
            this.sourceBoard.solved = false
        }
        if (this.boardStatus !== GAME_STATUS.SETUP) {
            this.boardStatus = GAME_STATUS.GAME
        }
    }

    initWithSize(width: number, height: number, status: GAME_STATUS) {
        this.sourceBoard = null
        this.boardData = []
        this.savedBoardIndex = this.savedBoards.length
        this.boardStatus = status
        this.columnHints.init(width)
        this.rowHints.init(height)
        this.resetBoard(width, height)
        this.setBoardSize()
    }

    initFromSaved(board: Board, status: GAME_STATUS) {
        this.sourceBoard = board
        this.boardData = board.boardData
        let width = this.boardData[0].length
        let height = this.boardData.length
        this.savedBoardIndex = this.savedBoards.indexOf(board)
        this.boardStatus = status
        // TODO should go to ColumnHints and RowHints
        this.columnHints.assign(board.columnHints)
        this.rowHints.assign(board.rowHints)
        this.setBoardSize()
        this.checkGame(true)
    }

    //     checkBoard: checkGame

    setBoardXY(x: number, y: number, value: BOARD_CELL) {
        this.setBoardData(y, x, value)
        this.columnHints.checkLine(x)
        this.rowHints.checkLine(y)
        this.checkGame(false)
    }

    finishBoard() {
        for (let y = 0; y < this.boardData.length; y++) {
            for (let x = 0; x < this.boardData[y].length; x++) {
                if (this.boardData[y][x].value === BOARD_CELL.NIL) {
                    this.setBoardXY(x, y, BOARD_CELL.OFF)
                }
            }
        }
    }

    saveCurrentBoard() {
        let board: SerializedBoard = {
            boardData: this.boardData,
            columnHints: { hints: this.columnHints.hints },
            rowHints: { hints: this.rowHints.hints },
            static: false
        }
        this.localStorage.setObject(`${BOARD_KEY}${this.savedBoardIndex}`, board)
        if (this.savedBoardIndex < this.savedBoards.length) {
            this.savedBoards[this.savedBoardIndex] = board
        } else {
            this.savedBoards.push(board)
        }
    }

    deleteCurrentBoard() {
        for (let i = this.savedBoardIndex + 1; i < this.savedBoards.length; i++) {
            if (!this.savedBoards[i].static) {
                this.localStorage.setObject(`${BOARD_KEY}${i - 1}`, this.savedBoards[i])
            }
        }
        this.localStorage.delete(`${BOARD_KEY}${this.savedBoards.length - 1}`)
            this.savedBoards.splice(this.savedBoardIndex, 1)
    }
}



export interface IHints {
    getHintXY(x: number, y: number, side: BoardSide): string
    setHintXY(x: number, y: number, side: BoardSide, value: string): Point
    canMove(hintPad: HintPadPage, dir: string): boolean
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

    public assign(newHints: Hints) {
        this.hints = newHints.hints
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
        let variant = Array(hintLength)

        /*
        This variable holds the common result after applying all variants.
        All cells that stay on or off across all variants will be on or off
        in the solution.
        */
        let solution = Array(dataLength)

        /*
        This variable holds a copy of the target board line
        */
        let boardLine = Array(dataLength)

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
                let piece = {
                    start: offset,
                    end: offset + self.hints[lineIndex][indexInLine].hint - 1
                }
                // if the piece goes beyond column limit, the building is not possible
                if (piece.end >= dataLength) return false
                variant[indexInLine] = piece
                // next piece should start by skipping 1 cell after this one
                offset = piece.end + 2
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
            if (hintLength > 0 && !variant[0]) {
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
                if (variantIndex >= hintLength || solutionIndex < variant[variantIndex].start) {
                    // apply to cells outside of variant pieces
                    solution[solutionIndex] = (solution[solutionIndex] === undefined || solution[solutionIndex] === BOARD_CELL.OFF) ? BOARD_CELL.OFF : BOARD_CELL.NIL
                } else if (solutionIndex <= variant[variantIndex].end) {
                    // apply to cells inside the variant pieces
                    solution[solutionIndex] = (solution[solutionIndex] === undefined || solution[solutionIndex] === BOARD_CELL.ON) ? BOARD_CELL.ON : BOARD_CELL.NIL
                    // moving to the next piece
                    if (solutionIndex === variant[variantIndex].end) {
                        variantIndex++
                    }
                }
                // if at least one cell is set or unset, the solution is applicable
                if (solution[solutionIndex] !== BOARD_CELL.NIL) solutionApplicable = true
            }
            //console.log(`Solution: ${solution}`)

            return solutionApplicable
        }

        /*
        Applies <solution> to the board column.
        Copies only the cells set to on or off.
        */
        function applySolutionToBoard() {
            self.game.undoData.startBlock()
            for (let solutionIndex = 0; solutionIndex < dataLength; solutionIndex++) {
                if (solution[solutionIndex] === BOARD_CELL.OFF || solution[solutionIndex] === BOARD_CELL.ON) {
                    self.setBoardDataValue(lineIndex, solutionIndex, solution[solutionIndex])
                }
            }
            self.game.undoData.endBlock()
            self.checkLine(lineIndex)
            self.game.checkGame(false)
        }

        // main algorithm (self explanatory)
        let variantsFound = 0
        let time = performance.now()

        createBoardLine()
        while (buildNextVariant()) {
            if (!variantConflictsWithBoard()) {
                variantsFound++
                if (!applyVariantToSolution()) break
            }
        }
        applySolutionToBoard()

        // logging stats
        time = (performance.now() - time) / 1000
        if (variantsFound > 0) {
            console.log(`${variantsFound} variant(s) found in ${time.toFixed(3)}s`)
        } else {
            console.warn(`No variants found in ${time.toFixed(3)}s`)
        }
    } // solveLine

}



export class ColumnHints extends Hints implements IHints {

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

    public canMove(hintPad: HintPadPage, dir: string): boolean {
        switch (dir) {
            case 'U': return hintPad.hintPos.y > 0
            case 'D': return hintPad.hintPos.y < this.getMaxIndexInLine() - 1
            case 'L': return hintPad.hintPos.x > 0
            case 'R': return hintPad.hintPos.x < this.hints.length - 1
        }
        return false
    }
}



export class RowHints extends Hints implements IHints {

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

    public canMove(hintPad: HintPadPage, dir: string): boolean {
        switch (dir) {
            case 'U': return hintPad.hintPos.y > 0
            case 'D': return hintPad.hintPos.y < this.hints.length - 1
            case 'L': return hintPad.hintPos.x > 0
            case 'R': return hintPad.hintPos.x < this.getMaxIndexInLine() - 1
        }
        return false
    }
}



type UndoListAtom = {
    x: number,
    y: number,
    was: BOARD_CELL,
    is: BOARD_CELL
}
type UndoListItem = UndoListAtom | Array<UndoListAtom>

export class UndoData {
    list: UndoListItem[] = []
    index = 0

    constructor(private game: GameProvider) {}

    reset() {
        this.list = []
        this.index = 0
    }


    getCurrentItem(): UndoListItem {
        return (this.index < this.list.length) ? this.list[this.index] : null
    }


    setCurrentItem(value: UndoListItem) {
        if (this.index < this.list.length) {
            this.list[this.index] = value
        } else {
            this.list.push(value)
        }
    }


    startBlock() {
        this.setCurrentItem([])
    }


    endBlock() {
        let current = this.getCurrentItem() as UndoListAtom[]
        if (Array.isArray(current) && current.length) {
            this.index++
            //console.log(`undo block (${current.length}) added, list(${this.list.length}), index: ${this.index}`)
        } else {
            this.list.splice(this.index, 1)
            //console.log(`undo block canceled, list(${this.list.length}), index: ${this.index}`)
        }
    }


    addItem(item: UndoListAtom) {
        let current = this.getCurrentItem()
        if (Array.isArray(current)) {
            current.push(item)
        } else {
            this.list.splice(this.index, this.list.length)
            this.list.push(item)
            this.index++
            //console.log(`undo item added, list(${this.list.length}), index: ${this.index}`)
        }
    }


    canUndo(): boolean {
        return (this.index > 0)
    }


    undo() {

        function doUndo(game, item) {
            game.boardData[item.y][item.x].value = item.was
        }

        this.index--
        let current = this.getCurrentItem()

        if (Array.isArray(current)) {
            for (let i in current) {
                doUndo(this.game, current[i])
            }
            //console.log(`lock undone, list(${this.list.length}), index: ${this.index}`)
        } else {
            doUndo(this.game, current)
            //console.log(`item undone, list(${this.list.length}), index: ${this.index}`)
        }
    }


    canRedo(): boolean {
        return (this.index < this.list.length)
    }


    redo() {

        function doRedo(game, item) {
            game.boardData[item.y][item.x].value = item.is
        }

        let current = this.getCurrentItem()
        this.index++

        if (Array.isArray(current)) {
            for (let i in current) {
                doRedo(this.game, current[i])
            }
            //console.log(`block redone, list(${this.list.length}), index: ${this.index}`)
        } else {
            doRedo(this.game, current)
            //console.log(`item redone, list(${this.list.length}), index: ${this.index}`)
        }
    }
}
