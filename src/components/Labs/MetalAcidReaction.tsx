import { Application, useTick } from "@pixi/react";
import { useRef } from "react";
import { Container, FederatedPointerEvent, Graphics, Text, TextStyle } from "pixi.js";
import { Experiment2D, useExperiment2D } from "./Experiment2D";

const W = 1000;
const H = 600;
const LIQUID_FLOW_ML_S = 14;
const RESERVOIR_CAPACITY_ML = 100;
const MG_CAPACITY_G = 1.200;
const MOLAR_MASS_MG = 24.305;
const MOLAR_VOLUME_H2_ML = 24450;
const SYRINGE_CAPACITY_ML = 20;

type FlowKind = "hcl" | "water" | "mg" | null;

type LabState = {
    hclMl: number;
    waterMl: number;
    mgAddedG: number;
    mgRemainingG: number;
    hclRemainingMol: number;
    h2Mol: number;
    elapsedS: number;
    reactionStarted: boolean;
    ventedVolumeMl: number;
    grainCount: number;
    timerRunning: boolean;
};

function textLabel(text: string, x: number, y: number, size = 14, weight: "normal" | "600" = "normal") {
    const t = new Text({
        text,
        style: new TextStyle({ fontFamily: "Segoe UI", fontSize: size, fontWeight: weight, fill: 0x111111 }),
    });
    t.position.set(x, y);
    return t;
}

class PushButton extends Container {
    private bg = new Graphics();
    private readonly w: number;
    private caption: Text;
    constructor(text: string, x: number, y: number, width: number, onClick: () => void) {
        super();
        this.w = width;
        this.position.set(x, y);
        this.caption = textLabel(text, width / 2, 15, 13, "600");
        this.caption.anchor.set(0.5);
        this.addChild(this.bg, this.caption);
        this.eventMode = "static";
        this.cursor = "pointer";
        this.on("pointerdown", () => { this.draw(true); onClick(); });
        this.on("pointerup", () => this.draw(false));
        this.on("pointerupoutside", () => this.draw(false));
        this.draw(false);
    }
    public setLabel(text: string) {
        this.caption.text = text;
    }

    public setEnabled(enabled: boolean) {
        this.eventMode = enabled ? "static" : "none";
        this.cursor = enabled ? "pointer" : "default";
        this.alpha = enabled ? 1 : 0.35;
        this.draw(false);
    }

    private draw(pressed: boolean) {
        this.bg.clear().roundRect(0, 0, this.w, 30, 6)
            .fill(pressed ? 0xd8d8d8 : 0xf5f5f5)
            .stroke({ width: 1.5, color: 0x777777 });
    }
}

class LiquidReservoir extends Container {
    private liquid = new Graphics();
    private valve = new Graphics();
    private readonly outletY: number;

    constructor(
        title: string,
        subtitle: string,
        x: number,
        y: number,
        outletY: number,
        onOpen: () => void,
        onClose: () => void,
    ) {
        super();
        this.position.set(x, y);
        this.outletY = outletY;
        // Keep reservoir labeling compact so the complete apparatus fits on screen.
        if (title) this.addChild(textLabel(title, 0, 0, 14, "600"));
        if (subtitle) this.addChild(textLabel(subtitle, 0, title ? 19 : 0, title ? 11 : 14, title ? "normal" : "600"));

        const bottleTop = 28;
        const bottleHeight = 135;
        const bottleWidth = 105;
        const bottle = new Graphics().roundRect(0, bottleTop, bottleWidth, bottleHeight, 7)
            .fill({ color: 0xffffff, alpha: 0.28 })
            .stroke({ width: 2, color: 0x555555 });
        this.addChild(bottle, this.liquid);

        // Fine reservoir graduations: minor every 5 mL, longer every 10/20 mL.
        for (let ml = 0; ml <= 100; ml += 5) {
            const yy = bottleTop + bottleHeight - 5 - ml * 1.25;
            const len = ml % 20 === 0 ? 25 : ml % 10 === 0 ? 17 : 9;
            this.addChild(new Graphics().moveTo(bottleWidth - len - 4, yy).lineTo(bottleWidth - 4, yy)
                .stroke({ width: ml % 20 === 0 ? 1.5 : 1, color: 0x555555 }));
            if (ml % 20 === 0) this.addChild(textLabel(String(ml), bottleWidth - 49, yy - 7, 9));
        }

        // Tube: DOWN, then RIGHT. Nothing else.
        const localOutletY = outletY - y;
        const tube = new Graphics().moveTo(52, bottleTop + bottleHeight)
            .lineTo(52, localOutletY)
            .lineTo(145, localOutletY)
            .stroke({ width: 5, color: 0x777777 });
        this.addChild(tube);

        // Valve lies on the horizontal section.
        this.valve.position.set(105, localOutletY);
        this.valve.eventMode = "static";
        this.valve.cursor = "pointer";
        const open = () => { this.drawValve(true); onOpen(); };
        const close = () => { this.drawValve(false); onClose(); };
        this.valve.on("pointerdown", open);
        this.valve.on("pointerup", close);
        this.valve.on("pointerupoutside", close);
        this.valve.on("pointercancel", close);
        this.addChild(this.valve);
        this.drawValve(false);
        this.setRemaining(100);
    }

