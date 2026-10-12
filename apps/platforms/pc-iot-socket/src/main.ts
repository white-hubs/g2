import axios from "axios";
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

/** 正常端口重连 Code */
const CLOSE_NORMAL = 1000;

/** 消息订阅持续时间 Code */
const MESSAGE_LINK = 500 * 60;

export class GHIotSocket {
  private readonly options: Options;
  private ws: WebSocket | undefined | null;
  private healthIntervalMsg: string | number | NodeJS.Timeout | undefined;
  private lockReconnect: boolean;
  private subscriptionID!: string;
  private magLoopTime: string | number | NodeJS.Timeout | undefined;
  public constructor(options: Options) {
    if (!options.accessToken) {
      throw new Error("消息通道初始化：accessToken错误");
    }
    if (typeof options.tenant === "undefined") {
      throw new Error("消息通道初始化：tenant错误");
    }
    if (!options.terminal) {
      throw new Error("消息通道初始化：terminal错误");
    }
    this.lockReconnect = false;
    this.options = options;
    this.initWebSocket();
  }

  public onmessage(callBack: ((messageContent: MessageContent) => void) | undefined): void {
    if (this.ws) {
      this.ws.onmessage = (e) => {
        const messageEvent = new CustomEvent("CubeMessageEvent", { detail: e });
        dispatchEvent(messageEvent);
        if (JSON.parse(e.data as unknown as string).msgType === "SUBSCRIBE") {
          this.subscriptionID = JSON.parse(e.data as unknown as string).content;
        }
        callBack?.(JSON.parse(e.data as unknown as string));
      };
    }
  }

  public dispose(): void {
    this.healthIntervalMsg && clearInterval(this.healthIntervalMsg);
    this.ws?.close(CLOSE_NORMAL);
    this.ws = null;
  }

  // 设备-实例-详情

  public async deviceDetail(params: any) {
    return axios({
      url: "/api/iot/north/device/detail",
      method: "get",
      params,
      headers: {
        tenant: this.options.tenant,
        terminal: 10000,
        Authorization: `Bearer ${this.options.accessToken}`,
        "Content-Type": "application/json",
      },
    }).then((res) => {
      const { snapshots, productPropVoList } = res.data;
      const dataArr: any[] | PromiseLike<any[]> = [];
      productPropVoList.forEach(
        (product: {
          precision: number;
          unitName: string;
          propCode: string;
          propName: any;
          dataType: any;
          dataWrite: any;
          dataConstraint: any[];
        }) => {
          const findSnapShot = snapshots.find((shotItem: { key: string; value: string }) => shotItem.key === product.propCode);
          const obj = {
            precision: product.precision,
            attributeCode: product.propCode,
            attributeName: product.propName,
            dataType: product.dataType,
            permission: product.dataWrite ? "READ_WRITE" : "READ",
            valueMin: product.dataConstraint[0],
            valueMax: product.dataConstraint[1],
            attributeKeyValueVos: product.dataConstraint,
            unitName: product.unitName,
            value: findSnapShot ? findSnapShot.value : "",
          };
          dataArr.push(obj);
        },
      );
      snapshots.forEach((item: { key: string; value: string }) => {
        dataArr.forEach((data) => {
          if (item.key === data.attributeCode) {
            data.value = item.value;
          }
        });
      });

      const deviceIdAndPropCode: string[] = [];
      dataArr.forEach((item) => {
        deviceIdAndPropCode.push(`${params.deviceId}.${item.attributeCode}`);
      });

      const param = {
        subscribeTTSWithSecond: MESSAGE_LINK,
        subscribeMsgTypes: [
          {
            key: "DEVICE_PROP",
            val: {
              changeNotify: false,
              deviceIdAndPropCode,
            },
          },
        ],
      };
      // 订阅消息
      this.subscribeEvent("SUBSCRIBE", param);
      this.magLoopTime = setInterval(() => {
        this.subscribeEvent("SUBSCRIBE", param);
      }, MESSAGE_LINK);
      return {
        dataArr,
        deviceInfo: res.data?.data || res.data,
      };
    });
  }

  public subscribeEvent(msgType: string, params: any): void {
    if (msgType === "SUBSCRIBE") {
      this.subscribeEvent("UNSUBSCRIBE", this.subscriptionID);
    }
    const health = {
      msgType,
      content: params,
    };
    if (this.ws?.readyState === 1) {
      this.ws?.send(JSON.stringify(health));
    }
  }

  // 取消订阅
  public unsubscribe() {
    this.subscribeEvent("UNSUBSCRIBE", this.subscriptionID);
    clearInterval(this.magLoopTime);
  }

  private initWebSocket(): void {
    const options = this.options;
    if (this.ws && this.ws.readyState === 1) {
      this.ws.close(CLOSE_NORMAL);
    }
    const websocketUrl = `${location.protocol === "http:" ? "ws" : "wss"}://${location.host}/api/iot/websocket/subscribe`;
    // const websocketUrl = 'ws://192.168.0.243:40201/api/iot/websocket/subscribe'
    const url = `${websocketUrl}?terminal=${options.terminal}&token=${options.accessToken}&tenant=${options.tenant}`;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.openMsg();
    };
    this.ws.onerror = () => {
      this.errorMsg();
    };
    this.ws.onclose = (e) => {
      this.closeMsg(e);
    };
  }

  private openMsg(): void {
    this.healthIntervalMsg && clearInterval(this.healthIntervalMsg);
    // 定时器判断连接状态
    this.healthIntervalMsg = setInterval(() => {
      // 未连接
      if (this.ws?.readyState === 3) {
        return;
      }
      const health = {
        msgType: "HEART_BEAT",
        content: Date.now(),
      };
      this.ws?.send(JSON.stringify(health));
    }, 1000 * 10);
  }

  private reconnect(): void {
    if (this.ws && this.ws.readyState === 0) {
      // 正在连接中
      return;
    }
    if (this.lockReconnect) return;
    this.lockReconnect = true;
    setTimeout(() => {
      this.initWebSocket();
      this.lockReconnect = false;
    }, 5000);
  }

  private closeMsg(e: { code: number }): void {
    this.healthIntervalMsg && clearInterval(this.healthIntervalMsg);
    if (e.code !== CLOSE_NORMAL) {
      this.reconnect();
    }
  }

  private errorMsg(): void {
    this.healthIntervalMsg && clearInterval(this.healthIntervalMsg);
    this.reconnect();
  }
}
