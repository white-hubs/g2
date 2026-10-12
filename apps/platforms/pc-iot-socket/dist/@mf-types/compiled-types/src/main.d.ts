interface Options {
    accessToken: string;
    tenant: number | string;
    terminal: string;
}
interface MessageContent {
    msgType: string;
    eventDataDTO: unknown;
    content: string;
}
export declare class GHIotSocket {
    private readonly options;
    private ws;
    private healthIntervalMsg;
    private lockReconnect;
    private subscriptionID;
    private magLoopTime;
    constructor(options: Options);
    onmessage(callBack: ((messageContent: MessageContent) => void) | undefined): void;
    dispose(): void;
    deviceDetail(params: any): Promise<{
        dataArr: any[];
        deviceInfo: any;
    }>;
    subscribeEvent(msgType: string, params: any): void;
    unsubscribe(): void;
    private initWebSocket;
    private openMsg;
    private reconnect;
    private closeMsg;
    private errorMsg;
}
export {};
//# sourceMappingURL=main.d.ts.map