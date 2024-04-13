import { ElementSelector } from '../definitions.js'

export function findElementAndroid({ text }: ElementSelector) {
    if (text) {
        return $(`android=new UiSelector().text("${text}")`)
    } else {
        throw new Error('Unknown selector strategy')
    }
}
