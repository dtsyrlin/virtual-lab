export type CollisionType =
    "elastic" |
    "inelastic";


export interface DynamicsTrackBody {

    id: string;

    mass: number;

    position: number;
    velocity: number;

    width: number;
}


export interface DynamicsTrackPhysicsOptions {

    trackLength: number;

    angleRadians?: number;

    gravity?: number;

    frictionCoefficient?: number;

    collisionType?: CollisionType;
}


export class DynamicsTrackPhysics {

    private readonly trackLength: number;

    private _angleRadians: number;

    private readonly gravity: number;

    private _frictionCoefficient: number;

    private _collisionType:
        CollisionType;

    private bodies =
        new Map<
            string,
            DynamicsTrackBody
        >();

    private heldBodies =
        new Set<string>();

    private kinematicVelocities =
        new Map<string, number>();

    private stuckPair:
        [string, string] | null =
        null;


    constructor({
        trackLength,

        angleRadians = 0,

        gravity = 9.81,

        frictionCoefficient = 0,

        collisionType = "elastic",
    }: DynamicsTrackPhysicsOptions) {

        this.trackLength =
            trackLength;

        this._angleRadians =
            angleRadians;

        this.gravity =
            gravity;

        this._frictionCoefficient =
            frictionCoefficient;

        this._collisionType =
            collisionType;
    }


    public addBody(
        id: string,
        mass: number,
        position: number,
        width: number
    ) {

        this.bodies.set(
            id,
            {
                id,

                mass,

                position,
                velocity: 0,

                width,
            }
        );
    }


    public removeBody(
        id: string
    ) {

        this.bodies.delete(
            id
        );

        this.heldBodies.delete(
            id
        );

        this.kinematicVelocities.delete(
            id
        );


        if (
            this.stuckPair?.includes(
                id
            )
        ) {

            this.stuckPair =
                null;
        }
    }


    public move(
        deltaTimeSeconds: number
    ) {

        const stuckWithHeldBody =
            this.stuckPair !== null &&
            this.stuckPair.some(
                id =>
                    this.heldBodies.has(
                        id
                    )
            );


        for (
            const body
            of this.bodies.values()
        ) {

            if (
                this.heldBodies.has(
                    body.id
                )
            ) {

                continue;
            }


            if (
                stuckWithHeldBody &&
                this.stuckPair?.includes(
                    body.id
                )
            ) {

                continue;
            }


            const acceleration =
                this.getAcceleration(
                    body
                );


            body.velocity +=
                acceleration *
                deltaTimeSeconds;


            body.position +=
                body.velocity *
                deltaTimeSeconds;
        }


        if (
            this.stuckPair
        ) {

            if (!stuckWithHeldBody) {

                this.updateStuckPair();
            }

            return;
        }


        for (
            const body
            of this.bodies.values()
        ) {

            if (
                !this.heldBodies.has(
                    body.id
                )
            ) {

                this.handleEndStops(
                    body
                );
            }
        }


        this.handleBodyCollisions();
    }

    private getAcceleration(
        body: DynamicsTrackBody
    ): number {

        const gravityAlongTrack =
            this.gravity *
            Math.sin(
                this._angleRadians
            );


        if (
            this._frictionCoefficient === 0
        ) {

            return gravityAlongTrack;
        }


        const normalAcceleration =
            this.gravity *
            Math.cos(
                this._angleRadians
            );


        const frictionMagnitude =
            this._frictionCoefficient *
            normalAcceleration;


        if (
            Math.abs(
                body.velocity
            ) > 0.0001
        ) {

            return (
                gravityAlongTrack -
                Math.sign(
                    body.velocity
                ) *
                frictionMagnitude
            );
        }


        if (
            Math.abs(
                gravityAlongTrack
            ) <=
            frictionMagnitude
        ) {

            return 0;
        }


        return (
            gravityAlongTrack -
            Math.sign(
                gravityAlongTrack
            ) *
            frictionMagnitude
        );
    }


    private handleBodyCollisions() {

        const bodies =
            Array.from(
                this.bodies.values()
            );


        if (
            bodies.length < 2
        ) {

            return;
        }


        bodies.sort(
            (
                a,
                b
            ) =>
                a.position -
                b.position
        );


        for (
            let i = 0;
            i < bodies.length - 1;
            i++
        ) {

            const left =
                bodies[i];

            const right =
                bodies[i + 1];


            const minimumDistance =
                (
                    left.width +
                    right.width
                ) /
                2;


            const actualDistance =
                right.position -
                left.position;


            if (
                actualDistance >
                minimumDistance
            ) {

                continue;
            }


            const leftHeld =
                this.heldBodies.has(
                    left.id
                );

            const rightHeld =
                this.heldBodies.has(
                    right.id
                );


            if (
                leftHeld ||
                rightHeld
            ) {

                this.resolveCollisionWithHeldBody(
                    left,
                    right,
                    leftHeld,
                    rightHeld,
                    minimumDistance
                );

                continue;
            }


            const overlap =
                minimumDistance -
                actualDistance;


            if (
                overlap > 0
            ) {

                left.position -=
                    overlap /
                    2;

                right.position +=
                    overlap /
                    2;
            }


            const relativeVelocity =
                left.velocity -
                right.velocity;


            if (
                relativeVelocity <= 0
            ) {

                continue;
            }


            if (
                this._collisionType ===
                "elastic"
            ) {

                this.resolveElasticCollision(
                    left,
                    right
                );

                this.handleEndStops(
                    left
                );

                this.handleEndStops(
                    right
                );

                continue;
            }


            this.resolveInelasticCollision(
                left,
                right
            );

            return;
        }
    }


