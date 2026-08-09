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
  }

  private createButtons(): void {
    let x = 0;

    for (const option of this.options) {
      this.createButton(
        option.label,
        option.gravity,
        x
      );

      x += 85;
    }
  }

  private createButton(
    label: string,
    gravity: number,
    x: number
  ): void {
    const button = new Container();

    button.position.set(
      x,
      0
    );

    const background = new Graphics();

    background
      .roundRect(
        0,
        0,
        75,
        30,
        5
      )
      .fill({
        color: 0xdddddd,
      })
      .stroke({
        color: 0x555555,
        width: 1,
      });

    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 13,
      fill: 0x111111,
    });

    const text = new Text({
      text: label,
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

        this.onGravityChanged?.(
          gravity
        );
      }
    );

    this.addChild(button);
  }
}