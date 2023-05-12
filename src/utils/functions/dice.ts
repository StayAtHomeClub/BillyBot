import Canvas, { CanvasRenderingContext2D, Image } from "canvas";
import {  
  DiceFaceData,
  DiceTypes,
  DiceFaces,
  Die,
  PatternFillObject,
  Result,
} from "../types/dice";
import { DiceRoll, Parser } from "rpg-dice-roller";
import { AttachmentBuilder } from "discord.js";
import chroma from "chroma-js";
import generateD6 from "./Dice/generateD6";
import { RollResult } from "rpg-dice-roller/types/results";
import sharp from "sharp";
import { StandardDice } from "rpg-dice-roller/types/dice";

const maxRowLength = 10;
const defaultDiceDimension = 100;
const defaultIconDimension = 25;

const getDiceWidth = (index: number) => defaultDiceDimension * index;

const getDiceHeight = (outerIndex: number, shouldHaveIcon: boolean) =>
  shouldHaveIcon
    ? outerIndex * defaultDiceDimension + outerIndex * defaultIconDimension
    : outerIndex * defaultDiceDimension;

const getCanvasHeight = (paginatedArray: any, shouldHaveIcon: boolean) =>
  shouldHaveIcon
    ? defaultDiceDimension * paginatedArray.length +
      defaultIconDimension * paginatedArray.length
    : defaultDiceDimension * paginatedArray.length;

const getCanvasWidth = (diceArray: any) => {
  const isSingleGroup = diceArray.length === 1;
  const onlyGroupLength = diceArray[0].length;
  const isFirstShorterOrEqualToMax = onlyGroupLength <= maxRowLength;
  const longestDiceGroupIndex = diceArray.reduce(
    (acc: number, cur: Die[], curidx: number, arr: any) =>
      cur.length > arr[acc].length ? curidx : acc,
    0
  );
  const longestGroupLength = diceArray[longestDiceGroupIndex].length;
  const isLongestShorterOrEqualToMax = longestGroupLength <= maxRowLength;

  switch (true) {
    case isSingleGroup && isFirstShorterOrEqualToMax:
      return defaultDiceDimension * onlyGroupLength;
    case isSingleGroup && !isFirstShorterOrEqualToMax:
      return defaultDiceDimension * maxRowLength;
    case !isSingleGroup && isLongestShorterOrEqualToMax:
      return defaultDiceDimension * longestGroupLength;
    case !isSingleGroup && !isLongestShorterOrEqualToMax:
      return defaultDiceDimension * maxRowLength;
    default:
      return defaultDiceDimension * onlyGroupLength;
  }
};

const paginateDiceArray = (diceArray: any): any => {
  const paginateDiceGroup = (diceArray: Die[]) =>
      Array(Math.ceil(diceArray.length / maxRowLength))
      .fill(undefined)
      .map((_, index: number) => index * maxRowLength)
      .map((begin: number) => diceArray.slice(begin, begin + maxRowLength));
    
  const newArray = diceArray.reduce(
      (acc: any, cur: Die[]) =>
      cur.length > maxRowLength
          ? acc.concat(paginateDiceGroup(cur))
          : acc.concat([cur]),
      []
  );

  return newArray;
};

const generateDie = async (
  sides: DiceTypes,
  number: DiceFaces,
  textColor?: string,
  outlineColor?: string,
  solidFill?: string,
  patternFill?: PatternFillObject,
  borderWidth?: string,
  width?: string,
  height?: string
): Promise<Buffer | null> => {
  const props = {
    result: number,
    textColor,
    outlineColor,
    solidFill,
    patternFill,
    borderWidth,
    width,
    height,
  };

  const dice: DiceFaceData = { 6: generateD6(props) };

  const image = dice[sides];

  try {
    const attachment = await sharp(new (Buffer as any).from(image))
      .png()
      .toBuffer();
    return attachment;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const generateLinearGradientFill = (color1: string, color2: string) => {
  const name = "linearGradient";
  return {
    string: `<linearGradient id="${name}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${color1}"/>
            <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>`,
    name,
  };
};

export const generateDiceAttachment = async (diceArray: any): Promise<any> => {
  try {
    const paginatedArray = paginateDiceArray(diceArray);
    const canvasHeight = getCanvasHeight(paginatedArray, false);
    const canvasWidth = getCanvasWidth(paginatedArray);
    const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);

    const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

    const outerPromiseArray = paginatedArray.map(
      (array: Die[], outerIndex: number) =>
        array.map(async (die: Die, index: number) => {
          const toLoad: Buffer | null = await generateDie(
            die.sides,
            die.rolled,
            die.textColor.hex(),
            "#000000",
            undefined,
            generateLinearGradientFill(
            die.color.hex(),
            die.secondaryColor.hex()
          )
        );

        const image: Image = await Canvas.loadImage(toLoad as Buffer);
        const diceWidth = getDiceWidth(index);
        const diceHeight = getDiceHeight(outerIndex, false);

        ctx.drawImage(
          image,
          diceWidth,
          diceHeight,
          defaultDiceDimension,
          defaultDiceDimension
        );
      })
    );

    await Promise.all(outerPromiseArray.map(Promise.all, Promise));

    const attachment: AttachmentBuilder = new AttachmentBuilder(
      canvas.toBuffer("image/png", { compressionLevel: 0 }),
      { name: "currentDice.png" }
    );

    return { attachment, canvas };

  } catch (err) {
    console.error(err);
    return null;
  }
};

export const rollDice = (
  cmd: string,
): any => {
  let diceArray: any = [];
  let groupArray: (
    | Die[]
    | { sides: number; rolled: number; }[]
  )[];
  let resultArray: Result[] | [] = [];

  try {
    const parsedRoll = Parser.parse(cmd);
    const sidesArray = parsedRoll.map((roll: StandardDice) => roll.sides)

    const roll = new DiceRoll(cmd);

    const result: Result = {
      output: roll.output,
      results: roll.total,
    };

    groupArray = roll.rolls.map((rollGroup: any, index: number) =>{
      return rollGroup.rolls.map((currentRoll: RollResult) => {
        const color = chroma('slategray').saturate(3);
        const secondaryColor = chroma('yellow');
        const textColor = chroma("#000000");
        return {
          sides: sidesArray[index],
          rolled: currentRoll.initialValue,
          color,
          secondaryColor,
          textColor,
        };
      })}
    );
    
    diceArray = [...diceArray, ...groupArray];
    resultArray = [...resultArray, result];

    return diceArray;
  } catch (err) {
    console.error(err);
    return [];
  }
};
      