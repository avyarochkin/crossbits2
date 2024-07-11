import { Injectable } from '@angular/core'
import { LocalStorageProvider } from '../local-storage/local-storage'
import { STATIC_BOARDS } from './data'
import {
    BOARD_CELL, BOARD_KEY, Board, BoardData, BoardDataItem, CELLS_IN_GROUP, CELL_SIZE,
    GAME_STATUS, Point, SOLVED_KEY, SerializedBoardData, SerializedBoard,
    SOLUTION_STATUS
} from './game.interface'
import { ColumnHints, RowHints } from './hints'
import { UndoStack } from './undo-stack'
import { GameSolver } from './game-solver'



@Injectable()
export class GameProvider {

    columnHints: ColumnHints
    rowHints: RowHints
    undoStack: UndoStack

    constructor(
        public localStorage: LocalStorageProvider
    ) {
        this.columnHints = new ColumnHints(this)
        this.rowHints = new RowHints(this)
        this.undoStack = new UndoStack(this)

        // initialize all static boards
        this.initAllStaticBoards()
        // append saved boards to static boards
        this.loadSavedBoards()
    }

    allBoards: Board[][] = []
    savedBoards: SerializedBoard[] = []

    sourceBoard?: Board
    savedBoardIndex = 0
    savedBoardNr: string
    boardStatus: GAME_STATUS = GAME_STATUS.OVER
    boardSize: Point = { x: 0, y: 0 }

    boardData: BoardData = []

    /**
     * Loads the data of custom boards at the time of initialization
     */
    loadSavedBoards() {
        let outOfBoards = false
        for (let index = 0; !outOfBoards; index++) {
            const board = this.localStorage.getObject<Board>(this.getBoardNameKey(index))
            if (board != null) {
                const savedData = this.localStorage.getObject<SerializedBoardData>(this.getBoardDataKey(board.nr))
                if (savedData != null) {
                    board.boardData = savedData.boardData
                    board.solved = savedData.solved
                }
                this.savedBoards.push(board)
            } else {
                outOfBoards = true
            }
        }
        this.allBoards.push(this.savedBoards as Board[])
    }

    /**
     * Loads board solutions for the backup to a file
     */
    boardDataToObject(): Record<string, SerializedBoardData> {
        const result = {}
        STATIC_BOARDS.forEach(stage =>
            stage
                .map(board => ({
                    nr: board.nr,
                    savedData: this.localStorage.getObject<SerializedBoardData>(this.getBoardDataKey(board.nr))
                }))
                .filter(({ savedData }) => savedData != null)
                .forEach(({ nr, savedData }) => {
                    result[nr] = savedData
                })
        )
        return result
    }

    savedBoardsToObject() {
        return this.savedBoards.map(board => ({
            nr: board.nr,
            columnHintData: board.columnHints.hints.map(hintLine =>
                hintLine.map(hint => hint.hint)
            ),
            rowHintData: board.rowHints.hints.map(hintLine =>
                hintLine.map(hint => hint.hint)
            )
        }))
    }

    initAllStaticBoards() {
        this.allBoards = STATIC_BOARDS.map((stage) => {
            return stage.map((board) => {
                let boardData: BoardData = []
                let boardSolved = false

                const savedData = this.localStorage.getObject<SerializedBoardData>(this.getBoardDataKey(board.nr))

                if (savedData != null) {
                    boardData = savedData.boardData
                    boardSolved = savedData.solved
                } else {
                    this.initBoardData(boardData, board.columnHintData.length, board.rowHintData.length)
                }

                const columnHints = new ColumnHints(this)
                columnHints.initWith(board.columnHintData.map(col =>
                    col.map(value => ({ hint: value }))
                ))

                const rowHints = new RowHints(this)
                rowHints.initWith(board.rowHintData.map(row =>
                    row.map(value => ({ hint: value }))
                ))

                return {
                    nr: board.nr,
                    boardData,
                    columnHints,
                    rowHints,
                    static: true,
                    solved: boardSolved
                }
            })
        })
    }


    // todo should go to controller
    setBoardSize() {
        const width = this.boardData[0].length, height = this.boardData.length
        this.boardSize.x = width * (CELL_SIZE + 1)
            + Math.floor(width / CELLS_IN_GROUP)
            + this.rowHints.getMaxIndexInLine() * (CELL_SIZE + 1) * 2
        this.boardSize.y = height * (CELL_SIZE + 1)
            + Math.floor(height / CELLS_IN_GROUP)
            + this.columnHints.getMaxIndexInLine() * (CELL_SIZE + 1) * 2
        // console.log(`board size ${boardSize.x}:${boardSize.y}`)
    }

    setBoardData(y: number, x: number, value: BOARD_CELL) {
        if (this.boardData[y][x].value === value) { return null }
        this.undoStack.addItem({
            y: y,
            x: x,
            was: this.boardData[y][x].value,
            is: value
        })
        return this.boardData[y][x].value = value
    }

