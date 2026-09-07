import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
} from "pixi.js";

export interface Pendulum2DOptions {
  position: {
    x: number;
    y: number;
  };

  pixelsPerMeter: number;

  minLength?: number;
  maxLength?: number;
  initialLength?: number;

  supportWidth?: number;
  supportThickness?: number;

  bobRadius?: number;
}

export class Pendulum2D extends Container {
  public onLengthChanged?: (
    lengthMeters: number
  ) => void;

  public onBobReleased?: (
    angleRadians: number
  ) => void;

  public readonly pixelsPerMeter:
    number;

  private readonly minLength:
    number;

  private readonly maxLength:
    number;

  private readonly supportWidth:
    number;

  private readonly supportThickness:
    number;

  private readonly bobRadius:
    number;

  private readonly support =
    new Graphics();

  private readonly stringGraphics =
    new Graphics();

  private readonly knob =
    new Graphics();

  private readonly pivotHole =
    new Graphics();

  private readonly bob =
    new Graphics();

  private _lengthMeters:
    number;

  private _angleRadians =
    0;

  private draggingKnob =
    false;

  private draggingBob =
    false;

  private pointerGlobalX =
    Number.NaN;

  private pointerGlobalY =
    Number.NaN;

  private readonly pivotLocal =
    new Point();

  private readonly knobMinX:
    number;

  private readonly knobMaxX:
    number;

  private knobSide =
    -1;

  constructor({
    position,
    pixelsPerMeter,
    minLength = 0.35,
    maxLength = 0.95,
    initialLength = 0.70,
    supportWidth = 600,
    supportThickness = 14,
    bobRadius = 24,
  }: Pendulum2DOptions) {
    super();

    this.position.set(
      position.x,
      position.y
    );

    this.pixelsPerMeter =
      pixelsPerMeter;

    this.minLength =
      minLength;

    this.maxLength =
      maxLength;

    this.supportWidth =
      supportWidth;

    this.supportThickness =
      supportThickness;

    this.bobRadius =
      bobRadius;

    this._lengthMeters =
      Math.max(
        this.minLength,
        Math.min(
          this.maxLength,
          initialLength
        )
      );

    this.pivotLocal.set(
      this.supportWidth / 2,
      this.supportThickness
    );

    /*
     * The knob may slide on either side of the hole.
     * Distance FROM the hole determines how much string has
     * been pulled across the top:
     *
     * farther from hole -> shorter pendulum
     * closer to hole    -> longer pendulum
     */
    this.knobMinX =
      30;

    this.knobMaxX =
      this.supportWidth - 30;

    this.addChild(
      this.support
    );

    this.addChild(
      this.stringGraphics
    );

    this.addChild(
      this.pivotHole
    );

    this.addChild(
      this.knob
    );

    this.addChild(
      this.bob
    );

    this.drawSupport();
    this.drawPivot();
    this.drawKnob();
    this.drawBob();

    this.setupKnobDragging();
    this.setupBobDragging();

    this.updateKnobFromLength();
    this.updateGeometry();
  }

  private drawSupport(): void {
    this.support.clear();

    this.support
      .roundRect(
        0,
        0,
        this.supportWidth,
        this.supportThickness,
        4
      )
      .fill({
        color: 0x777777,
      });
  }

  private drawPivot(): void {
    this.pivotHole.clear();

    /*
     * Small hole through the support bar.
     */
    this.pivotHole
      .circle(
        this.pivotLocal.x,
        this.pivotLocal.y,
        5
      )
      .fill({
        color: 0x222222,
      });
  }

  private drawKnob(): void {
    this.knob.clear();

    this.knob
      .roundRect(
        -16,
        -11,
        32,
        22,
        6
      )
      .fill({
        color: 0xdddddd,
      })
      .stroke({
        color: 0x444444,
        width: 2,
      });

    this.knob.eventMode =
      "static";

    this.knob.cursor =
      "ew-resize";
  }

