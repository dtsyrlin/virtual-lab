import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Text,
} from "pixi.js";


export interface ValueControlOptions {

    label?: string;

    showLabel?: boolean;

    min?: number;
    max?: number;
    step?: number;

    stepWidth?: number;

    value?: number;

    showRandom?: boolean;

    formatValue?: (
        value: number
    ) => string;

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


export class ValueControl extends Container {

    private readonly min: number;
    private readonly max: number;
    private readonly step: number;

    private readonly showRandom: boolean;

    private readonly formatValue:
        (
            value: number
        ) => string;

    private _value: number;
    private _isRandom = false;

    private _unlimitedSupply: boolean;

    private readonly showUnlimitedSupply: boolean;

    private readonly sliderStartX: number;
    private readonly sliderY = 22;

    private readonly stepWidth: number;

    private readonly knobRadius = 9;

    private readonly randomPositionCount: number;

    private readonly numericValueCount: number;

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
        step = 1,

        stepWidth = 24,

        value = 3,

        showRandom = true,

        formatValue =
            value =>
                String(value),

        unlimitedSupply = true,

        showUnlimitedSupply = true,

        position = {
            x: 20,
            y: 20,
        },

        onValueChanged,

        onUnlimitedSupplyChanged,
    }: ValueControlOptions) {

        super();


        if (step <= 0) {

            throw new Error(
                "ValueControl step must be greater than zero."
            );
        }


        if (max < min) {

            throw new Error(
                "ValueControl max must be greater than or equal to min."
            );
        }


        this.min = min;
        this.max = max;
        this.step = step;

        this.stepWidth =
            stepWidth;

        this.showRandom =
            showRandom;

        this.formatValue =
            formatValue;

        this.randomPositionCount =
            showRandom
                ? 2
                : 0;

        this.numericValueCount =
            Math.floor(
                (
                    this.max -
                    this.min
                ) /
                this.step +
                0.0000001
            ) +
            1;

        this._value =
            this.clampNumericValue(
                value
            );

        this._unlimitedSupply =
            unlimitedSupply;

        this.showUnlimitedSupply =
            showUnlimitedSupply;

        this.sliderStartX =
            10;

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
                -10
            );


            this.addChild(
                title
            );
        }


        const lastPosition =
            this.lastSliderPosition;


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


        if (this.showRandom) {

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
        }


        for (
            let index = 0;
            index <
                this.numericValueCount;
            index++
        ) {

            const numericValue =
                this.numericValueFromIndex(
                    index
                );


            this.createValueLabel(
                this.formatValue(
                    numericValue
                ),

                this.numericIndexToPosition(
                    index
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
                this.numericIndexToPosition(
                    this.numericIndexFromValue(
                        this._value
                    )
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


    private get lastSliderPosition():
        number {

        return (
            this.randomPositionCount +
            this.numericValueCount -
            1
        );
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


    private numericValueFromIndex(
        index: number
    ): number {

        const value =
            this.min +
            index *
            this.step;


        return Number(
            value.toFixed(10)
        );
    }


    private numericIndexFromValue(
        value: number
    ): number {

        const index =
            Math.round(
                (
                    value -
                    this.min
                ) /
                this.step
            );


        return Math.max(
            0,
            Math.min(
                this.numericValueCount -
                    1,
                index
            )
        );
    }


    private numericIndexToPosition(
        index: number
    ): number {

        return (
            this.randomPositionCount +
            index
        );
    }


    private clampNumericValue(
        value: number
    ): number {

        const clamped =
            Math.max(
                this.min,
                Math.min(
                    this.max,
                    value
                )
            );


        return this.numericValueFromIndex(
            this.numericIndexFromValue(
                clamped
            )
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


        if (
            sliderPosition < 0
        ) {

            sliderPosition =
                0;
        }


        if (
            sliderPosition >
            this.lastSliderPosition
        ) {

            sliderPosition =
                this.lastSliderPosition;
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
            this.showRandom &&
            sliderPosition <
                this.randomPositionCount;


        const newValue =
            isRandom
                ? sliderPosition
                : this.numericValueFromIndex(
                    sliderPosition -
                    this.randomPositionCount
                );


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
            this.clampNumericValue(
                value
            );

        this._isRandom =
            false;


        this.knob.position.x =
            this.positionForSliderPosition(
                this.numericIndexToPosition(
                    this.numericIndexFromValue(
                        this._value
                    )
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
