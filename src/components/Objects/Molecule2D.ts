import {
  Container,
  Graphics,
  Text,
} from "pixi.js";

import type {
  FederatedPointerEvent,
} from "pixi.js";


type Point2D = {
  x: number;
  y: number;
};


export type AtomCounts = {
  [symbol: string]: number;
};


type Molecule2DOptions = {
  id: string;

  position: Point2D;

  formula: string;

  atoms: AtomCounts;

  atomSize?: number;

  maxAtomsPerRow?: number;

  formulaOnly?: boolean;
};


type AtomView = {
  symbol: string;
  graphics: Graphics;
};


const DEFAULT_ATOM_COLOR =
  0xd9d9d9;


export class Molecule2D extends Container {

  public readonly id: string;

  public readonly formula: string;

  public readonly atoms:
    AtomCounts;


  private atomSize: number;

  private maxAtomsPerRow:
    number;


  private background:
    Graphics;

  private formulaLabel:
    Text;

  private atomViews:
    AtomView[] = [];

/*  private formulaOnly =
    false;
*/

  private moleculeWidth = 0;

  private moleculeHeight = 0;


  private dragging =
    false;

  private dragOffsetX = 0;

  private dragOffsetY = 0;


  private onMoveDragStartCallback?:
    () => boolean | void;

  private onMoveDragEndCallback?:
    () => void;


  constructor(
    options:
      Molecule2DOptions,
  ) {

    super();


    this.id =
      options.id;

    this.formula =
      options.formula;

    this.atoms = {
      ...options.atoms,
    };


    this.atomSize =
      options.atomSize ?? 26;

    this.maxAtomsPerRow =
      options.maxAtomsPerRow ?? 5;


    this.position.set(
      options.position.x,
      options.position.y,
    );


    this.background =
      new Graphics();

    this.addChild(
      this.background,
    );


    this.formulaLabel =
      new Text({
        text:
          this.toSubscriptFormula(
            this.formula,
          ),
        style: {
          fontSize: 26,
          fill: 0x222222,
          fontWeight:
            "bold",
        },
      });


    this.addChild(
      this.formulaLabel,
    );


    this.createAtoms();

    this.layout();


    this.setFormulaOnly(
      options.formulaOnly ??
        false,
    );


    this.eventMode =
      "static";

    this.cursor =
      "grab";


    this.on(
      "pointerdown",
      this.onPointerDown,
    );

    this.on(
      "globalpointermove",
      this.onPointerMove,
    );

    this.on(
      "pointerup",
      this.onPointerUp,
    );

    this.on(
      "pointerupoutside",
      this.onPointerUp,
    );
  }


  private toSubscriptFormula(
    formula: string,
  ) {

    const subscripts: {
      [digit: string]:
        string;
    } = {
      "0": "₀",
      "1": "₁",
      "2": "₂",
      "3": "₃",
      "4": "₄",
      "5": "₅",
      "6": "₆",
      "7": "₇",
      "8": "₈",
      "9": "₉",
    };


    return formula.replace(
      /\d/g,
      digit =>
        subscripts[digit] ??
        digit,
    );
  }


  private createAtoms() {

    for (
      const [
        symbol,
        count,
      ]
      of Object.entries(
        this.atoms,
      )
    ) {

      for (
        let index = 0;
        index < count;
        index++
      ) {

        const atom =
          new Container();


        const graphics =
          new Graphics();


        atom.addChild(
          graphics,
        );


        const label =
          new Text({

            text:
              symbol,

            style: {
              fontSize: 12,
              fill: 0x000000,
              fontWeight:
                "bold",
            },
          });


        label.anchor.set(
          0.5,
        );


        atom.addChild(
          label,
        );


        this.addChild(
          atom,
        );


        this.atomViews.push({
          symbol,
          graphics,
        });


        this.drawAtom(
          graphics,
          DEFAULT_ATOM_COLOR,
        );
      }
    }
  }


  private drawAtom(
    graphics: Graphics,
    color: number,
  ) {

    graphics.clear();


    graphics.circle(
      0,
      0,
      this.atomSize / 2,
    );


    graphics.fill(
      color,
    );


    graphics.stroke({
      width: 2,
      color: 0x333333,
    });
  }


