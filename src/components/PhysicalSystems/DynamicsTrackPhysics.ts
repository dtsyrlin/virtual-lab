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

    staticFrictionCoefficient?: number;

    kineticFrictionCoefficient?: number;

    collisionType?: CollisionType;
}


export class DynamicsTrackPhysics {

    private readonly trackLength: number;

    private _angleRadians: number;

    private readonly gravity: number;

    private _staticFrictionCoefficient:
        number;

    private _kineticFrictionCoefficient:
        number;

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

    /*
     * Each set represents one rigid inelastic
     * cluster.  A cluster can contain any number
     * of touching blocks.
     */
    private stuckGroups:
        Set<string>[] =
        [];


    constructor({
        trackLength,

        angleRadians = 0,

        gravity = 9.81,

        frictionCoefficient = 0,

        staticFrictionCoefficient =
            frictionCoefficient,

        kineticFrictionCoefficient =
            frictionCoefficient,

        collisionType = "elastic",
    }: DynamicsTrackPhysicsOptions) {

        this.trackLength =
            trackLength;

        this._angleRadians =
            angleRadians;

        this.gravity =
            gravity;

        this._staticFrictionCoefficient =
            Math.max(
                0,
                staticFrictionCoefficient
            );

        this._kineticFrictionCoefficient =
            Math.max(
                0,
                kineticFrictionCoefficient
            );

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

        this.removeFromStuckGroup(
            id
        );
    }


    public move(
        deltaTimeSeconds: number
    ) {

        const processedGroups =
            new Set<
                Set<string>
            >();


        for (
            const body
            of this.bodies.values()
        ) {

            const group =
                this.getStuckGroup(
                    body.id
                );


            if (group) {

                if (
                    processedGroups.has(
                        group
                    )
                ) {

                    continue;
                }


                processedGroups.add(
                    group
                );


                if (
                    this.groupContainsHeldBody(
                        group
                    )
                ) {

                    continue;
                }


                this.moveStuckGroup(
                    group,
                    deltaTimeSeconds
                );

                continue;
            }


            if (
                this.heldBodies.has(
                    body.id
                )
            ) {

                continue;
            }


            this.moveFreeBody(
                body,
                deltaTimeSeconds
            );


            this.handleEndStops(
                body
            );
        }


        this.handleBodyCollisions();
    }


    private moveFreeBody(
        body: DynamicsTrackBody,
        deltaTimeSeconds: number
    ) {

        body.velocity =
            this.getVelocityAfterForces(
                body.velocity,
                deltaTimeSeconds
            );


        body.position +=
            body.velocity *
            deltaTimeSeconds;
    }


    /*
     * Coulomb friction is handled directly as a
     * velocity change rather than as a raw
     * acceleration.  This prevents kinetic
     * friction from numerically overshooting
     * through v = 0 and producing chatter.
     */
    private getVelocityAfterForces(
        velocity: number,
        deltaTimeSeconds: number
    ): number {

        const gravityAlongTrack =
            this.gravity *
            Math.sin(
                this._angleRadians
            );


        const normalAcceleration =
            this.gravity *
            Math.cos(
                this._angleRadians
            );


        const velocityEpsilon =
            0.000001;


        if (
            Math.abs(
                velocity
            ) <=
            velocityEpsilon
        ) {

            const maximumStaticFriction =
                this._staticFrictionCoefficient *
                normalAcceleration;


            if (
                Math.abs(
                    gravityAlongTrack
                ) <=
                maximumStaticFriction
            ) {

                return 0;
            }


            const slidingAcceleration =
                gravityAlongTrack -
                Math.sign(
                    gravityAlongTrack
                ) *
                this._kineticFrictionCoefficient *
                normalAcceleration;


            if (
                Math.sign(
                    slidingAcceleration
                ) !==
                Math.sign(
                    gravityAlongTrack
                )
            ) {

                return 0;
            }


            return (
                slidingAcceleration *
                deltaTimeSeconds
            );
        }


        /*
         * Gravity first changes the velocity.
         */
        const gravityVelocity =
            velocity +
            gravityAlongTrack *
            deltaTimeSeconds;


        /*
         * If gravity itself carried the body
         * through zero, stop exactly at zero.
         * On the next frame static friction
         * decides whether it remains there.
         */
        if (
            velocity !== 0 &&
            gravityVelocity !== 0 &&
            Math.sign(
                gravityVelocity
            ) !==
            Math.sign(
                velocity
            )
        ) {

            return 0;
        }


        const frictionVelocityChange =
            this._kineticFrictionCoefficient *
            normalAcceleration *
            deltaTimeSeconds;


        if (
            frictionVelocityChange <= 0
        ) {

            return gravityVelocity;
        }


        const speed =
            Math.abs(
                gravityVelocity
            );


        if (
            speed <=
            frictionVelocityChange
        ) {

            return 0;
        }


        return (
            Math.sign(
                gravityVelocity
            ) *
            (
                speed -
                frictionVelocityChange
            )
        );
    }


