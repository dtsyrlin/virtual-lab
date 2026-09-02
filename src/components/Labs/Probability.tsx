import {
    Application,
} from "@pixi/react";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    Container,
    FederatedPointerEvent,
    Graphics,
} from "pixi.js";

import {
    Experiment2D,
    useExperiment2D,
} from "./Experiment2D";


const TAU =
    Math.PI * 2;


type Interval = {
    start: number;
    end: number;
};


type ProbabilityCircle2DOptions = {
    position: {
        x: number;
        y: number;
    };

    radius: number;

    probability1: number;
    probability2: number;

    onChanged:
        (
            intersection: number
        ) => void;
};


function normalizeAngle(
    angle: number
) {

    angle %= TAU;

    if (angle < 0) {
        angle += TAU;
    }

    return angle;
}


function circularIntervals(
    start: number,
    length: number
): Interval[] {

    if (length >= TAU) {
        return [
            {
                start: 0,
                end: TAU,
            },
        ];
    }


    const normalizedStart =
        normalizeAngle(
            start
        );


    const end =
        normalizedStart +
        length;


    if (end <= TAU) {

        return [
            {
                start:
                    normalizedStart,

                end,
            },
        ];
    }


    return [
        {
            start:
                normalizedStart,

            end:
                TAU,
        },

        {
            start:
                0,

            end:
                end -
                TAU,
        },
    ];
}


function intersectIntervals(
    first: Interval[],
    second: Interval[]
) {

    const intersections:
        Interval[] = [];


    for (
        const a
        of first
    ) {

        for (
            const b
            of second
        ) {

            const start =
                Math.max(
                    a.start,
                    b.start
                );


            const end =
                Math.min(
                    a.end,
                    b.end
                );


            if (
                end >
                start
            ) {

                intersections.push({
                    start,
                    end,
                });
            }
        }
    }


    return intersections;
}


