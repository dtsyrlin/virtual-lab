import {
    Container,
    Graphics,
    Text,
    FederatedPointerEvent,
} from "pixi.js";


export interface SizeControlOptions {

    label?: string;

    showLabel?: boolean;

    min?: number;
    max?: number;

    value?: number;

    unlimitedSupply?: boolean;

    showUnlimitedSupply?: boolean;

    position?: {
        x: number;
        y: number;
    };

    onValueChanged?: (
        value: number,
        isRandom: boolean
    ) => void;

    onUnlimitedSupplyChanged?: (
        unlimitedSupply: boolean
    ) => void;
}


export class SizeControl extends Container {

    private readonly min: number;
    private readonly max: number;

    private _value: number;
    private _isRandom = false;

    private _unlimitedSupply: boolean;

    private readonly showUnlimitedSupply: boolean;

    private readonly sliderStartX: number;
    private readonly sliderY = 22;

    private readonly stepWidth = 24;

    private readonly knobRadius = 9;

    private sliderLine: Graphics;
    private knob: Graphics;

    private valueLabels: Text[] = [];

    private checkBox?: Graphics;
    private checkMark?: Text;

    private draggingSlider = false;

    private onValueChanged?: (
        value: number,
        isRandom: boolean
    ) => void;

    private onUnlimitedSupplyChanged?: (
        unlimitedSupply: boolean
    ) => void;


    constructor({
        label = "",

        showLabel = true,

        min = 2,
        max = 7,

        value = 3,

        unlimitedSupply = true,

        showUnlimitedSupply = true,

        position = {
            x: 20,
            y: 20,
        },

        onValueChanged,

        onUnlimitedSupplyChanged,
    }: SizeControlOptions) {

        super();


        this.min = min;
        this.max = max;

        this._value = value;

        this._unlimitedSupply =
            unlimitedSupply;

        this.showUnlimitedSupply =
            showUnlimitedSupply;

        this.sliderStartX =
            showLabel
                ? 80
                : 10;

        this.onValueChanged =
            onValueChanged;

        this.onUnlimitedSupplyChanged =
            onUnlimitedSupplyChanged;


        this.position.set(
            position.x,
            position.y
        );


        if (showLabel) {

            const title =
                new Text({
                    text: label,

                    style: {
                        fontSize: 17,
                        fill: 0x000000,
                    },
                });


            title.position.set(
                0,
                12
            );


            this.addChild(
                title
            );
        }


        /*
         * Slider positions:
         *
         * 0 = R1
         * 1 = R2
         * 2... = numeric values min...max
         *
         * This lets numeric 1 coexist with
         * the two random positions.
         */
        const lastPosition =
            this.numericValueToPosition(
                this.max
            );


        this.sliderLine =
            new Graphics();


        this.sliderLine
            .moveTo(
                this.sliderStartX,
                this.sliderY
            )
            .lineTo(
                this.positionForSliderPosition(
                    lastPosition
                ),
                this.sliderY
            )
            .stroke({
                width: 3,
                color: 0x555555,
            });


        this.sliderLine.eventMode =
            "static";

        this.sliderLine.cursor =
            "pointer";


        this.sliderLine.on(
            "pointerdown",
            this.onSliderPointerDown
        );


        this.addChild(
            this.sliderLine
        );


        /*
         * R1 and R2 labels.
         */
        this.createValueLabel(
            "R1",
            0,
            true
        );

        this.createValueLabel(
            "R2",
            1,
            true
        );


        /*
         * Numeric labels.
         */
        for (
            let numericValue = this.min;
            numericValue <= this.max;
            numericValue++
        ) {

            this.createValueLabel(
                String(
                    numericValue
                ),
                this.numericValueToPosition(
                    numericValue
                ),
                false
            );
        }


        this.knob =
            new Graphics()
                .circle(
                    0,
                    0,
                    this.knobRadius
                )
                .fill(
                    0xeeeeee
                )
                .stroke({
                    width: 2,
                    color: 0x333333,
                });


        this.knob.position.set(
            this.positionForSliderPosition(
                this.numericValueToPosition(
                    this._value
                )
            ),
            this.sliderY
        );


        this.knob.eventMode =
            "static";

        this.knob.cursor =
            "grab";


        this.knob.on(
            "pointerdown",
            this.onSliderPointerDown
        );


        this.knob.on(
            "globalpointermove",
            this.onSliderPointerMove
        );


        this.knob.on(
            "pointerup",
            this.onSliderPointerUp
        );


        this.knob.on(
            "pointerupoutside",
            this.onSliderPointerUp
        );


        this.addChild(
            this.knob
        );


        if (
            this.showUnlimitedSupply
        ) {

            this.createUnlimitedSupplyControl(
                this.positionForSliderPosition(
                    lastPosition
                ) + 45
            );
        }
    }