    private drawValve(open: boolean) {
        this.valve.clear().circle(0, 0, 11)
            .fill(open ? 0xcfcfcf : 0xf5f5f5)
            .stroke({ width: 2, color: 0x444444 });
        this.valve.moveTo(-7, open ? 0 : -7).lineTo(7, open ? 0 : 7).stroke({ width: 2, color: 0x444444 });
    }

    public setRemaining(ml: number) {
        const remaining = Math.max(0, Math.min(100, ml));
        const h = remaining * 1.25;
        this.liquid.clear();
        if (h > 0) {
            this.liquid.rect(4, 158 - h, 97, h)
                .fill({ color: 0x83c8ee, alpha: 0.52 });
        }
    }

    public get connectionPoint() { return { x: this.x + 145, y: this.outletY }; }
}

class MgHopper extends Container {
    private fill = new Graphics();
    private lever = new Graphics();
    private grainCount = 10;
    private remainingG = MG_CAPACITY_G;
    private massText = textLabel("1.200 g", 7, 3, 10, "600");

    constructor(x: number, y: number, onOpen: () => void, onClose: () => void) {
        super();
        this.position.set(x, y);

        this.addChild(textLabel("Mg", 25, -22, 13, "600"));

        const hopper = new Graphics()
            .roundRect(0, 0, 70, 90, 5)
            .fill({ color: 0xffffff, alpha: 0.30 })
            .stroke({ width: 2, color: 0x555555 });
        this.addChild(hopper, this.fill);

        // Show the actual Mg mass remaining instead of graduations.
        this.addChild(this.massText);

        // Narrow chute drops directly through the stopper.
        this.addChild(new Graphics()
            .moveTo(27, 90).lineTo(27, 109)
            .moveTo(43, 90).lineTo(43, 109)
            .stroke({ width: 2, color: 0x555555 }));

        // Lever/gate. Hold it to let Mg fall.
        this.lever.position.set(35, 100);
        this.lever.eventMode = "static";
        this.lever.cursor = "pointer";
        const open = () => { this.drawLever(true); onOpen(); };
        const close = () => { this.drawLever(false); onClose(); };
        this.lever.on("pointerdown", open);
        this.lever.on("pointerup", close);
        this.lever.on("pointerupoutside", close);
        this.lever.on("pointercancel", close);
        this.addChild(this.lever);
        this.drawLever(false);
        this.setRemaining(MG_CAPACITY_G);
    }

    private drawLever(open: boolean) {
        this.lever.clear();
        this.lever.circle(0, 0, 5).fill(0xf5f5f5).stroke({ width: 1.5, color: 0x444444 });
        this.lever.moveTo(0, 0).lineTo(open ? 25 : 30, open ? 9 : -9)
            .stroke({ width: 4, color: 0x666666 });
    }

    public setGrainCount(count: number) {
        this.grainCount = count;
        this.setRemaining(this.remainingG);
    }

