import type { RollingObjectKind } from "../Objects/RollingObject2D";

export interface RollingTrackBody {
    id: string;
    kind: RollingObjectKind;
    mass: number;
    radius: number;
    position: number;
    velocity: number;
    angle: number;
    angularVelocity: number;
    held: boolean;
}

export interface RollingTrackPhysicsOptions {
    trackLength: number;
    gravity?: number;
}

export interface RollingTrackStepEvent {
    body: RollingTrackBody;
    previousPosition: number;
    position: number;
    startTime: number;
    endTime: number;
}

export class RollingTrackPhysics {
    private readonly trackLength: number;
    private readonly gravity: number;
    private readonly bodies = new Map<string, RollingTrackBody>();
    private _angleRadians = 0;
    private _staticFrictionCoefficient = 0;
    private _kineticFrictionCoefficient = 0;
    private simulationTime = 0;
    private onBodyStep?: (event: RollingTrackStepEvent) => void;

    constructor({
        trackLength,
        gravity = 9.81,
    }: RollingTrackPhysicsOptions) {
        this.trackLength = trackLength;
        this.gravity = gravity;
    }

    public addBody(
        id: string,
        kind: RollingObjectKind,
        position: number,
        radius: number
    ): void {
        this.bodies.set(id, {
            id,
            kind,
            mass: 1,
            radius,
            position,
            velocity: 0,
            angle: 0,
            angularVelocity: 0,
            held: false,
        });
        this.constrain(this.bodies.get(id)!);
    }

    public removeBody(id: string): void {
        this.bodies.delete(id);
    }

    public getBody(id: string): RollingTrackBody | undefined {
        return this.bodies.get(id);
    }

    public setBodyHeld(id: string, held: boolean): void {
        const body = this.bodies.get(id);
        if (!body) return;
        body.held = held;
        if (held) {
            body.velocity = 0;
            body.angularVelocity = 0;
        }
    }

    public dragBodyTo(id: string, position: number): number {
        const body = this.bodies.get(id);
        if (!body) return position;
        body.position = position;
        body.velocity = 0;
        body.angularVelocity = 0;
        this.constrain(body);
        return body.position;
    }

    public setAngle(angleRadians: number): void {
        this._angleRadians = angleRadians;
    }

    public setStaticFrictionCoefficient(value: number): void {
        this._staticFrictionCoefficient = Math.max(0, value);
    }

    public setKineticFrictionCoefficient(value: number): void {
        this._kineticFrictionCoefficient = Math.max(0, value);
    }

    public setOnBodyStep(
        callback: ((event: RollingTrackStepEvent) => void) | undefined
    ): void {
        this.onBodyStep = callback;
    }

    public getSimulationTime(): number {
        return this.simulationTime;
    }

    public move(deltaTimeSeconds: number): void {
        // Substeps make the rolling/slipping transition and stopper bounce
        // stable even if the browser drops a frame.
        const maxStep = 1 / 240;
        let remaining = Math.min(deltaTimeSeconds, 0.05);
        while (remaining > 0) {
            const dt = Math.min(maxStep, remaining);
            const startTime = this.simulationTime;
            const endTime = startTime + dt;

            for (const body of this.bodies.values()) {
                if (body.held) continue;
                const previousPosition = body.position;
                this.moveBody(body, dt);
                this.onBodyStep?.({
                    body,
                    previousPosition,
                    position: body.position,
                    startTime,
                    endTime,
                });
            }

            this.simulationTime = endTime;
            remaining -= dt;
        }
    }

    private moveBody(body: RollingTrackBody, dt: number): void {
        if (body.kind === "block") {
            this.moveSlidingBlock(body, dt);
        } else {
            this.moveRollingBody(body, dt);
        }

        body.position += body.velocity * dt;
        body.angle += body.angularVelocity * dt;
        this.handleStopper(body);
    }

    private moveSlidingBlock(body: RollingTrackBody, dt: number): void {
        const gAlong = this.gravity * Math.sin(this._angleRadians);
        const normal = this.gravity * Math.cos(this._angleRadians);
        const eps = 1e-7;

        if (Math.abs(body.velocity) < eps) {
            if (Math.abs(gAlong) <= this._staticFrictionCoefficient * normal) {
                body.velocity = 0;
                return;
            }
            const a = gAlong - Math.sign(gAlong) *
                this._kineticFrictionCoefficient * normal;
            body.velocity += a * dt;
            return;
        }

        const a = gAlong - Math.sign(body.velocity) *
            this._kineticFrictionCoefficient * normal;
        const next = body.velocity + a * dt;
        if (Math.sign(next) !== Math.sign(body.velocity) &&
            Math.abs(gAlong) <= this._staticFrictionCoefficient * normal) {
            body.velocity = 0;
        } else {
            body.velocity = next;
        }
    }

