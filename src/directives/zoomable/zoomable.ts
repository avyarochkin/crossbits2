import { Directive, Input, ElementRef, OnInit, Output, EventEmitter } from '@angular/core'
import { Gesture, GestureController } from '@ionic/angular'
import { Point } from 'src/providers/game/game.interface'

/** Delta-factor of scale elasticity when it exceeds min limit */
const MIN_SCALE_BOUNCE = 0.1
/** Delta-factor of scale elasticity when it exceeds max limit */
const MAX_SCALE_BOUNCE = 0.4
/** Section the scale takes per step when bouncing back to the limit */
const SCALE_BOUNCE_BACK_SECTION = 0.2
/** Scale discrepancy error defining when bouncing back should stop */
const SCALE_BOUNCE_BACK_ERROR = 0.01

@Directive({
    selector: '[zoomable]'
})
export class ZoomableDirective implements OnInit {

    @Input() set scale(value: number) {
        if (this.currentScale === value) { return }
        this.currentScale = value
        this.applyScale()
        this.scaleChange.emit(value)
    }
    get scale() { return this.currentScale }

    @Input() maxScale = 1
    @Input() minScale = 1

    /** Emits new scale value when it changes */
    @Output() readonly scaleChange = new EventEmitter<number>()

    private scrollEl: HTMLElement
    private zoomEl: HTMLElement
    private gesture: Gesture
    private contentSize: Point
    private currentScale = 1
    private pinchCenter: Point | null

    // values stored when the pinch/zoom operation starts
    private startScale = 1
    private startPinchCenter: Point | null

    constructor(
        private readonly hostRef: ElementRef<HTMLElement>,
        private readonly gestureCtrl: GestureController
    ) { }


    ngOnInit() {
        // by default the scroll element is the parent of the zoomable element
        this.scrollEl = this.hostRef.nativeElement.parentElement!

        this.zoomEl = this.hostRef.nativeElement
        this.zoomEl.style.width = 'fit-content'
        this.zoomEl.style.height = 'initial'

        this.gesture = this.gestureCtrl.create({
            el: this.hostRef.nativeElement,
            gestureName: 'pinch-zoom',
            threshold: 0,
            // this gesture processes only pinch/zoom, i.e. events with 2 touches
            canStart: ({ event }) => this.isPinchZoomEvent(event as TouchEvent),
            onStart: ({ event }) => { this.handlePinchZoomStart(event as TouchEvent) },
            onMove: ({ event }) => { this.handlePinchZoom(event as TouchEvent) },
            onEnd: () => { this.handlePinchZoomEnd() }
        })
        this.gesture.enable(true)
    }

    private isPinchZoomEvent(event: TouchEvent) {
        return event.changedTouches?.length === 2
    }

    private handlePinchZoomStart(event: TouchEvent) {
        // console.log('[pinch start event]', event)
        this.startScale = this.currentScale
        this.startPinchCenter = this.getMidPoint(event.changedTouches)
    }

    private handlePinchZoom(event: TouchEvent) {
        // console.log('[pinch event]', event)
        if ('scale' in event && typeof event.scale === 'number') {
            let scale = this.startScale * event.scale
            this.pinchCenter = this.getMidPoint(event.changedTouches)
            // when new scale exceeds min/max limit it should resist the further it moves away
            if (scale > this.maxScale) {
                scale = this.maxScale + (1 - this.maxScale / scale) * MAX_SCALE_BOUNCE
            } else if (scale < this.minScale) {
                scale = this.minScale - (1 - scale / this.minScale) * MIN_SCALE_BOUNCE
            }
            this.scale = scale
        }
    }

    private handlePinchZoomEnd() {
        // console.log('[pinch end event]')
        // when final scale is outside of min/max boundaries, it should bounce back
        if (this.currentScale > this.maxScale) {
            this.animateScale(this.maxScale)
        } else if (this.currentScale < this.minScale) {
            this.animateScale(this.minScale)
        } else {
            this.applyScale()
        }
    }

    private getMidPoint(touches: TouchList) {
        const { 0: point1, 1: point2 } = touches
        return touches.length === 2
            ? {
                x: (point1.clientX + point2.clientX) / 2,
                y: (point1.clientY + point2.clientY) / 2
            }
            : null
    }

    private applyScale() {
        if (this.zoomEl == null) { return }
        if (this.contentSize == null) {
            this.contentSize = {
                x: this.zoomEl.clientWidth * this.currentScale,
                y: this.zoomEl.clientHeight * this.currentScale
            }
        }

        this.zoomEl.style.transformOrigin = '0 0'
        this.zoomEl.style.transition = 'transform 150ms'
        this.zoomEl.style.transform = `scale3d(${this.currentScale}, ${this.currentScale}, 1)`
        this.zoomEl.style.width = `${this.contentSize.x}px`
        this.zoomEl.style.height = `${this.contentSize.y}px`
        this.adjustCenter()
    }

    /** @todo fix calculation of the offset x/y */
    private adjustCenter() {
        if (this.zoomEl == null || this.scrollEl == null
            || this.startPinchCenter == null || this.pinchCenter == null
        ) { return }
        const x = Math.round(this.startPinchCenter.x * this.currentScale - this.pinchCenter.x)
        const y = Math.round(this.startPinchCenter.y * this.currentScale - this.pinchCenter.y)

        this.zoomEl.style.left = `${ x > 0 ? 0 : -x }px`
        this.zoomEl.style.top = `${ y > 0 ? 0 : -y }px`

        this.scrollEl.scrollLeft = x > 0 ? x : 0
        this.scrollEl.scrollTop = y > 0 ? y : 0
        // console.log(`adjusting center with ${x}:${y}, scrollEl:${this.scrollEl.scrollLeft}:${this.scrollEl.scrollTop}`)
    }

    /**
     * Animates scale from the current value to `finalScale` with "ease-out" easing effect.
     * The animation uses `requestAnimationFrame` to schedule the next step. The animation
     * completes when the scale approaches `finalScale` closer than SCALE_BOUNCE_BACK_ERROR.
     * @param finalScale target scale
     */
    private animateScale(finalScale: number) {
        this.currentScale += (finalScale - this.currentScale) * SCALE_BOUNCE_BACK_SECTION

        if (Math.abs(this.currentScale - finalScale) > SCALE_BOUNCE_BACK_ERROR) {
            this.applyScale()
            window.requestAnimationFrame(this.animateScale.bind(this, finalScale) as FrameRequestCallback)
        } else {
            this.scale = finalScale
        }
    }
}
