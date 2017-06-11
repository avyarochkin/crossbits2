import { Injectable } from '@angular/core'


@Injectable()
export class LocalStorageProvider {

    constructor() {}

    // tslint:disable-next-line:no-any
    setObject(key: string, value: any) {
        window.localStorage[key] = JSON.stringify(value)
    }

    // tslint:disable-next-line:no-any
    getObject(key: string): any {
        let str = window.localStorage[key]
        return (str != undefined) ? JSON.parse(str) : null
    }
    delete(key: string) {
        window.localStorage.removeItem(key)
    }

}
