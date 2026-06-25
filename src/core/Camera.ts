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
}
