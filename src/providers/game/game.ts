import { Injectable } from '@angular/core'
import { LocalStorageProvider } from '../local-storage/local-storage'
import { staticBoards } from './data'

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

export const
    BOARD_SIDE = {
        LEFT: 'L',
        RIGHT: 'R',
        TOP: 'T',
        BOTTOM: 'B'
    },
    BOARD_HINTKIND = {
        TOP: 'tophint',
        BOTTOM: 'bottomhint',
        LEFT: 'lefthint',
        RIGHT: 'righthint'
    },
    BOARD_KEY = 'board'

export type Point = {
    x: number,
    y: number
}

export type Cell = {
    hint: number
}

type BoardDataItem = {
    value: number
}
export type BoardData = BoardDataItem[][]

export type Board = {
    boardData: BoardData,
    columnHints: ColumnHints,
    rowHints: RowHints,
    static: boolean,
    solved?: boolean
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
    savedBoards: Board[] = []

    sourceBoard: Board
    boardIndex = 0
    boardStatus: GAME_STATUS = GAME_STATUS.OVER
    boardSize: Point = { x: 0, y: 0 }

    boardData: BoardData = []

    loadSavedBoards() {
        let board: Board
        let index = 0
        do {
            board = this.localStorage.getObject(BOARD_KEY.concat(index.toString()))
            if (board) {
                this.savedBoards.push(board)
                index++
            }
        } while (board)
        this.allBoards.push(this.savedBoards)
    }

    initAllBoards(): Board[][] {
        return staticBoards.map((stage) => {
            return stage.map((board) => {
                let boardData: BoardData = []
                let width = board.columnHintData.length
                let height = board.rowHintData.length

                for (let y = 0; y < height; y++) {
                    boardData.push(new Array())
                    for (let x = 0; x < width; x++) {
                        boardData[y].push({value: BOARD_CELL.NIL})
                    }
                }

                let columnHints = new ColumnHints(this)
                columnHints.col = board.columnHintData.map(function(col) {
                    return col.map((value) => {
                        return { hint: value }
                    })
                })

                let rowHints = new RowHints(this)
                rowHints.row = board.rowHintData.map(function(row) {
                    return row.map((value) => {
                        return { hint: value }
                    })
                })

                return {
                    boardData: boardData,
                    columnHints: columnHints,
                    rowHints: rowHints,
                    static: true
                }
            })
        })
    }


    // todo should go to controller
    setBoardSize() {
        let width = this.boardData[0].length, height = this.boardData.length
        this.boardSize.x = width * 26 + Math.floor(width / 5) + this.rowHints.getMaxX() * 26 * 2
        this.boardSize.y = height * 26 + Math.floor(height / 5) + this.columnHints.getMaxY() * 26 * 2
        // console.log('board size '+boardSize.x+':'+boardSize.y)
    }

    setBoardData(y: number, x: number, value: number) {
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
            let allColsMatch = this.columnHints.allColsMatch(check)
            let allRowsMatch = this.rowHints.allRowsMatch(check)
            if (allColsMatch && allRowsMatch) {
                this.boardStatus = GAME_STATUS.OVER
                this.sourceBoard.solved = true
                console.log('Game solved!')
            }
        }
    }

    resetBoard(width: number, height: number) {
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
        this.sourceBoard.solved = false
        if (this.boardStatus !== GAME_STATUS.SETUP) {
            this.boardStatus = GAME_STATUS.GAME
        }
    }

    initWithSize(width: number, height: number, status: GAME_STATUS) {
        this.boardData = []
        this.boardIndex = this.savedBoards.length
        this.boardStatus = status

        this.columnHints.col = new Array(width)
        // this.columnHints.maxCol = Array(height)
        for (let x = 0; x < this.columnHints.col.length; x++) {
            this.columnHints.col[x] = []
        }

        this.rowHints.row = new Array(height)
        // this.rowHints.maxRow = Array(width)
        for (let y = 0; y < this.rowHints.row.length; y++) {
            this.rowHints.row[y] = []
        }
        this.resetBoard(width, height)
        this.setBoardSize()
    }

    initFromSaved(board: Board, status: GAME_STATUS) {
        this.sourceBoard = board
        this.boardData = board.boardData
        let width = this.boardData[0].length
        let height = this.boardData.length
        this.boardIndex = this.savedBoards.indexOf(board)
        this.boardStatus = status
        this.columnHints.col = board.columnHints.col
        this.columnHints.matching = new Array(width)
        // this.columnHints.maxCol = Array(height)
        this.rowHints.row = board.rowHints.row
        this.rowHints.matching = new Array(height)
        // this.rowHints.maxRow = Array(width)
        this.setBoardSize()
        this.checkGame(true)
    }

    //     checkBoard: checkGame

    setBoardXY(x: number, y: number, value: number) {
        this.setBoardData(y, x, value)
        this.columnHints.checkCol(x)
        this.rowHints.checkRow(y)
        this.checkGame(false)
    }

    saveCurrentBoard() {
        let board = {
            boardData: this.boardData,
            columnHints: this.columnHints,
            rowHints: this.rowHints,
            static: false
        }
        localStorage.setObject(`${BOARD_KEY}${this.boardIndex}`, board)
        if (this.boardIndex < this.savedBoards.length) {
            this.savedBoards[this.boardIndex] = board
        } else {
            this.savedBoards.push(board)
        }
    }

    deleteCurrentBoard() {
        for (let i = this.boardIndex + 1; i < this.savedBoards.length; i++) {
            if (!this.savedBoards[i].static) {
                localStorage.setObject(`${BOARD_KEY}${i - 1}`, this.savedBoards[i])
            }
        }
        localStorage.delete(`${BOARD_KEY}${this.savedBoards.length - 1}`)
            this.savedBoards.splice(this.boardIndex, 1)
    }
}


