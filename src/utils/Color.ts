import { rgba, rgbaToHex, type RGBAColor } from '../data/Types';

/** 预定义颜色 */
export const Colors = {
  BLACK: rgbaToHex(rgba(0, 0, 0)),
  WHITE: rgbaToHex(rgba(255, 255, 255)),
  RED: rgbaToHex(rgba(255, 0, 0)),
  GREEN: rgbaToHex(rgba(0, 255, 0)),
  BLUE: rgbaToHex(rgba(0, 0, 255)),
  YELLOW: rgbaToHex(rgba(255, 255, 0)),
  CYAN: rgbaToHex(rgba(0, 255, 255)),
  MAGENTA: rgbaToHex(rgba(255, 0, 255)),
  TRANSPARENT: 0,
  HALF_BLACK: rgbaToHex(rgba(0, 0, 0, 128)),
} as const;

export function blendColors(c1: RGBAColor, c2: RGBAColor, t: number): RGBAColor {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
    a: Math.round(c1.a + (c2.a - c1.a) * t),
  };
}

export function hexToColor(hex: number): number[] {
  return [
    (hex >> 24) & 0xff,
    (hex >> 16) & 0xff,
    (hex >> 8) & 0xff,
    hex & 0xff,
  ];
}