    public setRemaining(g: number) {
        this.remainingG = g;
        this.massText.text = `${Math.max(0, g).toFixed(3)} g`;
        const fraction = Math.max(0, Math.min(1, g / MG_CAPACITY_G));
        this.fill.clear();
        if (fraction <= 0) return;

        // Use exactly the same visible radii as the grains in the vessel.
        const grainRadius =
            this.grainCount === 10 ? 5.0 :
            this.grainCount === 20 ? 3.8 :
            this.grainCount === 30 ? 2.8 : 2.0;

        const visibleCount = Math.max(0, Math.round(this.grainCount * fraction));
        // Keep recognizable rows, but add a little jitter so the grains do not
        // look mechanically perfect. One drawn dot is still one actual grain.
        // Pack the rows closely for every grain size.  This is especially
        // important for Fine, where all 40 grains should remain well below
        // the mass readout.
        const xStep = grainRadius * 2 + 0.7;
        const yStep = grainRadius * 2 + 0.5;
        const cols = Math.max(1, Math.floor(56 / xStep));

        for (let i = 0; i < visibleCount; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const jitterX = (((i * 17) % 5) - 2) * 0.15;
            const jitterY = (((i * 23) % 5) - 2) * 0.10;
            const px = 7 + grainRadius + col * xStep + jitterX;
            const py = 83 - grainRadius - row * yStep + jitterY;
            this.fill.circle(px, py, grainRadius).fill(0x85898d);
        }
    }
}

class ReactionFlask extends Container {
    private liquid = new Graphics();
    private liquidMask = new Graphics();
    private bubbles = new Graphics();
    private mg = new Graphics();
    private surfaceY = 211;

    constructor(x: number, y: number) {
        super();
        this.position.set(x, y);

        // Shorter, wider reaction vessel.  Its visual capacity is deliberately
        // mapped to the full 200 mL available from the two liquid reservoirs.
        this.liquidMask
            .moveTo(95, 4).lineTo(95, 65).lineTo(30, 170)
            .quadraticCurveTo(14, 205, 60, 218).lineTo(180, 218)
            .quadraticCurveTo(226, 205, 210, 170).lineTo(145, 65).lineTo(145, 4)
            .closePath().fill(0xffffff);
        this.liquid.mask = this.liquidMask;

        const outline = new Graphics()
            .moveTo(92, 0).lineTo(92, 65).lineTo(26, 169)
            .quadraticCurveTo(10, 210, 58, 223).lineTo(182, 223)
            .quadraticCurveTo(230, 210, 214, 169).lineTo(148, 65).lineTo(148, 0)
            .closePath().fill({ color: 0xffffff, alpha: 0.20 }).stroke({ width: 3, color: 0x444444 });

        const stopper = new Graphics().roundRect(82, -15, 76, 25, 5).fill(0x555555);

        // Black rubber fittings are drawn over the tube ends.  The tubes therefore
        // look as though they actually pass through the rubber into the vessel.
        const ports = new Graphics()
            .roundRect(84, 18, 16, 12, 3).fill(0x111111)   // water inlet at neck
            .roundRect(84, 42, 16, 12, 3).fill(0x111111)   // HCl inlet at neck
            .roundRect(140, 30, 16, 12, 3).fill(0x111111); // gas outlet at neck

        this.addChild(this.liquid, this.liquidMask, this.mg, this.bubbles, outline, ports, stopper);
    }

    public setContents(hclMl: number, waterMl: number, mgG: number, grainCount = 20) {
        const total = Math.min(200, hclMl + waterMl);
        const fraction = Math.max(0, Math.min(1, total / 200));
        // The vessel is wider at the bottom, so equal added volumes initially
        // produce smaller height changes and progressively larger ones higher up.
        const surfaceY = 211 - 154 * Math.pow(fraction, 1.55);
        this.surfaceY = surfaceY;

        this.liquid.clear();
        if (fraction > 0) {
            // A centered horizontal rectangle supplies only the liquid surface/height.
            // The flask-interior mask supplies BOTH side edges, so the liquid
            // cannot develop an independent or skewed vessel shape.
            this.liquid.rect(-20, surfaceY, 280, 225 - surfaceY)
                .fill({ color: 0x83c8ee, alpha: 0.52 });
        }

        this.mg.clear();
        const massPerGrain = MG_CAPACITY_G / grainCount;
        const count = Math.min(grainCount, Math.max(0, Math.round(mgG / massPerGrain)));
        const grainRadius =
            grainCount === 10 ? 5.0 :
            grainCount === 20 ? 3.8 :
            grainCount === 30 ? 2.8 : 2.0;
        for (let i = 0; i < count; i++) {
            // Stable irregular positions along the bottom; one dot is one grain.
            const rx = ((i * 53 + i * i * 17 + grainCount * 5) % 997) / 996;
            const layer = Math.floor(i / 14);
            const x = 55 + grainRadius + rx * (130 - 2 * grainRadius);
            const y = 211 - grainRadius - layer * (grainRadius * 2 + 1) - ((i * 11) % 4);
            this.mg.circle(x, y, grainRadius).fill(0x8a8d90);
        }
    }

