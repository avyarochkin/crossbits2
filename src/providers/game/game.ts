import { Injectable } from '@angular/core'
import { LocalStorageProvider } from '../local-storage/local-storage'
import { STATIC_BOARDS } from './data'
import {
    BOARD_CELL, BOARD_KEY, Board, BoardData, CELLS_IN_GROUP, CELL_SIZE,
    GAME_STATUS, Point, SOLVED_KEY, SavedBoardData, SerializedBoard
} from './game.interface'
import { ColumnHints, RowHints } from './hints'
import { UndoStack } from './undo-stack'



@Injectable()
export class GameProvider {

    columnHints: ColumnHints
    rowHints: RowHints
    undoStack: UndoStack

    constructor(
        public localStorage: LocalStorageProvider) {

        this.columnHints = new ColumnHints(this)
        this.rowHints = new RowHints(this)
        this.undoStack = new UndoStack(this)

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
        return STATIC_BOARDS.map((stage) => {
            return stage.map((board) => {
                let boardData: BoardData = []
                let boardSolved = false
                const width = board.columnHintData.length
                const height = board.rowHintData.length

                const savedData = this.localStorage.getObject(SOLVED_KEY.concat(board.nr)) as SavedBoardData

                if (savedData) {
                    boardData = savedData.boardData
                    boardSolved = savedData.solved
                } else {
                    for (let y = 0; y < height; y++) {
                        boardData.push(new Array())
                        for (let x = 0; x < width; x++) {
                            boardData[y].push({ value: BOARD_CELL.NIL })
                        }
                    }
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

    checkGame(check: boolean) {
        if (this.boardStatus === GAME_STATUS.GAME) {
            const allColsMatch = this.columnHints.allLinesMatch(check)
            const allRowsMatch = this.rowHints.allLinesMatch(check)
            if (allColsMatch && allRowsMatch) {
                this.boardStatus = GAME_STATUS.OVER
                this.sourceBoard.solved = true
                console.log('Game solved!')
            }
        }
    }

    saveBoard(board?: Board) {
        if (!board) {
            board = this.sourceBoard
        }
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
        this.undoStack.reset()
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
        const board: SerializedBoard = {
            boardData: this.boardData,
            columnHints: { hints: this.columnHints.getHints() },
            rowHints: { hints: this.rowHints.getHints() },
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