    private resolveCollisionWithHeldBody(
        left: DynamicsTrackBody,
        right: DynamicsTrackBody,
        leftHeld: boolean,
        rightHeld: boolean,
        minimumDistance: number
    ) {

        if (
            leftHeld &&
            rightHeld
        ) {

            return;
        }


        if (leftHeld) {

            right.position =
                left.position +
                minimumDistance;


            if (
                right.velocity >= 0
            ) {

                return;
            }


            if (
                this._collisionType ===
                "elastic"
            ) {

                right.velocity =
                    Math.abs(
                        right.velocity
                    );

                return;
            }


            left.velocity =
                0;

            right.velocity =
                0;

            this.stuckPair = [
                left.id,
                right.id,
            ];

            return;
        }


        left.position =
            right.position -
            minimumDistance;


        if (
            left.velocity <= 0
        ) {

            return;
        }


        if (
            this._collisionType ===
            "elastic"
        ) {

            left.velocity =
                -Math.abs(
                    left.velocity
                );

            return;
        }


        left.velocity =
            0;

        right.velocity =
            0;

        this.stuckPair = [
            left.id,
            right.id,
        ];
    }

    private resolveElasticCollision(
        left: DynamicsTrackBody,
        right: DynamicsTrackBody
    ) {

        const totalMass =
            left.mass +
            right.mass;


        const leftVelocity =
            (
                (
                    left.mass -
                    right.mass
                ) /
                totalMass
            ) *
            left.velocity +
            (
                (
                    2 *
                    right.mass
                ) /
                totalMass
            ) *
            right.velocity;


        const rightVelocity =
            (
                (
                    2 *
                    left.mass
                ) /
                totalMass
            ) *
            left.velocity +
            (
                (
                    right.mass -
                    left.mass
                ) /
                totalMass
            ) *
            right.velocity;


        left.velocity =
            leftVelocity;

        right.velocity =
            rightVelocity;
    }


    private resolveInelasticCollision(
        left: DynamicsTrackBody,
        right: DynamicsTrackBody
    ) {

        const totalMass =
            left.mass +
            right.mass;


        const commonVelocity =
            (
                left.mass *
                left.velocity +
                right.mass *
                right.velocity
            ) /
            totalMass;


        left.velocity =
            commonVelocity;

        right.velocity =
            commonVelocity;


        this.stuckPair = [
            left.id,
            right.id,
        ];


        this.updateStuckPair();
    }


    private updateStuckPair() {

        if (
            !this.stuckPair
        ) {

            return;
        }


        const first =
            this.bodies.get(
                this.stuckPair[0]
            );

        const second =
            this.bodies.get(
                this.stuckPair[1]
            );


        if (
            !first ||
            !second
        ) {

            this.stuckPair =
                null;

            return;
        }


        let left =
            first;

        let right =
            second;


        if (
            first.position >
            second.position
        ) {

            left =
                second;

            right =
                first;
        }


        const commonVelocity =
            (
                left.mass *
                left.velocity +
                right.mass *
                right.velocity
            ) /
            (
                left.mass +
                right.mass
            );


        left.velocity =
            commonVelocity;

        right.velocity =
            commonVelocity;


        const contactDistance =
            (
                left.width +
                right.width
            ) /
            2;


        const midpoint =
            (
                left.position +
                right.position
            ) /
            2;


        left.position =
            midpoint -
            contactDistance /
            2;

        right.position =
            midpoint +
            contactDistance /
            2;


        const leftEdge =
            left.position -
            left.width /
            2;

        const rightEdge =
            right.position +
            right.width /
            2;


        if (
            leftEdge < 0
        ) {

            const correction =
                -leftEdge;


            left.position +=
                correction;

            right.position +=
                correction;


            const bouncedVelocity =
                Math.abs(
                    commonVelocity
                );


            left.velocity =
                bouncedVelocity;

            right.velocity =
                bouncedVelocity;

            return;
        }


        if (
            rightEdge >
            this.trackLength
        ) {

            const correction =
                rightEdge -
                this.trackLength;


            left.position -=
                correction;

            right.position -=
                correction;


            const bouncedVelocity =
                -Math.abs(
                    commonVelocity
                );


            left.velocity =
                bouncedVelocity;

            right.velocity =
                bouncedVelocity;
        }
    }


