import { Application, useTick } from "@pixi/react";
import { useRef } from "react";
import { Graphics, Point, Text } from "pixi.js";
import { Experiment2D, useExperiment2D } from "./Experiment2D";
import { RollingTrack2D } from "../Objects/RollingTrack2D";
import { RollingObject2D } from "../Objects/RollingObject2D";
import type { RollingObjectKind } from "../Objects/RollingObject2D";
import { PhotogatePair2D } from "../Objects/PhotogatePair2D";
import { ValueControl } from "../Objects/ValueControl";
import { Ruler2D } from "../Objects/Ruler2D";
import { RollingTrackPhysics } from "../PhysicalSystems/RollingTrackPhysics";

const PIXELS_PER_METER = 300;
const TRACK_LENGTH = 2.4;
const OBJECT_RADIUS_METERS = 0.10;
const OBJECT_RADIUS_PIXELS = OBJECT_RADIUS_METERS * PIXELS_PER_METER;
const GATE_SEPARATION = 0.20;

const FACTORY_POSITIONS: { kind: RollingObjectKind; x: number; y: number }[] = [
    { kind: "block", x: 70, y: 55 },
    { kind: "ring", x: 150, y: 55 },
    { kind: "double-ring", x: 250, y: 55 },
    { kind: "thick-ring", x: 365, y: 55 },
    { kind: "disk", x: 470, y: 55 },
];

interface LabObject {
    visual: RollingObject2D;
    attached: boolean;
}

interface PairState {
    firstBeam: 0 | 1 | null;
    startedAt: number | null;
    leftBlocked: boolean;
    rightBlocked: boolean;
}

