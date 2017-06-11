import { Component, Input, Output, EventEmitter, ViewChild, OnInit, AfterViewInit, OnDestroy } from '@angular/core'
import { Scroll } from 'ionic-angular'

@Component({
    selector: 'num-picker',
    templateUrl: 'num-picker.html'
})
export class NumPickerComponent implements OnInit, AfterViewInit, OnDestroy {
    private _value: number

    @Input() min: number
    @Input() max: number
    @Input() 
    set value(newValue: number) {
        if (this._value !== newValue) {
            this._value = newValue
            console.log(`num-picker: SET (value: ${this._value}`)
            if (this.numHeight) {
                this.scroll._scrollContent.nativeElement.scrollTop = (this.value - this.min) * this.numHeight
            }
        }
    }
    get value() { return this._value }

    @Output() change = new EventEmitter<number>()

    @ViewChild(Scroll) scroll: Scroll

    public numbers: string[]

    private removeScrollEventListener: Function

    constructor() {}
    
    // Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    ngOnInit() {
        console.log(`num-picker: INIT (value: ${this.value}, min: ${this.min}, max: ${this.max})`)

        // create array of numbers
        this.numbers = [' ']
        let numOfDigits = this.max.toString().length
        for (let i = this.min; i <= this.max; i++) {
            let str = `000000${i}`
            this.numbers.push(str.substr(str.length - numOfDigits, numOfDigits))
        }
        this.numbers.push('')

        // attach scroll event
        this.removeScrollEventListener = this.scroll.addScrollEventListener(e => this.handleScroll(e))
    }

    private numHeight = 0

    //Called after ngOnInit when the component's or directive's content has been initialized.
    ngAfterViewInit() {
        let numElement = this.scroll._scrollContent.nativeElement.querySelector('.num')
        this.numHeight = numElement ? numElement.clientHeight : 0
        // set initial scroll position
        this.scroll._scrollContent.nativeElement.scrollTop = (this.value - this.min) * this.numHeight
    }

    // Called once, before the instance is destroyed.
    ngOnDestroy() {
        // detach scroll event
        this.removeScrollEventListener()        
    }

    handleScroll(e) {
        // console.log(`Scroll ${e.target.scrollLeft}, ${e.target.scrollTop}`)
        let newValue = Math.round(e.target.scrollTop / this.numHeight) + this.min
        if (newValue !== this._value) {
            this._value = newValue
            this.change.emit(newValue)            
        }
    }

}
