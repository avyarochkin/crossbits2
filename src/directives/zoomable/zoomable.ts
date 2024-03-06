import { Directive, Input, ElementRef, OnInit } from '@angular/core'
import { Point } from 'src/providers/game/game.interface'
import 'hammerjs'

@Directive({
    selector: '[zoomable]'
})
export class ZoomableDirective implements OnInit {

    // private gesture: GestureController
    private minScaleBounce = 0.1
    private maxScaleBounce = 0.4
    private contentSize: Point

    private scaleObj = {
        startScale: 1,
        scale: 1,
        center: { x: 0, y: 0 },
        startCenter: { x: 0, y: 0 }
    }

    @Input()
    get scale() {
        return this.scaleObj.scale
    }
    set scale(scale) {
        this.scaleObj.scale = scale
        this.applyScale()
    }

    @Input() maxScale = 1
    @Input() minScale = 1

    private scrollEl: HTMLElement
    private zoomEl: HTMLElement

    constructor(public hostRef: ElementRef) {}


    public ngOnInit() {
        this.scrollEl = this.hostRef.nativeElement
        this.zoomEl = this.hostRef.nativeElement
        this.zoomEl.style.height = 'initial'

        // this.gesture = new Gesture(this.hostRef.nativeElement)
        // this.gesture.listen()
        // this.gesture.on('pinch', input => this.handlePinch(input))
        // this.gesture.on('pinchstart', input => this.handlePinchStart(input))
        // this.gesture.on('pinchend', input => this.handlePinchEnd(input))

        console.log(`[ZoomableDirective initialized]`)
    }

    // event handlers

    private handlePinchStart(input: HammerInput) {
        console.log(`[pinch start event]`)

        this.scaleObj.startScale = this.scaleObj.scale
        this.scaleObj.center = input.center

        this.scaleObj.startCenter = {
            x: (input.center.x + this.scrollEl.scrollLeft) / this.scaleObj.startScale,
            y: (input.center.y + this.scrollEl.scrollTop) / this.scaleObj.startScale
        }
    }

    private handlePinch(input: HammerInput) {
        console.log(`[pinch event (${input.eventType})]`)

        let scale = this.scaleObj.startScale * input.scale
        this.scaleObj.center = input.center

        if (input.isFinal) {
            this.handlePinchEnd(input)
        } else {

            if (scale > this.maxScale) {
                scale = this.maxScale + (1 - this.maxScale / scale) * this.maxScaleBounce
            } else if (scale < this.minScale) {
                scale = this.minScale - (1 - scale / this.minScale) * this.minScaleBounce
            }

            this.scale = scale
        }
    }

    private handlePinchEnd(input: HammerInput) {
        console.log(`[pinch end event]`)
        // this.checkScroll()

        if (this.scaleObj.scale > this.maxScale) {
            this.animateScale(this.maxScale)
        } else if (this.scaleObj.scale < this.minScale) {
            this.animateScale(this.minScale)
        } else {
            this.applyScale()
        }
    }

    private applyScale() {
        if (this.zoomEl) {
            if (this.contentSize == null) {
                this.contentSize = {
                    x: this.zoomEl.clientWidth,
                    y: this.zoomEl.clientHeight
                }
                console.log(`contentSize: ${this.contentSize.x}:${this.contentSize.y}`)
            }

            this.zoomEl.style.transformOrigin = '0 0'
            this.zoomEl.style.transition = 'transform 150ms'
            this.zoomEl.style.transform = `scale3d(${this.scaleObj.scale}, ${this.scaleObj.scale}, 1)`

            this.zoomEl.style.width = `${ this.contentSize.x }px`
            this.zoomEl.style.height = `${ this.contentSize.y }px`

            this.adjustCenter()

        }
    }

    private adjustCenter() {
        const x = Math.round(this.scaleObj.startCenter.x * this.scaleObj.scale - this.scaleObj.center.x)
        const y = Math.round(this.scaleObj.startCenter.y * this.scaleObj.scale - this.scaleObj.center.y)

        this.zoomEl.style.left = `${ x > 0 ? 0 : -x }px`
        this.zoomEl.style.top = `${ y > 0 ? 0 : -y }px`

        this.scrollEl.scrollLeft = x > 0 ? x : 0
        this.scrollEl.scrollTop = y > 0 ? y : 0

        console.log(`Scrolled:
            ${ x }/${ this.scrollEl.scrollLeft }/${ this.zoomEl.style.left } :
            ${ y }/${ this.scrollEl.scrollTop }/${ this.zoomEl.style.top }`)
    }

    private animateScale(finalScale: number) {
        this.scaleObj.scale += (finalScale - this.scaleObj.scale) / 5

        if (Math.abs(this.scaleObj.scale - finalScale) > 0.01) {
            this.applyScale()
            window.requestAnimationFrame(this.animateScale.bind(this, finalScale))
        } else {
            this.scale = finalScale
            // this.checkScroll()
        }
        // console.log(`Animating to scale ${finalScale} (${this.scaleObj.scale})`)
    }
}