function RollingTrackContents() {
    const physicsRef = useRef<RollingTrackPhysics | null>(null);
    const trackRef = useRef<RollingTrack2D | null>(null);
    const objectRef = useRef<LabObject | null>(null);
    const pairsRef = useRef<PhotogatePair2D[]>([]);
    const allPairsRef = useRef<PhotogatePair2D[]>([]);
    const pairStatesRef = useRef<PairState[]>([]);

    useExperiment2D((experiment: Experiment2D) => {
        const ruler = new Ruler2D(
            1,
            { x: 50, y: 395 },
            PIXELS_PER_METER,
            "vertical"
        );
        experiment.add(ruler);

        const track = new RollingTrack2D({
            position: { x: 120, y: 395 },
            length: TRACK_LENGTH,
            pixelsPerMeter: PIXELS_PER_METER,
            maxAngleRadians: Math.PI / 12,
        });
        trackRef.current = track;
        experiment.add(track);

        const physics = new RollingTrackPhysics({ trackLength: TRACK_LENGTH });
        physicsRef.current = physics;

        const clearPairState = (index: number) => {
            pairStatesRef.current[index] = {
                firstBeam: null,
                startedAt: null,
                leftBlocked: false,
                rightBlocked: false,
            };
            pairsRef.current[index]?.clear();
        };

        const clearAllPairs = () => {
            for (let i = 0; i < pairsRef.current.length; i++) clearPairState(i);
        };

        const addPairToTrack = (pair: PhotogatePair2D) => {
            if (pairsRef.current.includes(pair)) return;

            pairsRef.current.push(pair);
            pairStatesRef.current.push({
                firstBeam: null,
                startedAt: null,
                leftBlocked: false,
                rightBlocked: false,
            });
        };

        const configurePairGeometry = (
            pair: PhotogatePair2D,
            geometry: {
                trackPosition: number;
                separationMeters: number;
                beamHeight: number;
            }
        ) => {
            const minSeparation = 0.05;
            const maxSeparation = TRACK_LENGTH;
            const separation = Math.max(
                minSeparation,
                Math.min(maxSeparation, geometry.separationMeters)
            );
            const position = Math.max(
                0,
                Math.min(TRACK_LENGTH - separation, geometry.trackPosition)
            );
            const beamHeight = Math.max(
                35,
                Math.min(190, geometry.beamHeight)
            );

            pair.setGeometry({
                trackPosition: position,
                separationMeters: separation,
                beamHeight,
            });

            const screen = track.getPointAt(position);
            pair.position.set(screen.x, screen.y);
            pair.setTrackRotation(track.angleRadians);

            const index = pairsRef.current.indexOf(pair);
            if (index >= 0) clearPairState(index);
        };

        const createPhotogateFactory = () => {
            const factoryX = 840;
            const factoryY = 175;

            const pair = new PhotogatePair2D({
                position: { x: factoryX, y: factoryY },
                trackPosition: 0,
                separationMeters: GATE_SEPARATION,
                pixelsPerMeter: PIXELS_PER_METER,
                beamHeight: 55,

                onGeometryChange: geometry => {
                    // This callback is used only after attachment.
                    configurePairGeometry(pair, geometry);
                },
            });
            allPairsRef.current.push(pair);

            let isFactory = true;
            let attached = false;

            pair.setDetachedDragEnabled(true);

            pair.setOnDetachedDragStart(() => {
                if (!isFactory) return;

                // Same lifecycle as the rolling-object factories:
                // the grabbed object becomes the real object and a fresh
                // factory is immediately recreated at the original location.
                isFactory = false;
                createPhotogateFactory();
            });

            pair.setOnDetachedDragMove((_, point) => {
                if (attached) return;
                pair.position.set(point.x, point.y);
            });

            pair.setOnDetachedDragEnd((_, point) => {
                if (attached) return;

                const local = track.toLocal(point);
                const trackLengthPixels = TRACK_LENGTH * PIXELS_PER_METER;
                const closeToTrack =
                    local.x >= 0 &&
                    local.x <= trackLengthPixels &&
                    Math.abs(local.y) < 120;

                // Just like the rolling objects: if it wasn't dropped near the
                // track, leave it where the student dropped it and let them try
                // again. Do not teleport it anywhere.
                if (!closeToTrack) {
                    pair.position.set(point.x, point.y);
                    return;
                }

                const requested = track.getPositionFromPoint(point);
                const position = Math.max(
                    0,
                    Math.min(
                        TRACK_LENGTH - GATE_SEPARATION,
                        requested
                    )
                );

                attached = true;
                pair.setDetachedDragEnabled(false);
                pair.setGeometry({
                    trackPosition: position,
                    separationMeters: GATE_SEPARATION,
                    beamHeight: 55,
                });

                const screen = track.getPointAt(position);
                pair.position.set(screen.x, screen.y);
                pair.setTrackRotation(track.angleRadians);

                addPairToTrack(pair);
                clearPairState(pairsRef.current.indexOf(pair));
            });

            experiment.add(pair);

            // Keep the rolling/sliding object visually above every gate.
            if (objectRef.current) {
                experiment.add(objectRef.current.visual);
            }
        };

        createPhotogateFactory();

        // One global photogate reset: remove all placed gates and any
        // partially-dragged non-factory gates, then recreate a clean factory.
        const resetPhotogates = () => {
            for (const pair of [...allPairsRef.current]) {
                pair.removeFromParent();
                pair.destroy({ children: true });
            }

            allPairsRef.current = [];
            pairsRef.current = [];
            pairStatesRef.current = [];

            createPhotogateFactory();
        };

        const gateResetButton = new Graphics();
        gateResetButton.roundRect(0, 0, 72, 28, 5)
            .fill(0xf4f4f4)
            .stroke({ width: 1, color: 0x666666 });
        gateResetButton.position.set(834, 18);
        gateResetButton.eventMode = "static";
        gateResetButton.cursor = "pointer";
        gateResetButton.zIndex = 30;
        gateResetButton.on("pointerdown", event => {
            event.stopPropagation();
            resetPhotogates();
        });

        const gateResetText = new Text({
            text: "Reset",
            style: { fontSize: 14, fill: 0x000000 },
        });
        gateResetText.anchor.set(0.5);
        gateResetText.position.set(870, 32);
        gateResetText.zIndex = 31;

        experiment.add(gateResetButton);
        experiment.add(gateResetText);

        const crossingTime = (
            previousPosition: number,
            position: number,
            threshold: number,
            startTime: number,
            endTime: number
        ): number | null => {
            const delta = position - previousPosition;
            if (Math.abs(delta) < 1e-12) return null;
            const fraction = (threshold - previousPosition) / delta;
            if (fraction < 0 || fraction > 1) return null;
            return startTime + fraction * (endTime - startTime);
        };

        physics.setOnBodyStep(event => {
            const current = objectRef.current;
            if (!current?.attached || current.visual.id !== event.body.id) return;

            const body = event.body;
            const movingRight = event.position > event.previousPosition;
            const movingLeft = event.position < event.previousPosition;
            if (!movingRight && !movingLeft) return;

            pairsRef.current.forEach((pair, index) => {
                const state = pairStatesRef.current[index];
                if (!state) return;

                const beams = [pair.leftBeamPosition, pair.rightBeamPosition];
                const events: { beam: 0 | 1; time: number }[] = [];

                beams.forEach((beamPosition, beamIndex) => {
                    // A beam becomes blocked when the leading edge of the
                    // object's overall span reaches it. This preserves the
                    // intentionally dumb photogate behavior while locating
                    // the event inside the 240 Hz physics substep.
                    const threshold = movingRight
                        ? beamPosition - body.radius
                        : beamPosition + body.radius;
                    const time = crossingTime(
                        event.previousPosition,
                        event.position,
                        threshold,
                        event.startTime,
                        event.endTime
                    );
                    if (time !== null) {
                        events.push({ beam: beamIndex as 0 | 1, time });
                    }
                });

                events.sort((a, b) => a.time - b.time);

                for (const beamEvent of events) {
                    if (state.firstBeam === null) {
                        state.firstBeam = beamEvent.beam;
                        state.startedAt = beamEvent.time;
                        pair.setElapsed(0);
                        continue;
                    }

                    if (
                        state.startedAt !== null &&
                        beamEvent.beam !== state.firstBeam
                    ) {
                        pair.addMeasurement(beamEvent.time - state.startedAt);
                        state.firstBeam = null;
                        state.startedAt = null;
                    }
                }

                const leftEdge = body.position - body.radius;
                const rightEdge = body.position + body.radius;
                state.leftBlocked = pair.leftBeamPosition >= leftEdge &&
                    pair.leftBeamPosition <= rightEdge;
                state.rightBlocked = pair.rightBeamPosition >= leftEdge &&
                    pair.rightBeamPosition <= rightEdge;
            });
        });

        const getObjectCenter = (trackPosition: number) => {
            const surface = track.getPointAt(trackPosition);
            return new Point(
                surface.x + Math.sin(track.angleRadians) * OBJECT_RADIUS_PIXELS,
                surface.y - Math.cos(track.angleRadians) * OBJECT_RADIUS_PIXELS
            );
        };

        const removeCurrentObject = () => {
            const current = objectRef.current;
            if (!current) return;
            physics.removeBody(current.visual.id);
            experiment.remove(current.visual);
            current.visual.destroy({ children: true });
            objectRef.current = null;
            clearAllPairs();
        };

        let nextId = 1;

        const createFactory = (kind: RollingObjectKind, x: number, y: number) => {
            const object = new RollingObject2D({
                id: `rolling-${nextId++}`,
                kind,
                position: { x, y },
                radius: OBJECT_RADIUS_PIXELS,
            });
            let isFactory = true;

            object.setOnDragStart(() => {
                if (isFactory) {
                    isFactory = false;
                    // This lab intentionally permits only one experimental
                    // object at a time.  Pulling a new one from a factory
                    // replaces the previous object.
                    removeCurrentObject();
                    objectRef.current = { visual: object, attached: false };
                    createFactory(kind, x, y);
                } else if (objectRef.current?.attached) {
                    physics.setBodyHeld(object.id, true);
                }
            });

            object.setOnDragMove((_, point) => {
                const current = objectRef.current;
                if (!current || current.visual !== object) return;

                if (!current.attached) {
                    object.position.set(point.x, point.y);
                    return;
                }

                const requested = track.getPositionFromPoint(point);
                const position = physics.dragBodyTo(object.id, requested);
                const center = getObjectCenter(position);
                object.position.set(center.x, center.y);
                const body = physics.getBody(object.id);
                object.setTrackPose(track.angleRadians, body?.angle ?? 0);
            });

            object.setOnDragEnd((_, point) => {
                const current = objectRef.current;
                if (!current || current.visual !== object) return;

                const requested = track.getPositionFromPoint(point);

                // Once an object has been placed on the track it stays on the
                // track while being dragged.  dragBodyTo() clamps its center
                // between the two stoppers, so neither edge can pass a boundary.
                if (!current.attached) {
                    const local = track.toLocal(point);
                    const trackLengthPixels = TRACK_LENGTH * PIXELS_PER_METER;
                    const closeToTrack = local.x >= 0 && local.x <= trackLengthPixels &&
                        Math.abs(local.y) < 100;

                    if (!closeToTrack) {
                        object.position.set(point.x, point.y);
                        clearAllPairs();
                        return;
                    }

                    physics.addBody(
                        object.id,
                        object.kind,
                        requested,
                        OBJECT_RADIUS_METERS
                    );
                    current.attached = true;
                }

                const position = physics.dragBodyTo(object.id, requested);
                physics.setBodyHeld(object.id, false);
                const body = physics.getBody(object.id);
                const center = getObjectCenter(position);
                object.position.set(center.x, center.y);
                object.setTrackPose(track.angleRadians, body?.angle ?? 0);
                clearAllPairs();
            });

            experiment.add(object);
        };

        for (const factory of FACTORY_POSITIONS) {
            createFactory(factory.kind, factory.x, factory.y);
        }

        const staticControl = new ValueControl({
            label: "Static friction coefficient",
            min: 0,
            max: 0.4,
            step: 0.1,
            stepWidth: 34,
            value: 0,
            showRandom: false,
            showUnlimitedSupply: false,
            formatValue: value => value.toFixed(1),
            position: { x: 570, y: 20 },
            onValueChanged: value => physics.setStaticFrictionCoefficient(value),
        });

        const kineticControl = new ValueControl({
            label: "Kinetic friction coefficient",
            min: 0,
            max: 0.16,
            step: 0.04,
            stepWidth: 34,
            value: 0,
            showRandom: false,
            showUnlimitedSupply: false,
            formatValue: value => value.toFixed(2),
            position: { x: 570, y: 100 },
            onValueChanged: value => physics.setKineticFrictionCoefficient(value),
        });

        experiment.add(staticControl);
        experiment.add(kineticControl);

        track.setOnAngleChanged(() => {
            physics.setAngle(track.angleRadians);
            pairsRef.current.forEach(pair => {
                const point = track.getPointAt(pair.trackPosition);
                pair.position.set(point.x, point.y);
                pair.setTrackRotation(track.angleRadians);
            });

            const current = objectRef.current;
            if (current?.attached) {
                const body = physics.getBody(current.visual.id);
                if (body) {
                    const center = getObjectCenter(body.position);
                    current.visual.position.set(center.x, center.y);
                    current.visual.setTrackPose(track.angleRadians, body.angle);
                }
            }
            clearAllPairs();
        });
    });

    useTick(ticker => {
        const physics = physicsRef.current;
        const track = trackRef.current;
        if (!physics || !track) return;

        const dt = ticker.deltaMS / 1000;
        physics.move(dt);

        const current = objectRef.current;
        if (!current?.attached || current.visual.isDragging) return;
        const body = physics.getBody(current.visual.id);
        if (!body) return;

        const surface = track.getPointAt(body.position);
        current.visual.position.set(
            surface.x + Math.sin(track.angleRadians) * OBJECT_RADIUS_PIXELS,
            surface.y - Math.cos(track.angleRadians) * OBJECT_RADIUS_PIXELS
        );
        current.visual.setTrackPose(track.angleRadians, body.angle);

        // Measurement start/stop events are generated inside the physics
        // substeps above. The render tick only refreshes the running display.
        const now = physics.getSimulationTime();
        pairsRef.current.forEach((pair, index) => {
            const state = pairStatesRef.current[index];
            if (state?.startedAt !== null && state?.startedAt !== undefined) {
                pair.setElapsed(now - state.startedAt);
            }
        });
    });

    return null;
}

export default function RollingTrack() {
    return (
        <Application
            width={1000}
            height={600}
            backgroundColor={0xffffff}
            antialias
        >
            <RollingTrackContents />
        </Application>
    );
}
