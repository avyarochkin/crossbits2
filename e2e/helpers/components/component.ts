export class Component {
    get $() {
        return $(this.selector)
    }

    constructor(public selector: string) { }

}