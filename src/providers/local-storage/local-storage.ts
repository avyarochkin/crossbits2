import { Injectable } from '@angular/core'


@Injectable()
export class LocalStorageProvider {
    getValue<T>(key: string): T {
        return window.localStorage[key] as T
    }

    setValue<T>(key: string, value: T) {
        window.localStorage[key] = value
    }

    setObject<T extends object = object>(key: string, value: T) {
        window.localStorage[key] = JSON.stringify(value)
        console.info('SAVED', { key, value })
    }

    getObject<T extends object = object>(key: string): T | null {
        const str = window.localStorage[key] as string
        const value = (str !== undefined)
            ? JSON.parse(str) as T
            : null
        console.info('LOADED', { key, value })
        return value
    }

    delete(key: string) {
        window.localStorage.removeItem(key)
    }

}
