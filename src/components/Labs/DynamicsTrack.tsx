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
    Ruler2D,
} from "../Objects/Ruler2D";

import {
    GlidingBlock2D,
} from "../Objects/GlidingBlock2D";

import {
    ValueControl,
} from "../Objects/ValueControl";

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

const REFERENCE_MASS =
    4;

const REFERENCE_BLOCK_SIZE_PIXELS =
    70;


function getBlockSizePixels(
    mass: number
) {

    return (
        REFERENCE_BLOCK_SIZE_PIXELS *
        Math.cbrt(
            mass /
            REFERENCE_MASS
        )
    );
}

const RELEASE_VELOCITY_SAMPLE_MS =
    120;

const MIN_RELEASE_SAMPLE_MS =
    30;

const MAX_RELEASE_SPEED =
    6;

const PHOTOGATE_INITIAL_POSITIONS = [
    TRACK_LENGTH / 4,
    TRACK_LENGTH * 3 / 4,
];

const FACTORY_POSITION = {
    x: 225,
    y: 55,
};


interface LabBlock {

    visual: GlidingBlock2D;

    attached: boolean;
}


interface ActivePhotogateObject {

    ids: Set<string>;

    enteredAt: number;
}


function DynamicsTrackContents() {

    const physicsRef =
        useRef<
            DynamicsTrackPhysics | null
        >(null);

    const trackRef =
        useRef<
            DynamicsTrack2D | null
        >(null);

    const blocksRef =
        useRef<
            Map<
                string,
                LabBlock
            >
        >(
            new Map()
        );

    const photogatesRef =
        useRef<
            Photogate2D[]
        >(
            []
        );

    const activePhotogateObjectsRef =
        useRef<
            (
                ActivePhotogateObject |
                null
            )[]
        >(
            [
                null,
                null,
            ]
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

            const ruler =
                new Ruler2D(
                    1,
                    {
                        x: 50,
                        y: 395,
                    },
                    PIXELS_PER_METER,
                    "vertical"
                );


            experiment.add(
                ruler
            );


            const track =
                new DynamicsTrack2D({
                    position: {
                        x: 120,
                        y: 395,
                    },

                    length:
                        TRACK_LENGTH,

                    pixelsPerMeter:
                        PIXELS_PER_METER,

                    maxAngleRadians:
                        Math.PI /
                        12,
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


            const photogates =
                PHOTOGATE_INITIAL_POSITIONS.map(
                    (
                        trackPosition,
                        index
                    ) => {

                        const point =
                            track.getPointAt(
                                trackPosition
                            );


                        const photogate =
                            new Photogate2D({
                                position: {
                                    x:
                                        point.x,

                                    y:
                                        point.y,
                                },

                                trackPosition,

                                label:
                                    `G${index + 1}`,

                                maxMeasurements:
                                    3,

                                onClear:
                                    () => {

                                        activePhotogateObjectsRef.current[
                                            index
                                        ] =
                                            null;
                                    },
                            });


                        photogate.setTrackRotation(
                            track.angleRadians
                        );


                        experiment.add(
                            photogate
                        );


                        return photogate;
                    }
                );


            photogatesRef.current =
                photogates;


            const clearPhotogate =
                (
                    index: number
                ) => {

                    photogates[
                        index
                    ]?.clearMeasurements();


                    activePhotogateObjectsRef.current[
                        index
                    ] =
                        null;
                };


            const clearAllPhotogates =
                () => {

                    for (
                        let index = 0;
                        index <
                            photogates.length;
                        index++
                    ) {

                        clearPhotogate(
                            index
                        );
                    }
                };


            const getBlockCenterPoint =
                (
                    trackPosition:
                        number,

                    visual:
                        GlidingBlock2D
                ) => {

                    const surfacePoint =
                        track.getPointAt(
                            trackPosition
                        );


                    const halfHeight =
                        visual.blockHeight /
                        2;


                    return new Point(
                        surfacePoint.x +
                            Math.sin(
                                track.angleRadians
                            ) *
                            halfHeight,

                        surfacePoint.y -
                            Math.cos(
                                track.angleRadians
                            ) *
                            halfHeight
                    );
                };


            const updateObjectsForTrackAngle =
                () => {

                    physics.setAngle(
                        track.angleRadians
                    );


                    for (
                        const photogate
                        of photogates
                    ) {

                        const currentPhotogatePoint =
                            track.getPointAt(
                                photogate.trackPosition
                            );


                        photogate.position.set(
                            currentPhotogatePoint.x,
                            currentPhotogatePoint.y
                        );


                        photogate.setTrackRotation(
                            track.angleRadians
                        );
                    }


                    for (
                        const {
                            visual,
                            attached,
                        }
                        of blocksRef.current.values()
                    ) {

                        if (!attached) {
                            continue;
                        }


                        const body =
                            physics.getBody(
                                visual.id
                            );


                        if (!body) {
                            continue;
                        }


                        const point =
                            getBlockCenterPoint(
                                body.position,
                                visual
                            );


                        visual.position.set(
                            point.x,
                            point.y
                        );


                        visual.setTrackRotation(
                            track.angleRadians
                        );
                    }


                    clearAllPhotogates();
                };


            track.setOnAngleChanged(
                updateObjectsForTrackAngle
            );


            const movePhotogate =
                (
                    index: number,
                    point: Point
                ) => {

                    const photogate =
                        photogates[
                            index
                        ];


                    if (!photogate) {
                        return;
                    }


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


                    clearPhotogate(
                        index
                    );
                };


            photogates.forEach(
                (
                    photogate,
                    index
                ) => {

                    const move =
                        (
                            point: Point
                        ) => {

                            movePhotogate(
                                index,
                                point
                            );
                        };


                    photogate.setOnDragMove(
                        move
                    );

                    photogate.setOnDragEnd(
                        move
                    );
                }
            );


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


            let nextBlockNumber =
                1;

            let selectedMass =
                2;

            let factoryBlock:
                GlidingBlock2D | null =
                null;


            let createFactoryBlock:
                () => void;


            const setupBlockDragging =
                (
                    block:
                        GlidingBlock2D,

                    startsAsFactory:
                        boolean
                ) => {

                    let isFactory =
                        startsAsFactory;


                    block.setOnDragStart(
                        (
                            _,
                            point
                        ) => {

                            if (isFactory) {

                                isFactory =
                                    false;


                                blocksRef.current.set(
                                    block.id,
                                    {
                                        visual:
                                            block,

                                        attached:
                                            false,
                                    }
                                );


                                factoryBlock =
                                    null;


                                createFactoryBlock();
                            }


                            dragSamples.set(
                                block.id,
                                []
                            );


                            recordDragSample(
                                block.id,
                                point
                            );


                            const labBlock =
                                blocksRef.current.get(
                                    block.id
                                );


                            if (
                                labBlock?.attached
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


                            const labBlock =
                                blocksRef.current.get(
                                    block.id
                                );


                            if (
                                !labBlock?.attached
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
                                getBlockCenterPoint(
                                    trackPosition,
                                    block
                                );


                            block.position.set(
                                screenPoint.x,
                                screenPoint.y
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


                            const labBlock =
                                blocksRef.current.get(
                                    block.id
                                );


                            if (!labBlock) {

                                dragSamples.delete(
                                    block.id
                                );

                                return;
                            }


                            if (
                                labBlock.attached
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


                            labBlock.attached =
                                true;


                            physics.addBody(
                                block.id,
                                block.mass,
                                trackPosition,
                                block.blockWidth /
                                    PIXELS_PER_METER
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
                                getBlockCenterPoint(
                                    actualTrackPosition,
                                    block
                                );


                            block.position.set(
                                screenPoint.x,
                                screenPoint.y
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


            createFactoryBlock =
                () => {

                    const mass =
                        selectedMass;

                    const size =
                        getBlockSizePixels(
                            mass
                        );


                    const block =
                        new GlidingBlock2D({
                            id:
                                `block-${nextBlockNumber++}`,

                            position:
                                FACTORY_POSITION,

                            mass,

                            width:
                                size,

                            height:
                                size,
                        });


                    factoryBlock =
                        block;


                    setupBlockDragging(
                        block,
                        true
                    );


                    experiment.add(
                        block
                    );
                };


            const massControl =
                new ValueControl({
                    label:
                        "Mass, kg",

                    min: 1,
                    max: 5,

                    value: 2,

                    showRandom:
                        false,

                    showUnlimitedSupply:
                        false,

                    position: {
                        x: 35,
                        y: 20,
                    },

                    onValueChanged:
                        value => {

                            selectedMass =
                                value;


                            if (
                                !factoryBlock
                            ) {

                                return;
                            }


                            const size =
                                getBlockSizePixels(
                                    value
                                );


                            factoryBlock.setMass(
                                value
                            );


                            factoryBlock.setSize(
                                size,
                                size
                            );
                        },
                });


            experiment.add(
                massControl
            );


            const resetBlocks =
                () => {

                    for (
                        const [
                            blockId,
                            labBlock,
                        ]
                        of blocksRef.current
                    ) {

                        physics.removeBody(
                            blockId
                        );


                        experiment.remove(
                            labBlock.visual
                        );


                        labBlock.visual.destroy({
                            children: true,
                        });
                    }


                    blocksRef.current.clear();

                    dragSamples.clear();

                    clearAllPhotogates();
                };


            const collisionTypeControl =
                new CollisionTypeControl({
                    position: {
                        x: 770,
                        y: 20,
                    },

                    value:
                        "elastic",

                    onValueChanged:
                        value => {

                            physics.setCollisionType(
                                value
                            );
                        },

                    onReset:
                        resetBlocks,
                });


            experiment.add(
                collisionTypeControl
            );


            const staticFrictionControl =
                new ValueControl({
                    label:
                        "Static friction coefficient",

                    min: 0,
                    max: 0.4,
                    step: 0.1,

                    stepWidth: 34,

                    value: 0,

                    showRandom:
                        false,

                    showUnlimitedSupply:
                        false,

                    formatValue:
                        value =>
                            value.toFixed(1),

                    position: {
                        x: 410,
                        y: 20,
                    },

                    onValueChanged:
                        value => {

                            physics.setStaticFrictionCoefficient(
                                value
                            );
                        },
                });


            const kineticFrictionControl =
                new ValueControl({
                    label:
                        "Kinetic friction coefficient",

                    min: 0,
                    max: 0.16,
                    step: 0.04,

                    stepWidth: 34,

                    value: 0,

                    showRandom:
                        false,

                    showUnlimitedSupply:
                        false,

                    formatValue:
                        value =>
                            value.toFixed(2),

                    position: {
                        x: 410,
                        y: 100,
                    },

                    onValueChanged:
                        value => {

                            physics.setKineticFrictionCoefficient(
                                value
                            );
                        },
                });


            experiment.add(
                staticFrictionControl
            );

            experiment.add(
                kineticFrictionControl
            );


            createFactoryBlock();
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


            const photogates =
                photogatesRef.current;


            if (
                photogates.length > 0
            ) {

                const bodies =
                    Array.from(
                        blocksRef.current.values()
                    )
                    .filter(
                        block =>
                            block.attached
                    )
                    .map(
                        block => ({
                            block,
                            body:
                                physics.getBody(
                                    block.visual.id
                                ),
                        })
                    )
                    .filter(
                        (
                            item
                        ): item is {
                            block: LabBlock;
                            body: NonNullable<
                                ReturnType<
                                    DynamicsTrackPhysics["getBody"]
                                >
                            >;
                        } =>
                            item.body !==
                            undefined
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.body.position -
                            b.body.position
                    );


                const groups:
                    {
                        ids:
                            Set<string>;

                        leftEdge:
                            number;

                        rightEdge:
                            number;
                    }[] =
                    [];


                for (
                    const {
                        block,
                        body,
                    }
                    of bodies
                ) {

                    const leftEdge =
                        body.position -
                        body.width /
                        2;

                    const rightEdge =
                        body.position +
                        body.width /
                        2;

                    const previousGroup =
                        groups[
                            groups.length -
                            1
                        ];


                    if (
                        previousGroup &&
                        leftEdge <=
                            previousGroup.rightEdge +
                            0.0001
                    ) {

                        previousGroup.ids.add(
                            block.visual.id
                        );

                        previousGroup.rightEdge =
                            Math.max(
                                previousGroup.rightEdge,
                                rightEdge
                            );

                        continue;
                    }


                    groups.push({
                        ids:
                            new Set([
                                block.visual.id,
                            ]),

                        leftEdge,

                        rightEdge,
                    });
                }


                photogates.forEach(
                    (
                        photogate,
                        index
                    ) => {

                        const blockingGroup =
                            groups.find(
                                group =>
                                    photogate.trackPosition >=
                                        group.leftEdge &&
                                    photogate.trackPosition <=
                                        group.rightEdge
                            );


                        const active =
                            activePhotogateObjectsRef.current[
                                index
                            ];


                        if (!blockingGroup) {

                            if (active) {

                                photogate.addMeasurement(
                                    simulationTimeRef.current -
                                    active.enteredAt
                                );


                                activePhotogateObjectsRef.current[
                                    index
                                ] =
                                    null;
                            }


                            return;
                        }


                        if (!active) {

                            activePhotogateObjectsRef.current[
                                index
                            ] = {
                                ids:
                                    new Set(
                                        blockingGroup.ids
                                    ),

                                enteredAt:
                                    simulationTimeRef.current,
                            };


                            return;
                        }


                        const samePhysicalObject =
                            Array.from(
                                blockingGroup.ids
                            ).some(
                                id =>
                                    active.ids.has(
                                        id
                                    )
                            );


                        if (samePhysicalObject) {

                            active.ids =
                                new Set(
                                    blockingGroup.ids
                                );


                            return;
                        }


                        photogate.addMeasurement(
                            simulationTimeRef.current -
                            active.enteredAt
                        );


                        activePhotogateObjectsRef.current[
                            index
                        ] = {
                            ids:
                                new Set(
                                    blockingGroup.ids
                                ),

                            enteredAt:
                                simulationTimeRef.current,
                        };
                    }
                );
            }


            for (
                const {
                    visual,
                    attached,
                }
                of blocksRef.current.values()
            ) {

                if (!attached) {
                    continue;
                }


                if (
                    visual.isDragging
                ) {

                    continue;
                }


                const body =
                    physics.getBody(
                        visual.id
                    );


                if (!body) {
                    continue;
                }


                const surfacePoint =
                    track.getPointAt(
                        body.position
                    );


                const halfHeight =
                    visual.blockHeight /
                    2;


                visual.position.set(
                    surfacePoint.x +
                        Math.sin(
                            track.angleRadians
                        ) *
                        halfHeight,

                    surfacePoint.y -
                        Math.cos(
                            track.angleRadians
                        ) *
                        halfHeight
                );


                visual.setTrackRotation(
                    track.angleRadians
                );
            }
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
            antialias
        >
            <DynamicsTrackContents />
        </Application>
    );
}