  private drawBob(): void {
    this.bob.clear();

    this.bob
      .circle(
        0,
        0,
        this.bobRadius
      )
      .fill({
        color: 0x4f79a7,
      })
      .stroke({
        color: 0x2f4f70,
        width: 2,
      });

    /*
     * A small edge mark makes angular motion easier to see.
     */
    this.bob
      .circle(
        0,
        -this.bobRadius + 6,
        4
      )
      .fill({
        color: 0xffffff,
      });

    this.bob.eventMode =
      "static";

    this.bob.cursor =
      "grab";
  }

  private setupKnobDragging(): void {
    this.knob.on(
      "pointerdown",
      (
        event:
          FederatedPointerEvent
      ) => {
        event.stopPropagation();

        this.draggingKnob =
          true;
      }
    );

    this.knob.on(
      "globalpointermove",
      (
        event:
          FederatedPointerEvent
      ) => {
        if (
          !this.draggingKnob
        ) {
          return;
        }

        const local =
          this.toLocal(
            event.global
          );

        const knobX =
          Math.max(
            this.knobMinX,
            Math.min(
              this.knobMaxX,
              local.x
            )
          );

        this.knob.position.set(
          knobX,
          -5
        );

        const offset =
          knobX -
          this.pivotLocal.x;

        if (
          Math.abs(
            offset
          ) > 1
        ) {
          this.knobSide =
            offset < 0
              ? -1
              : 1;
        }

        const maxDistance =
          Math.max(
            1,
            this.pivotLocal.x -
              this.knobMinX
          );

        const fractionPulled =
          Math.min(
            1,
            Math.abs(
              offset
            ) /
              maxDistance
          );

        this._lengthMeters =
          this.maxLength -
          fractionPulled *
          (
            this.maxLength -
            this.minLength
          );

        this.updateGeometry();

        this.onLengthChanged?.(
          this._lengthMeters
        );
      }
    );

    this.knob.on(
      "pointerup",
      () => {
        this.draggingKnob =
          false;
      }
    );

    this.knob.on(
      "pointerupoutside",
      () => {
        this.draggingKnob =
          false;
      }
    );
  }

  private setupBobDragging(): void {
    /*
     * Keep the latest pointer position. The physics loop can then
     * compare a stationary mouse position with the moving bob.
     */
    this.bob.on(
      "globalpointermove",
      (
        event:
          FederatedPointerEvent
      ) => {
        this.pointerGlobalX =
          event.global.x;

        this.pointerGlobalY =
          event.global.y;
      }
    );

    this.bob.on(
      "pointerdown",
      (
        event:
          FederatedPointerEvent
      ) => {
        event.stopPropagation();

        this.pointerGlobalX =
          event.global.x;

        this.pointerGlobalY =
          event.global.y;

        this.draggingBob =
          true;

        this.bob.cursor =
          "grabbing";
      }
    );

    this.bob.on(
      "globalpointermove",
      (
        event:
          FederatedPointerEvent
      ) => {
        if (
          !this.draggingBob
        ) {
          return;
        }

        const local =
          this.toLocal(
            event.global
          );

        const dx =
          local.x -
          this.pivotLocal.x;

        const dy =
          local.y -
          this.pivotLocal.y;

        /*
         * Angle is measured from vertical downward.
         */
        this._angleRadians =
          Math.atan2(
            dx,
            dy
          );

        /*
         * Do not allow the bob to be dragged through the support.
         * Contact occurs when the bob's upper surface reaches
         * the underside of the bar:
         *
         *     L cos(theta) = bobRadius
         */
        const bobRadiusMeters =
          this.bobRadius /
          this.pixelsPerMeter;

        const maxAngle =
          Math.acos(
            Math.min(
              1,
              bobRadiusMeters /
                this._lengthMeters
            )
          );

        this._angleRadians =
          Math.max(
            -maxAngle,
            Math.min(
              maxAngle,
              this._angleRadians
            )
          );

        this.updateGeometry();
      }
    );

    const release =
      () => {
        if (
          !this.draggingBob
        ) {
          return;
        }

        this.draggingBob =
          false;

        this.bob.cursor =
          "grab";

        this.onBobReleased?.(
          this._angleRadians
        );
      };

    this.bob.on(
      "pointerup",
      release
    );

    this.bob.on(
      "pointerupoutside",
      release
    );
  }

