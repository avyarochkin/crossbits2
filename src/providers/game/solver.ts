/* eslint-disable no-console */
import { BOARD_CELL } from './game.interface'
import { VariantPiece } from './hints.interface'
import { combinations } from './game.utils'
import { Hints } from './hints'

const MAX_SOLVE_TIME_MSEC = 300_000 // 5 minutes
const MAX_COMBINATIONS = 10_000_000

export class LineSolver {
    private lineIndex: number
    private dataLength: number
    private hintLength: number
    private lastLineIndex?: number

    /**
     * This property contains one particular variant of all pieces that can be
     * allocated in column *x* according to its hint. *variant* represents
     * an array of pairs: { piece start index; piece end index }.
     * When building various variants this property gets initially populated
     * with the first variant and then gets updated to match the next variant.
     */
    private variant: VariantPiece[]

    /**
     * This property contains the common result after applying all variants.
     * All cells that stay on or off across all variants will be on or off
     * in the solution.
     */
    private solution: BOARD_CELL[]

    /**
     * This property contains a copy of the source board line
     */
    private boardLine: BOARD_CELL[]

    solveLine(ctx: Hints, lineIndex: number) {
        console.group(`Solving ${this.constructor.name}[${lineIndex}]`)
        this.lineIndex = lineIndex
        this.dataLength = ctx.getBoardLength() // height
        this.hintLength = ctx.hints[lineIndex].length
        const numberOfCombinations = this.getNumberOfCombinations(ctx)
        const tooManyCombinations = numberOfCombinations > MAX_COMBINATIONS && this.lastLineIndex !== lineIndex
        this.lastLineIndex = lineIndex

        if (tooManyCombinations) {
            console.warn(`${numberOfCombinations.toLocaleString()} possible variants. Are you sure?`)
            console.groupEnd()
            return
        } else {
            console.info(`${numberOfCombinations.toLocaleString()} possible variants`)
        }
        this.variant = new Array<VariantPiece>(this.hintLength)
        this.solution = new Array<BOARD_CELL>(this.dataLength)
        this.boardLine = new Array<BOARD_CELL>(this.dataLength)

        // main algorithm (self explanatory)
        let variantsFound = 0
        let givenUp = (this.hintLength === 0)
        const startTime = performance.now()

        this.createBoardLine(ctx)

        while (!givenUp && this.buildNextVariant(ctx)) {
            if (!this.variantConflictsWithBoard()) {
                variantsFound++
                givenUp = !this.applyVariantToSolution()
                    || performance.now() - startTime >= MAX_SOLVE_TIME_MSEC
            }
        }
        if (!givenUp) {
            this.applySolutionToBoard(ctx)
        }

        // logging stats
        const duration = performance.now() - startTime
        const durationStr = duration.toLocaleString()
        const variantsStr = variantsFound.toLocaleString()
        if (givenUp) {
            if (duration >= MAX_SOLVE_TIME_MSEC) {
                console.warn(`Given up after ${variantsStr} variant(s) in ${durationStr}ms`)
            } else {
                console.info(`Given up after ${variantsStr} variant(s)`)
            }
        } else if (variantsFound > 0) {
            console.info(`${variantsStr} variant(s) found in ${durationStr}ms`)
        } else {
            console.error(`No variants found in ${durationStr}ms`)
        }
        console.groupEnd()
    }

    reset() {
        this.lastLineIndex = undefined
    }

    /**
     * Copies the source board line to a local array to achieve better lookup
     * performance (33% faster)
     */
    private createBoardLine(ctx: Hints) {
        for (let indexInLine = 0; indexInLine < this.dataLength; indexInLine++) {
            this.boardLine[indexInLine] = ctx.getBoardDataValue(this.lineIndex, indexInLine)
        }
    }

    /**
     * Tries to build a valid variant by starting with the hint [startIndex]
     * and placing the first piece into the column at [offset]. Then places
     * all remaining pieces according to the next hints to the next possible
     * places.
     *
     * `buildVariant(0, 0)` builds the first possible variant for all hints.
     *
     * @returns *true* if could build a valid variant and *false* if not.
     */
    private buildVariant(ctx: Hints, startIndex: number, offset: number): boolean {
        for (let indexInLine = startIndex; indexInLine < this.hintLength; indexInLine++) {
            const pieceEnd = offset + ctx.hints[this.lineIndex][indexInLine].hint - 1

            // if the piece goes beyond column limit, the building is not possible
            if (pieceEnd >= this.dataLength) { return false }

            this.variant[indexInLine] = {
                start: offset,
                end: pieceEnd
            }
            // next piece should start by skipping 1 cell after this one
            offset = pieceEnd + 2
        }
        // all pieces are built successfully
        return true
    }