export class ColumnHints {

    col: Cell[][] = []
    matching: boolean[] = []

    constructor(
        private game: GameProvider) {}

    getHint(x: number, y: number, side: string): string {
        if (side === BOARD_SIDE.TOP) {
            y -= this.getMaxY() - this.col[x].length
        }
        return (y < 0) ? '' : (y < this.col[x].length) ? this.col[x][y].hint.toString() : ''
    }

    private maxCol: boolean[] = []

    iterable(): boolean[] {
        this.maxCol.length = this.getMaxY()
        return this.maxCol
    }

    getMaxY(): number {
        let maxY = Math.floor((this.game.boardData.length + 1) / 2)
        return Math.min(this.getLongestColLength() + ((this.game.boardStatus === GAME_STATUS.SETUP) ? 1 : 0), maxY)
    }

    getLongestColLength(): number {
        return this.col.reduce((a, b) => {
            return Math.max(a, b.length)
        }, 0)
    }

    setHint(x: number, y: number, side: string, value: string): Point {
        let result = { x: x, y: y }
        let last = false

        if (side === BOARD_SIDE.TOP) {
            y -= this.getMaxY() - this.col[x].length
            if (y < 0) {
                this.col[x].splice(0, 0, { hint: 0 })
                y = 0
            }
            last = (!y)
            result.y = y + this.getMaxY() - this.col[x].length
        } else {
            if (y >= this.col[x].length) {
                this.col[x].push({ hint: 0 })
                y = this.col[x].length - 1
            }
            last = (y === this.col[x].length - 1)
            result.y = y
        }

        if (value) {
            this.col[x][y].hint = parseInt(value)
            console.log('columnHints[' + x + ',' + y + ']=' + this.col[x][y].hint)
        } else if (last) {
            this.col[x].splice(y, 1)
        }
        this.game.setBoardSize()

        return result
    }

