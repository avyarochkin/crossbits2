import { Component } from './component.js'

export class Alert extends Component {
    get alert() {
        return $(this.selector)
    }

    get buttonDelete() {
        return this.alert.$$('.alert-button')[1]
    }

    constructor() {
        super('ion-alert')
    }
}