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
    }

    getObject<T extends object = object>(key: string): T | null {
        const str = window.localStorage[key] as string
        return (str !== undefined)
            ? JSON.parse(str) as T
            : null
    }

    delete(key: string) {
        window.localStorage.removeItem(key)
    }

}
