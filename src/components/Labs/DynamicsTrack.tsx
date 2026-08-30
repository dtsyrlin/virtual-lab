import {
    Application,
    useTick,
} from "@pixi/react";

import {
    useRef,
} from "react";

import {
    Point,
} from "pixi.js";

import {
    Experiment2D,
    useExperiment2D,
} from "./Experiment2D";

import {
    DynamicsTrack2D,
} from "../Objects/DynamicsTrack2D";

import {
    GlidingBlock2D,
} from "../Objects/GlidingBlock2D";

import {
    SizeControl,
} from "../Objects/SizeControl";

import {
    CollisionTypeControl,
} from "../Objects/CollisionTypeControl";

import {
    Photogate2D,
} from "../Objects/Photogate2D";

import {
    DynamicsTrackPhysics,
} from "../PhysicalSystems/DynamicsTrackPhysics";


const PIXELS_PER_METER =
    300;

const TRACK_LENGTH =
    2.4;

const BLOCK_WIDTH_PIXELS =
    70;

const BLOCK_HEIGHT_PIXELS =
    50;

const BLOCK_WIDTH_METERS =
    BLOCK_WIDTH_PIXELS /
    PIXELS_PER_METER;

const RELEASE_VELOCITY_SAMPLE_MS =
    120;

const MIN_RELEASE_SAMPLE_MS =
    30;

const MAX_RELEASE_SPEED =
    6;

const PHOTOGATE_INITIAL_POSITION =
    TRACK_LENGTH /
    2;

const BLOCK_1_INITIAL_POSITION = {
    x: 260,
    y: 170,
};

const BLOCK_2_INITIAL_POSITION = {
    x: 620,
    y: 170,
};