    private handleEndStops(
        body: DynamicsTrackBody
    ) {

        const halfWidth =
            body.width /
            2;


        const leftLimit =
            halfWidth;

        const rightLimit =
            this.trackLength -
            halfWidth;


        if (
            body.position <
            leftLimit
        ) {

            body.position =
                leftLimit;

            body.velocity =
                Math.abs(
                    body.velocity
                );

            return;
        }


        if (
            body.position >
            rightLimit
        ) {

            body.position =
                rightLimit;

            body.velocity =
                -Math.abs(
                    body.velocity
                );
        }
    }


    private releaseStuckPairIfNeeded(
        id: string
    ) {

        if (
            this.stuckPair?.includes(
                id
            )
        ) {

            this.stuckPair =
                null;
        }
    }


    public setBodyHeld(
        id: string,
        held: boolean
    ) {

        const body =
            this.bodies.get(
                id
            );


        if (!body) {
            return;
        }


        if (held) {

            this.heldBodies.add(
                id
            );

            this.kinematicVelocities.set(
                id,
                0
            );

            body.velocity =
                0;


            if (
                this.stuckPair?.includes(
                    id
                )
            ) {

                const otherId =
                    this.stuckPair[
                        this.stuckPair[0] === id
                            ? 1
                            : 0
                    ];

                const other =
                    this.bodies.get(
                        otherId
                    );


                if (other) {

                    other.velocity =
                        0;
                }
            }

            return;
        }


        this.heldBodies.delete(
            id
        );

        this.kinematicVelocities.delete(
            id
        );
    }

    public dragBodyTo(
        id: string,
        targetPosition: number,
        dragVelocity: number = 0
    ): number {

        const body =
            this.bodies.get(
                id
            );


        if (!body) {
            return targetPosition;
        }


        this.kinematicVelocities.set(
            id,
            dragVelocity
        );


        const halfWidth =
            body.width /
            2;


        let target =
            Math.max(
                halfWidth,
                Math.min(
                    this.trackLength -
                        halfWidth,
                    targetPosition
                )
            );


        if (
            this.stuckPair?.includes(
                id
            )
        ) {

            const otherId =
                this.stuckPair[
                    this.stuckPair[0] === id
                        ? 1
                        : 0
                ];

            const other =
                this.bodies.get(
                    otherId
                );


            if (other) {

                const bodyIsLeft =
                    body.position <
                    other.position;


                const draggingAway =
                    bodyIsLeft
                        ? target <
                            body.position
                        : target >
                            body.position;


                if (draggingAway) {

                    this.stuckPair =
                        null;

                    other.velocity =
                        0;

                    body.position =
                        target;

                    body.velocity =
                        dragVelocity;

                    return target;
                }


                return this.moveStuckPairFromDragged(
                    body,
                    other,
                    target,
                    dragVelocity
                );
            }


            this.stuckPair =
                null;
        }


        const other =
            Array.from(
                this.bodies.values()
            ).find(
                candidate =>
                    candidate.id !== id
            );


        if (!other) {

            body.position =
                target;

            body.velocity =
                dragVelocity;

            return target;
        }


        const minimumDistance =
            (
                body.width +
                other.width
            ) /
            2;


        const bodyWasLeft =
            body.position <=
            other.position;


        const previousPosition =
            body.position;


        if (bodyWasLeft) {

            const contactPosition =
                other.position -
                minimumDistance;


            if (
                target <=
                contactPosition
            ) {

                body.position =
                    target;

                body.velocity =
                    dragVelocity;

                return target;
            }


            const draggingTowardOther =
                target >
                previousPosition;


            if (!draggingTowardOther) {

                body.position =
                    Math.min(
                        target,
                        contactPosition
                    );

                body.velocity =
                    dragVelocity;

                return body.position;
            }


            if (
                this._collisionType ===
                "inelastic"
            ) {

                body.position =
                    contactPosition;

                this.stuckPair = [
                    body.id,
                    other.id,
                ];

                return this.moveStuckPairFromDragged(
                    body,
                    other,
                    target,
                    dragVelocity
                );
            }


            const otherRightLimit =
                this.trackLength -
                other.width /
                2;


            const otherTouchingStopper =
                other.position >=
                otherRightLimit -
                0.0001;


            if (
                otherTouchingStopper
            ) {

                other.position =
                    otherRightLimit;

                other.velocity =
                    0;


                target =
                    other.position -
                    minimumDistance;


                body.position =
                    target;

                body.velocity =
                    dragVelocity;

                return target;
            }


            other.position =
                Math.min(
                    target +
                        minimumDistance,
                    otherRightLimit
                );

            other.velocity =
                dragVelocity;


            target =
                other.position -
                minimumDistance;


            body.position =
                target;

            body.velocity =
                dragVelocity;

            return target;
        }


        const contactPosition =
            other.position +
                minimumDistance;


        if (
            target >=
            contactPosition
        ) {

            body.position =
                target;

            body.velocity =
                dragVelocity;

            return target;
        }


        const draggingTowardOther =
            target <
            previousPosition;


        if (!draggingTowardOther) {

            body.position =
                Math.max(
                    target,
                    contactPosition
                );

            body.velocity =
                dragVelocity;

            return body.position;
        }


        if (
            this._collisionType ===
            "inelastic"
        ) {

            body.position =
                contactPosition;

            this.stuckPair = [
                other.id,
                body.id,
            ];

            return this.moveStuckPairFromDragged(
                body,
                other,
                target,
                dragVelocity
            );
        }


        const otherLeftLimit =
            other.width /
            2;


        const otherTouchingStopper =
            other.position <=
            otherLeftLimit +
            0.0001;


        if (
            otherTouchingStopper
        ) {

            other.position =
                otherLeftLimit;

            other.velocity =
                0;


            target =
                other.position +
                minimumDistance;


            body.position =
                target;

            body.velocity =
                dragVelocity;

            return target;
        }


        other.position =
            Math.max(
                target -
                    minimumDistance,
                otherLeftLimit
            );

        other.velocity =
            dragVelocity;


        target =
            other.position +
                minimumDistance;


        body.position =
            target;

        body.velocity =
            dragVelocity;

        return target;
    }


