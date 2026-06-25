declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
    (config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
  }
  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    run(sql: string, params?: any[]): void;
    close(): void;
    export(): Uint8Array;
  }
  interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, any>;
    free(): boolean;
  }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
