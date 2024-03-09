import { Injectable } from '@angular/core'


@Injectable()
export class LocalStorageProvider {

    constructor() {}

    setObject(key: string, value: object) {
        window.localStorage[key] = JSON.stringify(value)
    }

    getObject(key: string): object {
        const str = window.localStorage[key] as string
        return (str !== undefined)
            ? JSON.parse(str) as object
            : null
    }
    delete(key: string) {
        window.localStorage.removeItem(key)
    }

}