class ProbabilityCircle2D
    extends Container {

    private readonly radius:
        number;

    private readonly probability1Graphics =
        new Graphics();

    private readonly probability2Graphics =
        new Graphics();

    private readonly intersectionGraphics =
        new Graphics();

    private readonly outlineGraphics =
        new Graphics();


    private probability1:
        number;

    private probability2:
        number;


    private angle1 =
        -Math.PI /
        2;

    private angle2 =
        Math.PI /
        3;


    private dragging:
        1 |
        2 |
        null =
        null;

    private previousPointerAngle =
        0;


    private readonly onChanged:
        (
            intersection:
                number
        ) => void;


    constructor(
        options:
            ProbabilityCircle2DOptions
    ) {

        super();


        this.position.set(
            options.position.x,
            options.position.y
        );


        this.radius =
            options.radius;

        this.probability1 =
            options.probability1;

        this.probability2 =
            options.probability2;

        this.onChanged =
            options.onChanged;


        this.addChild(
            this.probability1Graphics,
            this.probability2Graphics,
            this.intersectionGraphics,
            this.outlineGraphics
        );


        this.setupDragging(
            this.probability1Graphics,
            1
        );

        this.setupDragging(
            this.probability2Graphics,
            2
        );


        this.draw();
    }


    public setProbabilities(
        probability1: number,
        probability2: number
    ) {

        this.probability1 =
            probability1;

        this.probability2 =
            probability2;


        this.draw();
    }


    private setupDragging(
        graphics: Graphics,
        eventNumber: 1 | 2
    ) {

        graphics.eventMode =
            "static";

        graphics.cursor =
            "grab";


        graphics.on(
            "pointerdown",
            (
                event:
                    FederatedPointerEvent
            ) => {

                if (
                    event.button !==
                    0
                ) {
                    return;
                }


                this.dragging =
                    eventNumber;

                graphics.cursor =
                    "grabbing";


                const local =
                    this.toLocal(
                        event.global
                    );


                this.previousPointerAngle =
                    Math.atan2(
                        local.y,
                        local.x
                    );
            }
        );


        graphics.on(
            "globalpointermove",
            (
                event:
                    FederatedPointerEvent
            ) => {

                if (
                    this.dragging !==
                    eventNumber
                ) {
                    return;
                }


                const local =
                    this.toLocal(
                        event.global
                    );


                const currentPointerAngle =
                    Math.atan2(
                        local.y,
                        local.x
                    );


                let delta =
                    currentPointerAngle -
                    this.previousPointerAngle;


                if (
                    delta >
                    Math.PI
                ) {
                    delta -=
                        TAU;
                }


                if (
                    delta <
                    -Math.PI
                ) {
                    delta +=
                        TAU;
                }


                if (
                    eventNumber ===
                    1
                ) {

                    this.angle1 =
                        normalizeAngle(
                            this.angle1 +
                            delta
                        );

                } else {

                    this.angle2 =
                        normalizeAngle(
                            this.angle2 +
                            delta
                        );
                }


                this.previousPointerAngle =
                    currentPointerAngle;


                this.draw();
            }
        );


        const finishDrag =
            () => {

                if (
                    this.dragging !==
                    eventNumber
                ) {
                    return;
                }


                this.dragging =
                    null;

                graphics.cursor =
                    "grab";
            };


        graphics.on(
            "pointerup",
            finishDrag
        );

        graphics.on(
            "pointerupoutside",
            finishDrag
        );
    }


    private drawSector(
        graphics: Graphics,
        startAngle: number,
        probability: number,
        color: number,
        alpha: number
    ) {

        graphics.clear();


        if (
            probability <=
            0
        ) {
            return;
        }


        graphics.moveTo(
            0,
            0
        );


        graphics.arc(
            0,
            0,
            this.radius,
            startAngle,
            startAngle +
                TAU *
                probability
        );


        graphics.closePath();


        graphics.fill({
            color,
            alpha,
        });
    }


    private drawIntersection(
        intervals:
            Interval[]
    ) {

        this.intersectionGraphics.clear();


        for (
            const interval
            of intervals
        ) {

            this.intersectionGraphics.moveTo(
                0,
                0
            );


            this.intersectionGraphics.arc(
                0,
                0,
                this.radius,
                interval.start,
                interval.end
            );


            this.intersectionGraphics.closePath();


            this.intersectionGraphics.fill({
                color:
                    0x9b59b6,

                alpha:
                    0.9,
            });
        }
    }


    private draw() {

        this.drawSector(
            this.probability1Graphics,
            this.angle1,
            this.probability1,
            0x3498db,
            0.62
        );


        this.drawSector(
            this.probability2Graphics,
            this.angle2,
            this.probability2,
            0xf39c12,
            0.62
        );


        const intervals1 =
            circularIntervals(
                this.angle1,
                TAU *
                this.probability1
            );


        const intervals2 =
            circularIntervals(
                this.angle2,
                TAU *
                this.probability2
            );


        const intersections =
            intersectIntervals(
                intervals1,
                intervals2
            );


        this.drawIntersection(
            intersections
        );


        this.outlineGraphics.clear();


        this.outlineGraphics.circle(
            0,
            0,
            this.radius
        );


        this.outlineGraphics.stroke({
            width: 3,
            color:
                0x333333,
        });


        const overlapRadians =
            intersections.reduce(
                (
                    sum,
                    interval
                ) =>
                    sum +
                    interval.end -
                    interval.start,

                0
            );


        const intersectionProbability =
            overlapRadians /
            TAU;


        this.onChanged(
            intersectionProbability
        );
    }
}


type ProbabilityContentsProps = {
    probability1: number;
    probability2: number;

    onIntersectionChanged:
        (
            intersection:
                number
        ) => void;
};


function ProbabilityContents({
    probability1,
    probability2,
    onIntersectionChanged,
}: ProbabilityContentsProps) {

    const circleRef =
        useRef<
            ProbabilityCircle2D |
            null
        >(null);


    useExperiment2D(
        (
            experiment:
                Experiment2D
        ) => {

            const circle =
                new ProbabilityCircle2D({
                    position: {
                        x: 650,
                        y: 300,
                    },

                    radius:
                        270,

                    probability1,
                    probability2,

                    onChanged:
                        onIntersectionChanged,
                });


            circleRef.current =
                circle;


            experiment.add(
                circle
            );
        }
    );


    useEffect(
        () => {

            circleRef.current
                ?.setProbabilities(
                    probability1,
                    probability2
                );

        },
        [
            probability1,
            probability2,
        ]
    );


    return null;
}


function clampProbability(
    value: number
) {

    if (
        Number.isNaN(
            value
        )
    ) {
        return 0;
    }


    return Math.max(
        0,
        Math.min(
            1,
            value
        )
    );
}


function formatProbability(
    value: number
) {

    return value.toFixed(
        3
    );
}


