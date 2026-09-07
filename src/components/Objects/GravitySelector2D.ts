import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";

type GravityOption = {
  label: string;
  gravity: number;
};

type GravityButton = {
  option: GravityOption;
  background: Graphics;
  text: Text;
};

export class GravitySelector2D extends Container {
  public onGravityChanged?: (
    gravity: number
  ) => void;

  private readonly options: GravityOption[] = [
    { label: "Earth", gravity: 9.81 },
    { label: "Moon", gravity: 1.62 },
    { label: "Mars", gravity: 3.71 },
    { label: "Jupiter", gravity: 24.79 },
  ];

  private readonly buttons: GravityButton[] = [];

  private selectedGravity = 9.81;

  constructor(
    xPixels: number,
    yPixels: number
  ) {
    super();

    this.position.set(
      xPixels,
      yPixels
    );

    this.createButtons();
    this.updateButtonStyles();
  }

  private createButtons(): void {
    let x = 0;

    for (const option of this.options) {
      this.createButton(
        option,
        x
      );

      x += 85;
    }
  }

  private createButton(
    option: GravityOption,
    x: number
  ): void {
    const button = new Container();

    button.position.set(
      x,
      0
    );

    const background = new Graphics();

    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 13,
      fill: 0x111111,
      fontWeight: "normal",
    });

    const text = new Text({
      text: option.label,
      style,
    });

    text.anchor.set(0.5);

    text.position.set(
      37.5,
      15
    );

    button.addChild(background);
    button.addChild(text);

    button.eventMode = "static";
    button.cursor = "pointer";

    button.on(
      "pointerdown",
      (
        event: FederatedPointerEvent
      ) => {
        event.stopPropagation();

        this.selectedGravity =
          option.gravity;

        this.updateButtonStyles();

        this.onGravityChanged?.(
          option.gravity
        );
      }
    );

    this.buttons.push({
      option,
      background,
      text,
    });

    this.addChild(button);
  }

  private updateButtonStyles(): void {
    for (const button of this.buttons) {
      const selected =
        button.option.gravity ===
        this.selectedGravity;

      button.background.clear();

      button.background
        .roundRect(
          0,
          0,
          75,
          30,
          5
        )
        .fill({
          color: selected
            ? 0x666666
            : 0xdddddd,
        })
        .stroke({
          color: selected
            ? 0x222222
            : 0x555555,
          width: selected
            ? 2
            : 1,
        });

      button.text.style.fill =
        selected
          ? 0xffffff
          : 0x111111;

      button.text.style.fontWeight =
        selected
          ? "bold"
          : "normal";
    }
  }

  public setGravity(
    gravity: number
  ): void {
    const matchingOption =
      this.options.find(
        option =>
          option.gravity === gravity
      );

    if (!matchingOption) {
      return;
    }

    this.selectedGravity =
      matchingOption.gravity;

    this.updateButtonStyles();
  }

  public get gravity(): number {
    return this.selectedGravity;
  }
}