    private moveStuckPairFromDragged(
        dragged: DynamicsTrackBody,
        other: DynamicsTrackBody,
        targetPosition: number,
        dragVelocity: number
    ): number {

        const draggedIsLeft =
            dragged.position <
            other.position;


        const distance =
            (
                dragged.width +
                other.width
            ) /
            2;


        if (draggedIsLeft) {

            const maximumDraggedPosition =
                this.trackLength -
                other.width /
                2 -
                distance;


            dragged.position =
                Math.min(
                    targetPosition,
                    maximumDraggedPosition
                );

            other.position =
                dragged.position +
                distance;
        }
        else {

            const minimumDraggedPosition =
                other.width /
                2 +
                distance;


            dragged.position =
                Math.max(
                    targetPosition,
                    minimumDraggedPosition
                );

            other.position =
                dragged.position -
                distance;
        }


        dragged.velocity =
            dragVelocity;

        other.velocity =
            dragVelocity;


        return dragged.position;
    }

    public setBodyPosition(
        id: string,
        position: number
    ) {

        const body =
            this.bodies.get(
                id
            );


        if (!body) {
            return;
        }


        this.releaseStuckPairIfNeeded(
            id
        );


        body.position =
            position;
    }


    public setBodyVelocity(
        id: string,
        velocity: number
    ) {

        const body =
            this.bodies.get(
                id
            );


        if (!body) {
            return;
        }


        if (
            this.stuckPair?.includes(
                id
            )
        ) {

            const first =
                this.bodies.get(
                    this.stuckPair[0]
                );

            const second =
                this.bodies.get(
                    this.stuckPair[1]
                );


            if (
                first &&
                second
            ) {

                first.velocity =
                    velocity;

                second.velocity =
                    velocity;

                return;
            }
        }


        body.velocity =
            velocity;
    }

    public setBodyMass(
        id: string,
        mass: number
    ) {

        const body =
            this.bodies.get(
                id
            );


        if (!body) {
            return;
        }


        body.mass =
            mass;
    }


    public getBody(
        id: string
    ): DynamicsTrackBody | undefined {

        return this.bodies.get(
            id
        );
    }


    public areBodiesStuck(
        firstId: string,
        secondId: string
    ): boolean {

        if (
            !this.stuckPair
        ) {

            return false;
        }


        return (
            this.stuckPair.includes(
                firstId
            ) &&
            this.stuckPair.includes(
                secondId
            )
        );
    }


    public setAngle(
        angleRadians: number
    ) {

        this._angleRadians =
            angleRadians;
    }


    public setFrictionCoefficient(
        frictionCoefficient: number
    ) {

        this._frictionCoefficient =
            Math.max(
                0,
                frictionCoefficient
            );
    }


    public setCollisionType(
        collisionType: CollisionType
    ) {

        this._collisionType =
            collisionType;

        this.stuckPair =
            null;
    }


    public get angleRadians(): number {

        return this._angleRadians;
    }


    public get frictionCoefficient(): number {

        return this._frictionCoefficient;
    }


    public get collisionType(): CollisionType {

        return this._collisionType;
    }
}