    private moveStuckGroup(
        group: Set<string>,
        deltaTimeSeconds: number
    ) {

        const members =
            this.getGroupBodies(
                group
            );


        if (
            members.length === 0
        ) {

            this.deleteStuckGroup(
                group
            );

            return;
        }


        const commonVelocity =
            this.getGroupCommonVelocity(
                members
            );


        const newVelocity =
            this.getVelocityAfterForces(
                commonVelocity,
                deltaTimeSeconds
            );


        const displacement =
            newVelocity *
            deltaTimeSeconds;


        for (
            const body
            of members
        ) {

            body.velocity =
                newVelocity;

            body.position +=
                displacement;
        }


        this.packAndConstrainStuckGroup(
            group
        );
    }


    private handleBodyCollisions() {

        /*
         * More than one pass allows a newly
         * formed inelastic group to immediately
         * absorb another touching block during
         * the same frame.
         */
        for (
            let pass = 0;
            pass < this.bodies.size;
            pass++
        ) {

            let changed =
                false;


            const bodies =
                Array.from(
                    this.bodies.values()
                );


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


                if (
                    this.areBodiesStuck(
                        left.id,
                        right.id
                    )
                ) {

                    continue;
                }


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

                    changed =
                        true;

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

                    changed =
                        true;

                    continue;
                }


                this.resolveInelasticCollision(
                    left,
                    right
                );

                changed =
                    true;
            }


            if (!changed) {

                break;
            }
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


            this.resolveInelasticCollision(
                left,
                right
            );

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


        this.resolveInelasticCollision(
            left,
            right
        );
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

        const ids =
            new Set<string>();


        const leftGroup =
            this.getStuckGroup(
                left.id
            );

        const rightGroup =
            this.getStuckGroup(
                right.id
            );


        if (leftGroup) {

            for (
                const id
                of leftGroup
            ) {

                ids.add(
                    id
                );
            }
        }
        else {

            ids.add(
                left.id
            );
        }


        if (rightGroup) {

            for (
                const id
                of rightGroup
            ) {

                ids.add(
                    id
                );
            }
        }
        else {

            ids.add(
                right.id
            );
        }


        const members =
            Array.from(
                ids
            )
            .map(
                id =>
                    this.bodies.get(
                        id
                    )
            )
            .filter(
                (
                    body
                ): body is DynamicsTrackBody =>
                    body !== undefined
            );


        const totalMass =
            members.reduce(
                (
                    sum,
                    body
                ) =>
                    sum +
                    body.mass,
                0
            );


        const totalMomentum =
            members.reduce(
                (
                    sum,
                    body
                ) =>
                    sum +
                    body.mass *
                    body.velocity,
                0
            );


        const commonVelocity =
            totalMass > 0
                ? totalMomentum /
                    totalMass
                : 0;


        for (
            const body
            of members
        ) {

            body.velocity =
                commonVelocity;
        }


        const group =
            this.createOrMergeStuckGroup(
                ids
            );