export default function Probability() {

    const [
        event1Name,
        setEvent1Name,
    ] =
        useState(
            "Plays chess"
        );


    const [
        event2Name,
        setEvent2Name,
    ] =
        useState(
            "Wears glasses"
        );


    const [
        probability1,
        setProbability1,
    ] =
        useState(
            0.30
        );


    const [
        probability2,
        setProbability2,
    ] =
        useState(
            0.40
        );


    const [
        intersection,
        setIntersection,
    ] =
        useState(
            0
        );


    const union =
        probability1 +
        probability2 -
        intersection;


    const probability1Given2 =
        probability2 > 0
            ? intersection /
                probability2
            : null;


    const probability2Given1 =
        probability1 > 0
            ? intersection /
                probability1
            : null;


    const inputStyle:
        React.CSSProperties = {

        fontSize:
            "18px",

        padding:
            "7px 9px",

        width:
            "190px",
    };


    const probabilityInputStyle:
        React.CSSProperties = {

        ...inputStyle,

        width:
            "90px",
    };


    return (
        <div
            style={{
                width:
                    "100vw",

                height:
                    "100vh",

                backgroundColor:
                    "#ffffff",

                display:
                    "flex",

                flexDirection:
                    "column",

                position:
                    "relative",
            }}
        >
            <div
                style={{
                    position:
                        "absolute",

                    left:
                        "24px",

                    top:
                        "18px",

                    zIndex:
                        10,
                }}
            >
                <div
                    style={{
                        display:
                            "flex",

                        flexDirection:
                            "column",

                        gap:
                            "12px",
                    }}
                >
                    <div
                        style={{
                            display:
                                "flex",

                            alignItems:
                                "center",

                            gap:
                                "10px",
                        }}
                    >
                        <div
                            style={{
                                width:
                                    "18px",

                                height:
                                    "18px",

                                backgroundColor:
                                    "#3498db",
                            }}
                        />

                        <input
                            value={
                                event1Name
                            }

                            onChange={
                                event =>
                                    setEvent1Name(
                                        event.target.value
                                    )
                            }

                            style={
                                inputStyle
                            }
                        />

                        <span
                            style={{
                                fontSize:
                                    "18px",
                            }}
                        >
                            P =
                        </span>

                        <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}

                            value={
                                probability1
                            }

                            onChange={
                                event =>
                                    setProbability1(
                                        clampProbability(
                                            Number(
                                                event.target.value
                                            )
                                        )
                                    )
                            }

                            style={
                                probabilityInputStyle
                            }
                        />
                    </div>


                    <div
                        style={{
                            display:
                                "flex",

                            alignItems:
                                "center",

                            gap:
                                "10px",
                        }}
                    >
                        <div
                            style={{
                                width:
                                    "18px",

                                height:
                                    "18px",

                                backgroundColor:
                                    "#f39c12",
                            }}
                        />

                        <input
                            value={
                                event2Name
                            }

                            onChange={
                                event =>
                                    setEvent2Name(
                                        event.target.value
                                    )
                            }

                            style={
                                inputStyle
                            }
                        />

                        <span
                            style={{
                                fontSize:
                                    "18px",
                            }}
                        >
                            P =
                        </span>

                        <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}

                            value={
                                probability2
                            }

                            onChange={
                                event =>
                                    setProbability2(
                                        clampProbability(
                                            Number(
                                                event.target.value
                                            )
                                        )
                                    )
                            }

                            style={
                                probabilityInputStyle
                            }
                        />
                    </div>
                </div>


                <div
                    style={{
                        fontSize:
                            "18px",

                        lineHeight:
                            1.7,

                        marginTop:
                            "42px",

                        width:
                            "430px",

                        textAlign:
                            "left",
                    }}
                >
                    <div>
                        P({event1Name} ∩ {event2Name}) ={" "}
                        <strong>
                            {formatProbability(
                                intersection
                            )}
                        </strong>
                    </div>

                    <div>
                        P({event1Name} ∪ {event2Name}) ={" "}
                        <strong>
                            {formatProbability(
                                union
                            )}
                        </strong>
                    </div>

                    <div>
                        P({event1Name} | {event2Name}) ={" "}
                        <strong>
                            {
                                probability1Given2 ===
                                null
                                    ? "undefined"
                                    : formatProbability(
                                        probability1Given2
                                    )
                            }
                        </strong>
                    </div>

                    <div>
                        P({event2Name} | {event1Name}) ={" "}
                        <strong>
                            {
                                probability2Given1 ===
                                null
                                    ? "undefined"
                                    : formatProbability(
                                        probability2Given1
                                    )
                            }
                        </strong>
                    </div>
                </div>
            </div>


            <div
                style={{
                    flex:
                        1,

                    minHeight:
                        0,
                }}
            >
                <Application
                    width={1000}
                    height={600}
                    backgroundColor={
                        0xffffff
                    }
                    antialias
                >
                    <ProbabilityContents
                        probability1={
                            probability1
                        }

                        probability2={
                            probability2
                        }

                        onIntersectionChanged={
                            setIntersection
                        }
                    />
                </Application>
            </div>
        </div>
    );
}