function DynamicsTrackContents() {

    const physicsRef =
        useRef<
            DynamicsTrackPhysics | null
        >(null);

    const trackRef =
        useRef<
            DynamicsTrack2D | null
        >(null);

    const block1Ref =
        useRef<
            GlidingBlock2D | null
        >(null);

    const block2Ref =
        useRef<
            GlidingBlock2D | null
        >(null);

    const photogateRef =
        useRef<
            Photogate2D | null
        >(null);

    const photogateBlockedRef =
        useRef<
            Map<string, number>
        >(
            new Map()
        );

    const simulationTimeRef =
        useRef(
            0
        );


    useExperiment2D(
        (
            experiment:
                Experiment2D
        ) => {

            const track =
                new DynamicsTrack2D({
                    position: {
                        x: 120,
                        y: 430,
                    },

                    length:
                        TRACK_LENGTH,

                    pixelsPerMeter:
                        PIXELS_PER_METER,
                });


            trackRef.current =
                track;


            experiment.add(
                track
            );


            const physics =
                new DynamicsTrackPhysics({
                    trackLength:
                        TRACK_LENGTH,
                });


            physicsRef.current =
                physics;


            const photogatePoint =
                track.getPointAt(
                    PHOTOGATE_INITIAL_POSITION
                );


            const photogate =
                new Photogate2D({
                    position: {
                        x:
                            photogatePoint.x,

                        y:
                            photogatePoint.y,
                    },

                    trackPosition:
                        PHOTOGATE_INITIAL_POSITION,
                });


            photogate.setTrackRotation(
                track.angleRadians
            );


            photogateRef.current =
                photogate;


            experiment.add(
                photogate
            );


            const clearPhotogate =
                () => {

                    photogate.clearMeasurements();

                    photogateBlockedRef.current.clear();
                };


            const movePhotogate =
                (
                    point: Point
                ) => {

                    const trackPosition =
                        track.clampPosition(
                            track.getPositionFromPoint(
                                point
                            )
                        );


                    photogate.setTrackPosition(
                        trackPosition
                    );


                    const screenPoint =
                        track.getPointAt(
                            trackPosition
                        );


                    photogate.position.set(
                        screenPoint.x,
                        screenPoint.y
                    );


                    photogate.setTrackRotation(
                        track.angleRadians
                    );


                    clearPhotogate();
                };


            photogate.setOnDragMove(
                movePhotogate
            );

            photogate.setOnDragEnd(
                movePhotogate
            );


            const block1 =
                new GlidingBlock2D({
                    id: "block1",

                    position:
                        BLOCK_1_INITIAL_POSITION,

                    mass: 2,

                    width:
                        BLOCK_WIDTH_PIXELS,

                    height:
                        BLOCK_HEIGHT_PIXELS,
                });


            const block2 =
                new GlidingBlock2D({
                    id: "block2",

                    position:
                        BLOCK_2_INITIAL_POSITION,

                    mass: 4,

                    width:
                        BLOCK_WIDTH_PIXELS,

                    height:
                        BLOCK_HEIGHT_PIXELS,
                });


            block1Ref.current =
                block1;

            block2Ref.current =
                block2;


            experiment.add(
                block1
            );

            experiment.add(
                block2
            );


            const attachedBlocks =
                new Set<string>();


            interface DragSample {
                position: number;
                time: number;
            }


            const dragSamples =
                new Map<
                    string,
                    DragSample[]
                >();


            const recordDragSample =
                (
                    blockId: string,
                    point: Point
                ) => {

                    const now =
                        performance.now();


                    const position =
                        track.getPositionFromPoint(
                            point
                        );


                    const samples =
                        dragSamples.get(
                            blockId
                        ) ?? [];


                    samples.push({
                        position,
                        time: now,
                    });


                    const cutoff =
                        now -
                        RELEASE_VELOCITY_SAMPLE_MS;


                    while (
                        samples.length > 2 &&
                        samples[0].time <
                            cutoff
                    ) {

                        samples.shift();
                    }


                    dragSamples.set(
                        blockId,
                        samples
                    );
                };


            const getReleaseVelocity =
                (
                    blockId: string
                ) => {

                    const samples =
                        dragSamples.get(
                            blockId
                        );


                    if (
                        !samples ||
                        samples.length < 2
                    ) {

                        return 0;
                    }


                    const last =
                        samples[
                            samples.length - 1
                        ];


                    let first =
                        samples[0];


                    for (
                        let i =
                            samples.length - 2;

                        i >= 0;

                        i--
                    ) {

                        if (
                            last.time -
                            samples[i].time >=
                            MIN_RELEASE_SAMPLE_MS
                        ) {

                            first =
                                samples[i];

                            break;
                        }
                    }


                    const elapsedSeconds =
                        (
                            last.time -
                            first.time
                        ) /
                        1000;


                    if (
                        elapsedSeconds <= 0
                    ) {

                        return 0;
                    }


                    const velocity =
                        (
                            last.position -
                            first.position
                        ) /
                        elapsedSeconds;


                    return Math.max(
                        -MAX_RELEASE_SPEED,
                        Math.min(
                            MAX_RELEASE_SPEED,
                            velocity
                        )
                    );
                };


            const resetExperiment = () => {

                attachedBlocks.clear();

                dragSamples.clear();

                clearPhotogate();

                physics.removeBody(
                    block1.id
                );

                physics.removeBody(
                    block2.id
                );


                block1.position.set(
                    BLOCK_1_INITIAL_POSITION.x,
                    BLOCK_1_INITIAL_POSITION.y
                );

                block2.position.set(
                    BLOCK_2_INITIAL_POSITION.x,
                    BLOCK_2_INITIAL_POSITION.y
                );


                block1.setTrackRotation(
                    0
                );

                block2.setTrackRotation(
                    0
                );
            };



            const collisionTypeControl =
                new CollisionTypeControl({
                    position: {
                        x: 340,
                        y: 160,
                    },

                    value:
                        "elastic",

                    onValueChanged:
                        (
                            value
                        ) => {

                            physics.setCollisionType(
                                value
                            );

                            resetExperiment();
                        },
                });


            experiment.add(
                collisionTypeControl
            );


            const block1MassControl =
                new SizeControl({
                    showLabel:
                        false,

                    min: 1,
                    max: 7,

                    value: 2,

                    showUnlimitedSupply:
                        false,

                    position: {
                        x: 100,
                        y: 60,
                    },

                    onValueChanged:
                        (
                            value,
                            isRandom
                        ) => {

                            resetExperiment();


                            if (isRandom) {

                                const mass =
                                    1 +
                                    Math.floor(
                                        Math.random() *
                                        7
                                    );


                                block1.setMass(
                                    mass,
                                    "x"
                                );

                                return;
                            }


                            block1.setMass(
                                value
                            );
                        },
                });


            const block2MassControl =
                new SizeControl({
                    showLabel:
                        false,

                    min: 1,
                    max: 7,

                    value: 4,

                    showUnlimitedSupply:
                        false,

                    position: {
                        x: 500,
                        y: 60,
                    },

                    onValueChanged:
                        (
                            value,
                            isRandom
                        ) => {

                            resetExperiment();


                            if (isRandom) {

                                const mass =
                                    1 +
                                    Math.floor(
                                        Math.random() *
                                        7
                                    );


                                block2.setMass(
                                    mass,
                                    "y"
                                );

                                return;
                            }


                            block2.setMass(
                                value
                            );
                        },
                });


            experiment.add(
                block1MassControl
            );

            experiment.add(
                block2MassControl
            );


            const setupBlockDragging =
                (
                    block:
                        GlidingBlock2D
                ) => {

                    block.setOnDragStart(
                        (
                            _,
                            point
                        ) => {

                            dragSamples.set(
                                block.id,
                                []
                            );


                            recordDragSample(
                                block.id,
                                point
                            );


                            if (
                                attachedBlocks.has(
                                    block.id
                                )
                            ) {

                                physics.setBodyHeld(
                                    block.id,
                                    true
                                );
                            }
                        }
                    );


                    block.setOnDragMove(
                        (
                            _,
                            point
                        ) => {

                            recordDragSample(
                                block.id,
                                point
                            );


                            if (
                                !attachedBlocks.has(
                                    block.id
                                )
                            ) {

                                block.position.set(
                                    point.x,
                                    point.y
                                );

                                return;
                            }


                            const requestedTrackPosition =
                                track.clampPosition(
                                    track.getPositionFromPoint(
                                        point
                                    )
                                );


                            const dragVelocity =
                                getReleaseVelocity(
                                    block.id
                                );


                            const trackPosition =
                                physics.dragBodyTo(
                                    block.id,
                                    requestedTrackPosition,
                                    dragVelocity
                                );


                            const screenPoint =
                                track.getPointAt(
                                    trackPosition
                                );


                            block.position.set(
                                screenPoint.x,
                                screenPoint.y -
                                    BLOCK_HEIGHT_PIXELS /
                                    2
                            );
                        }
                    );


                    block.setOnDragEnd(
                        (
                            _,
                            point
                        ) => {

                            recordDragSample(
                                block.id,
                                point
                            );


                            const releaseVelocity =
                                getReleaseVelocity(
                                    block.id
                                );


                            if (
                                attachedBlocks.has(
                                    block.id
                                )
                            ) {

                                const requestedTrackPosition =
                                    track.clampPosition(
                                        track.getPositionFromPoint(
                                            point
                                        )
                                    );


                                physics.dragBodyTo(
                                    block.id,
                                    requestedTrackPosition,
                                    releaseVelocity
                                );


                                physics.setBodyHeld(
                                    block.id,
                                    false
                                );


                                physics.setBodyVelocity(
                                    block.id,
                                    releaseVelocity
                                );


                                dragSamples.delete(
                                    block.id
                                );

                                return;
                            }


                            const localPoint =
                                track.toLocal(
                                    point
                                );


                            const trackLengthPixels =
                                TRACK_LENGTH *
                                PIXELS_PER_METER;


                            const closeToTrack =
                                localPoint.x >= 0 &&
                                localPoint.x <=
                                    trackLengthPixels &&
                                Math.abs(
                                    localPoint.y
                                ) < 90;


                            if (!closeToTrack) {

                                block.position.set(
                                    point.x,
                                    point.y
                                );


                                dragSamples.delete(
                                    block.id
                                );

                                return;
                            }


                            const trackPosition =
                                track.clampPosition(
                                    localPoint.x /
                                    PIXELS_PER_METER
                                );


                            attachedBlocks.add(
                                block.id
                            );


                            physics.addBody(
                                block.id,
                                block.mass,
                                trackPosition,
                                BLOCK_WIDTH_METERS
                            );


                            physics.setBodyHeld(
                                block.id,
                                true
                            );


                            const actualTrackPosition =
                                physics.dragBodyTo(
                                    block.id,
                                    trackPosition
                                );


                            physics.setBodyHeld(
                                block.id,
                                false
                            );


                            physics.setBodyVelocity(
                                block.id,
                                releaseVelocity
                            );


                            const screenPoint =
                                track.getPointAt(
                                    actualTrackPosition
                                );


                            block.position.set(
                                screenPoint.x,
                                screenPoint.y -
                                    BLOCK_HEIGHT_PIXELS /
                                    2
                            );


                            block.setTrackRotation(
                                track.angleRadians
                            );


                            dragSamples.delete(
                                block.id
                            );
                        }
                    );
                };


            setupBlockDragging(
                block1
            );

            setupBlockDragging(
                block2
            );
        }
    );


    useTick(
        ticker => {

            const physics =
                physicsRef.current;

            const track =
                trackRef.current;


            if (
                !physics ||
                !track
            ) {

                return;
            }


            const deltaTimeSeconds =
                ticker.deltaMS /
                1000;


            physics.move(
                deltaTimeSeconds
            );


            simulationTimeRef.current +=
                deltaTimeSeconds;


            const photogate =
                photogateRef.current;


            if (photogate) {

                const blocked =
                    photogateBlockedRef.current;

                const block1 =
                    block1Ref.current;

                const block2 =
                    block2Ref.current;

                const body1 =
                    block1
                        ? physics.getBody(
                            block1.id
                        )
                        : undefined;

                const body2 =
                    block2
                        ? physics.getBody(
                            block2.id
                        )
                        : undefined;


                const touchingTogether =
                    body1 !== undefined &&
                    body2 !== undefined &&
                    Math.abs(
                        body1.position -
                        body2.position
                    ) <=
                    (
                        body1.width +
                        body2.width
                    ) /
                    2 +
                    0.0001;


                const groupKey =
                    "touching-pair";


                if (
                    touchingTogether &&
                    body1 &&
                    body2
                ) {

                    const leftEdge =
                        Math.min(
                            body1.position -
                                body1.width /
                                2,

                            body2.position -
                                body2.width /
                                2
                        );


                    const rightEdge =
                        Math.max(
                            body1.position +
                                body1.width /
                                2,

                            body2.position +
                                body2.width /
                                2
                        );


                    const isBlocking =
                        photogate.trackPosition >=
                            leftEdge &&
                        photogate.trackPosition <=
                            rightEdge;


                    const body1EnteredAt =
                        blocked.get(
                            body1.id
                        );

                    const body2EnteredAt =
                        blocked.get(
                            body2.id
                        );

                    const groupEnteredAt =
                        blocked.get(
                            groupKey
                        );


                    const earliestEnteredAt =
                        Math.min(
                            body1EnteredAt ??
                                Infinity,

                            body2EnteredAt ??
                                Infinity,

                            groupEnteredAt ??
                                Infinity
                        );


                    blocked.delete(
                        body1.id
                    );

                    blocked.delete(
                        body2.id
                    );


                    if (isBlocking) {

                        blocked.set(
                            groupKey,

                            Number.isFinite(
                                earliestEnteredAt
                            )
                                ? earliestEnteredAt
                                : simulationTimeRef.current
                        );
                    }
                    else if (
                        Number.isFinite(
                            earliestEnteredAt
                        )
                    ) {

                        photogate.addMeasurement(
                            simulationTimeRef.current -
                            earliestEnteredAt
                        );


                        blocked.delete(
                            groupKey
                        );
                    }
                }
                else {

                    const previousGroupEnteredAt =
                        blocked.get(
                            groupKey
                        );


                    blocked.delete(
                        groupKey
                    );


                    const checkBlock =
                        (
                            block:
                                GlidingBlock2D | null,
                            inheritedEnteredAt?:
                                number
                        ) => {

                            if (!block) {
                                return;
                            }


                            const body =
                                physics.getBody(
                                    block.id
                                );


                            if (!body) {

                                blocked.delete(
                                    block.id
                                );

                                return;
                            }


                            const isBlocking =
                                Math.abs(
                                    body.position -
                                    photogate.trackPosition
                                ) <=
                                body.width /
                                2;


                            const enteredAt =
                                blocked.get(
                                    block.id
                                ) ??
                                (
                                    isBlocking
                                        ? inheritedEnteredAt
                                        : undefined
                                );


                            if (
                                isBlocking &&
                                enteredAt ===
                                    undefined
                            ) {

                                blocked.set(
                                    block.id,
                                    simulationTimeRef.current
                                );

                                return;
                            }


                            if (
                                isBlocking &&
                                enteredAt !==
                                    undefined
                            ) {

                                blocked.set(
                                    block.id,
                                    enteredAt
                                );

                                return;
                            }


                            if (
                                !isBlocking &&
                                enteredAt !==
                                    undefined
                            ) {

                                photogate.addMeasurement(
                                    simulationTimeRef.current -
                                    enteredAt
                                );


                                blocked.delete(
                                    block.id
                                );
                            }
                        };


                    checkBlock(
                        block1,
                        previousGroupEnteredAt
                    );

                    checkBlock(
                        block2,
                        previousGroupEnteredAt
                    );
                }
            }

            const updateBlock =
                (
                    block:
                        GlidingBlock2D | null
                ) => {

                    if (!block) {
                        return;
                    }


                    if (
                        block.isDragging
                    ) {

                        return;
                    }


                    const body =
                        physics.getBody(
                            block.id
                        );


                    if (!body) {
                        return;
                    }


                    const point =
                        track.getPointAt(
                            body.position
                        );


                    block.position.set(
                        point.x,
                        point.y -
                            BLOCK_HEIGHT_PIXELS /
                            2
                    );


                    block.setTrackRotation(
                        track.angleRadians
                    );
                };


            updateBlock(
                block1Ref.current
            );

            updateBlock(
                block2Ref.current
            );
        }
    );


    return null;
}


export default function DynamicsTrack() {

    return (
        <Application
            width={1000}
            height={600}
            backgroundColor={0xffffff}
        >
            <DynamicsTrackContents />
        </Application>
    );
}