    private createValueLabel(
        textValue: string,
        sliderPosition: number,
        random: boolean
    ) {

        const text =
            new Text({
                text:
                    textValue,

                style: {
                    fontSize:
                        random
                            ? 12
                            : 14,

                    fill:
                        0x000000,
                },
            });


        text.anchor.set(
            0.5,
            0
        );


        text.position.set(
            this.positionForSliderPosition(
                sliderPosition
            ),
            this.sliderY + 13
        );


        this.valueLabels.push(
            text
        );


        this.addChild(
            text
        );
    }


    private numericValueToPosition(
        value: number
    ): number {

        return (
            2 +
            value -
            this.min
        );
    }


    private positionForSliderPosition(
        sliderPosition: number
    ): number {

        return (
            this.sliderStartX +
            sliderPosition *
            this.stepWidth
        );
    }


    private sliderPositionFromX(
        x: number
    ): number {

        let sliderPosition =
            Math.round(
                (
                    x -
                    this.sliderStartX
                ) /
                this.stepWidth
            );


        const lastPosition =
            this.numericValueToPosition(
                this.max
            );


        if (
            sliderPosition < 0
        ) {

            sliderPosition =
                0;
        }


        if (
            sliderPosition >
            lastPosition
        ) {

            sliderPosition =
                lastPosition;
        }


        return sliderPosition;
    }


    private onSliderPointerDown = (
        event: FederatedPointerEvent
    ) => {

        this.draggingSlider =
            true;

        this.knob.cursor =
            "grabbing";


        this.updateSliderFromEvent(
            event
        );
    };


    private onSliderPointerMove = (
        event: FederatedPointerEvent
    ) => {

        if (!this.draggingSlider) {
            return;
        }


        this.updateSliderFromEvent(
            event
        );
    };


    private onSliderPointerUp = () => {

        this.draggingSlider =
            false;

        this.knob.cursor =
            "grab";
    };


    private updateSliderFromEvent(
        event: FederatedPointerEvent
    ) {

        const local =
            event.getLocalPosition(
                this
            );


        const sliderPosition =
            this.sliderPositionFromX(
                local.x
            );


        const isRandom =
            sliderPosition <= 1;


        const newValue =
            isRandom
                ? sliderPosition
                : this.min +
                    sliderPosition -
                    2;


        /*
         * R1 and R2 are distinct slider
         * positions even though both are random.
         */
        if (
            newValue ===
                this._value &&
            isRandom ===
                this._isRandom
        ) {

            return;
        }


        this._value =
            newValue;

        this._isRandom =
            isRandom;


        this.knob.position.x =
            this.positionForSliderPosition(
                sliderPosition
            );


        this.onValueChanged?.(
            this._value,
            this._isRandom
        );
    }


    private createUnlimitedSupplyControl(
        x: number
    ) {

        this.checkBox =
            new Graphics();


        this.checkBox
            .rect(
                0,
                0,
                22,
                22
            )
            .fill(
                0xffffff
            )
            .stroke({
                width: 2,
                color: 0x444444,
            });


        this.checkBox.position.set(
            x,
            11
        );


        this.checkBox.eventMode =
            "static";

        this.checkBox.cursor =
            "pointer";


        this.checkMark =
            new Text({
                text:
                    this._unlimitedSupply
                        ? "✓"
                        : "",

                style: {
                    fontSize: 20,
                    fill: 0x000000,
                },
            });


        this.checkMark.anchor.set(
            0.5
        );


        this.checkMark.position.set(
            x + 11,
            22
        );


        const checkboxLabel =
            new Text({
                text:
                    "Unlimited supply",

                style: {
                    fontSize: 15,
                    fill: 0x000000,
                },
            });


        checkboxLabel.position.set(
            x + 30,
            13
        );


        this.checkBox.on(
            "pointertap",
            this.toggleUnlimitedSupply
        );


        checkboxLabel.eventMode =
            "static";

        checkboxLabel.cursor =
            "pointer";


        checkboxLabel.on(
            "pointertap",
            this.toggleUnlimitedSupply
        );


        this.addChild(
            this.checkBox
        );

        this.addChild(
            this.checkMark
        );

        this.addChild(
            checkboxLabel
        );
    }


    private toggleUnlimitedSupply =
        () => {

            this._unlimitedSupply =
                !this._unlimitedSupply;


            if (this.checkMark) {

                this.checkMark.text =
                    this._unlimitedSupply
                        ? "✓"
                        : "";
            }


            this.onUnlimitedSupplyChanged?.(
                this._unlimitedSupply
            );
        };


    public setValue(
        value: number
    ) {

        if (
            value < this.min ||
            value > this.max
        ) {

            return;
        }


        this._value =
            value;

        this._isRandom =
            false;


        this.knob.position.x =
            this.positionForSliderPosition(
                this.numericValueToPosition(
                    value
                )
            );
    }


    public setUnlimitedSupply(
        unlimitedSupply: boolean
    ) {

        this._unlimitedSupply =
            unlimitedSupply;


        if (this.checkMark) {

            this.checkMark.text =
                unlimitedSupply
                    ? "✓"
                    : "";
        }
    }


    public get value(): number {

        return this._value;
    }


    public get isRandom(): boolean {

        return this._isRandom;
    }


    public get unlimitedSupply(): boolean {

        return this._unlimitedSupply;
    }
}
