import {
  Container,
  Graphics,
} from "pixi.js";


type Point2D = {
  x: number;
  y: number;
};


type VerticalSpringAttachmentOptions = {

  position: Point2D;

  height: number;

  armLength?: number;

  thickness?: number;
};


export class VerticalSpringAttachment
  extends Container {

  private graphics:
    Graphics;


  private attachmentHeight:
    number;


  private armLength:
    number;


  private thickness:
    number;


  constructor(
    options:
      VerticalSpringAttachmentOptions,
  ) {

    super();


    this.position.set(
      options.position.x,
      options.position.y,
    );


    this.attachmentHeight =
      options.height;


    this.armLength =
      options.armLength ?? 100;


    this.thickness =
      options.thickness ?? 8;


    this.graphics =
      new Graphics();


    this.addChild(
      this.graphics,
    );


    this.draw();
  }


  private draw() {

    this.graphics.clear();


    //
    // Long vertical support.
    //

    this.graphics.rect(
      0,
      0,
      this.thickness,
      this.attachmentHeight,
    );


    this.graphics.fill(
      0x666666,
    );


    //
    // Horizontal attachment arm
    // at the top.
    //

    this.graphics.rect(
      0,
      0,
      this.armLength,
      this.thickness,
    );


    this.graphics.fill(
      0x666666,
    );


    //
    // Horizontal foot at bottom.
    //

    const footWidth =
      100;


    this.graphics.rect(
      -footWidth / 2 +
        this.thickness / 2,

      this.attachmentHeight -
        this.thickness,

      footWidth,
      this.thickness,
    );


    this.graphics.fill(
      0x666666,
    );
  }

  public getClosestSpringAttachmentPosition(
    x: number,
  ) {

    const minimumX =
      this.x;


    const maximumX =
      this.x +
      this.armLength;


    const attachmentX =
      Math.max(
        minimumX,

        Math.min(
          maximumX,
          x,
        ),
      );


    return {
      x:
        attachmentX,

      y:
        this.y +
        this.thickness,
    };
  }


  public getAttachmentY() {

    return (
      this.y +
      this.thickness
    );
  }


  public getLeftX() {

    return this.x;
  }


  public getRightX() {

    return (
      this.x +
      this.armLength
    );
  }
}