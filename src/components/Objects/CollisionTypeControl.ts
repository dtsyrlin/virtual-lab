import {
    Container,
    Graphics,
    Text,
} from "pixi.js";

import type {
    CollisionType,
} from "../PhysicalSystems/DynamicsTrackPhysics";


export interface CollisionTypeControlOptions {

    position?: {
        x: number;
        y: number;
    };

    value?: CollisionType;

    onValueChanged?: (
        value: CollisionType
    ) => void;

    onReset?: () => void;
}


export class CollisionTypeControl extends Container {

    private _value:
        CollisionType;

    private readonly elasticButton =
        new Graphics();

    private readonly inelasticButton =
        new Graphics();

    private readonly resetButton =
        new Graphics();

    private readonly elasticText:
        Text;

    private readonly inelasticText:
        Text;

    private readonly resetText:
        Text;

    private readonly onValueChanged?: (
        value: CollisionType
    ) => void;

    private readonly onReset?: () => void;


    constructor({
        position = {
            x: 350,
            y: 105,
        },

        value = "elastic",

        onValueChanged,

        onReset,
    }: CollisionTypeControlOptions = {}) {

        super();


        this._value =
            value;

        this.onValueChanged =
            onValueChanged;

        this.onReset =
            onReset;


        this.position.set(
            position.x,
            position.y
        );


        this.elasticText =
            this.createButtonText(
                "Elastic"
            );

        this.inelasticText =
            this.createButtonText(
                "Inelastic"
            );

        this.resetText =
            this.createButtonText(
                "Reset"
            );


        this.elasticButton.eventMode =
            "static";

        this.inelasticButton.eventMode =
            "static";

        this.resetButton.eventMode =
            "static";


        this.elasticButton.cursor =
            "pointer";

        this.inelasticButton.cursor =
            "pointer";

        this.resetButton.cursor =
            "pointer";


        this.elasticButton.on(
            "pointerdown",
            () => {

                this.setValue(
                    "elastic"
                );
            }
        );


        this.inelasticButton.on(
            "pointerdown",
            () => {

                this.setValue(
                    "inelastic"
                );
            }
        );


        this.resetButton.on(
            "pointerdown",
            () => {

                this.onReset?.();
            }
        );


        this.addChild(
            this.elasticButton
        );

        this.addChild(
            this.inelasticButton
        );

        this.addChild(
            this.resetButton
        );

        this.addChild(
            this.elasticText
        );

        this.addChild(
            this.inelasticText
        );

        this.addChild(
            this.resetText
        );


        this.draw();
    }


    private createButtonText(
        text: string
    ) {

        const buttonText =
            new Text({
                text,

                style: {
                    fontSize: 17,
                    fill: 0x000000,
                },
            });


        buttonText.anchor.set(
            0.5
        );


        return buttonText;
    }


    private drawButton(
        button: Graphics,
        y: number,
        selected: boolean
    ) {

        const buttonWidth =
            110;

        const buttonHeight =
            32;


        button.clear();


        button
            .roundRect(
                0,
                y,
                buttonWidth,
                buttonHeight,
                5
            )
            .fill(
                selected
                    ? 0xd8d8d8
                    : 0xf4f4f4
            )
            .stroke({
                width: 2,
                color: 0x555555,
            });
    }


    private draw() {

        const buttonHeight =
            32;

        const gap =
            7;

        const buttonWidth =
            110;


        const elasticY =
            0;

        const inelasticY =
            buttonHeight +
            gap;

        const resetY =
            (
                buttonHeight +
                gap
            ) *
            2;


        this.drawButton(
            this.elasticButton,
            elasticY,
            this._value ===
                "elastic"
        );

        this.drawButton(
            this.inelasticButton,
            inelasticY,
            this._value ===
                "inelastic"
        );

        this.drawButton(
            this.resetButton,
            resetY,
            false
        );


        this.elasticText.position.set(
            buttonWidth / 2,
            elasticY +
                buttonHeight / 2
        );

        this.inelasticText.position.set(
            buttonWidth / 2,
            inelasticY +
                buttonHeight / 2
        );

        this.resetText.position.set(
            buttonWidth / 2,
            resetY +
                buttonHeight / 2
        );
    }


    public setValue(
        value: CollisionType
    ) {

        if (
            value ===
            this._value
        ) {

            return;
        }


        this._value =
            value;

        this.draw();


        this.onValueChanged?.(
            value
        );
    }


    public get value():
        CollisionType {

        return this._value;
    }
}
