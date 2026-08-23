import {
  Container,
  Graphics,
  Text,
  FederatedPointerEvent,
} from "pixi.js";


export type SpringOrientation =
  | "horizontal"
  | "vertical";


type ActiveDragButton =
  | "left"
  | "right";


type Spring2DOptions = {
  id: string;

  position: {
    x: number;
    y: number;
  };

  length: number;
  k: number;

  pixelsPerMeter: number;

  orientation?: SpringOrientation;
};


export class Spring2D extends Container {

  public readonly id: string;

  public readonly naturalLength: number;
  public readonly k: number;

  public readonly pixelsPerMeter: number;

  public orientation: SpringOrientation;


  private currentLength: number;

  private springGraphics: Graphics;

  private kLabel: Text;


  private dragging = false;

  private activeDragButton:
    ActiveDragButton | null =
      null;


  private dragOffsetX = 0;
  private dragOffsetY = 0;


  private onLeftDragStartCallback?:
    () => boolean | void;

  private onDragEndCallback?:
    () => void;


  private onRightDragStartCallback?:
    () => boolean | void;

  private onRightDragEndCallback?:
    () => void;


  constructor(
    options: Spring2DOptions,
  ) {

    super();


    this.id =
      options.id;

    this.naturalLength =
      options.length;

    this.currentLength =
      options.length;

    this.k =
      options.k;

    this.pixelsPerMeter =
      options.pixelsPerMeter;

    this.orientation =
      options.orientation ??
      "vertical";


    this.position.set(
      options.position.x,
      options.position.y,
    );


    this.springGraphics =
      new Graphics();


    this.addChild(
      this.springGraphics,
    );


    //
    // Spring constant label.
    //

    this.kLabel =
      new Text({
        text:
          `k = ${this.k} N/m`,

        style: {
          fontSize: 14,
          fill: 0x222222,
        },
      });


    this.kLabel.anchor.set(
      0.5,
      1,
    );


    this.addChild(
      this.kLabel,
    );


    this.draw();


    this.eventMode =
      "static";

    this.cursor =
      "grab";


    this.on(
      "pointerdown",
      this.onPointerDown,
    );


    this.on(
      "globalpointermove",
      this.onPointerMove,
    );


    this.on(
      "pointerup",
      this.onPointerUp,
    );


    this.on(
      "pointerupoutside",
      this.onPointerUp,
    );
  }


  private draw() {

    this.springGraphics.clear();


    const lengthPixels =
      this.currentLength *
      this.pixelsPerMeter;


    const springWidth =
      20;

    const endBarHeight =
      24;

    const endStraightLength =
      12;

    const numberOfCoils =
      12;


    if (
      this.orientation ===
      "horizontal"
    ) {

      //
      // Left attachment bar.
      //

      this.springGraphics.moveTo(
        0,
        -endBarHeight / 2,
      );

      this.springGraphics.lineTo(
        0,
        endBarHeight / 2,
      );


      //
      // Left straight section.
      //

      this.springGraphics.moveTo(
        0,
        0,
      );

      this.springGraphics.lineTo(
        endStraightLength,
        0,
      );


      const coilStart =
        endStraightLength;


      const coilEnd =
        Math.max(
          coilStart,

          lengthPixels -
            endStraightLength,
        );


      const coilLength =
        coilEnd -
        coilStart;


      const step =
        coilLength /
        (numberOfCoils * 2);


      this.springGraphics.moveTo(
        coilStart,
        0,
      );


      for (
        let i = 1;
        i < numberOfCoils * 2;
        i++
      ) {

        const x =
          coilStart +
          i * step;


        const y =
          i % 2 === 0
            ? -springWidth / 2
            : springWidth / 2;


        this.springGraphics.lineTo(
          x,
          y,
        );
      }


      this.springGraphics.lineTo(
        coilEnd,
        0,
      );


      this.springGraphics.lineTo(
        lengthPixels,
        0,
      );


      //
      // Right attachment bar.
      //

      this.springGraphics.moveTo(
        lengthPixels,
        -endBarHeight / 2,
      );

      this.springGraphics.lineTo(
        lengthPixels,
        endBarHeight / 2,
      );


      //
      // Label above spring.
      //

      this.kLabel.rotation =
        0;

      this.kLabel.position.set(
        lengthPixels / 2,
        -20,
      );

    } else {

      //
      // Vertical version.
      //

      this.springGraphics.moveTo(
        -endBarHeight / 2,
        0,
      );

      this.springGraphics.lineTo(
        endBarHeight / 2,
        0,
      );


      this.springGraphics.moveTo(
        0,
        0,
      );

      this.springGraphics.lineTo(
        0,
        endStraightLength,
      );


      const coilStart =
        endStraightLength;


      const coilEnd =
        Math.max(
          coilStart,

          lengthPixels -
            endStraightLength,
        );


      const coilLength =
        coilEnd -
        coilStart;


      const step =
        coilLength /
        (numberOfCoils * 2);


      this.springGraphics.moveTo(
        0,
        coilStart,
      );


      for (
        let i = 1;
        i < numberOfCoils * 2;
        i++
      ) {

        const y =
          coilStart +
          i * step;


        const x =
          i % 2 === 0
            ? -springWidth / 2
            : springWidth / 2;


        this.springGraphics.lineTo(
          x,
          y,
        );
      }


      this.springGraphics.lineTo(
        0,
        coilEnd,
      );


      this.springGraphics.lineTo(
        0,
        lengthPixels,
      );


      this.springGraphics.moveTo(
        -endBarHeight / 2,
        lengthPixels,
      );

      this.springGraphics.lineTo(
        endBarHeight / 2,
        lengthPixels,
      );


      this.kLabel.rotation =
        Math.PI / 2;

      this.kLabel.position.set(
        28,
        lengthPixels / 2,
      );
    }


    this.springGraphics.stroke({
      width: 3,
      color: 0x333333,
    });
  }


