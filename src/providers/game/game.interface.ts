import { HintCell } from './hints.interface'
import { ColumnHints, RowHints } from './hints'

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

export const CELL_SIZE = 25
export const CELLS_IN_GROUP = 5

export const BOARD_SIDE = {
    LEFT: <BoardSide> 'L',
    RIGHT: <BoardSide> 'R',
    TOP: <BoardSide> 'T',
    BOTTOM: <BoardSide> 'B'
}
export const BOARD_PART = {
    HINT_TOP: 'top-hint',
    HINT_BOTTOM: 'bottom-hint',
    HINT_LEFT: 'left-hint',
    HINT_RIGHT: 'right-hint',
    DATA: 'data'
}
export const BOARD_KEY = 'board'
export const SOLVED_KEY= 'solved'

export interface Point {
    x: number
    y: number
}

export interface BoardDataItem {
    value: number
}
export type BoardData = BoardDataItem[][]

export interface Board {
    nr: string
    boardData: BoardData
    columnHints: ColumnHints
    rowHints: RowHints
    static: boolean
    solved?: boolean
}

export interface SavedBoardData {
    boardData: BoardData
    solved: boolean
}

export interface SerializedBoard {
    boardData: BoardData
    columnHints: {
        hints: HintCell[][]
    }
    rowHints: {
        hints: HintCell[][]
    }
    static: boolean
}