    public setBubbles(intensity: number, phase: number) {
        this.bubbles.clear();
        const count = Math.min(22, Math.ceil(intensity * 22));
        const top = Math.max(this.surfaceY + 5, 72);
        const bottom = 207;
        const liquidHeight = Math.max(0, bottom - top);
        if (liquidHeight < 4) return;

        for (let i = 0; i < count; i++) {
            const radius = 2 + (i % 3);
            // Bubbles rise only through liquid.  Their y-position wraps at the
            // liquid surface instead of continuing upward through the headspace.
            const travel = (i * 29 + phase * (18 + i % 4)) % liquidHeight;
            const y = bottom - travel;

            // Keep every bubble safely inside the vessel at its current height.
            // The neck is narrow; the bulb widens progressively below y=65.
            let left = 101;
            let right = 139;
            if (y >= 65 && y < 170) {
                const t = (y - 65) / 105;
                left = 101 - 64 * t;
                right = 139 + 64 * t;
            } else if (y >= 170) {
                left = 43;
                right = 197;
            }
            const span = Math.max(1, right - left - 2 * radius);
            const x = left + radius + ((i * 37 + i * i * 11) % span);
            this.bubbles.circle(x, y, radius).stroke({ width: 1, color: 0x4f9ac5 });
        }
    }
}

class GasSyringe extends Container {
    private piston = new Graphics();
    private externalArm = new Graphics();
    private ventValve = new Graphics();
    private dragging = false;
    private displayedVolumeMl = 0;
    private onVentToVolume?: (volumeMl: number) => void;

    constructor(x: number, y: number, onVentToVolume?: (volumeMl: number) => void) {
        super();
        this.position.set(x, y);
        this.onVentToVolume = onVentToVolume;
        this.addChild(textLabel("Gas syringe", 55, -27, 14, "600"));
        this.addChild(new Graphics().roundRect(0, 0, 205, 64, 8)
            .fill({ color: 0xffffff, alpha: 0.35 }).stroke({ width: 2, color: 0x444444 }));

        // Precision scale: 20 mL total, minor graduations every 1 mL.
        for (let ml = 0; ml <= 20; ml += 1) {
            const xx = 20 + ml * 8;
            const len = ml % 5 === 0 ? 9 : 5;
            this.addChild(new Graphics().moveTo(xx, 0).lineTo(xx, len)
                .stroke({ width: ml % 5 === 0 ? 1.4 : 1, color: 0x333333 }));
            if (ml % 5 === 0) {
                this.addChild(textLabel(String(ml), xx - (ml >= 10 ? 6 : 3), 10, 9));
            }
        }
        this.addChild(textLabel("mL", 181, 27, 9), this.piston, this.externalArm);

        // Vent is above the vessel connection. It is normally closed and opens
        // automatically only while the user is pushing the external plunger arm
        // inward to expel gas. Releasing the arm closes the vent again.
        this.ventValve.position.set(8, -4);
        this.addChild(this.ventValve);
        this.drawVentValve(false);

        // Only the part of the plunger OUTSIDE the syringe is draggable.
        this.externalArm.eventMode = "static";
        this.externalArm.cursor = "grab";
        this.externalArm.on("pointerdown", (event: FederatedPointerEvent) => {
            this.dragging = true;
            this.externalArm.cursor = "grabbing";
            // Grabbing alone does not open the vent. It opens only once the
            // plunger is actually pushed inward to expel gas.
            this.drawVentValve(false);
            event.stopPropagation();
        });
        this.externalArm.on("globalpointermove", (event: FederatedPointerEvent) => {
            if (!this.dragging) return;
            const local = event.getLocalPosition(this);
            // Pushing the outside arm left vents gas. It cannot be pulled right
            // by hand; outward motion comes from gas entering the syringe.
            const before = this.displayedVolumeMl;
            const requested = Math.max(0, Math.min(before, (local.x - 225) / 8));
            if (requested < before - 0.001) {
                this.drawVentValve(true);
                this.setVolume(requested);
                this.onVentToVolume?.(requested);
            } else {
                this.drawVentValve(false);
            }
        });
        const stopDrag = () => {
            this.dragging = false;
            this.externalArm.cursor = "grab";
            this.drawVentValve(false);
        };
        this.externalArm.on("pointerup", stopDrag);
        this.externalArm.on("pointerupoutside", stopDrag);
        this.externalArm.on("pointercancel", stopDrag);
        this.setVolume(0);
    }

