/**
 * product(a : b) = a * (a + 1) * (a + 2) * ... * b
 */
export function product(startFactor: number, endFactor: number) {
    if (startFactor > endFactor) { return 1 }
    return startFactor < endFactor
        ? startFactor * product(startFactor + 1, endFactor)
        : endFactor
}

/**
 *                  n!        product(k + 1, n)
 * C(n : k) = ------------- = -----------------
 *            m! * (n - k)!   product(1, n - k)
 */
export function combinations(itemsInSet: number, itemsInSubset: number) {
    if (itemsInSubset > itemsInSet) { return 0 }
    // using min[k, n - k] to minimize number of product cycles
    // given that C(n : k) === C(n : n - k)
    const minItemsInSubset = Math.min(itemsInSubset, itemsInSet - itemsInSubset)
    return Math.round(product(itemsInSet - minItemsInSubset + 1, itemsInSet) / product(1, minItemsInSubset))
}
