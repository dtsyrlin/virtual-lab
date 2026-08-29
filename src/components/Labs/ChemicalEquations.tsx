import {
  Application,
} from "@pixi/react";

import {
  memo,
  useCallback,
  useState,
} from "react";

import {
  Graphics,
  Text,
} from "pixi.js";

import {
  Experiment2D,
  useExperiment2D,
} from "./Experiment2D";

import {
  Molecule2D,
} from "../Objects/Molecule2D";

import {
  parseChemicalEquation,
  parseFormula,
} from "../Utils/ChemicalFormulaParser";


type EquationCoefficients = {
  reactants: number[];
  products: number[];
};


type ChemicalEquationContentsProps = {
  reactants: string;
  products: string;

  onCoefficientsChange:
    (
      coefficients:
        EquationCoefficients,
    ) => void;
};


function formatFormula(
  formula: string,
) {

  const parts =
    formula.split(
      /(\d+)/,
    );


  return parts.map(
    (
      part,
      index,
    ) => {

      if (
        /^\d+$/.test(part)
      ) {

        return (
          <sub
            key={index}
          >
            {part}
          </sub>
        );
      }


      return part;
    },
  );
}


function toSubscriptText(
  text: string,
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


  return text.replace(
    /\d/g,
    digit =>
      subscripts[digit] ??
      digit,
  );
}


function formatEquationSide(
  text: string,
  coefficients: number[],
) {

  const formulas =
    text
      .split("+")
      .map(
        formula =>
          formula.trim(),
      )
      .filter(Boolean);


  return formulas.map(
    (
      formula,
      index,
    ) => {

      const coefficient =
        coefficients[index] ??
        0;


      return (
        <span
          key={
            formula +
            index
          }
        >
          {index > 0 &&
            " + "}

          {coefficient > 1 &&
            coefficient}

          {formatFormula(
            formula,
          )}
        </span>
      );
    },
  );
}


