import { Directive, Input, ElementRef, OnInit, Output, EventEmitter, Renderer2, HostListener } from '@angular/core'
import { IonContent } from '@ionic/angular'
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
        this.setDefaultScaleCenter()
        this.setScale(value)
    }
    get scale() { return this.currentScale }

    @Input() maxScale = 1
    @Input() minScale = 1

    /** Emits new scale value when it changes */
    @Output() readonly scaleChange = new EventEmitter<number>()

    private scrollerEl: HTMLElement | undefined
    private scrollEl: HTMLElement
    private zoomEl: HTMLElement
    private currentScale = 1
    private lastScale = 1
    private scaleCenter: Point | null

    // values stored when the pinch/zoom operation starts
    private pinchStartScale: number | null

    constructor(
        private readonly hostRef: ElementRef<HTMLElement>,
        private readonly renderer: Renderer2
    ) { }


    async ngOnInit() {
        // by default the scroll element is the parent of the zoomable element
        this.scrollEl = this.hostRef.nativeElement.parentElement!
        this.zoomEl = this.hostRef.nativeElement
        this.renderer.setStyle(this.zoomEl, 'width', 'fit-content')
        this.renderer.setStyle(this.zoomEl, 'height', 'initial')
        this.renderer.setStyle(this.zoomEl, 'will-change', 'scroll-position, transform')
        const content = this.scrollEl.parentElement as IonContent | null
        this.scrollerEl = await content?.getScrollElement()
    }

    private isPinchZoomEvent(event: TouchEvent) {
        return event.changedTouches?.length === 2
    }

    @HostListener('touchmove', ['$event'])
    handlePinchZoom(event: TouchEvent) {
        if (!this.isPinchZoomEvent(event)) { return }
        if (this.pinchStartScale == null) {
            this.pinchStartScale = this.currentScale
            this.scaleCenter = this.getMidPoint(event.changedTouches)
        }
        if ('scale' in event && typeof event.scale === 'number') {
            this.setScale(this.adjustedScale(event.scale))
        }
    }

    private adjustedScale(value: number): number {
        let scale = this.pinchStartScale! * value
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
        if (this.pinchStartScale == null) { return }
        this.pinchStartScale = null
        // when final scale is outside of min/max boundaries, it should bounce back
        if (this.currentScale > this.maxScale) {
            this.animateScale(this.maxScale)
        } else if (this.currentScale < this.minScale) {
            this.animateScale(this.minScale)
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

    private setDefaultScaleCenter() {
        if (this.scrollerEl == null) { return }
        this.scaleCenter = {
            x: this.scrollerEl.clientWidth / 2,
            y: this.scrollerEl.clientHeight / 2
        }
    }

    private setScale(value: number) {
        this.lastScale = this.currentScale
        this.currentScale = value
        this.applyScale(value)
        this.scaleChange.emit(value)
    }

    private applyScale(scale: number) {
        if (this.zoomEl == null || this.scrollEl == null) { return }
        this.renderer.setStyle(this.zoomEl, 'transformOrigin', '0 0')
        this.renderer.setStyle(this.zoomEl, 'transform', `scale3d(${scale}, ${scale}, 1)`)

        const contentWidth = Math.round(this.zoomEl.clientWidth * scale)
        const contentHeight = Math.round(this.zoomEl.clientHeight * scale)
        this.renderer.setStyle(this.scrollEl, 'width', `${contentWidth}px`)
        this.renderer.setStyle(this.scrollEl, 'height', `${contentHeight}px`)
        this.scrollToScaleCenter()
    }

    private scrollToScaleCenter() {
        if (this.scrollerEl == null || this.scaleCenter == null) { return }
        const deltaScale = this.currentScale / this.lastScale
        const left = Math.max((this.scaleCenter.x + this.scrollerEl.scrollLeft) * deltaScale - this.scaleCenter.x, 0)
        const top = Math.max((this.scaleCenter.y + this.scrollerEl.scrollTop) * deltaScale - this.scaleCenter.y, 0)
        this.scrollerEl.scrollTo({ left, top })
    }

    /**
     * Animates scale from the current value to `finalScale` with "ease-out" easing effect.
     * The animation uses `requestAnimationFrame` to schedule the next step. The animation
     * completes when the scale approaches `finalScale` closer than SCALE_BOUNCE_BACK_ERROR.
     * @param finalScale target scale
     */
    private animateScale(finalScale: number) {
        this.lastScale = this.currentScale
        this.currentScale += (finalScale - this.currentScale) * SCALE_BOUNCE_BACK_SECTION

        if (Math.abs(this.currentScale - finalScale) > SCALE_BOUNCE_BACK_ERROR) {
            this.applyScale(this.currentScale)
            window.requestAnimationFrame(this.animateScale.bind(this, finalScale) as FrameRequestCallback)
        } else {
            this.setScale(finalScale)
        }
    }
}
