import { Container, Graphics, Text } from "pixi.js";

export interface TextControlField {
    name: string;
    label: string;
    value: number;
}

export interface TextControls2DOptions {
    fields: TextControlField[];
    buttonText: string;
    position?: {
        x: number;
        y: number;
    };
    onButtonClick?: (controls: TextControls2D) => void;
}

interface FieldDisplay {
    value: string;
    box: Graphics;
    text: Text;
}

export class TextControls2D extends Container {
    private fields = new Map<string, FieldDisplay>();
    private selectedField: string | null = null;

    private onButtonClick?: (controls: TextControls2D) => void;

    private readonly inputWidth = 55;
    private readonly inputHeight = 32;
    private readonly fieldSpacing = 150;

    constructor({
        fields,
        buttonText,
        position = { x: 20, y: 20 },
        onButtonClick,
    }: TextControls2DOptions) {
        super();

        this.position.set(position.x, position.y);
        this.onButtonClick = onButtonClick;

        fields.forEach((field, index) => {
            this.createField(field, index);
        });

        this.createButton(
            buttonText,
            fields.length * this.fieldSpacing
        );

        window.addEventListener("keydown", this.onKeyDown);
    }

    private createField(field: TextControlField, index: number) {
        const x = index * this.fieldSpacing;

        const label = new Text({
            text: field.label,
            style: {
                fontSize: 16,
                fill: 0x000000,
            },
        });

        label.position.set(x, 7);
        this.addChild(label);

        const boxX = x + 65;

        const box = new Graphics()
            .rect(0, 0, this.inputWidth, this.inputHeight)
            .fill(0xffffff)
            .stroke({
                width: 2,
                color: 0x555555,
            });

        box.position.set(boxX, 0);
        box.eventMode = "static";
        box.cursor = "text";

        const text = new Text({
            text: String(field.value),
            style: {
                fontSize: 18,
                fill: 0x000000,
            },
        });

        text.anchor.set(0.5);
        text.position.set(
            boxX + this.inputWidth / 2,
            this.inputHeight / 2
        );

        box.on("pointertap", () => {
            this.selectField(field.name);
        });

        this.addChild(box);
        this.addChild(text);

        this.fields.set(field.name, {
            value: String(field.value),
            box,
            text,
        });
    }

    private createButton(buttonText: string, x: number) {
        const width = 130;
        const height = this.inputHeight;

        const button = new Graphics()
            .roundRect(0, 0, width, height, 5)
            .fill(0xdddddd)
            .stroke({
                width: 2,
                color: 0x555555,
            });

        button.position.set(x, 0);
        button.eventMode = "static";
        button.cursor = "pointer";

        const text = new Text({
            text: buttonText,
            style: {
                fontSize: 16,
                fill: 0x000000,
            },
        });

        text.anchor.set(0.5);
        text.position.set(
            x + width / 2,
            height / 2
        );

        button.on("pointertap", () => {
            this.selectedField = null;
            this.redrawFields();

            this.onButtonClick?.(this);
        });

        this.addChild(button);
        this.addChild(text);
    }

    private selectField(name: string) {
        this.selectedField = name;
        this.redrawFields();
    }

    private redrawFields() {
        for (const [name, field] of this.fields) {
            field.box.clear();

            field.box
                .rect(0, 0, this.inputWidth, this.inputHeight)
                .fill(0xffffff)
                .stroke({
                    width: this.selectedField === name ? 3 : 2,
                    color:
                        this.selectedField === name
                            ? 0x000000
                            : 0x555555,
                });
        }
    }

    private onKeyDown = (event: KeyboardEvent) => {
        if (!this.selectedField) return;

        const field = this.fields.get(this.selectedField);

        if (!field) return;

        if (/^[0-9]$/.test(event.key)) {
            if (field.value === "0") {
                field.value = event.key;
            } else {
                field.value += event.key;
            }
        } else if (event.key === "Backspace") {
            field.value = field.value.slice(0, -1);

            if (field.value === "") {
                field.value = "0";
            }
        } else if (event.key === "Enter") {
            this.selectedField = null;
            this.redrawFields();
            return;
        } else {
            return;
        }

        field.text.text = field.value;
    };

    public getValue(name: string): number {
        const field = this.fields.get(name);

        if (!field) {
            throw new Error(`Unknown control field: ${name}`);
        }

        return Number(field.value);
    }

    public setValue(name: string, value: number) {
        const field = this.fields.get(name);

        if (!field) {
            throw new Error(`Unknown control field: ${name}`);
        }

        field.value = String(value);
        field.text.text = field.value;
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]) {
        window.removeEventListener("keydown", this.onKeyDown);
        super.destroy(options);
    }
}