    solveColumn(x: number) {
        this.undoStack.startBlock()
        this.columnHints.solveLine(x)
        this.undoStack.endBlock()
        this.columnHints.checkLine(x)
        this.checkGame(false)
    }

    solveRow(y: number) {
        this.undoStack.startBlock()
        this.rowHints.solveLine(y)
        this.undoStack.endBlock()
        this.rowHints.checkLine(y)
        this.checkGame(false)
    }

    async solveGame(updateBoard: () => void): Promise<SOLUTION_STATUS> {
        const gameSolver = new GameSolver(this.columnHints, this.rowHints)
        this.undoStack.startBlock()
        const solutionStatus = await gameSolver.solveGame(updateBoard)
        this.undoStack.endBlock()
        this.checkGame(false)
        // GameSolver does not check the final game status therefore checking it here
        return this.boardStatus === GAME_STATUS.OVER
            ? SOLUTION_STATUS.FINISHED
            : solutionStatus
    }

    checkGame(check: boolean) {
        if (this.sourceBoard == null) { return }
        if (this.boardStatus === GAME_STATUS.GAME) {
            const allColsMatch = this.columnHints.allLinesMatch(check)
            const allRowsMatch = this.rowHints.allLinesMatch(check)
            if (allColsMatch && allRowsMatch) {
                this.boardStatus = GAME_STATUS.OVER
                this.sourceBoard.solved = true
            }
        }
    }

    saveBoard() {
        if (this.sourceBoard == null) { return }
        this.localStorage.setObject(this.getBoardDataKey(this.sourceBoard.nr, this.savedBoardIndex), {
            boardData: this.sourceBoard.boardData,
            solved: this.sourceBoard.solved
        })
    }

    saveBoardData(nr: string, data: SerializedBoardData) {
        this.localStorage.setObject(this.getBoardDataKey(nr), data)
    }

    resetBoard(width?: number, height?: number) {
        const boardWidth = width ?? this.boardData[0].length
        const boardHeight = height ?? this.boardData.length

        this.boardData.splice(0, this.boardData.length)
        this.initBoardData(this.boardData, boardWidth, boardHeight)
        this.columnHints.reset()
        this.rowHints.reset()
        this.undoStack.reset()
        if (this.sourceBoard) {
            this.sourceBoard.solved = false
        }
        if (this.boardStatus !== GAME_STATUS.SETUP) {
            this.boardStatus = GAME_STATUS.GAME
        }
    }

    initWithSize(width: number, height: number, status: GAME_STATUS) {
        this.sourceBoard = undefined
        this.boardData = []
        this.savedBoardIndex = this.savedBoards.length
        this.savedBoardNr = this.newSavedBoardNr()
        this.boardStatus = status
        this.columnHints.init(width)
        this.rowHints.init(height)
        this.resetBoard(width, height)
        this.setBoardSize()
    }

    initFromSaved(board: Board, status: GAME_STATUS) {
        this.sourceBoard = board
        if (board.boardData.length === 0) {
            const boardWidth = board.columnHints.hints.length
            const boardHeight = board.rowHints.hints.length
            this.initBoardData(this.sourceBoard.boardData, boardWidth, boardHeight)
        }
        this.boardData = this.sourceBoard.boardData
        this.savedBoardIndex = this.savedBoards.indexOf(board)
        this.savedBoardNr = board.nr
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
        const board: SerializedBoard = {
            nr: this.savedBoardNr,
            boardData: [],
            columnHints: { hints: this.columnHints.getHints() },
            rowHints: { hints: this.rowHints.getHints() },
            static: false
        }
        this.localStorage.setObject(this.getBoardNameKey(this.savedBoardIndex), board)
        this.savedBoards[this.savedBoardIndex] = board
    }

    deleteCurrentBoard() {
        for (let i = this.savedBoardIndex + 1; i < this.savedBoards.length; i++) {
            if (!this.savedBoards[i].static) {
                this.localStorage.setObject(this.getBoardNameKey(i - 1), this.savedBoards[i])
            }
        }
        this.localStorage.delete(this.getBoardNameKey(this.savedBoards.length - 1))
        this.savedBoards.splice(this.savedBoardIndex, 1)
    }

    private getBoardDataKey(nr: string, index?: number) {
        return nr != null ? `${SOLVED_KEY}${nr}` : `${SOLVED_KEY}0.${index}`
    }

    private getBoardNameKey(index: number) {
        return `${BOARD_KEY}${index}`
    }

    private newSavedBoardNr() {
        const maxMinorNumber = this.savedBoards
            .map(board => Number(board.nr?.replace('0.', '')))
            .reduce((prev, curr) => Math.max(prev, curr), 0)
        return `0.${maxMinorNumber + 1}`
    }

    private initBoardData(boardData: BoardData, width: number, height: number) {
        for (let y = 0; y < height; y++) {
            boardData.push(new Array<BoardDataItem>())
            for (let x = 0; x < width; x++) {
                boardData[y].push({ value: BOARD_CELL.NIL })
            }
        }
    }
}



