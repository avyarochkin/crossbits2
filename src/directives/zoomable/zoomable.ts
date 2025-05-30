import { Directive, Input, ElementRef, OnInit, Output, EventEmitter, Renderer2, HostListener } from '@angular/core'
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
        this.contentSize = {
            x: Math.round(this.zoomEl.clientWidth * value),
            y: Math.round(this.zoomEl.clientHeight * value)
        }
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
    private contentSize: Point
    private currentScale = 1
    private pinchCenter: Point | null

    // values stored when the pinch/zoom operation starts
    private startScale: number | null
    private startPinchCenter: Point | null

    constructor(
        private readonly hostRef: ElementRef<HTMLElement>,
        private readonly renderer: Renderer2
    ) { }


    ngOnInit() {
        // by default the scroll element is the parent of the zoomable element
        this.scrollEl = this.hostRef.nativeElement.parentElement!

        this.zoomEl = this.hostRef.nativeElement
        this.renderer.setStyle(this.zoomEl, 'width', 'fit-content')
        this.renderer.setStyle(this.zoomEl, 'height', 'initial')
        this.renderer.setStyle(this.zoomEl, 'will-change', 'scroll-position, transform')
    }

    private isPinchZoomEvent(event: TouchEvent) {
        return event.changedTouches?.length === 2
    }

    @HostListener('touchstart', ['$event'])
    handlePinchZoomStart(event: TouchEvent) {
        // This is required to prevent mobile web browsers from auto-zooming the while page
        event.preventDefault()
    }

    @HostListener('touchmove', ['$event'])
    handlePinchZoom(event: TouchEvent) {
        if (!this.isPinchZoomEvent(event)) { return }
        if (this.startScale == null) {
            this.startScale = this.currentScale
            this.startPinchCenter = this.getMidPoint(event.changedTouches)
        }
        if ('scale' in event && typeof event.scale === 'number') {
            this.scale = this.adjustScale(event.scale)
            this.pinchCenter = this.getMidPoint(event.changedTouches)
        }
    }

    private adjustScale(value: number): number {
        let scale = this.startScale! * value
        // when new scale exceeds min/max limit it should resist the further it moves away
        if (scale > this.maxScale) {
            scale = this.maxScale + (1 - this.maxScale / scale) * MAX_SCALE_BOUNCE
        } else if (scale < this.minScale) {
            scale = this.minScale - (1 - scale / this.minScale) * MIN_SCALE_BOUNCE
        }
        return scale
    }

    @HostListener('touchend')
    handlePinchZoomEnd() {
        if (this.startScale == null) { return }
        this.startScale = null
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
        if (this.zoomEl == null || this.scrollEl == null) { return }
        this.renderer.setStyle(this.zoomEl, 'transformOrigin', '0 0')
        // this.renderer.setStyle(this.zoomEl, 'transition', 'transform 150ms')
        this.renderer.setStyle(this.zoomEl, 'transform', `scale3d(${this.currentScale}, ${this.currentScale}, 1)`)
        this.renderer.setStyle(this.scrollEl, 'width', `${this.contentSize.x}px`)
        this.renderer.setStyle(this.scrollEl, 'height', `${this.contentSize.y}px`)
        // this.adjustCenter()
    }

    /** @todo fix calculation of the offset x/y */
    private adjustCenter() {
        if (this.zoomEl == null || this.scrollEl == null
            || this.startPinchCenter == null || this.pinchCenter == null
        ) { return }
        const x = Math.round(this.startPinchCenter.x * this.currentScale - this.pinchCenter.x)
        const y = Math.round(this.startPinchCenter.y * this.currentScale - this.pinchCenter.y)

        this.renderer.setStyle(this.zoomEl, 'left', `${ x > 0 ? 0 : -x }px`)
        this.renderer.setStyle(this.zoomEl, 'top', `${ y > 0 ? 0 : -y }px`)

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