    checkCol(x: number) {
        let chainLength = 0, hintIndex = 0, match = true
        let boardHeight = this.game.boardData.length, hintCol = this.col[x], hintSize = hintCol.length

        for (let y = 0; match && y < boardHeight; y++) {
            if (this.game.boardData[y][x].value === BOARD_CELL.ON) {
                chainLength++
                if (y === boardHeight - 1 || this.game.boardData[y + 1][x].value !== BOARD_CELL.ON) {
                    match = (hintIndex < hintSize && hintCol[hintIndex].hint === chainLength)
                    hintIndex++
                }
            } else {
                chainLength = 0
            }
        }
        this.matching[x] = match && (hintIndex === hintSize)
    }

    allColsMatch(check: boolean): boolean {
        let matching = true
        for (let x = 0; x < this.matching.length; x++) {
            if (check) this.checkCol(x)
            matching = matching && this.matching[x]
        }
        return matching
    }

    // try to solve the board column based on the hint values
    solveCol(x: number) {
        let self = this
        let dataLength = this.game.boardData.length // height
        let hintLength = self.col[x].length

        /*
        This variable holds one particular variant of all pieces that can be
        allocated in column "x" according to its hint. The veriable represents
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
        Tries to build a valid variant by starting with the hint [startIndex]
        and placing the first piece into the column at [offset]. Then places
        all remaining pieces according to the next hints to the next possible
        places.
        Returns "true" if could build a valid variant and "false" if not.
        buildVariant(0, 0) builds the first possible variant for all hints.
        */
        function buildVariant(startIndex: number, offset: number) {
            for (let index = startIndex; index < hintLength; index++) {
                let piece = {
                    start: offset,
                    end: offset + self.col[x][index].hint - 1
                }
                // if the piece goes beyond column limit, the building is not possible
                if (piece.end >= dataLength) return false
                variant[index] = piece
                // next piece should start by skipping 1 cell after this one
                offset = piece.end + 2
            }
            // all pieces are built successfully
            return true
        }

        /*
        Tries to build the next variant based on the current state of <variant>
        variable. Tries to shift the last piece forfward, then second last and
        so on as long as the variant remains valid.
        If <variant> variable is not initialized, tries to build the first one.
        Returns "true" if could build a valid variant and "false" if not.
        */
        function buildNextVariant() {
            // if not initialized, build the first variant
            if (!variant[0]) {
                return buildVariant(0, 0)
            }
            // try to shift a piece one cell forward starting with the last one
            for (let index = hintLength - 1; index >= 0; index--) {
                if (buildVariant(index, variant[index].start + 1)) return true
            }
            // all pieces are shifted to their last position - cannot build a new variant
            return false
        }

        /*
        Checks if <variant> conflicts with any column cells set to on/off.
        Returns "true" if conflict found and "false" if not.
        */
        function variantConflictsWithBoard() {
            let index = 0, conflict = false
            for (let y = 0; y < dataLength && !conflict; y++) {
                if (index >= hintLength || y < variant[index].start) {
                    // check conflict with cells outside of variant pieces
                    conflict = (this.game.boardData[y][x].value === BOARD_CELL.ON)
                } else if (y <= variant[index].end) {
                    // check conflict with cells inside the variant pieces
                    conflict = (this.game.boardData[y][x].value === BOARD_CELL.OFF)
                    // moving to the next piece
                    if (y === variant[index].end) {
                        index++
                    }
                }
            }
            //console.log(variant.map(function(item){
            //    return item.start+':'+item.end
            //}) + ' - ' + (conflict ? 'conflict' : 'OK'))

            return conflict
        }

        /*
        Applies <variant> to <solution>. All cells that stay on or off across
        all variants will be set to on or off in the solution.
        */
        function applyVariantToSolution() {
            let index = 0
            for (let y = 0; y < dataLength; y++) {
                if (index >= hintLength || y < variant[index].start) {
                    // apply to cells outside of variant pieces
                    solution[y] = (solution[y] === undefined || solution[y] === BOARD_CELL.OFF) ? BOARD_CELL.OFF : BOARD_CELL.NIL
                } else if (y <= variant[index].end) {
                    // apply to cells inside the variant pieces
                    solution[y] = (solution[y] === undefined || solution[y] === BOARD_CELL.ON) ? BOARD_CELL.ON : BOARD_CELL.NIL
                    // moving to the next piece
                    if (y === variant[index].end) {
                        index++
                    }
                }
            }
            //console.log('Solution: ' + solution)
        }

        /*
        Applies <solution> to the board column.
        Copies only the cells set to on or off.
        */
        function applySolutionToBoard() {
            this.game.undoData.startBlock()
            for (let y = 0; y < dataLength; y++) {
                if (solution[y] === BOARD_CELL.OFF || solution[y] === BOARD_CELL.ON) {
                    this.game.setBoardData(y, x, solution[y])
                    this.game.rowHints.checkRow(y)
                }
            }
            this.game.undoData.endBlock()
            self.checkCol(x)
            this.game.checkGame(false)
        }

        // main algorithm (self explanatory)
        while (buildNextVariant()) {
            if (!variantConflictsWithBoard()) {
                applyVariantToSolution()
            }
        }
        applySolutionToBoard()
    } // solveCol

