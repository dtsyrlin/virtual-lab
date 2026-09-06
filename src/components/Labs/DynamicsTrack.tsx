import {
    Application,
    useTick,
} from "@pixi/react";

import {
    useRef,
} from "react";

import {
    Container,
    Graphics,
    Point,
    Text,
    TextStyle,
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

    enteredAt: number;
}


class GateToGateDisplay
    extends Container {

    private readonly valueText:
        Text;


    constructor(
        x: number,
        y: number
    ) {

        super();


        this.position.set(
            x,
            y
        );


        const label =
            new Text({
                text:
                    "Gate-to-gate Δt, s",

                style:
                    new TextStyle({
                        fontFamily:
                            "Arial",

                        fontSize:
                            14,

                        fill:
                            0x111111,
                    }),
            });


        label.position.set(
            0,
            0
        );


        this.addChild(
            label
        );


        const screen =
            new Graphics();


        screen
            .roundRect(
                0,
                22,
                160,
                52,
                7
            )
            .fill({
                color:
                    0x222222,
            });


        this.addChild(
            screen
        );


        this.valueText =
            new Text({
                text:
                    "---",

                style:
                    new TextStyle({
                        fontFamily:
                            "monospace",

                        fontSize:
                            28,

                        fill:
                            0xffffff,
                    }),
            });


        this.valueText.anchor.set(
            0.5
        );


        this.valueText.position.set(
            80,
            48
        );


        this.addChild(
            this.valueText
        );
    }


    public setTime(
        seconds: number
    ): void {

        this.valueText.text =
            seconds.toFixed(
                3
            );
    }


    public setLiveTime(
        seconds: number
    ): void {

        this.setTime(
            seconds
        );
    }


    public clear(): void {

        this.valueText.text =
            "---";
    }
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

    const gateToGateDisplayRef =
        useRef<
            GateToGateDisplay | null
        >(null);


    const pendingGateEntriesRef =
        useRef<
            Map<
                string,
                {
                    gateIndex:
                        number;

                    enteredAt:
                        number;
                }
            >
        >(
            new Map()
        );

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


            const clearGateToGateTiming =
                () => {

                    pendingGateEntriesRef.current.clear();

                    gateToGateDisplayRef.current?.clear();
                };


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


                    clearGateToGateTiming();
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

                    clearGateToGateTiming();
                };


            const collisionTypeControl =
                new CollisionTypeControl({
                    position: {
                        x: 600,
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
                        x: 350,
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
                        x: 350,
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


            const gateToGateDisplay =
                new GateToGateDisplay(
                    790,
                    25
                );


            gateToGateDisplayRef.current =
                gateToGateDisplay;


            experiment.add(
                gateToGateDisplay
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


            const stepStartTime =
                simulationTimeRef.current;


            const bodiesBeforeStep =
                new Map<
                    string,
                    {
                        position: number;
                        width: number;
                    }
                >();


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


                bodiesBeforeStep.set(
                    visual.id,
                    {
                        position:
                            body.position,

                        width:
                            body.width,
                    }
                );
            }


            physics.move(
                deltaTimeSeconds
            );


            simulationTimeRef.current =
                stepStartTime +
                deltaTimeSeconds;


            const photogates =
                photogatesRef.current;


            /*
             * Live displays are intentionally frame-refreshed.
             * They are visual feedback only; final measurements
             * still come from the exact sub-frame physics crossing
             * times calculated below.
             */
            let earliestPendingGateEntry:
                number | null =
                null;


            for (
                const pending
                of pendingGateEntriesRef.current.values()
            ) {

                if (
                    earliestPendingGateEntry ===
                        null ||
                    pending.enteredAt <
                        earliestPendingGateEntry
                ) {

                    earliestPendingGateEntry =
                        pending.enteredAt;
                }
            }


            if (
                earliestPendingGateEntry !==
                null
            ) {

                gateToGateDisplayRef.current?.setLiveTime(
                    Math.max(
                        0,
                        simulationTimeRef.current -
                            earliestPendingGateEntry
                    )
                );
            }


            photogates.forEach(
                (
                    photogate,
                    index
                ) => {

                    const active =
                        activePhotogateObjectsRef.current[
                            index
                        ];


                    photogate.setLiveMeasurement(
                        active
                            ? Math.max(
                                0,
                                simulationTimeRef.current -
                                    active.enteredAt
                            )
                            : null
                    );
                }
            );


            if (
                photogates.length > 0
            ) {

                /*
                 * Photogate timing is calculated from the physical
                 * trajectory during this simulation step, not from
                 * the render-frame boundary.
                 *
                 * For each block we solve the fraction of the step
                 * during which the gate lies between its leading and
                 * trailing edges.  The intervals from all blocks are
                 * then merged, so touching blocks behave as one
                 * continuous object at the gate.
                 */
                photogates.forEach(
                    (
                        photogate,
                        index
                    ) => {

                        const gatePosition =
                            photogate.trackPosition;


                        const blockedIntervals:
                            {
                                start: number;
                                end: number;
                            }[] =
                            [];


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


                            const before =
                                bodiesBeforeStep.get(
                                    visual.id
                                );

                            const after =
                                physics.getBody(
                                    visual.id
                                );


                            if (
                                !before ||
                                !after
                            ) {

                                continue;
                            }


                            const halfWidth =
                                after.width /
                                2;

                            const startCenter =
                                before.position;

                            const endCenter =
                                after.position;

                            const displacement =
                                endCenter -
                                startCenter;


                            if (
                                Math.abs(
                                    displacement
                                ) <
                                1e-12
                            ) {

                                if (
                                    gatePosition >=
                                        startCenter -
                                        halfWidth &&
                                    gatePosition <=
                                        startCenter +
                                        halfWidth
                                ) {

                                    blockedIntervals.push({
                                        start: 0,
                                        end: 1,
                                    });
                                }


                                continue;
                            }


                            let entryFraction =
                                (
                                    gatePosition -
                                    halfWidth -
                                    startCenter
                                ) /
                                displacement;

                            let exitFraction =
                                (
                                    gatePosition +
                                    halfWidth -
                                    startCenter
                                ) /
                                displacement;


                            if (
                                entryFraction >
                                exitFraction
                            ) {

                                [
                                    entryFraction,
                                    exitFraction,
                                ] = [
                                    exitFraction,
                                    entryFraction,
                                ];
                            }


                            /*
                             * A new beam-entry event occurs only when
                             * the leading edge actually crosses the
                             * gate during this physics step.  If the
                             * block was already covering the beam at
                             * the beginning of the step, entryFraction
                             * is negative and no new hit is generated.
                             */
                            if (
                                entryFraction >=
                                    -1e-9 &&
                                entryFraction <=
                                    1 + 1e-9
                            ) {

                                const enteredAt =
                                    stepStartTime +
                                    Math.max(
                                        0,
                                        Math.min(
                                            1,
                                            entryFraction
                                        )
                                    ) *
                                    deltaTimeSeconds;


                                const pending =
                                    pendingGateEntriesRef.current.get(
                                        visual.id
                                    );


                                if (
                                    pending &&
                                    pending.gateIndex !==
                                        index
                                ) {

                                    gateToGateDisplayRef.current?.setTime(
                                        Math.abs(
                                            enteredAt -
                                            pending.enteredAt
                                        )
                                    );


                                    pendingGateEntriesRef.current.delete(
                                        visual.id
                                    );
                                }
                                else {

                                    pendingGateEntriesRef.current.set(
                                        visual.id,
                                        {
                                            gateIndex:
                                                index,

                                            enteredAt,
                                        }
                                    );


                                    gateToGateDisplayRef.current?.setLiveTime(
                                        Math.max(
                                            0,
                                            simulationTimeRef.current -
                                                enteredAt
                                        )
                                    );
                                }
                            }


                            const start =
                                Math.max(
                                    0,
                                    entryFraction
                                );

                            const end =
                                Math.min(
                                    1,
                                    exitFraction
                                );


                            if (
                                end >= start &&
                                end >= 0 &&
                                start <= 1
                            ) {

                                blockedIntervals.push({
                                    start,
                                    end,
                                });
                            }
                        }


                        blockedIntervals.sort(
                            (
                                a,
                                b
                            ) =>
                                a.start -
                                b.start
                        );


                        const mergedIntervals:
                            {
                                start: number;
                                end: number;
                            }[] =
                            [];


                        for (
                            const interval
                            of blockedIntervals
                        ) {

                            const previous =
                                mergedIntervals[
                                    mergedIntervals.length -
                                    1
                                ];


                            if (
                                previous &&
                                interval.start <=
                                    previous.end +
                                    1e-9
                            ) {

                                previous.end =
                                    Math.max(
                                        previous.end,
                                        interval.end
                                    );

                                continue;
                            }


                            mergedIntervals.push({
                                start:
                                    interval.start,

                                end:
                                    interval.end,
                            });
                        }


                        let active =
                            activePhotogateObjectsRef.current[
                                index
                            ];

                        let previousEnd =
                            0;


                        for (
                            const interval
                            of mergedIntervals
                        ) {

                            if (
                                active &&
                                interval.start >
                                    previousEnd +
                                    1e-9
                            ) {

                                const exitedAt =
                                    stepStartTime +
                                    previousEnd *
                                    deltaTimeSeconds;


                                photogate.addMeasurement(
                                    exitedAt -
                                    active.enteredAt
                                );


                                photogate.setLiveMeasurement(
                                    null
                                );


                                active =
                                    null;
                            }


                            if (!active) {

                                active = {
                                    enteredAt:
                                        stepStartTime +
                                        interval.start *
                                        deltaTimeSeconds,
                                };


                                photogate.setLiveMeasurement(
                                    Math.max(
                                        0,
                                        simulationTimeRef.current -
                                            active.enteredAt
                                    )
                                );
                            }


                            previousEnd =
                                interval.end;


                            if (
                                interval.end <
                                1 -
                                1e-9
                            ) {

                                const exitedAt =
                                    stepStartTime +
                                    interval.end *
                                    deltaTimeSeconds;


                                photogate.addMeasurement(
                                    exitedAt -
                                    active.enteredAt
                                );


                                photogate.setLiveMeasurement(
                                    null
                                );


                                active =
                                    null;
                            }
                        }


                        if (
                            active &&
                            (
                                mergedIntervals.length ===
                                    0 ||
                                previousEnd <
                                    1 -
                                    1e-9
                            )
                        ) {

                            const exitedAt =
                                stepStartTime +
                                previousEnd *
                                deltaTimeSeconds;


                            photogate.addMeasurement(
                                exitedAt -
                                active.enteredAt
                            );


                            photogate.setLiveMeasurement(
                                null
                            );


                            active =
                                null;
                        }


                        activePhotogateObjectsRef.current[
                            index
                        ] =
                            active;
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
