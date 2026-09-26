export class BouncingBallPhysics {
  
  private y: number;
  private velocityY = 0;

  private readonly bottomY: number;
  private accelerationY: number;
  private readonly maxStep = 1 / 240;

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
    let timeRemaining = deltaTime;

    while (timeRemaining > 0) {
      const dt = Math.min(timeRemaining, this.maxStep);
      this.advance(dt);
      timeRemaining -= dt;
    }

    return this.y;
  }

  private advance(deltaTime: number): void {
    const startY = this.y;
    const startVelocityY = this.velocityY;
    const accelerationY = this.accelerationY;

    const endY =
      startY +
      startVelocityY * deltaTime +
      0.5 * accelerationY * deltaTime * deltaTime;

    const endVelocityY =
      startVelocityY + accelerationY * deltaTime;

    if (endY < this.bottomY) {
      this.y = endY;
      this.velocityY = endVelocityY;
      return;
    }

    const distanceToBottom = this.bottomY - startY;
    const discriminant =
      startVelocityY * startVelocityY +
      2 * accelerationY * distanceToBottom;

    let collisionTime =
      (-startVelocityY + Math.sqrt(Math.max(0, discriminant))) /
      accelerationY;

    collisionTime = Math.max(
      0,
      Math.min(collisionTime, deltaTime)
    );

    const velocityAtCollision =
      startVelocityY + accelerationY * collisionTime;

    const velocityAfterCollision =
      -velocityAtCollision;

    const remainingTime =
      deltaTime - collisionTime;

    this.y =
      this.bottomY +
      velocityAfterCollision * remainingTime +
      0.5 * accelerationY * remainingTime * remainingTime;

    this.velocityY =
      velocityAfterCollision +
      accelerationY * remainingTime;

    if (this.y > this.bottomY) {
      this.y = this.bottomY;
    }
  }

  public setAcceleration(accelerationY: number): void {
      this.accelerationY = accelerationY;
  }
}