const ChemicalEquationContents =
  memo(function ChemicalEquationContents({
    reactants,
    products,
    onCoefficientsChange,
  }: ChemicalEquationContentsProps) {

  useExperiment2D(
    (
      experiment:
        Experiment2D,
    ) => {

      const equation =
        parseChemicalEquation(
          reactants,
          products,
        );


      let nextMoleculeId = 1;


      const factoryY =
        38;

      const factoryGap =
        18;


      const workspaceTop =
        72;

      const workspaceMargin =
        30;

      const balanceGap =
        190;

      const workspaceWidth =
        (
          window.innerWidth -
          workspaceMargin * 2 -
          balanceGap
        ) / 2;

      const workspaceHeight =
        Math.max(
          150,
          Math.min(
            280,
            window.innerHeight -
            workspaceTop -
            90,
          ),
        );


      const leftWorkspaceX =
        workspaceMargin;

      const rightWorkspaceX =
        workspaceMargin +
        workspaceWidth +
        balanceGap;


      const balanceCenterX =
        leftWorkspaceX +
        workspaceWidth +
        balanceGap / 2;


      type Side =
        "reactant" |
        "product";


      type PlacedMolecule = {
        molecule:
          Molecule2D;

        side:
          Side;

        formulaIndex:
          number;
      };


      const placedMolecules:
        PlacedMolecule[] = [];


      const createWorkspace =
        (
          x: number,
          title: string,
        ) => {

          const graphics =
            new Graphics();


          graphics.roundRect(
            x,
            workspaceTop,
            workspaceWidth,
            workspaceHeight,
            10,
          );


          graphics.fill(
            0xf7f7f7,
          );


          graphics.stroke({
            width: 2,
            color: 0x999999,
          });


          experiment.add(
            graphics,
          );


          const label =
            new Text({
              text: title,
              style: {
                fontSize: 18,
                fill: 0x444444,
                fontWeight:
                  "bold",
              },
            });


          label.position.set(
            x + 12,
            workspaceTop + 10,
          );


          experiment.add(
            label,
          );


        };


      createWorkspace(
        leftWorkspaceX,
        "Reactants",
      );


      createWorkspace(
        rightWorkspaceX,
        "Products",
      );


      const positionSide =
        (
          side: Side,
        ) => {

          const sideMolecules =
            placedMolecules.filter(
              placed =>
                placed.side ===
                side,
            );


          const areaX =
            side ===
              "reactant"
              ? leftWorkspaceX
              : rightWorkspaceX;


          const padding = 18;

          const gap = 12;

          const startY =
            workspaceTop + 48;


          let x =
            areaX +
            padding;

          let y =
            startY;

          let rowHeight = 0;


          for (
            const placed
            of sideMolecules
          ) {

            const molecule =
              placed.molecule;


            const width =
              molecule
                .getMoleculeWidth();

            const height =
              molecule
                .getMoleculeHeight();


            if (
              x + width >
              areaX +
                workspaceWidth -
                padding
            ) {

              x =
                areaX +
                padding;

              y +=
                rowHeight +
                gap;

              rowHeight = 0;
            }


            molecule.setPosition(
              x,
              y,
            );


            x +=
              width +
              gap;


            rowHeight =
              Math.max(
                rowHeight,
                height,
              );
          }
        };


      const positionAll =
        () => {

          positionSide(
            "reactant",
          );

          positionSide(
            "product",
          );
        };


      const equationSymbols =
        Array.from(
          new Set(
            [
              ...equation.reactants,
              ...equation.products,
            ].flatMap(
              formula =>
                Object.keys(
                  parseFormula(
                    formula,
                  ),
                ),
            ),
          ),
        );


      type BalanceRow = {
        symbol:
          string;

        leftPlatform:
          Graphics;

        rightPlatform:
          Graphics;

        leftCount:
          Text;

        rightCount:
          Text;

        symbolText:
          Text;

        neutralY:
          number;
      };


      const balanceRows:
        BalanceRow[] = [];


      const platformWidth =
        58;

      const platformHeight =
        5;

      const platformOffset =
        52;

      const balanceStep =
        13;

      const firstBalanceY =
        workspaceTop + 58;

      const balanceRowSpacing =
        86;


      equationSymbols.forEach(
        (
          symbol,
          index,
        ) => {

          const neutralY =
            firstBalanceY +
            index *
              balanceRowSpacing;


          const symbolText =
            new Text({
              text:
                symbol,
              style: {
                fontSize: 23,
                fill: 0x222222,
                fontWeight:
                  "bold",
              },
            });


          symbolText.anchor.set(
            0.5,
          );


          symbolText.position.set(
            balanceCenterX,
            neutralY - 23,
          );


          experiment.add(
            symbolText,
          );


          const leftPlatform =
            new Graphics();


          leftPlatform.roundRect(
            -platformWidth / 2,
            -platformHeight / 2,
            platformWidth,
            platformHeight,
            2,
          );


          leftPlatform.fill(
            0x666666,
          );


          experiment.add(
            leftPlatform,
          );


          const rightPlatform =
            new Graphics();


          rightPlatform.roundRect(
            -platformWidth / 2,
            -platformHeight / 2,
            platformWidth,
            platformHeight,
            2,
          );


          rightPlatform.fill(
            0x666666,
          );


          experiment.add(
            rightPlatform,
          );


          const leftCount =
            new Text({
              text:
                "0",
              style: {
                fontSize: 18,
                fill: 0x222222,
                fontWeight:
                  "bold",
              },
            });


          leftCount.anchor.set(
            0.5,
            1,
          );


          experiment.add(
            leftCount,
          );


          const rightCount =
            new Text({
              text:
                "0",
              style: {
                fontSize: 18,
                fill: 0x222222,
                fontWeight:
                  "bold",
              },
            });


          rightCount.anchor.set(
            0.5,
            1,
          );


          experiment.add(
            rightCount,
          );


          balanceRows.push({
            symbol,
            leftPlatform,
            rightPlatform,
            leftCount,
            rightCount,
            symbolText,
            neutralY,
          });
        },
      );


      const setPlatformPosition =
        (
          platform:
            Graphics,
          countText:
            Text,
          x: number,
          y: number,
          count: number,
        ) => {

          platform.position.set(
            x,
            y,
          );


          countText.text =
            `${count}`;


          countText.position.set(
            x,
            y - 5,
          );
        };


      const updateWorkspaceInfo =
        () => {

          const reactantCounts: {
            [symbol: string]:
              number;
          } = {};


          const productCounts: {
            [symbol: string]:
              number;
          } = {};


          const reactantCoefficients =
            equation.reactants.map(
              () => 0,
            );


          const productCoefficients =
            equation.products.map(
              () => 0,
            );


          for (
            const placed
            of placedMolecules
          ) {

            const counts =
              placed.molecule
                .getAtomCounts();


            const totals =
              placed.side ===
                "reactant"
                ? reactantCounts
                : productCounts;


            for (
              const [
                symbol,
                count,
              ]
              of Object.entries(
                counts,
              )
            ) {

              totals[symbol] =
                (
                  totals[symbol] ??
                  0
                ) +
                count;
            }


            if (
              placed.side ===
                "reactant"
            ) {

              reactantCoefficients[
                placed.formulaIndex
              ] += 1;

            } else {

              productCoefficients[
                placed.formulaIndex
              ] += 1;
            }
          }


          for (
            const row
            of balanceRows
          ) {

            const left =
              reactantCounts[
                row.symbol
              ] ??
              0;


            const right =
              productCounts[
                row.symbol
              ] ??
              0;


            let leftY =
              row.neutralY;

            let rightY =
              row.neutralY;


            if (
              left > right
            ) {

              leftY +=
                balanceStep;

              rightY -=
                balanceStep;

            } else if (
              right > left
            ) {

              leftY -=
                balanceStep;

              rightY +=
                balanceStep;
            }


            setPlatformPosition(
              row.leftPlatform,
              row.leftCount,
              balanceCenterX -
                platformOffset,
              leftY,
              left,
            );


            setPlatformPosition(
              row.rightPlatform,
              row.rightCount,
              balanceCenterX +
                platformOffset,
              rightY,
              right,
            );
          }


          onCoefficientsChange({
            reactants:
              reactantCoefficients,

            products:
              productCoefficients,
          });
        };


      const removePlacedMolecule =
        (
          molecule:
            Molecule2D,
        ) => {

          const index =
            placedMolecules.findIndex(
              placed =>
                placed.molecule ===
                molecule,
            );


          if (
            index >= 0
          ) {

            placedMolecules.splice(
              index,
              1,
            );


            molecule
              .resetAtomColors();


            positionAll();

            updateWorkspaceInfo();
          }
        };


      const placeMolecule =
        (
          molecule:
            Molecule2D,
          side:
            Side,
          formulaIndex:
            number,
        ) => {

          removePlacedMolecule(
            molecule,
          );


          placedMolecules.push({
            molecule,
            side,
            formulaIndex,
          });


          positionAll();

          updateWorkspaceInfo();
        };


      const isInsideWorkspace =
        (
          molecule:
            Molecule2D,
          side:
            Side,
        ) => {

          const x =
            side ===
              "reactant"
              ? leftWorkspaceX
              : rightWorkspaceX;


          const centerX =
            molecule.x +
            molecule
              .getMoleculeWidth() /
              2;


          const centerY =
            molecule.y +
            molecule
              .getMoleculeHeight() /
              2;


          return (
            centerX >= x &&
            centerX <=
              x +
                workspaceWidth &&
            centerY >=
              workspaceTop &&
            centerY <=
              workspaceTop +
                workspaceHeight
          );
        };


      const wirePlacedMolecule =
        (
          molecule:
            Molecule2D,
          side:
            Side,
          formulaIndex:
            number,
        ) => {

          molecule.setOnMoveDragStart(
            () => {

              removePlacedMolecule(
                molecule,
              );


              return true;
            },
          );


          molecule.setOnMoveDragEnd(
            () => {

              if (
                isInsideWorkspace(
                  molecule,
                  side,
                )
              ) {

                placeMolecule(
                  molecule,
                  side,
                  formulaIndex,
                );

                return;
              }


              experiment.remove(
                molecule,
              );


              molecule.destroy({
                children: true,
              });
            },
          );
        };


      const createFactory =
        (
          formula: string,
          x: number,
          y: number,
          side:
            Side,
          formulaIndex:
            number,
        ) => {

          const molecule =
            new Molecule2D({
              id:
                `molecule${nextMoleculeId++}`,
              position: {
                x,
                y,
              },
              formula,
              atoms:
                parseFormula(
                  formula,
                ),
              formulaOnly:
                true,
            });


          experiment.add(
            molecule,
          );


          molecule.setOnMoveDragStart(
            () => {

              createFactory(
                formula,
                x,
                y,
                side,
                formulaIndex,
              );


              wirePlacedMolecule(
                molecule,
                side,
                formulaIndex,
              );


              return true;
            },
          );


          molecule.setOnMoveDragEnd(
            () => {

              if (
                isInsideWorkspace(
                  molecule,
                  side,
                )
              ) {

                placeMolecule(
                  molecule,
                  side,
                  formulaIndex,
                );

                return;
              }


              experiment.remove(
                molecule,
              );


              molecule.destroy({
                children: true,
              });
            },
          );
        };


      const formulaDisplayWidth =
        (
          formula: string,
        ) => {

          return Math.max(
            42,
            formula.length *
              18,
          );
        };


      let reactantFactoryX =
        leftWorkspaceX;


      equation.reactants.forEach(
        (
          formula,
          index,
        ) => {

          createFactory(
            formula,
            reactantFactoryX,
            factoryY,
            "reactant",
            index,
          );


          reactantFactoryX +=
            formulaDisplayWidth(
              formula,
            ) +
            factoryGap;
        },
      );


      let productFactoryX =
        rightWorkspaceX;


      equation.products.forEach(
        (
          formula,
          index,
        ) => {

          createFactory(
            formula,
            productFactoryX,
            factoryY,
            "product",
            index,
          );


          productFactoryX +=
            formulaDisplayWidth(
              formula,
            ) +
            factoryGap;
        },
      );


      updateWorkspaceInfo();
    },
  );


  return null;
});


