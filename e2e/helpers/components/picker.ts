import { Component } from './component.js';

export class Picker extends Component {
    get picker() {
        return $(this.selector)
    }

    get buttonOK() {
        return this.picker.$('.picker-toolbar-apply button')
    }

    get buttonCancel() {
        return this.picker.$('.picker-toolbar-cancel button')
    }

    get selectedOptions() {
        return this.picker.$$('.picker-col .picker-opt-selected')
    }

    constructor() {
        super('ion-picker')
    }
}