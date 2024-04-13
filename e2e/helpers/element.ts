import { ElementActionOptions } from './definitions.js'

export async function waitForElement(selector: string, { visibilityTimeout = 5000 }: ElementActionOptions = {}) {
    const el = await $(selector)
    await el.waitForDisplayed({ timeout: visibilityTimeout })
    return el
}

export function blur(selector: string, /* { visibilityTimeout = 5000 }: ElementActionOptions = {} */) {
    return browser.execute((sel) => {
        const el = document.querySelector<HTMLElement>(sel)
        if (el) {
            el.blur()
        }
    }, selector)
}

export function tryAcceptAlert() {
    try {
        return driver.acceptAlert()
    } catch (e) {
        console.warn('No alert to accept')
    }
}