    reset() {
        this.matching = new Array(this.col.length)
    }
}



export class RowHints {

    game: GameProvider
    row: Cell[][] = []
    matching: boolean[] = []

    constructor(game: GameProvider) {
        this.game = game
    }

    getHint(y: number, x: number, side: string): string {
        if (side === BOARD_SIDE.LEFT) {
            x -= this.getMaxX() - this.row[y].length
        }
        return (x < 0) ? '' : (x < this.row[y].length) ? this.row[y][x].hint.toString() : ''
    }

    private maxRow: boolean[] = []

    iterable(): boolean[] {
        this.maxRow.length = this.getMaxX()
        return this.maxRow
    }

    getMaxX(): number {
        let maxX = Math.floor((this.game.boardData[0].length + 1) / 2)
        return Math.min(this.getLongestRowLength() + ((this.game.boardStatus === GAME_STATUS.SETUP) ? 1 : 0), maxX)
    }

    getLongestRowLength(): number {
        return this.row.reduce((a, b) => {
            return Math.max(a, b.length)
        }, 0)
    }

    setHint(y: number, x: number, side: string, value): Point {
        let result = { x: x, y: y }
        let last = false

        if (side === BOARD_SIDE.LEFT) {
            x -= this.getMaxX() - this.row[y].length
            if (x < 0) {
                this.row[y].splice(0, 0, { hint: 0 })
                x = 0
            }
            last = (!x)
            result.x = x + this.getMaxX() - this.row[y].length
        } else {
            if (x >= this.row[y].length) {
                this.row[y].push({ hint: 0 })
                x = this.row[y].length - 1
            }
            last = (x === this.row[y].length - 1)
            result.x = x
        }

        if (value) {
            this.row[y][x].hint = parseInt(value)
            console.log('rowHints[' + x + ',' + y + ']=' + this.row[y][x].hint)
        } else if (last) {
            this.row[y].splice(x, 1)
        }
        this.game.setBoardSize()

        return result
    }

    checkRow(y: number) {
        let chainLength = 0, hintIndex = 0, match = true
        let boardWidth = this.game.boardData[0].length, hintRow = this.row[y], hintSize = hintRow.length

        for (let x = 0; match && x < boardWidth; x++) {
            if (this.game.boardData[y][x].value === BOARD_CELL.ON) {
                chainLength++
                if (x === boardWidth - 1 || this.game.boardData[y][x + 1].value !== BOARD_CELL.ON) {
                    match = (hintIndex < hintSize && hintRow[hintIndex].hint === chainLength)
                    hintIndex++
                }
            } else {
                chainLength = 0
            }
        }
        this.matching[y] = match && (hintIndex === hintSize)
    }

    allRowsMatch(check: boolean): boolean {
        let matching = true
        for (let y = 0; y < this.matching.length; y++) {
            if (check) this.checkRow(y)
            matching = matching && this.matching[y]
        }
        return matching
    }

