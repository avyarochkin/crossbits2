import { Injectable } from '@angular/core'
import { LocalStorageProvider } from '../local-storage/local-storage'
import { staticBoards } from './data'
import { HintCell, ColumnHints, RowHints } from './hints'
import { UndoStack } from './undo-stack'

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

type BoardDataItem = {
    value: number
}
export type BoardData = BoardDataItem[][]

export class Board {
    nr: string
    boardData: BoardData
    columnHints: ColumnHints
    rowHints: RowHints
    static: boolean
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
                columnHints.initWith(board.columnHintData.map(function(col) {
                    return col.map((value) => {
                        return { hint: value }
                    })
                }))

                let rowHints = new RowHints(this)
                rowHints.initWith(board.rowHintData.map(function(row) {
                    return row.map((value) => {
                        return { hint: value }
                    })
                }))

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
        this.undoStack.addItem({
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
        let board: SerializedBoard = {
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



