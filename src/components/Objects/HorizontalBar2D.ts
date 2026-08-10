import { Container, Graphics, Text, FederatedPointerEvent } from "pixi.js";


export interface HorizontalBar2DOptions {
    lengthCm: number;
    showLength?: boolean;
    position?: {
        x: number;
        y: number;
    };
    draggable?: boolean;
    pixelsPerCm?: number;

    onGrabbed?: (
        event: FederatedPointerEvent
    ) => void;
}

export class HorizontalBar2D extends Container {
    private bar: Graphics;
    private lengthLabel: Text;

    private _lengthCm: number;
    private _showLength: boolean;
    private _draggable: boolean;
    private pixelsPerCm: number;

    private dragging = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;

    private readonly barHeight = 30;

    constructor({
        lengthCm,
        showLength = true,
        position = { x: 0, y: 0 },
        draggable = true,

        // 96 CSS pixels = 1 inch
        pixelsPerCm = 96 / 2.54,
        onGrabbed,
    }: HorizontalBar2DOptions) {
        super();

        this._lengthCm = lengthCm;
        this._showLength = showLength;
        this._draggable = draggable;
        this.pixelsPerCm = pixelsPerCm;
        this.onGrabbed = onGrabbed;
        this.position.set(position.x, position.y);

        this.bar = new Graphics();

        this.lengthLabel = new Text({
            text: "",
            style: {
                fontSize: 16,
                fill: 0x000000,
            },
        });

        this.addChild(this.bar);
        this.addChild(this.lengthLabel);

        this.draw();

        if ( this._draggable || this.onGrabbed) {
            this.enableInteraction();
        }
    }


    private onGrabbed?: ( event: FederatedPointerEvent ) => void;

    private draw() {
        const width = this._lengthCm * this.pixelsPerCm;

        this.bar.clear();

        this.bar
            .rect(0, 0, width, this.barHeight)
            .fill(0xd8b36a)
            .stroke({
                width: 2,
                color: 0x333333,
            });

        this.lengthLabel.text = this._showLength
            ? `${this._lengthCm} cm`
            : "";

        this.lengthLabel.anchor.set(0.5);

        this.lengthLabel.position.set(
            width / 2,
            this.barHeight / 2
        );
    }

    private enableInteraction() {
        this.eventMode = "static";

        if (this._draggable) {
            this.cursor = "grab";
        }

        this.on(
            "pointerdown",
            this.onPointerDown
        );

        this.on(
            "globalpointermove",
            this.onPointerMove
        );

        this.on(
            "pointerup",
            this.onPointerUp
        );

        this.on(
            "pointerupoutside",
            this.onPointerUp
        );
    }

    private onPointerDown = ( event: FederatedPointerEvent) => {

        this.onGrabbed?.(event);

        if (!this._draggable) {
            return;
        }

        this.beginDragging(event);
    };


    public onDropped?: () => void;


    public beginDragging( event: FederatedPointerEvent) {
        if (!this.parent) return;

        this.dragging = true;
        this.cursor = "grabbing";

        const mouse =
            event.getLocalPosition(
                this.parent
            );

        this.dragOffsetX =
            mouse.x - this.x;

        this.dragOffsetY =
            mouse.y - this.y;
    }

    private onPointerMove = (event: FederatedPointerEvent) => {
        if (!this.dragging || !this.parent) return;

        const mouse = event.getLocalPosition(this.parent);

        this.position.set(
            mouse.x - this.dragOffsetX,
            mouse.y - this.dragOffsetY
        );
    };

    private onPointerUp = () => {
        if (!this.dragging) {
            return;
        }

        this.dragging = false;

        if (this._draggable) {
            this.cursor = "grab";
        }

        this.onDropped?.();
    };

    public setLengthCm(lengthCm: number) {
        this._lengthCm = lengthCm;
        this.draw();
    }

    public get lengthCm() {
        return this._lengthCm;
    }

    public get widthPixels() {
        return this._lengthCm * this.pixelsPerCm;
    }
}