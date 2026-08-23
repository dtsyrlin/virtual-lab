import {
  Container,
  Graphics,
} from "pixi.js";


export interface Balance2DOptions {
  position: {
    x: number;
    y: number;
  };

  width?: number;
  height?: number;
}


export class Balance2D
  extends Container {

  private readonly fixedGraphics:
    Graphics;

  private readonly beam:
    Graphics;

  private readonly leftPlatform:
    Graphics;

  private readonly rightPlatform:
    Graphics;


  private readonly balanceWidth:
    number;

  private readonly balanceHeight:
    number;

  private readonly beamY:
    number;

  private readonly platformWidth:
    number;

  private readonly platformThickness:
    number;


  constructor(
    options: Balance2DOptions
  ) {

    super();

    this.position.set(
      options.position.x,
      options.position.y
    );

    this.balanceWidth =
      options.width ?? 460;

    this.balanceHeight =
      options.height ?? 240;

    this.beamY =
      40;

    this.platformWidth =
      250;

    this.platformThickness =
      15;


    this.fixedGraphics =
      new Graphics();

    this.beam =
      new Graphics();

    this.leftPlatform =
      new Graphics();

    this.rightPlatform =
      new Graphics();


    this.addChild(
      this.fixedGraphics
    );

    this.addChild(
      this.beam
    );

    this.addChild(
      this.leftPlatform
    );

    this.addChild(
      this.rightPlatform
    );


    this.drawFixedParts();
    this.drawBeam();
    this.drawPlatforms();

    this.setTilt(
      0
    );
  }


  private drawFixedParts(): void {

    const centerX =
      this.balanceWidth / 2;

    const baseY =
      this.balanceHeight;


    this.fixedGraphics.moveTo(
      centerX,
      this.beamY
    );

    this.fixedGraphics.lineTo(
      centerX - 60,
      baseY - 20
    );

    this.fixedGraphics.lineTo(
      centerX + 60,
      baseY - 20
    );

    this.fixedGraphics.closePath();

    this.fixedGraphics.fill(
      0x777777
    );


    this.fixedGraphics.rect(
      centerX - 90,
      baseY - 20,
      180,
      20
    );

    this.fixedGraphics.fill(
      0x555555
    );
  }


  private drawBeam(): void {

    const beamThickness =
      12;


    this.beam.rect(
      -this.balanceWidth / 2,
      -beamThickness / 2,
      this.balanceWidth,
      beamThickness
    );

    this.beam.fill(
      0x555555
    );


    this.beam.position.set(
      this.balanceWidth / 2,
      this.beamY
    );
  }


  private drawPlatforms(): void {

    this.leftPlatform.rect(
      -this.platformWidth / 2,
      -this.platformThickness,
      this.platformWidth,
      this.platformThickness
    );

    this.leftPlatform.fill(
      0x888888
    );


    this.rightPlatform.rect(
      -this.platformWidth / 2,
      -this.platformThickness,
      this.platformWidth,
      this.platformThickness
    );

    this.rightPlatform.fill(
      0x888888
    );
  }


  public setTilt(
    angle: number
  ): void {

    this.beam.rotation =
      angle;


    const halfWidth =
      this.balanceWidth / 2;

    const centerX =
      this.balanceWidth / 2;

    const centerY =
      this.beamY;


    const dx =
      Math.cos(angle) *
      halfWidth;

    const dy =
      Math.sin(angle) *
      halfWidth;


    this.leftPlatform.position.set(
      centerX - dx,
      centerY - dy
    );


    this.rightPlatform.position.set(
      centerX + dx,
      centerY + dy
    );


    this.leftPlatform.rotation =
      0;

    this.rightPlatform.rotation =
      0;
  }


  public getLeftPlatformTop() {

    return {
      x:
        this.x +
        this.leftPlatform.x,

      y:
        this.y +
        this.leftPlatform.y -
        this.platformThickness,
    };
  }


  public getRightPlatformTop() {

    return {
      x:
        this.x +
        this.rightPlatform.x,

      y:
        this.y +
        this.rightPlatform.y -
        this.platformThickness,
    };
  }


  public getPlatformWidth(): number {

    return this.platformWidth;
  }
}
