import {
    Container,
    Graphics,
    Text,
    FederatedPointerEvent,
} from "pixi.js";


export type HorizontalBarDragBehavior =
    "move" |
    "clone";


export interface HorizontalBar2DOptions {
    lengthCm: number;

    showLength?: boolean;

    position?: {
        x: number;
        y: number;
    };

    draggable?: boolean;

    dragBehavior?: HorizontalBarDragBehavior;

    pixelsPerCm?: number;

    onCloneRequested?: (
        source: HorizontalBar2D,
        event: FederatedPointerEvent
    ) => void;
}


export class HorizontalBar2D extends Container {

    private bar: Graphics;
    private lengthLabel: Text;

    private _lengthCm: number;
    private _showLength: boolean;
    private _draggable: boolean;

    private dragBehavior:
        HorizontalBarDragBehavior;

    private pixelsPerCm: number;

    private dragging = false;

    private dragOffsetX = 0;
    private dragOffsetY = 0;

    private readonly barHeight = 30;

    private onCloneRequested?: (
        source: HorizontalBar2D,
        event: FederatedPointerEvent
    ) => void;


    public onDropped?: () => void;


    constructor({
        lengthCm,
        showLength = true,

        position = {
            x: 0,
            y: 0,
        },

        draggable = true,

        dragBehavior = "move",

        pixelsPerCm = 96 / 2.54,

        onCloneRequested,
    }: HorizontalBar2DOptions) {

        super();

        this._lengthCm =
            lengthCm;

        this._showLength =
            showLength;

        this._draggable =
            draggable;

        this.dragBehavior =
            dragBehavior;

        this.pixelsPerCm =
            pixelsPerCm;

        this.onCloneRequested =
            onCloneRequested;


        this.position.set(
            position.x,
            position.y
        );


        this.bar =
            new Graphics();


        this.lengthLabel =
            new Text({
                text: "",

                style: {
                    fontSize: 16,
                    fill: 0x000000,
                },
            });


        this.addChild(
            this.bar
        );

        this.addChild(
            this.lengthLabel
        );


        this.draw();


        if (this._draggable) {
            this.enableInteraction();
        }
    }


    private draw() {

        const width =
            this._lengthCm *
            this.pixelsPerCm;


        this.bar.clear();


        this.bar
            .rect(
                0,
                0,
                width,
                this.barHeight
            )
            .fill(
                0xd8b36a
            )
            .stroke({
                width: 2,
                color: 0x333333,
            });


        this.lengthLabel.text =
            this._showLength
                ? `${this._lengthCm} cm`
                : "";


        this.lengthLabel.anchor.set(
            0.5
        );


        this.lengthLabel.position.set(
            width / 2,
            this.barHeight / 2
        );
    }


    private enableInteraction() {

        this.eventMode =
            "static";

        this.cursor =
            "grab";


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


    private onPointerDown = (
        event: FederatedPointerEvent
    ) => {

        if (!this._draggable) {
            return;
        }


        if (
            this.dragBehavior ===
            "clone"
        ) {

            this.onCloneRequested?.(
                this,
                event
            );

            return;
        }


        this.beginDragging(
            event
        );
    };


    public beginDragging(
        event: FederatedPointerEvent
    ) {

        if (!this.parent) {
            return;
        }

        this.parent.setChildIndex(
            this,
            this.parent.children.length - 1
        );        

        this.dragging =
            true;

        this.cursor =
            "grabbing";


        const mouse =
            event.getLocalPosition(
                this.parent
            );


        this.dragOffsetX =
            mouse.x -
            this.x;

        this.dragOffsetY =
            mouse.y -
            this.y;
    }


    private onPointerMove = (
        event: FederatedPointerEvent
    ) => {

        if (
            !this.dragging ||
            !this.parent
        ) {
            return;
        }


        const mouse =
            event.getLocalPosition(
                this.parent
            );


        this.position.set(
            mouse.x -
                this.dragOffsetX,

            mouse.y -
                this.dragOffsetY
        );
    };


    private onPointerUp = () => {

        if (!this.dragging) {
            return;
        }


        this.dragging =
            false;

        this.cursor =
            "grab";


        this.onDropped?.();
    };


    public setLengthCm(
        lengthCm: number
    ) {

        this._lengthCm =
            lengthCm;

        this.draw();
    }


    public setShowLength(
        showLength: boolean
    ) {

        this._showLength =
            showLength;

        this.draw();
    }


    public setDragBehavior(
        dragBehavior:
            HorizontalBarDragBehavior
    ) {

        this.dragBehavior =
            dragBehavior;
    }


    public get lengthCm() {

        return this._lengthCm;
    }


    public get showLength() {

        return this._showLength;
    }


    public get widthPixels() {

        return (
            this._lengthCm *
            this.pixelsPerCm
        );
    }
}