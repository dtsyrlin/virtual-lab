import type {
  AtomCounts,
} from "../Objects/Molecule2D";


export type ParsedChemicalEquation = {
  reactants: string[];
  products: string[];
};


function normalizeSubscripts(
  text: string,
) {

  const digits: {
    [character: string]:
      string;
  } = {
    "₀": "0",
    "₁": "1",
    "₂": "2",
    "₃": "3",
    "₄": "4",
    "₅": "5",
    "₆": "6",
    "₇": "7",
    "₈": "8",
    "₉": "9",
  };


  return text.replace(
    /[₀₁₂₃₄₅₆₇₈₉]/g,
    character =>
      digits[character] ??
      character,
  );
}


export function normalizeFormula(
  formula: string,
) {

  return normalizeSubscripts(
    formula,
  )
    .replace(
      /\s+/g,
      "",
    )
    .toUpperCase();
}


export function parseFormula(
  formula: string,
): AtomCounts {

  const normalized =
    normalizeFormula(
      formula,
    );


  if (
    normalized.length === 0
  ) {

    throw new Error(
      "Formula cannot be empty.",
    );
  }


  const atoms:
    AtomCounts = {};


  const tokenPattern =
    /([A-Z])(\d*)/g;


  let lastIndex = 0;

  let match:
    RegExpExecArray | null;


  while (
    (
      match =
        tokenPattern.exec(
          normalized,
        )
    ) !== null
  ) {

    if (
      match.index !==
      lastIndex
    ) {

      throw new Error(
        `Invalid formula: ${formula}`,
      );
    }


    const symbol =
      match[1];


    const count =
      match[2]
        ? Number(
            match[2],
          )
        : 1;


    if (
      !Number.isInteger(
        count,
      ) ||
      count <= 0
    ) {

      throw new Error(
        `Invalid subscript in formula: ${formula}`,
      );
    }


    atoms[symbol] =
      (
        atoms[symbol] ??
        0
      ) +
      count;


    lastIndex =
      tokenPattern.lastIndex;
  }


  if (
    lastIndex !==
    normalized.length
  ) {

    throw new Error(
      `Invalid formula: ${formula}`,
    );
  }


  return atoms;
}


export function parseFormulaList(
  text: string,
): string[] {

  const formulas =
    text
      .split("+")
      .map(
        formula =>
          normalizeFormula(
            formula,
          ),
      )
      .filter(
        formula =>
          formula.length > 0,
      );


  if (
    formulas.length === 0
  ) {

    throw new Error(
      "At least one formula is required.",
    );
  }


  for (
    const formula
    of formulas
  ) {

    parseFormula(
      formula,
    );
  }


  return formulas;
}


export function parseChemicalEquation(
  reactantsText: string,
  productsText: string,
): ParsedChemicalEquation {

  return {
    reactants:
      parseFormulaList(
        reactantsText,
      ),

    products:
      parseFormulaList(
        productsText,
      ),
  };
}
