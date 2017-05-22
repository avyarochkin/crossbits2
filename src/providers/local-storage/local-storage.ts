import { Injectable } from '@angular/core'

@Injectable()
export class LocalStorageProvider {

    constructor() {}

    setObject(key: string, value: any) {
        window.localStorage[key] = JSON.stringify(value)
    }

    getObject(key: string): any {
        var str = window.localStorage[key]
        return (str != undefined) ? JSON.parse(str) : null
    }
    delete(key: string) {
        window.localStorage.removeItem(key)
    }

}