    private drawVentValve(open: boolean) {
        this.ventValve.clear()
            // short branch rising from the syringe inlet
            .moveTo(0, 4).lineTo(0, -13)
            .stroke({ width: 5, color: 0x777777 })
            .circle(0, -18, 7)
            .fill(open ? 0xd8d8d8 : 0xf5f5f5)
            .stroke({ width: 1.5, color: 0x333333 })
            .moveTo(0, -18)
            .lineTo(open ? 10 : 0, open ? -28 : -30)
            .stroke({ width: 3, color: 0x444444 });
    }

    public setVolume(ml: number) {
        const volume = Math.max(0, Math.min(SYRINGE_CAPACITY_ML, ml));
        this.displayedVolumeMl = volume;

        // Piston travels 8 px per mL. The exposed plunger arm grows by exactly
        // the same amount, so its thumb flange moves one-for-one with the piston.
        const pistonX = 20 + volume * 8;
        const displacementPx = volume * 8;
        const barrelEndX = 205;
        const baseExternalArmLength = 20;
        const armEndX = barrelEndX + baseExternalArmLength + displacementPx;

        this.piston.clear()
            .rect(pistonX - 4, 2, 8, 60).fill(0x777777)
            // internal part of the plunger rod; visual only, not draggable
            .rect(pistonX, 28, Math.max(0, barrelEndX - pistonX), 9).fill(0x888888);

        this.externalArm.clear()
            // exposed arm is the only grab target
            .rect(barrelEndX, 28, armEndX - barrelEndX, 9).fill(0x888888)
            // thumb/finger flange
            .rect(armEndX - 3, 17, 6, 31).fill(0x777777);
    }
}