export default function ChemicalEquations() {

  const [
    reactantsInput,
    setReactantsInput,
  ] =
    useState(
      "H2 + O2",
    );


  const [
    productsInput,
    setProductsInput,
  ] =
    useState(
      "H2O",
    );


  const [
    equation,
    setEquation,
  ] =
    useState<{
      reactants: string;
      products: string;
    } | null>(
      null,
    );


  const [
    coefficients,
    setCoefficients,
  ] =
    useState<
      EquationCoefficients
    >({
      reactants: [],
      products: [],
    });


  const [
    equationVersion,
    setEquationVersion,
  ] =
    useState(
      0,
    );


  const onCoefficientsChange =
    useCallback(
      (
        next:
          EquationCoefficients,
      ) => {

        setCoefficients(
          next,
        );
      },
      [],
    );


  const [
    error,
    setError,
  ] =
    useState(
      "",
    );


  const setChemicalEquation =
    () => {

      const reactants =
        reactantsInput.trim();


      const products =
        productsInput.trim();


      if (
        !reactants ||
        !products
      ) {

        setError(
          "Enter both reactants and products.",
        );

        return;
      }


      try {

        const parsed =
          parseChemicalEquation(
            reactants,
            products,
          );


        setCoefficients({
          reactants:
            parsed.reactants.map(
              () => 0,
            ),

          products:
            parsed.products.map(
              () => 0,
            ),
        });


        const normalizedReactants =
          parsed.reactants.join(
            " + ",
          );


        const normalizedProducts =
          parsed.products.join(
            " + ",
          );


        setReactantsInput(
          toSubscriptText(
            normalizedReactants,
          ),
        );


        setProductsInput(
          toSubscriptText(
            normalizedProducts,
          ),
        );


        setError(
          "",
        );


        setEquation({
          reactants:
            normalizedReactants,

          products:
            normalizedProducts,
        });


        setEquationVersion(
          version =>
            version + 1,
        );

      } catch (
        error
      ) {

        setError(
          error instanceof Error
            ? error.message
            : "Invalid equation.",
        );
      }
    };


  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor:
          "#e8edf2",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "10px 24px 6px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "6px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            width: "calc(100% - 48px)",
          }}
        >
          <input
            value={
              reactantsInput
            }
            onChange={
              event =>
                setReactantsInput(
                  event.target.value,
                )
            }
            onKeyDown={
              event => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  setChemicalEquation();
                }
              }
            }
            placeholder="Reactants"
            style={{
              width: "320px",
              fontSize: "22px",
              padding:
                "10px 12px",
            }}
          />

          <div
            style={{
              fontSize: "30px",
            }}
          >
            →
          </div>

          <input
            value={
              productsInput
            }
            onChange={
              event =>
                setProductsInput(
                  event.target.value,
                )
            }
            onKeyDown={
              event => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  setChemicalEquation();
                }
              }
            }
            placeholder="Products"
            style={{
              width: "320px",
              fontSize: "22px",
              padding:
                "10px 12px",
            }}
          />

          <button
            onClick={
              setChemicalEquation
            }
            style={{
              fontSize: "18px",
              padding:
                "7px 24px",
              cursor: "pointer",
              marginLeft: "8px",
            }}
          >
            Set
          </button>
        </div>



        {error && (
          <div
            style={{
              color: "#b00020",
              fontSize: "15px",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
        }}
      >
        <Application
          resizeTo={window}
          backgroundColor={
            0xe8edf2
          }
          antialias
        >
          {equation && (
            <ChemicalEquationContents
              key={
                equation.reactants +
                "->" +
                equation.products +
                "-" +
                equationVersion
              }
              reactants={
                equation.reactants
              }
              products={
                equation.products
              }
              onCoefficientsChange={
                onCoefficientsChange
              }
            />
          )}
        </Application>
      </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "0px",
            fontSize: "24px",
            width: "auto",
            position: "absolute",
            left: "30px",
            top: "450px",
            zIndex: 2,
          }}
        >
          <span>
            {formatEquationSide(
              equation
                ? equation.reactants
                : reactantsInput,

              equation
                ? coefficients.reactants
                : [],
            )}
          </span>

          <span
            style={{
              position: "relative",
              top: "-3px",
            }}
          >
            →
          </span>

          <span>
            {formatEquationSide(
              equation
                ? equation.products
                : productsInput,

              equation
                ? coefficients.products
                : [],
            )}
          </span>
        </div>
    </div>
  );
}
