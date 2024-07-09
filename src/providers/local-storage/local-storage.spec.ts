import { LocalStorageProvider } from './local-storage'

describe('LocalStorageProvider', () => {
    let localStorage: LocalStorageProvider

    beforeEach(() => {
        localStorage = new LocalStorageProvider()
        window.localStorage['object-key'] = '{ "key": "value" }'
        window.localStorage['value-key'] = '42'
    })

    it('should get value from local storage', () => {
        const result = localStorage.getValue('value-key')
        expect(result).toBe('42')
    })

    it('should set value in local storage', () => {
        localStorage.setValue('value-key', '66')
        expect(window.localStorage['value-key']).toBe('66')
    })

    it('should set object in local storage as a string', () => {
        localStorage.setObject('object-key', { key: 'new value' })
        expect(window.localStorage['object-key']).toBe('{"key":"new value"}')
    })

    it('should get object from local storage', () => {
        const result = localStorage.getObject('object-key')
        expect(result).toEqual({ key: 'value' })
    })

    it('should return null if object does not exist in local storage', () => {
        const result = localStorage.getObject('does-not-exist')
        expect(result).toBeNull()
    })

    it('should delete object from local storage', () => {
        expect(window.localStorage['object-key']).toBeDefined()
        localStorage.delete('object-key')
        expect(window.localStorage['object-key']).toBeUndefined()
    })
})