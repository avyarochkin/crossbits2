import { Component, ViewEncapsulation, OnInit, ElementRef, Input } from '@angular/core'
import { Gesture } from 'ionic-angular'


@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'zoomer',
    templateUrl: 'zoomer.html',
})
export class ZoomerComponent implements OnInit {

    // @ViewChild('container') container: ElementRef
    // @ViewChild('ionScrollContainer') ionScrollContainer: Scroll

    private gesture: Gesture
    // private scrollContent = null
    // private scrollListener = null
    // private scroll: Point = { x: 0, y: 0 }
    // private size: Point = { x: 0, y: 0 }

    // private position: Point = { x: 0, y: 0 }
    // private centerStart: Point = { x: 0, y: 0 }
    // private panCenterStart: Point = { x: 0, y: 0 }
    // private centerRatio: Point = { x: 0, y: 0 }

    // private scale = 1
    // private scaleStart = 1

    // private contentSize: Point = { x: 0, y: 0 }

    constructor(public zoomerRef: ElementRef) {}

    public ngOnInit() {
        // Get the scroll content
        //this.scrollContent = this.ionScrollContainer._scrollContent.nativeElement

        // Attach events
        this.gesture = new Gesture(this.zoomerRef.nativeElement)
        this.gesture.listen()
        this.gesture.on('pinch', e => this.handlePinch(e))
        this.gesture.on('pinchstart', e => this.handlePinchStart(e))
        this.gesture.on('pinchend', e => this.handlePinchEnd(e))
        //this.gesture.on('pan', e => this.handlePan(e))

        //this.scrollListener = this.scrollEvent.bind(this)
        //this.scrollContent.addEventListener('scroll', this.scrollListener)

        // Listen to parent resize
        // this.parentSubject.subscribe(event => {
        //   this.resize(event)
        // })

        // Resize the zoomed content
        //this.resize(false)
    }

    // event handlers

    @Input('max') maxScale = 1.5
    @Input('min') minScale = 0.5

    private minScaleBounce = 0.2
    private maxScaleBounce = 0.35

    private scaleObj = {
        startScale: 1,
        scale: 1
    }

    private handlePinchStart(event) {
        this.scaleObj.startScale = this.scaleObj.scale
        // this.setCenter(event)
    }

    private handlePinch(event: MSGestureEvent) {
        let scale = this.scaleObj.startScale * event.scale

        if (scale > this.maxScale) {
            scale = this.maxScale + (1 - this.maxScale / scale) * this.maxScaleBounce
        } else if (scale < this.minScale) {
            scale = this.minScale - (1 - scale / this.minScale) * this.minScaleBounce
        }

        this.scaleObj.scale = scale
        this.applyScale()

        event.preventDefault()
    }

    private handlePinchEnd(event: MSGestureEvent) {
        // this.checkScroll()

        if (this.scaleObj.scale > this.maxScale) {
            this.animateScale(this.maxScale)
        } else if (this.scaleObj.scale < this.minScale) {
            this.animateScale(this.minScale)
        }
    }

    private applyScale() {
        // const realContentWidth = this.contentSize.x * this.scale
        // const realContentHeight = this.contentSize.y * this.scale

        // this.position.x = Math.max((this.size.x - realContentWidth) / (2 * this.scale), 0)
        // this.position.y = Math.max((this.size.y - realContentHeight) / (2 * this.scale), 0)

        // this.zoomerRef.nativeElement.style.transform = `scale(${this.scaleObj.scale}) translate(${this.position.x}px, ${this.position.y}px)`
        this.zoomerRef.nativeElement.style.transform = `scale(${this.scaleObj.scale})`
        // this.container.nativeElement.style.width = `${realContentWidth}px`
        // this.container.nativeElement.style.height = `${realContentHeight}px`

        // this.scroll.x = this.centerRatio.x * realContentWidth - this.centerStart.x
        // this.scroll.y = this.centerRatio.y * realContentHeight - this.centerStart.y
        // this.setScroll()
    }

    private animateScale(scale: number) {

        this.scaleObj.scale += (scale - this.scaleObj.scale) / 5

        if (Math.abs(this.scaleObj.scale - scale) > 0.1) {
            this.applyScale()
            window.requestAnimationFrame(this.animateScale.bind(this, scale))
        } else {
            this.scaleObj.scale = scale
            this.applyScale()
            // this.checkScroll()
        }
    }

/*
    //Called after every check of the component's or directive's content.
    public ngAfterContentChecked() {        
        this.setContentSize()
    }

    public ngOnDestroy() {
        this.scrollContent.removeEventListener('scroll', this.scrollListener)
    }

    public resize(event) {
        // Set the wrapper dimensions first
        this.setWrapperSize(event.width, event.height)

        // Get the content dimensions
        this.setContentSize()
    }

    private scrollEvent(event) {
        this.scroll.x = event.target.scrollLeft
        this.scroll.y = event.target.scrollTop
    }

    private setWrapperSize(width:number, height:number) {
        this.size.x = width || window.innerWidth
        this.size.y = height || window.innerHeight
    }
    
    private setContentSize() {
        const x = this.container.nativeElement.clientWidth
        const y = this.container.nativeElement.clientHeight
        if (x !== this.contentSize.x || y !== this.contentSize.y) {
            this.contentSize = { x: x, y: y }
        }
    }

    private handleDoubleTap(event) {
        this.setCenter(event)

        let scale = Math.min(this.scale > 1 ? 1 : 2.5, this.maxScale)
        this.animateScale(scale)
    }

    private handlePan(event) {
        // calculate center x,y since pan started
        let x = Math.max(Math.floor(this.panCenterStart.x + event.deltaX), 0)
        const y = Math.max(Math.floor(this.panCenterStart.y + event.deltaY), 0)

        this.centerStart.x = x
        this.centerStart.y = y

        if (event.isFinal) {
            this.panCenterStart.x = x
            this.panCenterStart.y = y
        }

        this.displayScale()
    }

    // utility functions

    private setCenter(event) {
        const realContentWidth = this.contentSize.x * this.scale
        const realContentHeight = this.contentSize.y * this.scale

        this.centerStart.x = Math.max(event.center.x - this.position.x * this.scale, 0)
        this.centerStart.y = Math.max(event.center.y - this.position.y * this.scale, 0)
        this.panCenterStart.x = Math.max(event.center.x - this.position.x * this.scale, 0)
        this.panCenterStart.y = Math.max(event.center.y - this.position.y * this.scale, 0)

        this.centerRatio.x = Math.min((this.centerStart.x + this.scroll.x) / realContentWidth, 1)
        this.centerRatio.y = Math.min((this.centerStart.y + this.scroll.y) / realContentHeight, 1)
    }

    private setScroll() {
        this.scrollContent.scrollLeft = this.scroll.x
        this.scrollContent.scrollTop = this.scroll.y
    }

    // private checkScroll() {
    //     if (this.scale > 1) {
    //         this.disableScroll.emit({})
    //     } else {
    //         this.enableScroll.emit({})
    //     }
    // }
*/
}
