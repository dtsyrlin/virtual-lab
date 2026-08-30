import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";

export class Timer2D extends Container {
  private elapsedSeconds = 0;
  private running = false;

  private readonly display: Text;
  private readonly startStopLabel: Text;

  constructor(
    xPixels: number,
    yPixels: number
  ) {
    super();

    this.position.set(
      xPixels,
      yPixels
    );

    this.drawBackground();

    this.display = this.createDisplay();
    this.addChild(this.display);

    this.startStopLabel =
      this.createButton(
        "START",
        10,
        65,
        () => this.toggleRunning()
      );

    this.createButton(
      "RESET",
      90,
      65,
      () => this.reset()
    );
  }

  private drawBackground(): void {
    const background = new Graphics();

    background
      .roundRect(
        0,
        0,
        160,
        60,
        8
      )
      .fill({
        color: 0x222222,
      });

    this.addChild(background);
  }

  private createDisplay(): Text {
    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 28,
      fill: 0xffffff,
    });

    const display = new Text({
      text: "0.00",
      style,
    });

    display.position.set(
      48,
      13
    );

    return display;
  }

  private createButton(
    label: string,
    x: number,
    y: number,
    onClick: () => void
  ): Text {
    const button =
      new Container();

    button.position.set(
      x,
      y
    );

    const background =
      new Graphics();

    background
      .roundRect(
        0,
        0,
        60,
        28,
        5
      )
      .fill({
        color: 0xdddddd,
      })
      .stroke({
        color: 0x555555,
        width: 1,
      });

    const style =
      new TextStyle({
        fontFamily: "Arial",
        fontSize: 12,
        fill: 0x111111,
      });

    const text =
      new Text({
        text: label,
        style,
      });

    text.anchor.set(0.5);

    text.position.set(
      30,
      14
    );

    button.addChild(
      background
    );

    button.addChild(
      text
    );

    button.eventMode =
      "static";

    button.cursor =
      "pointer";

    button.on(
      "pointerdown",
      (
        event:
          FederatedPointerEvent
      ) => {
        event.stopPropagation();

        onClick();
      }
    );

    this.addChild(
      button
    );

    return text;
  }

  public toggleRunning(): void {
    this.running =
      !this.running;

    this.startStopLabel.text =
      this.running
        ? "STOP"
        : "START";
  }

  public reset(): void {
    this.elapsedSeconds = 0;

    this.updateDisplay();
  }

  public update(
    deltaTime: number
  ): void {
    if (!this.running) {
      return;
    }

    this.elapsedSeconds +=
      deltaTime;

    this.updateDisplay();
  }

  private updateDisplay(): void {
    this.display.text =
      this.elapsedSeconds.toFixed(2);
  }
}