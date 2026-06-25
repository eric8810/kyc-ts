import { Engine } from '../engine/Engine';

/**
 * BattleNetwork — WebSocket 联机对战
 * 对应 C++ BattleNetwork.cpp
 * 使用 WebSocket 替代 asio TCP
 */
export class BattleNetwork {
  private static instance: BattleNetwork;
  static getInstance(): BattleNetwork {
    if (!BattleNetwork.instance) BattleNetwork.instance = new BattleNetwork();
    return BattleNetwork.instance;
  }

  private ws: WebSocket | null = null;
  private connected = false;
  private messageQueue: any[] = [];
  private handlers: Map<string, (data: any) => void> = new Map();

  /** 连接到服务器 */
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.connected = true;
        this.sendHandshake();
        resolve();
      };

      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));
      this.ws.onclose = () => { this.connected = false; };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const handler = this.handlers.get(data.type);
        if (handler) handler(data.payload);
      };
    });
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  /** 发送握手（版本+武学SHA256验证） */
  private sendHandshake(): void {
    const version = '1.0.0';
    const magicHash = 'default'; // 实际应计算武学数据的SHA256
    this.send({ type: 'handshake', payload: { version, magicHash } });
  }

  /** 发送战斗行动 */
  sendBattleAction(action: {
    type: number;       // 0=移动 1=攻击 2=使用武功 3=使用物品 4=等待
    actorId: number;
    targetX?: number;
    targetY?: number;
    magicId?: number;
    itemId?: number;
  }): void {
    this.send({ type: 'battleAction', payload: action });
  }

  /** 发送角色数据 */
  sendRoleData(roleId: number, roleData: any): void {
    this.send({ type: 'roleData', payload: { roleId, roleData } });
  }

  /** 注册消息处理器 */
  on(type: string, handler: (data: any) => void): void {
    this.handlers.set(type, handler);
  }

  private send(data: any): void {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }

  isConnected(): boolean { return this.connected; }
}