    // try to solve the board row based on the hint values
    solveRow(y: number) {
        let self = this
        let dataLength = this.game.boardData[0].length // width
        let hintLength = self.row[y].length
        let variant = Array(hintLength)
        let solution = Array(dataLength)

        function buildVariant(startIndex, offset) {
            for (let index = startIndex; index < hintLength; index++) {
                let piece = {
                    start: offset,
                    end: offset + self.row[y][index].hint - 1
                }
                if (piece.end >= dataLength) return false
                variant[index] = piece
                offset = piece.end + 2
            }
            return true
        }

        function buildNextVariant() {
            if (!variant[0]) {
                return buildVariant(0, 0)
            }
            for (let index = hintLength - 1; index >= 0; index--) {
                if (buildVariant(index, variant[index].start + 1)) return true
            }
            return false
        }

        function variantConflictsWithBoard() {
            let index = 0, conflict = false
            for (let x = 0; x < dataLength && !conflict; x++) {
                if (index >= hintLength || x < variant[index].start) {
                    conflict = (this.game.boardData[y][x].value === BOARD_CELL.ON)
                } else if (x <= variant[index].end) {
                    conflict = (this.game.boardData[y][x].value === BOARD_CELL.OFF)
                    if (x === variant[index].end) {
                        index++
                    }
                }
            }
            //console.log(variant.map(function(item){
            //    return item.start+':'+item.end
            //}) + ' - ' + (conflict ? 'conflict' : 'OK'))

            return conflict
        }

        function applyVariantToSolution() {
            let index = 0
            for (let x = 0; x < dataLength; x++) {
                if (index >= hintLength || x < variant[index].start) {
                    solution[x] = (solution[x] === undefined || solution[x] === BOARD_CELL.OFF) ? BOARD_CELL.OFF : BOARD_CELL.NIL
                } else if (x <= variant[index].end) {
                    solution[x] = (solution[x] === undefined || solution[x] === BOARD_CELL.ON) ? BOARD_CELL.ON : BOARD_CELL.NIL
                    if (x === variant[index].end) {
                        index++
                    }
                }
            }
            //console.log('Solution: ' + solution)
        }

        function applySolutionToBoard() {
            this.game.undoData.startBlock()
            for (let x = 0; x < dataLength; x++) {
                if (solution[x] === BOARD_CELL.OFF || solution[x] === BOARD_CELL.ON) {
                    this.game.setBoardData(y, x, solution[x])
                    this.game.columnHints.checkCol(x)
                }
            }
            this.game.undoData.endBlock()
            self.checkRow(y)
            this.game.checkGame(false)
        }

        // main algorithm (self explanatory)
        while (buildNextVariant()) {
            if (!variantConflictsWithBoard()) {
                applyVariantToSolution()
            }
        }
        applySolutionToBoard()
    }

    reset() {
        this.matching = new Array(this.row.length)
    }
}



type UndoListAtom = {
    x: number,
    y: number,
    was: number,
    is: number
}
type UndoListItem = UndoListAtom | Array<UndoListAtom>

export class UndoData {
    list: UndoListItem[] = []
    index: 0

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
        if (current.length) {
            this.index++
            console.log(`undo block (${current.length}) added, list(${this.list.length}), index: ${this.index}`)
        } else {
            this.list.splice(this.index, 1)
            console.log(`undo block canceled, list(${this.list.length}), index: ${this.index}`)
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
            console.log(`undo item added, list(${this.list.length}), index: ${this.index}`)
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
            for (let i = 0; i < current.length; i++) {
                doUndo(this.game, current[i])
            }
            console.log(`lock undone, list(${this.list.length}), index: ${this.index}`)
        } else {
            doUndo(this.game, current)
            console.log(`item undone, list(${this.list.length}), index: ${this.index}`)
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
            for (let i = 0; i < current.length; i++) {
                doRedo(this.game, current[i])
            }
            console.log(`block redone, list(${this.list.length}), index: ${this.index}`)
        } else {
            doRedo(this.game, current)
            console.log(`item redone, list(${this.list.length}), index: ${this.index}`)
        }
    }
}
