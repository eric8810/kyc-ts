/**
 * Camera — 相机/视口管理
 */
export class Camera {
  x = 0;
  y = 0;

  /** 设置视口位置 */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /** 跟随目标 */
  follow(targetX: number, targetY: number, tileW: number, tileH: number, screenW: number, screenH: number): void {
    const screenCX = screenW / 2;
    const screenCY = screenH / 2;
    this.x = (targetX - targetY) * tileW / 2 - screenCX;
    this.y = (targetX + targetY) * tileH / 2 - screenCY;
  }

  /**
   * kys-cpp / 原版使用的 45° 等距坐标：
   * x = (mx - my) * TILE_W + centerX
   * y = (mx + my) * TILE_H + centerY
   * 这里的 tileW/tileH 是 18/9 逻辑半宽半高，实际地面贴图通常为 36×18。
   */
  followIso(targetX: number, targetY: number, tileW: number, tileH: number, screenW: number, screenH: number): void {
    const screenCX = screenW / 2;
    const screenCY = screenH / 2;
    this.x = (targetX - targetY) * tileW - screenCX;
    this.y = (targetX + targetY) * tileH - screenCY;
  }
}