  private beginMoveDrag(
    event:
      FederatedPointerEvent,
  ) {

    if (!this.parent) {
      return;
    }


    this.dragging =
      true;


    this.cursor =
      "grabbing";


    const parentPosition =
      this.parent.toLocal(
        event.global,
      );


    this.dragOffsetX =
      parentPosition.x -
      this.x;


    this.dragOffsetY =
      parentPosition.y -
      this.y;
  }


  private onPointerDown =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (!this.parent) {
        return;
      }


      // =================================================
      // RIGHT DRAG
      //
      // Reserved for detaching the
      // right-most spring.
      // =================================================

      if (
        event.button === 2
      ) {

        event.preventDefault();


        const allowDrag =
          this.onRightDragStartCallback?.();


        if (
          allowDrag === false ||
          allowDrag === undefined
        ) {

          return;
        }


        this.activeDragButton =
          "right";


        this.beginMoveDrag(
          event,
        );


        return;
      }


      if (
        event.button !== 0
      ) {
        return;
      }


      this.activeDragButton =
        "left";


      const allowDrag =
        this.onLeftDragStartCallback?.();


      if (
        allowDrag === false
      ) {

        this.activeDragButton =
          null;

        return;
      }


      this.beginMoveDrag(
        event,
      );
    };


  private onPointerMove =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (!this.dragging) {
        return;
      }


      if (!this.parent) {
        return;
      }


      const parentPosition =
        this.parent.toLocal(
          event.global,
        );


      this.position.set(

        parentPosition.x -
          this.dragOffsetX,

        parentPosition.y -
          this.dragOffsetY,
      );
    };


  private onPointerUp = () => {

    if (!this.dragging) {
      return;
    }


    const finishedButton =
      this.activeDragButton;


    this.dragging =
      false;


    this.activeDragButton =
      null;


    this.cursor =
      "grab";


    if (
      finishedButton ===
        "right"
    ) {

      this.onRightDragEndCallback?.();


      return;
    }


    this.onDragEndCallback?.();
  };


  public setOnLeftDragStart(
    callback:
      () => boolean | void,
  ) {

    this.onLeftDragStartCallback =
      callback;
  }


  public setOnDragEnd(
    callback:
      () => void,
  ) {

    this.onDragEndCallback =
      callback;
  }


  public setOnRightDragStart(
    callback:
      () => boolean | void,
  ) {

    this.onRightDragStartCallback =
      callback;
  }


  public setOnRightDragEnd(
    callback:
      () => void,
  ) {

    this.onRightDragEndCallback =
      callback;
  }


  public setCurrentLength(
    lengthMeters: number,
  ) {

    this.currentLength =
      lengthMeters;


    this.draw();
  }


  public getCurrentLength() {

    return this.currentLength;
  }


  public getNaturalLength() {

    return this.naturalLength;
  }


  public getFreeEndPosition() {

    const lengthPixels =
      this.currentLength *
      this.pixelsPerMeter;


    if (
      this.orientation ===
      "vertical"
    ) {

      return {
        x: this.x,

        y:
          this.y +
          lengthPixels,
      };
    }


    return {
      x:
        this.x +
        lengthPixels,

      y: this.y,
    };
  }


  public setInitialPosition(
    x: number,
    y: number,
  ) {

    this.position.set(
      x,
      y,
    );
  }
}
