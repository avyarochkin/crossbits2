import { Component, OnInit, ElementRef, Input } from '@angular/core'

export const MIN_SCALE_BOUNCE = 0.2
export const MAX_SCALE_BOUNCE = 0.2

@Component({
    selector: 'zoomer',
    template: '<ng-content></ng-content>',
})
export class ZoomerComponent implements OnInit {

    // private gesture: Gesture

    private readonly scaleObj = {
        startScale: 1
    }

    @Input() scale = 1
    @Input('max') maxScale = 1
    @Input('min') minScale = 1

    constructor(public zoomerRef: ElementRef<HTMLElement>) {}

    ngOnInit() {
        this.zoomerRef.nativeElement.style.position = 'absolute'
        // this.gesture = new Gesture(this.zoomerRef.nativeElement)
        // this.gesture.listen()
        // this.gesture.on('pinch', input => this.handlePinch(input))
        // this.gesture.on('pinchstart', input => this.handlePinchStart(input))
        // this.gesture.on('pinchend', input => this.handlePinchEnd(input))

        // Listen to parent resize
        // this.parentSubject.subscribe(event => {
        //   this.resize(event)
        // })
        this.resize()
    }

    ngAfterViewChecked() {
        this.applyScale()
    }

    resize() {
        // Set the wrapper dimensions first
        // this.setWrapperSize(event.width, event.height)

        // Get the content dimensions
        // this.setContentSize()
    }

    // event handlers

    private handlePinchStart() {
        console.log('[pinch start event]')

        this.scaleObj.startScale = this.scale
        // this.setCenter(event)
    }

    private handlePinch(input: HammerInput) {
        console.log('[pinch event]')
        let scale = this.scaleObj.startScale * input.scale

        if (scale > this.maxScale) {
            scale = this.maxScale + (1 - this.maxScale / scale) * MAX_SCALE_BOUNCE
        } else if (scale < this.minScale) {
            scale = this.minScale - (1 - scale / this.minScale) * MIN_SCALE_BOUNCE
        }

        this.scale = scale
        this.applyScale()

        input.srcEvent.preventDefault()
    }

    private handlePinchEnd() {
        console.log('[pinch end event]')
        // this.checkScroll()

        if (this.scale > this.maxScale) {
            this.animateScale(this.maxScale)
        } else if (this.scale < this.minScale) {
            this.animateScale(this.minScale)
        }
    }

    private applyScale() {
        // const realContentWidth = this.contentSize.x * this.scale
        // const realContentHeight = this.contentSize.y * this.scale

        // this.position.x = Math.max((this.size.x - realContentWidth) / (2 * this.scale), 0)
        // this.position.y = Math.max((this.size.y - realContentHeight) / (2 * this.scale), 0)
        this.zoomerRef.nativeElement.style.transformOrigin = '0 0'
        this.zoomerRef.nativeElement.style.transform = `scale3d(${this.scale},${this.scale},1)`
        // this.container.nativeElement.style.width = `${realContentWidth}px`
        // this.container.nativeElement.style.height = `${realContentHeight}px`

        // this.scroll.x = this.centerRatio.x * realContentWidth - this.centerStart.x
        // this.scroll.y = this.centerRatio.y * realContentHeight - this.centerStart.y
        // this.setScroll()
    }

    private animateScale(scale: number) {
        this.scale += (scale - this.scale) / 5

        if (Math.abs(this.scale - scale) > 0.1) {
            this.applyScale()
            window.requestAnimationFrame(this.animateScale.bind(this, scale) as FrameRequestCallback)
        } else {
            this.scale = scale
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
*/
}
