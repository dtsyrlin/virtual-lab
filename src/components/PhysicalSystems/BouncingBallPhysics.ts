export class BouncingBallPhysics {
  
  private y: number;
  private velocityY = 0;

  private readonly bottomY: number;
  private accelerationY: number;

  constructor(
    initialY: number,
    bottomY: number,
    accelerationY: number
  ) {
    this.y = initialY;
    this.bottomY = bottomY;
    this.accelerationY = accelerationY;
  }

  public move(deltaTime: number): number {
    this.y += this.velocityY * deltaTime;
    if (this.y >= this.bottomY) {
      //this.y = this.bottomY;
      this.velocityY = -this.velocityY;
    }
    else
    {
      this.velocityY += this.accelerationY * deltaTime;
    }

    return this.y;
  }

  public setAcceleration(accelerationY: number): void {
      this.accelerationY = accelerationY;
  }
}