  private layout() {

    this.formulaLabel.visible =
      false;

    this.background.visible =
      true;


    for (
      const atom
      of this.atomViews
    ) {

      if (
        atom.graphics.parent
      ) {

        atom.graphics.parent.visible =
          true;
      }
    }


    const atomCount =
      this.atomViews.length;


    const columns =
      Math.min(
        this.maxAtomsPerRow,
        Math.max(
          1,
          atomCount,
        ),
      );


    const rows =
      Math.max(
        1,
        Math.ceil(
          atomCount /
          columns,
        ),
      );


    const padding = 7;

    const gap = 3;


    const atomsWidth =
      columns *
        this.atomSize +
      (
        columns - 1
      ) *
        gap;


    const atomsHeight =
      rows *
        this.atomSize +
      (
        rows - 1
      ) *
        gap;


    this.moleculeWidth =
      atomsWidth +
      padding * 2;


    this.moleculeHeight =
      atomsHeight +
      padding * 2;


    for (
      let index = 0;
      index < this.atomViews.length;
      index++
    ) {

      const atomView =
        this.atomViews[
          index
        ];


      const atomContainer =
        atomView.graphics.parent!;


      const column =
        index %
        columns;


      const row =
        Math.floor(
          index /
          columns,
        );


      atomContainer.position.set(

        padding +
          this.atomSize / 2 +
          column *
            (
              this.atomSize +
              gap
            ),

        padding +
          this.atomSize / 2 +
          row *
            (
              this.atomSize +
              gap
            ),
      );
    }


    this.background.clear();


    this.background.roundRect(
      0,
      0,
      this.moleculeWidth,
      this.moleculeHeight,
      6,
    );


    this.background.fill(
      0xf5f5f5,
    );


    this.background.stroke({
      width: 2,
      color: 0x777777,
    });
  }


  private onPointerDown =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (
        event.button !== 0 ||
        !this.parent
      ) {

        return;
      }


      const allowDrag =
        this
          .onMoveDragStartCallback
          ?.();


      if (
        allowDrag === false
      ) {

        return;
      }


      const parentPosition =
        this.parent.toLocal(
          event.global,
        );


      this.dragOffsetX =
        parentPosition.x -
        this.x;


      this.dragOffsetY =
        parentPosition.y -
        this.y;


      this.dragging =
        true;


      this.cursor =
        "grabbing";
    };


  private onPointerMove =
    (
      event:
        FederatedPointerEvent,
    ) => {

      if (
        !this.dragging ||
        !this.parent
      ) {

        return;
      }


      const parentPosition =
        this.parent.toLocal(
          event.global,
        );


      this.position.set(

        parentPosition.x -
          this.dragOffsetX,

        parentPosition.y -
          this.dragOffsetY,
      );
    };


  private onPointerUp =
    () => {

      if (
        !this.dragging
      ) {

        return;
      }


      this.dragging =
        false;


      this.cursor =
        "grab";


      this
        .onMoveDragEndCallback
        ?.();
    };


  public setOnMoveDragStart(
    callback:
      () => boolean | void,
  ) {

    this.onMoveDragStartCallback =
      callback;
  }


  public setOnMoveDragEnd(
    callback:
      () => void,
  ) {

    this.onMoveDragEndCallback =
      callback;
  }


  public setFormulaOnly(
    formulaOnly: boolean,
  ) {

/*    this.formulaOnly =
      formulaOnly;
*/

    if (
      formulaOnly
    ) {

      this.background.visible =
        false;

      this.formulaLabel.visible =
        true;


      for (
        const atom
        of this.atomViews
      ) {

        if (
          atom.graphics.parent
        ) {

          atom.graphics.parent.visible =
            false;
        }
      }


      this.formulaLabel.position.set(
        0,
        0,
      );


      this.moleculeWidth =
        this.formulaLabel.width;

      this.moleculeHeight =
        this.formulaLabel.height;

    } else {

      this.layout();
    }
  }


  public setPosition(
    x: number,
    y: number,
  ) {

    this.position.set(
      x,
      y,
    );
  }


  public setAtomColor(
    symbol: string,
    color: number,
  ) {

    for (
      const atom
      of this.atomViews
    ) {

      if (
        atom.symbol ===
        symbol
      ) {

        this.drawAtom(
          atom.graphics,
          color,
        );
      }
    }
  }


  public setAtomColors(
    colors: {
      [symbol: string]:
        number;
    },
  ) {

    for (
      const atom
      of this.atomViews
    ) {

      this.drawAtom(

        atom.graphics,

        colors[
          atom.symbol
        ] ??
          DEFAULT_ATOM_COLOR,
      );
    }
  }


  public resetAtomColors() {

    for (
      const atom
      of this.atomViews
    ) {

      this.drawAtom(
        atom.graphics,
        DEFAULT_ATOM_COLOR,
      );
    }
  }


  public getAtomCounts() {

    return {
      ...this.atoms,
    };
  }


  public getMoleculeWidth() {

    return this.moleculeWidth;
  }


  public getMoleculeHeight() {

    return this.moleculeHeight;
  }
}