        this.packAndConstrainStuckGroup(
            group
        );
    }


    private getStuckGroup(
        id: string
    ):
        Set<string> |
        undefined {

        return this.stuckGroups.find(
            group =>
                group.has(
                    id
                )
        );
    }


    private createOrMergeStuckGroup(
        ids: Set<string>
    ): Set<string> {

        const touchingGroups =
            this.stuckGroups.filter(
                group =>
                    Array.from(
                        ids
                    ).some(
                        id =>
                            group.has(
                                id
                            )
                    )
            );


        const merged =
            new Set<string>(
                ids
            );


        for (
            const group
            of touchingGroups
        ) {

            for (
                const id
                of group
            ) {

                merged.add(
                    id
                );
            }
        }


        this.stuckGroups =
            this.stuckGroups.filter(
                group =>
                    !touchingGroups.includes(
                        group
                    )
            );


        this.stuckGroups.push(
            merged
        );


        return merged;
    }


    private removeFromStuckGroup(
        id: string
    ) {

        const group =
            this.getStuckGroup(
                id
            );


        if (!group) {

            return;
        }


        group.delete(
            id
        );


        if (
            group.size < 2
        ) {

            this.deleteStuckGroup(
                group
            );
        }
    }


    private deleteStuckGroup(
        group: Set<string>
    ) {

        this.stuckGroups =
            this.stuckGroups.filter(
                candidate =>
                    candidate !==
                    group
            );
    }


    private groupContainsHeldBody(
        group: Set<string>
    ): boolean {

        return Array.from(
            group
        ).some(
            id =>
                this.heldBodies.has(
                    id
                )
        );
    }


    private getGroupBodies(
        group: Set<string>
    ): DynamicsTrackBody[] {

        return Array.from(
            group
        )
        .map(
            id =>
                this.bodies.get(
                    id
                )
        )
        .filter(
            (
                body
            ): body is DynamicsTrackBody =>
                body !== undefined
        )
        .sort(
            (
                a,
                b
            ) =>
                a.position -
                b.position
        );
    }


    private getGroupCommonVelocity(
        members:
            DynamicsTrackBody[]
    ): number {

        const totalMass =
            members.reduce(
                (
                    sum,
                    body
                ) =>
                    sum +
                    body.mass,
                0
            );


        if (
            totalMass <= 0
        ) {

            return 0;
        }


        return (
            members.reduce(
                (
                    sum,
                    body
                ) =>
                    sum +
                    body.mass *
                    body.velocity,
                0
            ) /
            totalMass
        );
    }


    private packAndConstrainStuckGroup(
        group: Set<string>
    ) {

        const members =
            this.getGroupBodies(
                group
            );


        if (
            members.length < 2
        ) {

            this.deleteStuckGroup(
                group
            );

            return;
        }


        const commonVelocity =
            this.getGroupCommonVelocity(
                members
            );


        let leftEdge =
            members[0].position -
            members[0].width /
            2;


        for (
            const body
            of members
        ) {

            body.position =
                leftEdge +
                body.width /
                2;

            body.velocity =
                commonVelocity;

            leftEdge +=
                body.width;
        }


        const first =
            members[0];

        const last =
            members[
                members.length - 1
            ];


        const currentLeftEdge =
            first.position -
            first.width /
            2;

        const currentRightEdge =
            last.position +
            last.width /
            2;


        if (
            currentLeftEdge < 0
        ) {

            const correction =
                -currentLeftEdge;


            for (
                const body
                of members
            ) {

                body.position +=
                    correction;

                body.velocity =
                    Math.abs(
                        commonVelocity
                    );
            }

            return;
        }


        if (
            currentRightEdge >
            this.trackLength
        ) {

            const correction =
                currentRightEdge -
                this.trackLength;


            for (
                const body
                of members
            ) {

                body.position -=
                    correction;

                body.velocity =
                    -Math.abs(
                        commonVelocity
                    );
            }
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


            const group =
                this.getStuckGroup(
                    id
                );


            if (group) {

                for (
                    const member
                    of this.getGroupBodies(
                        group
                    )
                ) {

                    member.velocity =
                        0;
                }
            }
            else {

                body.velocity =
                    0;
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


        const group =
            this.getStuckGroup(
                id
            );


        if (group) {

            const members =
                this.getGroupBodies(
                    group
                );


            const index =
                members.findIndex(
                    member =>
                        member.id ===
                        id
                );


            const isLeftEnd =
                index === 0;

            const isRightEnd =
                index ===
                members.length - 1;


            const draggingAway =
                (
                    isLeftEnd &&
                    target <
                        body.position
                ) ||
                (
                    isRightEnd &&
                    target >
                        body.position
                );


            if (draggingAway) {

                this.removeFromStuckGroup(
                    id
                );


                body.position =
                    target;

                body.velocity =
                    dragVelocity;


                const remainingGroup =
                    members
                    .filter(
                        member =>
                            member.id !==
                            id
                    )
                    .map(
                        member =>
                            member.id
                    );


                if (
                    remainingGroup.length >= 2
                ) {

                    const remaining =
                        this.getStuckGroup(
                            remainingGroup[0]
                        );


                    if (remaining) {

                        for (
                            const member
                            of this.getGroupBodies(
                                remaining
                            )
                        ) {

                            member.velocity =
                                0;
                        }
                    }
                }
                else if (
                    remainingGroup.length === 1
                ) {

                    const remainingBody =
                        this.bodies.get(
                            remainingGroup[0]
                        );


                    if (remainingBody) {

                        remainingBody.velocity =
                            0;
                    }
                }


                return target;
            }


            return this.moveStuckGroupFromDragged(
                body,
                group,
                target,
                dragVelocity
            );
        }


        const other =
            this.findFirstBodyInDragPath(
                body,
                target
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

                body.velocity =
                    dragVelocity;

                other.velocity =
                    dragVelocity;


                const newGroup =
                    this.createOrMergeStuckGroup(
                        new Set([
                            body.id,
                            other.id,
                        ])
                    );


                return this.moveStuckGroupFromDragged(
                    body,
                    newGroup,
                    target,
                    dragVelocity
                );
            }


            return this.moveElasticChainFromDragged(
                body,
                target,
                1,
                dragVelocity
            );
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

            body.velocity =
                dragVelocity;

            other.velocity =
                dragVelocity;


            const newGroup =
                this.createOrMergeStuckGroup(
                    new Set([
                        body.id,
                        other.id,
                    ])
                );


            return this.moveStuckGroupFromDragged(
                body,
                newGroup,
                target,
                dragVelocity
            );
        }


        return this.moveElasticChainFromDragged(
            body,
            target,
            -1,
            dragVelocity
        );
    }


    private moveElasticChainFromDragged(
        body: DynamicsTrackBody,
        targetPosition: number,
        direction: 1 | -1,
        dragVelocity: number
    ): number {

        const result =
            this.moveElasticBodyInChain(
                body,
                targetPosition,
                direction,
                dragVelocity,
                body.id,
                new Set<string>()
            );


        return result.position;
    }


    private moveElasticBodyInChain(
        body: DynamicsTrackBody,
        desiredPosition: number,
        direction: 1 | -1,
        dragVelocity: number,
        draggedBodyId: string,
        visited: Set<string>
    ): {
        position: number;
        blocked: boolean;
    } {

        visited.add(
            body.id
        );


        /*
         * Another held body is an immovable
         * obstacle.  The original dragged body
         * is, of course, allowed to move.
         */
        if (
            body.id !==
                draggedBodyId &&
            this.heldBodies.has(
                body.id
            )
        ) {

            body.velocity =
                0;


            return {
                position:
                    body.position,

                blocked:
                    true,
            };
        }


        const halfWidth =
            body.width /
            2;

        const leftLimit =
            halfWidth;

        const rightLimit =
            this.trackLength -
            halfWidth;


        let target =
            Math.max(
                leftLimit,
                Math.min(
                    rightLimit,
                    desiredPosition
                )
            );


        const stopperBlocked =
            (
                direction === 1 &&
                desiredPosition >
                    rightLimit
            ) ||
            (
                direction === -1 &&
                desiredPosition <
                    leftLimit
            );


        const next =
            Array.from(
                this.bodies.values()
            )
            .filter(
                candidate =>
                    !visited.has(
                        candidate.id
                    ) &&
                    (
                        direction === 1
                            ? candidate.position >
                                body.position
                            : candidate.position <
                                body.position
                    )
            )
            .sort(
                (a, b) =>
                    direction === 1
                        ? a.position -
                            b.position
                        : b.position -
                            a.position
            )[0];


        if (!next) {

            body.position =
                target;

            body.velocity =
                stopperBlocked
                    ? 0
                    : dragVelocity;


            return {
                position:
                    target,

                blocked:
                    stopperBlocked,
            };
        }


        const minimumDistance =
            (
                body.width +
                next.width
            ) /
            2;

        const contactPosition =
            next.position -
            direction *
            minimumDistance;

        const reachesNext =
            direction === 1
                ? target >
                    contactPosition
                : target <
                    contactPosition;


        if (!reachesNext) {

            body.position =
                target;

            body.velocity =
                stopperBlocked
                    ? 0
                    : dragVelocity;


            return {
                position:
                    target,

                blocked:
                    stopperBlocked,
            };
        }


        const desiredNextPosition =
            target +
            direction *
            minimumDistance;

        const nextResult =
            this.moveElasticBodyInChain(
                next,
                desiredNextPosition,
                direction,
                dragVelocity,
                draggedBodyId,
                visited
            );


        target =
            nextResult.position -
            direction *
            minimumDistance;


        body.position =
            target;

        body.velocity =
            nextResult.blocked
                ? 0
                : dragVelocity;


        return {
            position:
                target,

            blocked:
                nextResult.blocked,
        };
    }


    private findFirstBodyInDragPath(
        body: DynamicsTrackBody,
        target: number
    ):
        DynamicsTrackBody |
        undefined {

        const candidates =
            Array.from(
                this.bodies.values()
            )
            .filter(
                candidate =>
                    candidate.id !==
                    body.id
            );


        if (
            target >
            body.position
        ) {

            return candidates
                .filter(
                    candidate =>
                        candidate.position >
                        body.position
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.position -
                        b.position
                )[0];
        }


        if (
            target <
            body.position
        ) {

            return candidates
                .filter(
                    candidate =>
                        candidate.position <
                        body.position
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b.position -
                        a.position
                )[0];
        }


        return undefined;
    }


    private moveStuckGroupFromDragged(
        dragged: DynamicsTrackBody,
        group: Set<string>,
        targetPosition: number,
        dragVelocity: number
    ): number {

        const members =
            this.getGroupBodies(
                group
            );


        if (
            members.length === 0
        ) {

            return targetPosition;
        }


        const delta =
            targetPosition -
            dragged.position;


        const first =
            members[0];

        const last =
            members[
                members.length - 1
            ];


        const leftEdge =
            first.position -
            first.width /
            2;

        const rightEdge =
            last.position +
            last.width /
            2;


        const minimumDelta =
            -leftEdge;

        const maximumDelta =
            this.trackLength -
            rightEdge;


        const allowedDelta =
            Math.max(
                minimumDelta,
                Math.min(
                    maximumDelta,
                    delta
                )
            );


        for (
            const member
            of members
        ) {

            member.position +=
                allowedDelta;

            member.velocity =
                dragVelocity;
        }


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


        this.removeFromStuckGroup(
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


        const group =
            this.getStuckGroup(
                id
            );


        if (group) {

            for (
                const member
                of this.getGroupBodies(
                    group
                )
            ) {

                member.velocity =
                    velocity;
            }

            return;
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

        const group =
            this.getStuckGroup(
                firstId
            );


        return (
            group !==
                undefined &&
            group.has(
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

        const coefficient =
            Math.max(
                0,
                frictionCoefficient
            );


        this._staticFrictionCoefficient =
            coefficient;

        this._kineticFrictionCoefficient =
            coefficient;
    }


    public setStaticFrictionCoefficient(
        frictionCoefficient: number
    ) {

        this._staticFrictionCoefficient =
            Math.max(
                0,
                frictionCoefficient
            );
    }


    public setKineticFrictionCoefficient(
        frictionCoefficient: number
    ) {

        this._kineticFrictionCoefficient =
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

        this.stuckGroups =
            [];
    }


    public get angleRadians(): number {

        return this._angleRadians;
    }


    public get frictionCoefficient(): number {

        return this._kineticFrictionCoefficient;
    }


    public get staticFrictionCoefficient():
        number {

        return this._staticFrictionCoefficient;
    }


    public get kineticFrictionCoefficient():
        number {

        return this._kineticFrictionCoefficient;
    }


    public get collisionType(): CollisionType {

        return this._collisionType;
    }
}
