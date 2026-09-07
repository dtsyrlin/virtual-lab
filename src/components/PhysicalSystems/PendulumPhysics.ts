export interface PendulumPhysicsOptions {
  lengthMeters: number;
  gravity?: number;
  angleRadians?: number;
  angularVelocity?: number;
  bobRadiusMeters?: number;
}

export class PendulumPhysics {
  private _lengthMeters: number;
  private _gravity: number;

  private _angleRadians: number;
  private _angularVelocity: number;
  private readonly bobRadiusMeters:
    number;

  constructor({
    lengthMeters,
    gravity = 9.81,
    angleRadians = 0,
    angularVelocity = 0,
    bobRadiusMeters = 0,
  }: PendulumPhysicsOptions) {
    this._lengthMeters =
      lengthMeters;

    this._gravity =
      gravity;

    this._angleRadians =
      angleRadians;

    this._angularVelocity =
      angularVelocity;

    this.bobRadiusMeters =
      Math.max(
        0,
        bobRadiusMeters
      );
  }

  /*
   * Ideal simple pendulum:
   *
   * theta'' = -(g / L) sin(theta)
   *
   * We intentionally do NOT use the small-angle
   * approximation sin(theta) ~= theta.
   *
   * Velocity Verlet gives much better long-term
   * energy behavior than simple Euler integration.
   */
  public move(
    deltaTimeSeconds: number
  ): number {
    if (
      deltaTimeSeconds <= 0
    ) {
      return this._angleRadians;
    }

    /*
     * Sub-stepping keeps the motion stable if a render
     * frame is unusually long.
     */
    const maxStep =
      1 / 240;

    const steps =
      Math.max(
        1,
        Math.ceil(
          deltaTimeSeconds /
          maxStep
        )
      );

    const dt =
      deltaTimeSeconds /
      steps;

    for (
      let i = 0;
      i < steps;
      i++
    ) {
      const accelerationBefore =
        this.getAngularAcceleration(
          this._angleRadians
        );

      this._angleRadians +=
        this._angularVelocity *
          dt +
        0.5 *
          accelerationBefore *
          dt *
          dt;

      const accelerationAfter =
        this.getAngularAcceleration(
          this._angleRadians
        );

      this._angularVelocity +=
        0.5 *
        (
          accelerationBefore +
          accelerationAfter
        ) *
        dt;

      this.resolveSupportCollision();
    }

    return this._angleRadians;
  }

  /*
   * The bob cannot pass through the horizontal support.
   * With the pivot at the underside of the bar, contact occurs at
   *
   *     L cos(theta) = r
   *
   * where r is the bob radius.
   *
   * Reversing angular velocity gives an ideal elastic bounce
   * while keeping the velocity tangent to the circular path.
   */
  private resolveSupportCollision(): void {
    if (
      this.bobRadiusMeters <= 0 ||
      this._lengthMeters <=
        this.bobRadiusMeters
    ) {
      return;
    }

    const maxAngle =
      Math.acos(
        this.bobRadiusMeters /
          this._lengthMeters
      );

    const sign =
      this._angleRadians < 0
        ? -1
        : 1;

    if (
      Math.abs(
        this._angleRadians
      ) < maxAngle
    ) {
      return;
    }

    this._angleRadians =
      sign *
      maxAngle;

    /*
     * Only reverse if the bob was moving farther into the bar.
     */
    if (
      sign *
        this._angularVelocity >
      0
    ) {
      this._angularVelocity *=
        -1;
    }
  }

  private getAngularAcceleration(
    angleRadians: number
  ): number {
    return (
      -this._gravity /
      this._lengthMeters *
      Math.sin(
        angleRadians
      )
    );
  }

  public releaseFromRest(
    angleRadians: number
  ): void {
    this._angleRadians =
      angleRadians;

    this._angularVelocity =
      0;
  }

  public setLength(
    lengthMeters: number,
    conserveAngularMomentum = true
  ): void {
    if (
      lengthMeters <= 0
    ) {
      return;
    }

    if (
      conserveAngularMomentum &&
      this._lengthMeters > 0
    ) {
      /*
       * For a point mass:
       *
       *     angular momentum = m r^2 omega
       *
       * A radial pull produces no torque about the pivot,
       * so r^2 * omega is conserved during the length change.
       */
      const ratio =
        this._lengthMeters /
        lengthMeters;

      this._angularVelocity *=
        ratio *
        ratio;
    }

    this._lengthMeters =
      lengthMeters;

    this.resolveSupportCollision();
  }

  public applyDamping(
    deltaTimeSeconds: number,
    dampingPerSecond = 4
  ): void {
    if (
      deltaTimeSeconds <= 0 ||
      dampingPerSecond <= 0
    ) {
      return;
    }

    /*
     * Exponential damping keeps the effect independent
     * of frame rate.
     */
    this._angularVelocity *=
      Math.exp(
        -dampingPerSecond *
        deltaTimeSeconds
      );
  }

  public setGravity(
    gravity: number
  ): void {
    if (
      gravity <= 0
    ) {
      return;
    }

    this._gravity =
      gravity;
  }

  public stopAtAngle(
    angleRadians: number
  ): void {
    this._angleRadians =
      angleRadians;

    this._angularVelocity =
      0;
  }

  public get angleRadians(): number {
    return this._angleRadians;
  }

  public get angularVelocity(): number {
    return this._angularVelocity;
  }

  public get lengthMeters(): number {
    return this._lengthMeters;
  }

  public get gravity(): number {
    return this._gravity;
  }
}
