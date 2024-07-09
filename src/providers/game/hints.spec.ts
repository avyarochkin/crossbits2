import { LocalStorageProvider } from '../local-storage/local-storage'
import { GameProvider } from './game'
import { BOARD_SIDE, GAME_STATUS } from './game.interface'
import { ColumnHints, RowHints } from './hints'
import { HintCell } from './hints.interface'
import { LineSolver } from './line-solver'

jest.mock('./game')
jest.mock('./line-solver')

describe('Hints', () => {
    let columnHints: ColumnHints
    let rowHints: RowHints
    let mockGame: GameProvider
    let hints: HintCell[][]

    jest.mocked(GameProvider).mockImplementation(() => ({
        rowHints: {
            checkLine: (lineIndex) => { }
        },
        columnHints: {
            checkLine: (lineIndex) => { }
        },
        setBoardData: (y, x, value) => value,
        setBoardSize: () => { }
    }) as GameProvider)

    beforeEach(() => {
        hints = [
            [{ hint: 1 }, { hint: 2 }],
            [{ hint: 2 }, { hint: 1 }],
            [],
            [{ hint: 2 }],
            [{ hint: 2 }],
            [{ hint: 3 }]
        ]
        mockGame = new GameProvider({} as LocalStorageProvider)
        mockGame.boardStatus = GAME_STATUS.GAME
        mockGame.boardData = Array.from(
            { length: 4 },
            () => Array.from(
                { length: 6 },
                () => ({ value: -1 })
            )
        )

        jest.spyOn(mockGame, 'setBoardData')
        jest.spyOn(mockGame, 'setBoardSize')
    })

    describe('ColumnHints', () => {
        beforeEach(() => {
            jest.spyOn(mockGame.rowHints, 'checkLine')
            columnHints = new ColumnHints(mockGame)
            columnHints.initWith(hints)
        })

        it('should create ColumnHints instance', () => {
            expect(columnHints).toBeInstanceOf(ColumnHints)
        })

        it('should initialize hints by the length', () => {
            columnHints.init(6)
            expect(columnHints.getHints()).toEqual([[], [], [], [], [], []])
        })

        it('should initialize hints with provided hint cells', () => {
            expect(columnHints.getHints()).toBe(hints)
        })

        it('should assign hints from the given ColumnHints', () => {
            const fromColumnHints = { hints } as ColumnHints
            jest.spyOn(columnHints, 'reset')
            columnHints.assign(fromColumnHints)
            expect(columnHints.getHints()).toBe(fromColumnHints.hints)
            expect(columnHints.reset).toHaveBeenCalled()
        })

        it('should call solveLine at solver', () => {
            columnHints.solveLine(3)
            expect(LineSolver.prototype.solveLine).toHaveBeenCalledWith(columnHints, 3)
        })

        // ColumnHints methods

        it('should get board length', () => {
            const boardLength = columnHints.getBoardLength()
            expect(boardLength).toBe(4)
        })

        it('should get board data value', () => {
            mockGame.boardData[2][1] = { value: 1 }
            const value = columnHints.getBoardDataValue(1, 2)
            expect(value).toBe(1)
        })

        it('should set board data value', () => {
            columnHints.setBoardDataValue(1, 2, 1)
            expect(mockGame.setBoardData).toHaveBeenCalledWith(2, 1, 1)
            expect(mockGame.rowHints.checkLine).toHaveBeenCalledWith(2)
        })

        it('should get hint string for top side', () => {
            const hintXY = columnHints.getHintAt({ x: 0, y: 0, side: BOARD_SIDE.TOP })
            expect(hintXY).toEqual('1')
        })

        it('should get hint string for bottom side', () => {
            const hintXY = columnHints.getHintAt({ x: 0, y: 1, side: BOARD_SIDE.BOTTOM })
            expect(hintXY).toEqual('2')
        })
    })

    describe('RowHints', () => {
        beforeEach(() => {
            jest.spyOn(mockGame.columnHints, 'checkLine')
            rowHints = new RowHints(mockGame)
            rowHints.initWith(hints)
        })

        it('should check the given line and update matching', () => {
            mockGame.boardData[0] = [{ value: 1 }, { value: 0 }, { value: 1 }, { value: 1 }]
            rowHints.checkLine(0)
            expect(rowHints.matching[0]).toEqual(true)
        })

        it('should get board length', () => {
            const boardLength = rowHints.getBoardLength()
            expect(boardLength).toBe(6)
        })

        it('should get board data value', () => {
            mockGame.boardData[2][1] = { value: 1 }
            const value = rowHints.getBoardDataValue(2, 1)
            expect(value).toBe(1)
        })

        it('should set board data value', () => {
            rowHints.setBoardDataValue(1, 2, 1)
            expect(mockGame.setBoardData).toHaveBeenCalledWith(1, 2, 1)
            expect(mockGame.columnHints.checkLine).toHaveBeenCalledWith(2)
        })

        it('should get hint string for left side', () => {
            const hintXY = rowHints.getHintAt({ x: 0, y: 0, side: BOARD_SIDE.LEFT })
            expect(hintXY).toEqual('1')
        })

        it('should get hint string for right side', () => {
            const hintXY = rowHints.getHintAt({ x: 0, y: 1, side: BOARD_SIDE.RIGHT })
            expect(hintXY).toEqual('2')
        })
    })
})