    private moveRollingBody(body: RollingTrackBody, dt: number): void {
        const m = body.mass;
        const r = body.radius;
        const I = this.getMomentOfInertia(body);
        const gAlong = this.gravity * Math.sin(this._angleRadians);
        const normalForce = m * this.gravity * Math.cos(this._angleRadians);
        const maximumStaticFriction =
            this._staticFrictionCoefficient * normalForce;

        const rollingAcceleration =
            gAlong / (1 + I / (m * r * r));
        const requiredStaticFriction =
            m * (rollingAcceleration - gAlong);

        const canMaintainRolling =
            Math.abs(requiredStaticFriction) <= maximumStaticFriction + 1e-10;

        const slip = body.velocity - body.angularVelocity * r;
        const slipEpsilon = 1e-9;

        /*
         * At zero slip, static friction gets the first opportunity to keep
         * v = omega R.  If it is strong enough, the rolling constraint is
         * maintained.  Otherwise the contact immediately begins to slip in
         * the direction gravity is trying to create.
         */
        if (Math.abs(slip) <= slipEpsilon && canMaintainRolling) {
            body.velocity += rollingAcceleration * dt;
            body.angularVelocity += (rollingAcceleration / r) * dt;
            return;
        }

        const slipDirection = Math.abs(slip) > slipEpsilon
            ? Math.sign(slip)
            : Math.sign(gAlong || 1);

        const friction = -slipDirection *
            this._kineticFrictionCoefficient * normalForce;
        const linearAcceleration = gAlong + friction / m;
        const angularAcceleration = -friction * r / I;
        const slipAcceleration =
            linearAcceleration - angularAcceleration * r;

        /*
         * If kinetic friction will drive the contact-point slip through zero
         * during this substep, advance only to that physical instant first.
         * There is no energy projection or artificial velocity reset.
         */
        if (
            Math.abs(slip) > slipEpsilon &&
            slip * slipAcceleration < 0
        ) {
            const timeToZeroSlip = -slip / slipAcceleration;

            if (timeToZeroSlip > 0 && timeToZeroSlip < dt) {
                body.velocity += linearAcceleration * timeToZeroSlip;
                body.angularVelocity += angularAcceleration * timeToZeroSlip;

                // Numerically place the contact exactly at s = 0.  This is
                // not an energy projection: it is the state reached at the
                // calculated zero-slip crossing time.
                body.angularVelocity = body.velocity / r;

                const remainingTime = dt - timeToZeroSlip;

                if (canMaintainRolling) {
                    body.velocity += rollingAcceleration * remainingTime;
                    body.angularVelocity +=
                        (rollingAcceleration / r) * remainingTime;
                    return;
                }

                /*
                 * Static friction is insufficient.  Continue immediately in
                 * the new slipping regime for the rest of this substep.  A
                 * recursive call is safe here because we now start at s = 0;
                 * it therefore cannot re-enter this crossing branch without
                 * first developing nonzero slip.
                 */
                this.moveRollingBody(body, remainingTime);
                return;
            }
        }

        body.velocity += linearAcceleration * dt;
        body.angularVelocity += angularAcceleration * dt;
    }

    private getMomentOfInertia(body: RollingTrackBody): number {
        const m = body.mass;
        const r = body.radius;
        switch (body.kind) {
            case "disk":
                return 0.5 * m * r * r;
            case "thick-ring":
                return (5 / 8) * m * r * r;
            case "double-ring":
                // Same linear-density wire: outer ring carries 2/3 of the
                // mass, inner ring (radius R/2) carries 1/3.
                return (3 / 4) * m * r * r;
            case "ring":
                return m * r * r;
            case "block":
                return Infinity;
        }
    }

    private handleStopper(body: RollingTrackBody): void {
        const min = body.radius;
        const max = this.trackLength - body.radius;

        if (body.position < min) {
            body.position = min;
            if (body.velocity < 0) {
                body.velocity = -body.velocity;
                body.angularVelocity = -body.angularVelocity;
            }
        } else if (body.position > max) {
            body.position = max;
            if (body.velocity > 0) {
                body.velocity = -body.velocity;
                body.angularVelocity = -body.angularVelocity;
            }
        }
    }

    private constrain(body: RollingTrackBody): void {
        body.position = Math.max(
            body.radius,
            Math.min(this.trackLength - body.radius, body.position)
        );
    }
}
