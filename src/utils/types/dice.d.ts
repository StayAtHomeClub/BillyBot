import chroma from "chroma-js";

export type DiceFaceData = {
  [K in DiceTypes]: string;
};

export type DiceFaces = 6 | 5 | 4 | 3 | 2 | 1 | 0;

export type DiceTypes = 6;

export interface Die {
  sides: DiceTypes;
  rolled: DiceFaces;
  iconSpacing?: number | null;
  color: chroma.Color;
  secondaryColor: chroma.Color;
  textColor: chroma.Color;
}

export type DieGenerator = (
  fill: string,
  outline: string,
  width: number,
  height: number
) => void;

export interface GenerateDieProps {
  result: number;
  textColor?: string;
  outlineColor?: string;
  solidFill?: string;
  patternFill?: PatternFillObject;
  borderWidth?: string;
  width?: string;
  height?: string;
}

export interface PatternFillObject {
  string: string;
  name: string;
}

export interface Result {
  output: string;
  results: number;
}