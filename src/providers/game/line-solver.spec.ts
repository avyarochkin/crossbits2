import { LineSolver } from './line-solver'
import { Hints, RowHints } from './hints'
import { GameProvider } from './game'
import { HintCell } from './hints.interface'
import { BOARD_CELL } from './game.interface'

jest.mock('./hints')

describe('LineSolver', () => {
    let solver: LineSolver
    let mockHints: RowHints
    let boardData: BOARD_CELL[]
    const hintsData: HintCell[][] = []
    const emptyLine = (length: number) => Array.from({ length }, () => -1)
    const hintCellsFrom = (numbers: number[]) => numbers.map(hint => ({ hint }))

    jest.mocked(RowHints, { shallow: true }).mockImplementation(() => ({
        hints: hintsData,
        getBoardLength: () => boardData.length,
        getBoardDataValue: (lineIndex: number, indexInLine: number) => BOARD_CELL.NIL,
        setBoardDataValue: (lineIndex: number, indexInLine: number, value: BOARD_CELL) => {
            boardData[indexInLine] = value
        },
        getNumberOfCombinations: (lineIndex: number) => 1
    } as Hints))

    beforeEach(() => {
        solver = new LineSolver()
        mockHints = new RowHints({} as GameProvider)
        boardData = new Array<BOARD_CELL>()
    })

    it('should create LineSolver instance', () => {
        expect(solver).toBeInstanceOf(LineSolver)
    })

    it('should solve this line fully', () => {
        // ******** -> 1 2 3 -> X-XX-XXX
        boardData = emptyLine(8)
        hintsData[0] = hintCellsFrom([1, 2, 3])
        solver.solveLine(mockHints, 0)
        expect(boardData).toEqual([1, 0, 1, 1, 0, 1, 1, 1])
    })

    it('should solve this line partially', () => {
        // ********* -> 2 2 2 -> *X**X**X*
        boardData = emptyLine(9)
        hintsData[0] = hintCellsFrom([2, 2, 2])
        solver.solveLine(mockHints, 0)
        expect(boardData).toEqual([-1, 1, -1, -1, 1, -1, -1, 1, -1])
    })

    it('should not solve a line if it has no solutions', () => {
        // ********* -> 3 3 3 -> *********
        boardData = emptyLine(9)
        hintsData[0] = hintCellsFrom([3, 3, 3])
        solver.solveLine(mockHints, 0)
        expect(boardData).toEqual(emptyLine(9))
    })

    it('should not solve a line if hints have too many combinations', () => {
        // *****(37)***** -> 1 1 1 1 1 1 1 1 1 1 1 -> *****(37)*****
        boardData = emptyLine(37)
        hintsData[0] = hintCellsFrom([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
        solver.solveLine(mockHints, 0)
        expect(boardData).toEqual(emptyLine(37))
    })

    it('should give up due to insufficient variant coverage', () => {
        // ******** -> 1 1 1 -> ********
        boardData = emptyLine(8)
        hintsData[0] = hintCellsFrom([1, 1, 1])
        solver.solveLine(mockHints, 0)
        expect(boardData).toEqual(emptyLine(8))
    })

    it('should give up after 10,000,000 msec', () => {

        jest.spyOn(performance, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValue(10_000_001)
        // ******** -> 1 2 3 -> ********
        boardData = emptyLine(8)
        hintsData[0] = [1, 2, 3].map(hint => ({ hint }))
        solver.solveLine(mockHints, 0)
        expect(boardData).toEqual(emptyLine(8))
    })
})