function ReactionVesselContents() {
    const stateRef = useRef<LabState | null>(null);
    const flowRef = useRef<FlowKind>(null);
    const hclRef = useRef<LiquidReservoir | null>(null);
    const waterRef = useRef<LiquidReservoir | null>(null);
    const mgRef = useRef<MgHopper | null>(null);
    const flaskRef = useRef<ReactionFlask | null>(null);
    const syringeRef = useRef<GasSyringe | null>(null);
    const timerRef = useRef<Text | null>(null);
    const phaseRef = useRef(0);

    useExperiment2D((experiment: Experiment2D) => {
        const state: LabState = {
            hclMl: 0, waterMl: 0, mgAddedG: 0, mgRemainingG: 0,
            hclRemainingMol: 0, h2Mol: 0, elapsedS: 0, reactionStarted: false, ventedVolumeMl: 0, grainCount: 10, timerRunning: false,
        };
        stateRef.current = state;

        const flaskX = 330;
        const flaskY = 175;
        const waterPortY = flaskY + 24;
        const hclPortY = flaskY + 48;

        const start = (kind: Exclude<FlowKind, null>) => { flowRef.current = kind; };
        const stop = (kind: Exclude<FlowKind, null>) => { if (flowRef.current === kind) flowRef.current = null; };

        // HCl is the leftmost reservoir, so its tube drops farther before turning right.
        // Water turns right sooner. Both terminate exactly at the flask wall.
        const hcl = new LiquidReservoir("", "1.0 M HCl", 25, 15, hclPortY,
            () => start("hcl"), () => stop("hcl"));
        const water = new LiquidReservoir("", "H₂O", 180, 15, waterPortY,
            () => start("water"), () => stop("water"));
        hclRef.current = hcl;
        waterRef.current = water;
        experiment.add(hcl);
        experiment.add(water);

        // Mg sits directly above the stopper and falls vertically through a gate.
        let updateGrainControls = () => {};
        const dispenseOneMgGrain = () => {
            const massPerGrain = MG_CAPACITY_G / state.grainCount;
            const available = MG_CAPACITY_G - state.mgAddedG;
            if (available + 1e-12 < massPerGrain) return;

            state.mgAddedG += massPerGrain;
            state.mgRemainingG += massPerGrain;
            mgRef.current?.setRemaining(MG_CAPACITY_G - state.mgAddedG);
            updateGrainControls();
            flaskRef.current?.setContents(state.hclMl, state.waterMl, state.mgRemainingG, state.grainCount);
        };

        const mg = new MgHopper(flaskX + 85, flaskY - 124,
            dispenseOneMgGrain, () => {});
        mg.setGrainCount(state.grainCount);
        mgRef.current = mg;
        experiment.add(mg);

        // Plumbing is drawn before the flask so the tube ends disappear naturally
        // under the glass outline at the exact wall intersections.
        const plumbing = new Graphics();
        const h = hcl.connectionPoint;
        const w = water.connectionPoint;
        const neckLeftX = flaskX + 92;
        // Each reservoir's horizontal run is a single straight line all the way
        // from its valve section to the corresponding neck fitting.
        plumbing.moveTo(h.x, h.y).lineTo(neckLeftX, h.y)
            .moveTo(w.x, w.y).lineTo(neckLeftX, w.y)
            .stroke({ width: 5, color: 0x777777 });

        // Draw the gas tube before the flask so its left end disappears behind
        // the black rubber outlet fitting, just like the two inlet tubes.
        const gasY = flaskY + 36;
        const gasWallX = flaskX + 148;
        const syringeX = 520;
        // Align the barrel with the neck outlet; this also moves the syringe upward.
        const syringeY = gasY - 32;
        plumbing.moveTo(gasWallX, gasY).lineTo(syringeX, gasY)
            .stroke({ width: 5, color: 0x777777 });
        experiment.add(plumbing);

        const flask = new ReactionFlask(flaskX, flaskY);
        flaskRef.current = flask;
        experiment.add(flask);

        const syringe = new GasSyringe(syringeX, syringeY, (requestedVolumeMl) => {
            const totalGasMl = state.hclMl + state.waterMl + state.h2Mol * MOLAR_VOLUME_H2_ML;
            state.ventedVolumeMl = Math.max(0, totalGasMl - requestedVolumeMl);
        });
        syringeRef.current = syringe;
        experiment.add(syringe);

        const timerPanel = new Container();
        timerPanel.position.set(735, 10);
        timerPanel.addChild(textLabel("Timer", 0, 0, 13, "600"));
        timerPanel.addChild(new Graphics().roundRect(0, 22, 155, 54, 7).fill(0x222222));
        const timer = new Text({ text: "0.00 s", style: { fontFamily: "monospace", fontSize: 27, fill: 0xffffff } });
        timer.anchor.set(0.5); timer.position.set(77, 49); timerPanel.addChild(timer);
        timerRef.current = timer;
        experiment.add(timerPanel);

        const timerButton = new PushButton("START", 742, 92, 65, () => {
            state.timerRunning = !state.timerRunning;
            timerButton.setLabel(state.timerRunning ? "STOP" : "START");
        });
        experiment.add(timerButton);

        experiment.add(new PushButton("RESET", 815, 92, 65, () => {
            flowRef.current = null;
            Object.assign(state, {
                hclMl: 0, waterMl: 0, mgAddedG: 0, mgRemainingG: 0,
                hclRemainingMol: 0, h2Mol: 0, elapsedS: 0, reactionStarted: false,
                ventedVolumeMl: 0, grainCount: state.grainCount, timerRunning: false,
            });
            hcl.setRemaining(100); water.setRemaining(100); mg.setRemaining(MG_CAPACITY_G);
            flask.setContents(0, 0, 0, state.grainCount); flask.setBubbles(0, 0);
            syringe.setVolume(0); timer.text = "0.00 s";
            timerButton.setLabel("START");
            updateGrainControls();
        }));

        // Grain size can be selected only before any Mg has been dispensed.
        const grainPanel = new Container();
        grainPanel.position.set(505, 42); // slightly farther left and up
        grainPanel.addChild(textLabel("Grain Size", 0, 0, 13, "600"));
        const grainButtons: { n: number; button: PushButton }[] = [];
        const redrawGrainButtons = () => {
            const enabled = state.mgAddedG <= 1e-12;
            for (const item of grainButtons) {
                item.button.setEnabled(enabled);
                if (enabled) item.button.alpha = item.n === state.grainCount ? 1 : 0.55;
            }
        };
        updateGrainControls = redrawGrainButtons;
        const grainSizes = [
            { label: "Large", n: 10 },
            { label: "Med", n: 20 },
            { label: "Small", n: 30 },
            { label: "Fine", n: 40 },
        ];
        grainSizes.forEach((item, i) => {
            const button = new PushButton(item.label, i * 48, 22, 44, () => {
                if (state.mgAddedG > 1e-12) return;
                state.grainCount = item.n;
                mg.setGrainCount(item.n);
                redrawGrainButtons();
            });
            grainButtons.push({ n: item.n, button });
            grainPanel.addChild(button);
        });
        redrawGrainButtons();
        experiment.add(grainPanel);
    });

    useTick(ticker => {
        const s = stateRef.current;
        if (!s) return;
        const dt = Math.min(0.04, ticker.deltaMS / 1000);
        phaseRef.current += dt;
        if (s.timerRunning) {
            s.elapsedS += dt;
            if (timerRef.current) timerRef.current.text = `${s.elapsedS.toFixed(2)} s`;
        }

        const flow = flowRef.current;
        if (flow === "hcl" || flow === "water") {
            const used = flow === "hcl" ? s.hclMl : s.waterMl;
            const available = RESERVOIR_CAPACITY_ML - used;
            const delivered = Math.min(LIQUID_FLOW_ML_S * dt, Math.max(0, available));
            if (delivered > 0) {
                if (flow === "hcl") {
                    s.hclMl += delivered;
                    s.hclRemainingMol += delivered / 1000; // 1.0 M stock
                    hclRef.current?.setRemaining(100 - s.hclMl);
                } else {
                    s.waterMl += delivered;
                    waterRef.current?.setRemaining(100 - s.waterMl);
                }
            } else flowRef.current = null;
}

        const liquidMl = s.hclMl + s.waterMl;
        flaskRef.current?.setContents(s.hclMl, s.waterMl, s.mgRemainingG, s.grainCount);

        // Any liquid delivered into the sealed vessel displaces the same volume of gas
        // into the syringe. Reaction-generated hydrogen adds to that displacement.
        const h2Ml = s.h2Mol * MOLAR_VOLUME_H2_ML;
        syringeRef.current?.setVolume(Math.max(0, liquidMl + h2Ml - s.ventedVolumeMl));

        // Recalculate the instantaneous rate every physics step from the current state.
        const totalL = liquidMl / 1000;
        const hclConcentration = totalL > 0 ? s.hclRemainingMol / totalL : 0;
        const mgMol = s.mgRemainingG / MOLAR_MASS_MG;

        if (hclConcentration > 0 && mgMol > 1e-10 && s.hclRemainingMol > 1e-10) {
            s.reactionStarted = true;
            // Surface-area model for equal, geometrically similar Mg grains.
            // At fixed total mass, A_total ∝ N^(1/3).  As Mg dissolves,
            // A_total ∝ M_remaining^(2/3).  Normalize to 0.100 g split into 10 grains.
            const massFraction = Math.max(0, Math.min(1, s.mgRemainingG / MG_CAPACITY_G));
            const grainFactor = Math.cbrt(s.grainCount / 10);
            const surfaceFactor = Math.pow(massFraction, 2 / 3) * grainFactor;
            // Effective rate constant representing a warmer, well-mixed experiment.
            // It changes the time scale only; concentration and Mg surface area
            // still determine the relative reaction rate exactly as before.
            const mgRateMolS = 0.000500 * hclConcentration * surfaceFactor;
            const reactedMgMol = Math.min(mgMol, s.hclRemainingMol / 2, mgRateMolS * dt);
            if (reactedMgMol > 0) {
                s.mgRemainingG -= reactedMgMol * MOLAR_MASS_MG;
                s.hclRemainingMol -= 2 * reactedMgMol;
                s.h2Mol += reactedMgMol;
                flaskRef.current?.setContents(s.hclMl, s.waterMl, s.mgRemainingG, s.grainCount);
                flaskRef.current?.setBubbles(Math.min(1, mgRateMolS / 0.00004), phaseRef.current);
                syringeRef.current?.setVolume(Math.max(0, liquidMl + s.h2Mol * MOLAR_VOLUME_H2_ML - s.ventedVolumeMl));
            }
        } else {
            flaskRef.current?.setBubbles(0, phaseRef.current);
        }
    });

    return null;
}

export default function ReactionVessel() {
    return (
        <Application width={W} height={H} backgroundColor={0xffffff} antialias>
            <ReactionVesselContents />
        </Application>
    );
}