    /**
     * Tries to build the next variant based on the current state of property
     * **variant**. Tries to shift the last piece forward, then second last and
     * so on as long as the variant remains valid.
     * If property **variant** is not initialized, tries to build the first one.
     *
     * @returns *true* if could build a valid variant
     */
    private buildNextVariant(ctx: Hints): boolean {
        // if not initialized, build the first variant
        if (this.variant[0] == null) {
            return this.buildVariant(ctx, 0, 0)
        }
        // try to shift a piece one cell forward starting with the last one
        for (let startIndex = this.hintLength - 1; startIndex >= 0; startIndex--) {
            if (this.buildVariant(ctx, startIndex, this.variant[startIndex].start + 1)) { return true }
        }
        // all pieces are shifted to their last position - cannot build a new variant
        return false
    }

    /**
     * Checks if property **variant** conflicts with any column cells set to on/off.
     *
     * @returns *true* if conflict found
     */
    private variantConflictsWithBoard(): boolean {
        let variantIndex = 0, conflict = false
        for (let indexInLine = 0; indexInLine < this.dataLength && !conflict; indexInLine++) {
            if (variantIndex >= this.hintLength || indexInLine < this.variant[variantIndex].start) {
                // check conflict with cells outside of variant pieces
                conflict = (this.boardLine[indexInLine] === BOARD_CELL.ON)
            } else if (indexInLine <= this.variant[variantIndex].end) {
                // check conflict with cells inside the variant pieces
                conflict = (this.boardLine[indexInLine] === BOARD_CELL.OFF)
                // moving to the next piece
                if (indexInLine === this.variant[variantIndex].end) {
                    variantIndex++
                }
            }
        }
        //console.log(`${variant.map(item => { return `${item.start}:${item.end}` })} - ${conflict ? 'conflict' : 'OK'}`)
        return conflict
    }

    /**
     * Applies **variant** to **solution**. All cells that stay on or off across
     * all variants will be set to on or off in the solution.
     *
     * @returns *true* if the solution has any cells set to on or off, i.e. if
     * the solution is applicable
     */
    private applyVariantToSolution(): boolean {
        let variantIndex = 0
        let solutionApplicable = false
        for (let solutionIndex = 0; solutionIndex < this.dataLength; solutionIndex++) {
            let value = this.solution[solutionIndex]
            if (variantIndex >= this.hintLength || solutionIndex < this.variant[variantIndex].start) {
                // apply to cells outside of variant pieces
                value = (value === undefined || value === BOARD_CELL.OFF) ? BOARD_CELL.OFF : BOARD_CELL.NIL
            } else if (solutionIndex <= this.variant[variantIndex].end) {
                // apply to cells inside the variant pieces
                value = (value === undefined || value === BOARD_CELL.ON) ? BOARD_CELL.ON : BOARD_CELL.NIL
                // moving to the next piece
                if (solutionIndex === this.variant[variantIndex].end) {
                    variantIndex++
                }
            }
            this.solution[solutionIndex] = value
            // if at least one cell is set or unset, the solution is applicable
            solutionApplicable = solutionApplicable || (value !== BOARD_CELL.NIL)
        }
        //console.log(`Solution: ${solution}`)
        return solutionApplicable
    }

    /**
     * Applies **solution** to the board column.
     * Copies only the cells set to on or off.
     */
    private applySolutionToBoard(ctx: Hints) {
        for (let solutionIndex = 0; solutionIndex < this.dataLength; solutionIndex++) {
            const value = this.solution[solutionIndex]
            if (value === BOARD_CELL.OFF || value === BOARD_CELL.ON) {
                ctx.setBoardDataValue(this.lineIndex, solutionIndex, value)
            }
        }
    }

    private getNumberOfCombinations(ctx: Hints) {
        const hintSum = ctx.hints[this.lineIndex].reduce((prev, curr) => prev + curr.hint, 0)
        const hintCount = ctx.hints[this.lineIndex].length
        const emptyCells = ctx.getBoardLength() - hintSum - hintCount + 1
        return combinations(hintCount + emptyCells, hintCount)
    }
}