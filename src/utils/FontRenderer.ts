import { Text, TextStyle } from 'pixi.js';
import { Engine } from '../engine/Engine';

/**
 * FontRenderer — 字体渲染工具
 * 测量、缓存、自动换行
 */
export class FontRenderer {
  private static instance: FontRenderer;
  static getInstance(): FontRenderer {
    if (!FontRenderer.instance) FontRenderer.instance = new FontRenderer();
    return FontRenderer.instance;
  }

  private defaultFont = 'SimHei, Microsoft YaHei, sans-serif';
  private cache = new Map<string, { text: Text; width: number; height: number }>();

  /** 估算文本宽度 */
  measureText(text: string, fontSize: number): number {
    let w = 0;
    for (const ch of text) {
      w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.55;
    }
    return w;
  }

  /** 估算文本行数（给定最大宽度） */
  countLines(text: string, fontSize: number, maxWidth: number): number {
    let lines = 1;
    let lineWidth = 0;
    for (const ch of text) {
      const chW = /[\u4e00-\u9fff]/.test(ch) ? fontSize : fontSize * 0.55;
      if (lineWidth + chW > maxWidth) {
        lines++;
        lineWidth = chW;
      } else {
        lineWidth += chW;
      }
    }
    return lines;
  }

  /** 快速创建文本 */
  quickText(content: string, fontSize: number, color: number | string = 0xffffff): Text {
    return Engine.getInstance().createText(content, fontSize, color);
  }
}
