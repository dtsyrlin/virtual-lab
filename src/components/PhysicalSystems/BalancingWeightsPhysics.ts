export class BalancingWeightsPhysics {

  private currentTilt =
    0;

  private targetTilt =
    0;


  private readonly maxTilt =
    0.16;


  private readonly tiltSpeed =
    0.35;


  public updateMasses(
    leftMass: number,
    rightMass: number
  ): void {

    if (
      leftMass ===
      rightMass
    ) {

      this.targetTilt =
        0;

      return;
    }


    this.targetTilt =
      leftMass > rightMass
        ? -this.maxTilt
        : this.maxTilt;
  }


  public move(
    deltaTime: number
  ): void {

    const difference =
      this.targetTilt -
      this.currentTilt;


    const maxStep =
      this.tiltSpeed *
      deltaTime;


    if (
      Math.abs(
        difference
      ) <= maxStep
    ) {

      this.currentTilt =
        this.targetTilt;

      return;
    }


    this.currentTilt +=
      Math.sign(
        difference
      ) *
      maxStep;
  }


  public getTilt(): number {

    return this.currentTilt;
  }


  public reset(): void {

    this.currentTilt =
      0;

    this.targetTilt =
      0;
  }
}
