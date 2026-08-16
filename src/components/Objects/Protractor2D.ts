import { Container, Graphics, Text, TextStyle } from "pixi.js";

type Point2D = {
  x: number;
  y: number;
};

export class Protractor2D extends Container {
  private readonly radiusPx: number;

  private dragging = false;
  private rotating = false;

  private dragOffset = { x: 0, y: 0 };
  private startRotationAngle = 0;
  private startRotation = 0;

  constructor(
    radius: number,
    initialPosition: Point2D,
    pixelsPerMeter: number
  ) {
    super();

    this.radiusPx = radius * pixelsPerMeter;

    this.position.set(initialPosition.x, initialPosition.y);

    this.drawProtractor();
    this.setupInteraction();
  }

  private drawProtractor() {
    const r = this.radiusPx;

    const body = new Graphics();

    // Transparent semicircular body
    body
      .moveTo(-r, 0)
      .arc(0, 0, r, Math.PI, 0)
      .lineTo(-r, 0)
      .fill({
        color: 0xddeeff,
        alpha: 0.22,
      })
      .stroke({
        color: 0x333333,
        width: 2,
      });

    this.addChild(body);

    // Degree marks
    for (let degrees = 0; degrees <= 180; degrees += 5) {
      const radians = (degrees * Math.PI) / 180;

      let tickLength = 8;

      if (degrees % 10 === 0) {
        tickLength = 14;
      }

      if (degrees % 30 === 0) {
        tickLength = 20;
      }

      const outerX = Math.cos(radians) * r;
      const outerY = -Math.sin(radians) * r;

      const innerRadius = r - tickLength;

      const innerX = Math.cos(radians) * innerRadius;
      const innerY = -Math.sin(radians) * innerRadius;

      const tick = new Graphics()
        .moveTo(outerX, outerY)
        .lineTo(innerX, innerY)
        .stroke({
          color: 0x222222,
          width: degrees % 10 === 0 ? 2 : 1,
        });

      this.addChild(tick);

      // Labels every 10 degrees
      if (degrees % 10 === 0) {
        const labelRadius = r - 32;

        const x = Math.cos(radians) * labelRadius;
        const y = -Math.sin(radians) * labelRadius;

        const label = new Text({
          text: `${degrees}`,
          style: new TextStyle({
            fontFamily: "Arial",
            fontSize: 12,
            fill: 0x222222,
          }),
        });

        label.anchor.set(0.5);
        label.position.set(x, y);

        this.addChild(label);
      }
    }

    // Center / vertex placement mark
    const centerMark = new Graphics()
      .circle(0, 0, 7)
      .stroke({
        color: 0xcc2222,
        width: 2,
      })
      .moveTo(-11, 0)
      .lineTo(11, 0)
      .moveTo(0, -11)
      .lineTo(0, 11)
      .stroke({
        color: 0xcc2222,
        width: 2,
      });

    this.addChild(centerMark);

    // Small label near the placement mark
    const centerLabel = new Text({
      text: "vertex",
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 11,
        fill: 0xcc2222,
      }),
    });

    centerLabel.anchor.set(0.5, 1);
    centerLabel.position.set(0, -13);

    this.addChild(centerLabel);
  }

  private setupInteraction() {
    this.eventMode = "static";
    this.cursor = "grab";

    this.on("pointerdown", (event) => {
      const local = event.getLocalPosition(this);

      /*
       * Clicking near the outer arc rotates.
       * Clicking elsewhere drags.
       */
      const distanceFromCenter = Math.sqrt(
        local.x * local.x + local.y * local.y
      );

      if (distanceFromCenter > this.radiusPx * 0.82) {
        this.rotating = true;

        const parentPoint = event.getLocalPosition(this.parent!);

        this.startRotationAngle = Math.atan2(
          parentPoint.y - this.y,
          parentPoint.x - this.x
        );

        this.startRotation = this.rotation;
        this.cursor = "grabbing";
      } else {
        this.dragging = true;

        const parentPoint = event.getLocalPosition(this.parent!);

        this.dragOffset.x = parentPoint.x - this.x;
        this.dragOffset.y = parentPoint.y - this.y;

        this.cursor = "grabbing";
      }
    });

    this.on("globalpointermove", (event) => {
      const parentPoint = event.getLocalPosition(this.parent!);

      if (this.dragging) {
        this.position.set(
          parentPoint.x - this.dragOffset.x,
          parentPoint.y - this.dragOffset.y
        );
      }

      if (this.rotating) {
        const angle = Math.atan2(
          parentPoint.y - this.y,
          parentPoint.x - this.x
        );

        this.rotation =
          this.startRotation + angle - this.startRotationAngle;
      }
    });

    const stopInteraction = () => {
      this.dragging = false;
      this.rotating = false;
      this.cursor = "grab";
    };

    this.on("pointerup", stopInteraction);
    this.on("pointerupoutside", stopInteraction);
  }
}