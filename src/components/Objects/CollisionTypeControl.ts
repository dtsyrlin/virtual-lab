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
}


export class CollisionTypeControl extends Container {

    private _value:
        CollisionType;

    private readonly elasticButton =
        new Graphics();

    private readonly inelasticButton =
        new Graphics();

    private readonly elasticText:
        Text;

    private readonly inelasticText:
        Text;

    private readonly onValueChanged?: (
        value: CollisionType
    ) => void;


    constructor({
        position = {
            x: 350,
            y: 105,
        },

        value = "elastic",

        onValueChanged,
    }: CollisionTypeControlOptions = {}) {

        super();


        this._value =
            value;

        this.onValueChanged =
            onValueChanged;


        this.position.set(
            position.x,
            position.y
        );


        this.elasticText =
            new Text({
                text: "Elastic",

                style: {
                    fontSize: 17,
                    fill: 0x000000,
                },
            });


        this.inelasticText =
            new Text({
                text: "Inelastic",

                style: {
                    fontSize: 17,
                    fill: 0x000000,
                },
            });


        this.elasticText.anchor.set(
            0.5
        );

        this.inelasticText.anchor.set(
            0.5
        );


        this.elasticButton.eventMode =
            "static";

        this.inelasticButton.eventMode =
            "static";


        this.elasticButton.cursor =
            "pointer";

        this.inelasticButton.cursor =
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


        this.addChild(
            this.elasticButton
        );

        this.addChild(
            this.inelasticButton
        );

        this.addChild(
            this.elasticText
        );

        this.addChild(
            this.inelasticText
        );


        this.draw();
    }


    private draw() {

        const buttonWidth =
            100;

        const buttonHeight =
            32;


        this.elasticButton.clear();

        this.inelasticButton.clear();


        this.elasticButton
            .roundRect(
                0,
                0,
                buttonWidth,
                buttonHeight,
                5
            )
            .fill(
                this._value ===
                    "elastic"
                    ? 0xd8d8d8
                    : 0xf4f4f4
            )
            .stroke({
                width: 2,
                color: 0x555555,
            });


        this.inelasticButton
            .roundRect(
                buttonWidth + 6,
                0,
                buttonWidth,
                buttonHeight,
                5
            )
            .fill(
                this._value ===
                    "inelastic"
                    ? 0xd8d8d8
                    : 0xf4f4f4
            )
            .stroke({
                width: 2,
                color: 0x555555,
            });


        this.elasticText.position.set(
            buttonWidth / 2,
            buttonHeight / 2
        );


        this.inelasticText.position.set(
            buttonWidth +
                6 +
                buttonWidth / 2,
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
