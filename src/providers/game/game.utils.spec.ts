import { combinations, product } from './game.utils'
describe('Game Utils', () => {
    describe('product', () => {
        it.each([
            [1, 3, 6],
            [3, 5, 60],
            [4, 4, 4],
            [5, 3, 1]
        ])('should calculate product(%i:%i) correctly', (a, b, expected) => {
            expect(product(a, b)).toBe(expected)
        })
    })

    describe('combinations', () => {
        it.each([
            [5, 1, 5],
            [5, 2, 10],
            [5, 3, 10],
            [5, 4, 5],
            [5, 5, 1],
            [5, 6, 0]
        ])('should calculate combinations from %i by %i correctly', (n, k, expected) => {
            expect(combinations(n, k)).toBe(expected)
        })
    })
})
