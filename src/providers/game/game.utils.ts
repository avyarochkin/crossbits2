/**
 * product(a : b) = a * (a + 1) * (a + 2) * ... * b
 */
export function product(a: number, b: number) {
    if (a > b) { return 1 }
    return a < b ? a * product(a + 1, b) : b
}

/**
 *                  n!        product(k + 1, n)
 * C(n : k) = ------------- = -----------------
 *            m! * (n - k)!   product(1, n - k)
 */
export function combinations(n: number, k: number) {
    // using min[k, n - k] to minimize number of product cycles
    // given that C(n : k) === C(n : n - k)
    k = Math.min(k, n - k)
    return Math.round(product(n - k + 1, n) / product(1, k))
}
