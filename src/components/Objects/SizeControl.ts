import {
    Container,
    Graphics,
    Text,
    FederatedPointerEvent,
} from "pixi.js";


export interface SizeControlOptions {

    label?: string;

    showLabel?: boolean;

    /*
     * Actual numeric range.
     *
     * Positions 0 and 1 are automatically
     * treated as random values.
     */
    min?: number;
    max?: number;

    /*
     * Slider position.
     *
     * 0 or 1 = random
     * 2...max = actual value
     */
    value?: number;

    unlimitedSupply?: boolean;

    showUnlimitedSupply?: boolean;

    position?: {
        x: number;
        y: number;
    };

    onValueChanged?: (
        value: number
    ) => void;

    onUnlimitedSupplyChanged?: (
        unlimitedSupply: boolean
    ) => void;
}


export class SizeControl extends Container {

    private readonly min: number;
    private readonly max: number;

    private _value: number;
    private _unlimitedSupply: boolean;

    private readonly showUnlimitedSupply: boolean;

    private readonly sliderStartX: number;

    private readonly sliderY = 22;

    private readonly stepWidth = 32;

    private readonly knobRadius = 9;

    private sliderLine: Graphics;
    private knob: Graphics;

    private valueLabels: Text[] = [];

    private checkBox?: Graphics;
    private checkMark?: Text;

    private draggingSlider = false;

    private onValueChanged?: (
        value: number
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


        /*
         * Optional control label.
         */
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
         * Slider line.
         */
        this.sliderLine =
            new Graphics();


        const sliderEndX =
            this.positionForValue(
                this.max
            );


        this.sliderLine
            .moveTo(
                this.sliderStartX,
                this.sliderY
            )
            .lineTo(
                sliderEndX,
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
         * Slider labels.
         */
        for (
            let value = 0;
            value <= this.max;
            value++
        ) {

            if (
                value >= 2 &&
                value < this.min
            ) {
                continue;
            }


            const displayText =
                value == 0
                    ? "R1"
                    : value == 1
                        ? "R2"
                        : String(value);


            const text =
                new Text({
                    text:
                        displayText,

                    style: {
                        fontSize:
                            value <= 1
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
                this.positionForValue(
                    value
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


        /*
         * Slider knob.
         */
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
            this.positionForValue(
                this._value
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


        /*
         * Unlimited supply checkbox.
         */
        if (
            this.showUnlimitedSupply
        ) {

            this.createUnlimitedSupplyControl(
                sliderEndX + 45
            );
        }
    }


    private positionForValue(
        value: number
    ): number {

        return (
            this.sliderStartX +
            value * this.stepWidth
        );
    }


    private valueFromX(
        x: number
    ): number {

        let value =
            Math.round(
                (
                    x -
                    this.sliderStartX
                ) /
                this.stepWidth
            );


        if (value < 0) {
            value = 0;
        }


        if (value > this.max) {
            value = this.max;
        }


        if (
            value >= 2 &&
            value < this.min
        ) {

            value = this.min;
        }


        return value;
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


        const newValue =
            this.valueFromX(
                local.x
            );


        if (
            newValue ===
            this._value
        ) {
            return;
        }


        this._value =
            newValue;


        this.knob.position.x =
            this.positionForValue(
                this._value
            );


        this.onValueChanged?.(
            this._value
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
            value < 0 ||
            value > this.max
        ) {
            return;
        }


        this._value =
            value;


        this.knob.position.x =
            this.positionForValue(
                value
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

        return (
            this._value === 0 ||
            this._value === 1
        );
    }


    public get unlimitedSupply(): boolean {

        return this._unlimitedSupply;
    }
}