  private updateKnobFromLength(): void {
    const fractionPulled =
      (
        this.maxLength -
        this._lengthMeters
      ) /
      (
        this.maxLength -
        this.minLength
      );

    const maxDistance =
      this.pivotLocal.x -
      this.knobMinX;

    const distance =
      fractionPulled *
      maxDistance;

    const x =
      this.pivotLocal.x +
      this.knobSide *
      distance;

    this.knob.position.set(
      x,
      -5
    );
  }

  private updateGeometry(): void {
    /*
     * Pendulum length is defined from the pivot to the CENTER
     * of the bob, because the bob is modeled as a point mass
     * located at its center.
     */
    const centerLengthPixels =
      this._lengthMeters *
      this.pixelsPerMeter;

    const bobX =
      this.pivotLocal.x +
      Math.sin(
        this._angleRadians
      ) *
      centerLengthPixels;

    const bobY =
      this.pivotLocal.y +
      Math.cos(
        this._angleRadians
      ) *
      centerLengthPixels;

    this.bob.position.set(
      bobX,
      bobY
    );

    this.stringGraphics.clear();

    /*
     * Visible top section of string from the knob to the hole.
     */
    this.stringGraphics
      .moveTo(
        this.knob.x,
        0
      )
      .lineTo(
        this.pivotLocal.x,
        0
      )
      .lineTo(
        this.pivotLocal.x,
        this.pivotLocal.y
      )
      .stroke({
        color: 0x333333,
        width: 2,
      });

    /*
     * Hanging string ends at the surface of the bob.
     * The physical pendulum length, however, continues
     * another bob radius to the bob's center.
     */
    const stringLengthPixels =
      Math.max(
        0,
        centerLengthPixels -
        this.bobRadius
      );

    const stringEndX =
      this.pivotLocal.x +
      Math.sin(
        this._angleRadians
      ) *
      stringLengthPixels;

    const stringEndY =
      this.pivotLocal.y +
      Math.cos(
        this._angleRadians
      ) *
      stringLengthPixels;

    this.stringGraphics
      .moveTo(
        this.pivotLocal.x,
        this.pivotLocal.y
      )
      .lineTo(
        stringEndX,
        stringEndY
      )
      .stroke({
        color: 0x333333,
        width: 2,
      });
  }

  public setState(
    angleRadians: number,
    lengthMeters:
      number = this._lengthMeters
  ): void {
    this._angleRadians =
      angleRadians;

    this._lengthMeters =
      Math.max(
        this.minLength,
        Math.min(
          this.maxLength,
          lengthMeters
        )
      );

    this.updateKnobFromLength();
    this.updateGeometry();
  }

  public setAngle(
    angleRadians: number
  ): void {
    this._angleRadians =
      angleRadians;

    this.updateGeometry();
  }

  public setLength(
    lengthMeters: number
  ): void {
    this._lengthMeters =
      Math.max(
        this.minLength,
        Math.min(
          this.maxLength,
          lengthMeters
        )
      );

    this.updateKnobFromLength();
    this.updateGeometry();
  }

  public get angleRadians(): number {
    return this._angleRadians;
  }

  public get lengthMeters(): number {
    return this._lengthMeters;
  }

  public get isPointerWithinBobRadius(): boolean {
    if (
      !Number.isFinite(
        this.pointerGlobalX
      ) ||
      !Number.isFinite(
        this.pointerGlobalY
      )
    ) {
      return false;
    }

    const bobCenter =
      this.toGlobal(
        this.bob.position
      );

    const dx =
      this.pointerGlobalX -
      bobCenter.x;

    const dy =
      this.pointerGlobalY -
      bobCenter.y;

    return (
      dx * dx +
      dy * dy <=
      this.bobRadius *
      this.bobRadius
    );
  }

  public get hangingStringLengthMeters(): number {
    return Math.max(
      0,
      this._lengthMeters -
      this.bobRadius /
        this.pixelsPerMeter
    );
  }

  public get isBobDragging(): boolean {
    return this.draggingBob;
  }
}
