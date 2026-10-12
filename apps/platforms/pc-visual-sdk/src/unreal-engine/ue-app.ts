// oxlint-disable
//@ts-expect-error
import { webRtcPlayer } from "./web-rtc-player";

let webRtcPlayerObj:
  | {
      video: HTMLVideoElement;
      send: (arg0: any) => void;
      onWebRtcOffer: (offer: any) => void;
      onWebRtcCandidate: (candidate: any) => void;
      onWebRtcAnswer: (answer: any) => void;
      onVideoInitialised: () => void;
      onDataChannelConnected: () => void;
      onConnectionFailed: () => void;
      onNewVideoTrack: (streams: any) => void;
      onDataChannelMessage: (data: any) => void;
      latencyTestTimings: { SetUETimings: (arg0: any) => void; OnAllLatencyTimingsReady: (timings: any) => void };
      aggregateStats: (arg0: number) => void;
      onAggregatedStats: (aggregatedStats: any) => void;
      receiveOffer: (arg0: any) => void;
      receiveAnswer: (arg0: any) => void;
      handleCandidateFromServer: (arg0: any) => void;
      close: () => void;
    }
  | null
  | undefined = null;
let print_stats = false;
let print_inputs = false;
let connect_on_load = false;
let is_reconnection = false;

let ws: WebSocket | undefined = undefined;
const WS_OPEN_STATE = 1;
// Ws 正常连接标志
let ws_connected = false;

let qualityController = false;
// oxlint-disable-next-line
let matchViewportResolution: any;
// TODO: Remove this - workaround because of bug causing UE to crash when switching resolutions too quickly
let lastTimeResized = new Date().getTime();
let resizeTimeout: string | number | NodeJS.Timeout | undefined;

let onDataChannelConnected;
let responseEventListeners = new Map();

let freezeFrameOverlay: {
  classList: { add: (arg0: string) => void };
  style: { display: string; width: string; height: string; left: string; top: string };
} | null = null;
let shouldShowPlayOverlay = true;
let unquantizeAndDenormalizeUnsigned = null;
// A freeze frame is a still JPEG image shown instead of the video.
let freezeFrame = {
  receiving: false,
  size: 0,
  jpeg: undefined,
  height: 0,
  width: 0,
  valid: false,
};

let file = {
  mimetype: "",
  extension: "",
  receiving: false,
  size: 0,
  data: [],
  valid: false,
  timestampStart: undefined,
};

// Optionally detect if the user is not interacting (AFK) and disconnect them.
let afk: {
  enabled: boolean;
  warnTimeout: number;
  closeTimeout: number;
  active: boolean;
  overlay: HTMLDivElement | undefined;
  warnTimer: number | undefined;
  countdown: number;
  countdownTimer: number | undefined;
} = {
  enabled: false, // Set to true to enable the AFK system.
  warnTimeout: 120, // The time to elapse before warning the user they are inactive.
  closeTimeout: 10, // The time after the warning when we disconnect the user.

  active: false, // Whether the AFK system is currently looking for inactivity.
  overlay: undefined, // The UI overlay warning the user that they are inactive.
  warnTimer: undefined, // The timer which waits to show the inactivity warning overlay.
  countdown: 0, // The inactivity warning overlay has a countdown to show time until disconnect.
  countdownTimer: undefined, // The timer used to tick the seconds shown on the inactivity warning overlay.
};

// If the user focuses on a UE4 input widget then we show them a button to open
// The on-screen keyboard. JavaScript security means we can only show the
// On-screen keyboard in response to a user interaction.
let editTextButton = undefined;

// A hidden input text box which is used only for focusing and opening the
// On-screen keyboard.
let hiddenInput: HTMLInputElement | undefined = undefined;

let t0 = Date.now();

function setOverlay(
  htmlClass: string,
  htmlElement?: HTMLDivElement,
  onClickFunction?: { (event: any): void; (arg0: MouseEvent): void } | undefined,
) {
  let videoPlayOverlay = document.getElementById("videoPlayOverlay");
  if (!videoPlayOverlay) {
    let playerDiv = document.getElementById("player");
    videoPlayOverlay = document.createElement("div");
    videoPlayOverlay.id = "videoPlayOverlay";
    videoPlayOverlay.style.left = "0";
    videoPlayOverlay.style.top = "0";
    playerDiv?.appendChild(videoPlayOverlay);
  }

  // Remove existing html child elements so we can add the new one
  while (videoPlayOverlay.lastChild) {
    videoPlayOverlay.removeChild(videoPlayOverlay.lastChild);
  }

  if (htmlElement) {
    videoPlayOverlay.appendChild(htmlElement);
  }

  if (onClickFunction) {
    videoPlayOverlay.addEventListener("click", function onOverlayClick(event) {
      onClickFunction(event);
      videoPlayOverlay.removeEventListener("click", onOverlayClick);
    });
  }

  // Remove existing html classes so we can set the new one
  let cl = videoPlayOverlay.classList;
  for (let i = cl.length - 1; i >= 0; i--) {
    cl.remove(cl[i]);
  }

  videoPlayOverlay.classList.add(htmlClass);
}

function showConnectOverlay(dom: HTMLElement, line: any) {
  let startText = document.createElement("div");
  startText.id = "playButton";
  startText.innerHTML = "点击加载模型";
  startText.style.textAlign = "center";
  startText.style.margin = "20% auto";
  setTimeout(() => {
    connect(dom, line);
    startAfkWarningTimer();
  }, 500);
}

function showTextOverlay(text: string) {
  let textOverlay = document.createElement("div");
  textOverlay.id = "messageOverlay";
  textOverlay.innerHTML = text ? text : "";
  setOverlay("textDisplayState", textOverlay);
}

function playVideoStream() {
  if (webRtcPlayerObj && webRtcPlayerObj.video) {
    webRtcPlayerObj.video.play().catch(function (onRejectedReason) {
      showPlayOverlay();
    });

    requestInitialSettings();
    requestQualityControl();
    showFreezeFrameOverlay();
    hideOverlay();
  } else {
  }
}

function showPlayOverlay() {
  let img = document.createElement("img");
  img.id = "playButton";
  img.src = "/images/Play.png";
  img.alt = "加载中...";
  // SetOverlay('clickableState', img, event => {
  //     PlayVideoStream();
  // });
  setTimeout(() => {
    playVideoStream();
  }, 500);
  shouldShowPlayOverlay = false;
}

function updateAfkOverlayText() {
  if (afk.overlay) {
    afk.overlay.innerHTML =
      "<center>No activity detected<br>Disconnecting in " + afk.countdown + " seconds<br>Click to continue<br></center>";
  }
}

function showAfkOverlay() {
  // Pause the timer while the user is looking at the inactivity warning overlay.
  stopAfkWarningTimer();

  // Show the inactivity warning overlay.
  afk.overlay = document.createElement("div");
  afk.overlay.id = "afkOverlay";
  setOverlay("clickableState", afk.overlay, () => {
    // The user clicked so start the timer again and carry on.
    hideOverlay();
    clearInterval(afk.countdownTimer);
    startAfkWarningTimer();
  });

  afk.countdown = afk.closeTimeout;
  updateAfkOverlayText();

  if (inputOptions.controlScheme == ControlSchemeType.LockedMouse) {
    document.exitPointerLock();
  }

  afk.countdownTimer = setInterval(function countdownTimer() {
    afk.countdown--;
    if (afk.countdown == 0) {
      // The user failed to click so disconnect them.
      hideOverlay();
      ws?.close();
    } else {
      // Update the countdown message.
      updateAfkOverlayText();
    }
  }, 1000) as unknown as number;
}

function hideOverlay() {
  setOverlay("hiddenState");
}

// Start a timer which when elapsed will warn the user they are inactive.
function startAfkWarningTimer() {
  afk.active = afk.enabled;
  resetAfkWarningTimer();
}

// Stop the timer which when elapsed will warn the user they are inactive.
function stopAfkWarningTimer() {
  afk.active = false;
}

// If the user interacts then reset the warning timer.
function resetAfkWarningTimer() {
  if (afk.active) {
    clearTimeout(afk.warnTimer);
    afk.warnTimer = setTimeout(function warnTimer() {
      showAfkOverlay();
    }, afk.warnTimeout * 1000) as unknown as number;
  }
}

// Function createWebRtcOffer() {
//     If (webRtcPlayerObj) {
//         Console.log('Creating offer');
//         ShowTextOverlay('Starting connection to server, please wait');
//         WebRtcPlayerObj.createOffer();
//     } else {
//         Console.log('WebRTC player not setup, cannot create offer');
//         ShowTextOverlay('Unable to setup video');
//     }
// }

function sendInputData(data: ArrayBufferLike) {
  if (webRtcPlayerObj) {
    resetAfkWarningTimer();
    webRtcPlayerObj.send(data);
  }
}

export function addResponseEventListener(name: any, listener: any) {
  responseEventListeners.set(name, listener);
}

// Function removeResponseEventListener(name) {
//     ResponseEventListeners.remove(name);
// }

// Must be kept in sync with PixelStreamingProtocol::EToPlayerMsg C++ enum.
const ToClientMessageType = {
  QualityControlOwnership: 0,
  Response: 1,
  Command: 2,
  FreezeFrame: 3,
  UnfreezeFrame: 4,
  VideoEncoderAvgQP: 5,
  LatencyTest: 6,
  InitialSettings: 7,
  FileExtension: 8,
  FileMimeType: 9,
  FileContents: 10,
};

let VideoEncoderQP: number | string = "N/A";

function setupWebRtcPlayer(htmlElement: HTMLElement, config: any) {
  webRtcPlayerObj = new webRtcPlayer(config);
  //设置自动播放
  webRtcPlayerObj!.video.muted = true;
  htmlElement.appendChild(webRtcPlayerObj!.video);

  webRtcPlayerObj!.onWebRtcOffer = function onWebRtcOffer(offer) {
    if (ws && ws.readyState === WS_OPEN_STATE) {
      let offerStr = JSON.stringify(offer);
      ws.send(offerStr);
    }
  };

  webRtcPlayerObj!.onWebRtcCandidate = function onWebRtcCandidate(candidate) {
    if (ws && ws.readyState === WS_OPEN_STATE) {
      ws.send(
        JSON.stringify({
          type: "iceCandidate",
          candidate: candidate,
        }),
      );
    }
  };

  webRtcPlayerObj!.onWebRtcAnswer = function onWebRtcAnswer(answer) {
    if (ws && ws.readyState === WS_OPEN_STATE) {
      let answerStr = JSON.stringify(answer);
      ws.send(answerStr);
    }
  };

  webRtcPlayerObj!.onVideoInitialised = function onVideoInitialised() {
    if (ws && ws.readyState === WS_OPEN_STATE) {
      resizePlayerStyle();
      playVideoStream();
    }
  };

  webRtcPlayerObj!.onDataChannelConnected = function onDataChannelConnected() {
    if (ws && ws.readyState === WS_OPEN_STATE) {
      // ShowTextOverlay('WebRTC data channel connected... waiting for video');
      // ShowTextOverlay('连接成功，等待接收数据...');
      requestQualityControl();
    }
  };

  webRtcPlayerObj!.onConnectionFailed = function onConnectionFailed() {
    if (ws && ws.readyState === WS_OPEN_STATE) {
      // Ws.close();
      ws.close(1013, "ICE connection failed");
    }
  };

  webRtcPlayerObj!.onNewVideoTrack = function onNewVideoTrack(streams) {
    if (webRtcPlayerObj?.video && webRtcPlayerObj.video.srcObject && webRtcPlayerObj.onVideoInitialised) {
      webRtcPlayerObj.onVideoInitialised();
    }
  };

  webRtcPlayerObj!.onDataChannelMessage = function onDataChannelMessage(data) {
    let view = new Uint8Array(data);
    if (view[0] === ToClientMessageType.QualityControlOwnership) {
      let ownership = view[1] !== 0;
      qualityController = ownership;
    } else if (view[0] === ToClientMessageType.Response) {
      let response = new TextDecoder("utf-16").decode(data.slice(1));
      for (let listener of responseEventListeners.values()) {
        listener(response);
      }
    } else if (view[0] === ToClientMessageType.Command) {
      let commandAsString = new TextDecoder("utf-16").decode(data.slice(1));
      let command = JSON.parse(commandAsString);
      if (command.command === "onScreenKeyboard") {
        // ShowOnScreenKeyboard(command);
      }
    } else if (view[0] === ToClientMessageType.FreezeFrame) {
      // ProcessFreezeFrameMessage(view);
    } else if (view[0] === ToClientMessageType.UnfreezeFrame) {
      // InvalidateFreezeFrameOverlay();
    } else if (view[0] === ToClientMessageType.VideoEncoderAvgQP) {
      VideoEncoderQP = new TextDecoder("utf-16").decode(data.slice(1));
    } else if (view[0] == ToClientMessageType.LatencyTest) {
      let latencyTimingsAsString = new TextDecoder("utf-16").decode(data.slice(1));
      let latencyTimingsFromUE = JSON.parse(latencyTimingsAsString);
      if (webRtcPlayerObj) {
        webRtcPlayerObj.latencyTestTimings.SetUETimings(latencyTimingsFromUE);
      }
    } else if (view[0] == ToClientMessageType.InitialSettings) {
      let settingsString = new TextDecoder("utf-16").decode(data.slice(1));
      let settingsJSON = JSON.parse(settingsString);
    } else if (view[0] == ToClientMessageType.FileExtension) {
      // ProcessFileExtension(view);
    } else if (view[0] == ToClientMessageType.FileMimeType) {
      // ProcessFileMimeType(view);
    } else if (view[0] == ToClientMessageType.FileContents) {
      // ProcessFileContents(view);
    } else {
      // Console.error(`unrecognized data received, packet ID ${view[0]}`);
    }
  };

  registerInputs(webRtcPlayerObj!.video);

  // On a touch device we will need special ways to show the on-screen keyboard.
  if ("ontouchstart" in document.documentElement) {
    createOnScreenKeyboardHelpers(htmlElement as HTMLInputElement);
  }

  //CreateWebRtcOffer();

  return webRtcPlayerObj!.video;
}

function setupStats() {
  webRtcPlayerObj!.aggregateStats(1 * 1000 /*Check every 1 second*/);
  let printInterval = 5 * 60 * 1000; /*Print every 5 minutes*/
  let nextPrintDuration = printInterval;
  webRtcPlayerObj!.onAggregatedStats = (aggregatedStats) => {
    let numberFormat = new Intl.NumberFormat(window.navigator.language, {
      maximumFractionDigits: 0,
    });
    let timeFormat = new Intl.NumberFormat(window.navigator.language, {
      maximumFractionDigits: 0,
      minimumIntegerDigits: 2,
    });

    // Calculate duration of run
    let runTime = (aggregatedStats.timestamp - aggregatedStats.timestampStart) / 1000;
    let timeValues = [];
    let timeDurations = [60, 60];
    for (let timeIndex = 0; timeIndex < timeDurations.length; timeIndex++) {
      timeValues.push(runTime % timeDurations[timeIndex]);
      runTime /= timeDurations[timeIndex];
    }
    timeValues.push(runTime);

    let runTimeSeconds = timeValues[0];
    let runTimeMinutes = Math.floor(timeValues[1]);
    let runTimeHours = Math.floor(timeValues[2]);

    let receivedBytesMeasurement = "B";
    let receivedBytes = aggregatedStats.hasOwnProperty("bytesReceived") ? aggregatedStats.bytesReceived : 0;
    let dataMeasurements = ["kB", "MB", "GB"];
    for (let index = 0; index < dataMeasurements.length; index++) {
      if (receivedBytes < 100 * 1000) {
        break;
      }
      receivedBytes /= 1000;
      receivedBytesMeasurement = dataMeasurements[index];
    }

    // Let qualityStatus = document.getElementById("qualityStatus");

    // "blinks" quality status element for 1 sec by making it transparent, speed = number of blinks
    let blinkQualityStatus = function blinkQualityStatus(speed: number) {
      let iter = speed;
      let opacity = 1; // [0..1]
      let tickId = setInterval(
        function () {
          opacity -= 0.1;
          // Map `opacity` to [-0.5..0.5] range, decrement by 0.2 per step and take `abs` to make it blink: 1 -> 0 -> 1
          // QualityStatus.style = `opacity: ${Math.abs((opacity - 0.5) * 2)}`;
          if (opacity <= 0.1) {
            if (--iter == 0) {
              clearInterval(tickId);
            } else {
              // Next blink
              opacity = 1;
            }
          }
        },
        100 / speed, // Msecs
      );
    };

    const orangeQP = 26;
    const redQP = 35;

    let statsText = "";

    let color = "lime";
    //@ts-expect-error
    if (VideoEncoderQP > redQP) {
      color = "red";
      blinkQualityStatus(2);
      statsText += `<div style="color: ${color}">Very blocky encoding quality</div>`;
      //@ts-expect-error
    } else if (VideoEncoderQP > orangeQP) {
      color = "orange";
      blinkQualityStatus(1);
      statsText += `<div style="color: ${color}">Blocky encoding quality</div>`;
    }

    // QualityStatus.className = `${color}Status`;

    statsText += `<div>Duration: ${timeFormat.format(runTimeHours)}:${timeFormat.format(runTimeMinutes)}:${timeFormat.format(runTimeSeconds)}</div>`;
    statsText += `<div>Video Resolution: ${
      aggregatedStats.hasOwnProperty("frameWidth") &&
      aggregatedStats.frameWidth &&
      aggregatedStats.hasOwnProperty("frameHeight") &&
      aggregatedStats.frameHeight
        ? aggregatedStats.frameWidth + "x" + aggregatedStats.frameHeight
        : "Chrome only"
    }</div>`;
    statsText += `<div>Received (${receivedBytesMeasurement}): ${numberFormat.format(receivedBytes)}</div>`;
    statsText += `<div>Frames Decoded: ${aggregatedStats.hasOwnProperty("framesDecoded") ? numberFormat.format(aggregatedStats.framesDecoded) : "Chrome only"}</div>`;
    statsText += `<div>Packets Lost: ${aggregatedStats.hasOwnProperty("packetsLost") ? numberFormat.format(aggregatedStats.packetsLost) : "Chrome only"}</div>`;
    statsText += `<div>Framerate: ${aggregatedStats.hasOwnProperty("framerate") ? numberFormat.format(aggregatedStats.framerate) : "Chrome only"}</div>`;
    statsText += `<div>Frames dropped: ${aggregatedStats.hasOwnProperty("framesDropped") ? numberFormat.format(aggregatedStats.framesDropped) : "Chrome only"}</div>`;
    statsText += `<div>Net RTT (ms): ${aggregatedStats.hasOwnProperty("currentRoundTripTime") ? numberFormat.format(aggregatedStats.currentRoundTripTime * 1000) : "Can't calculate"}</div>`;
    statsText += `<div>Browser receive to composite (ms): ${aggregatedStats.hasOwnProperty("receiveToCompositeMs") ? numberFormat.format(aggregatedStats.receiveToCompositeMs) : "Chrome only"}</div>`;
    statsText += `<div style="color: ${color}">Bitrate (kbps): ${aggregatedStats.hasOwnProperty("bitrate") ? numberFormat.format(aggregatedStats.bitrate) : "Chrome only"}</div>`;
    statsText += `<div style="color: ${color}">Video Quantization Parameter: ${VideoEncoderQP}</div>`;

    // Let statsDiv = document.getElementById("stats");
    // StatsDiv.innerHTML = statsText;

    if (print_stats) {
      if (aggregatedStats.timestampStart) {
        if (aggregatedStats.timestamp - aggregatedStats.timestampStart > nextPrintDuration) {
          if (ws && ws.readyState === WS_OPEN_STATE) {
            ws.send(
              JSON.stringify({
                type: "stats",
                data: aggregatedStats,
              }),
            );
          }
          nextPrintDuration += printInterval;
        }
      }
    }
  };

  webRtcPlayerObj!.latencyTestTimings.OnAllLatencyTimingsReady = function OnAllLatencyTimingsReady(timings) {
    if (!timings.BrowserReceiptTimeMs) {
      return;
    }

    let latencyExcludingDecode = timings.BrowserReceiptTimeMs - timings.TestStartTimeMs;
    let encodeLatency = timings.UEEncodeMs;
    let uePixelStreamLatency = timings.UECaptureToSendMs;
    let ueTestDuration = timings.UETransmissionTimeMs - timings.UEReceiptTimeMs;
    let networkLatency = latencyExcludingDecode - ueTestDuration;

    //These ones depend on FrameDisplayDeltaTimeMs
    let endToEndLatency = null;
    let browserSideLatency = null;

    if (timings.FrameDisplayDeltaTimeMs && timings.BrowserReceiptTimeMs) {
      endToEndLatency =
        timings.FrameDisplayDeltaTimeMs + networkLatency + (typeof uePixelStreamLatency === "string" ? 0 : uePixelStreamLatency);
      browserSideLatency = timings.FrameDisplayDeltaTimeMs + (latencyExcludingDecode - networkLatency - ueTestDuration);
    }

    let latencyStatsInnerHTML = "";
    latencyStatsInnerHTML += `<div>Net latency RTT (ms): ${networkLatency.toFixed(2)}</div>`;
    latencyStatsInnerHTML += `<div>UE Encode (ms): ${typeof encodeLatency === "string" ? encodeLatency : encodeLatency.toFixed(2)}</div>`;
    latencyStatsInnerHTML += `<div>UE Send to capture (ms): ${typeof uePixelStreamLatency === "string" ? uePixelStreamLatency : uePixelStreamLatency.toFixed(2)}</div>`;
    latencyStatsInnerHTML += `<div>UE probe duration (ms): ${ueTestDuration.toFixed(2)}</div>`;
    latencyStatsInnerHTML +=
      timings.FrameDisplayDeltaTimeMs && timings.BrowserReceiptTimeMs
        ? `<div>Browser composite latency (ms): ${timings.FrameDisplayDeltaTimeMs.toFixed(2)}</div>`
        : "";
    latencyStatsInnerHTML += browserSideLatency ? `<div>Total browser latency (ms): ${browserSideLatency.toFixed(2)}</div>` : "";
    latencyStatsInnerHTML += endToEndLatency ? `<div>Total latency (ms): ${endToEndLatency.toFixed(2)}</div>` : "";
    // Document.getElementById("LatencyStats").innerHTML = latencyStatsInnerHTML;
  };
}

function onWebRtcOffer(webRTCData: any) {
  webRtcPlayerObj!.receiveOffer(webRTCData);
  setupStats();
}

function onWebRtcAnswer(webRTCData: any) {
  webRtcPlayerObj!.receiveAnswer(webRTCData);
  setupStats();
}

function onWebRtcIce(iceCandidate: any) {
  if (webRtcPlayerObj) {
    webRtcPlayerObj.handleCandidateFromServer(iceCandidate);
  }
}

let styleWidth: string | number;
let styleHeight: string | number;
let styleTop;
let styleLeft;
let styleCursor = "default";
let styleAdditional = "";

const ControlSchemeType = {
  // A mouse can lock inside the WebRTC player so the user can simply move the
  // Mouse to control the orientation of the camera. The user presses the
  // Escape key to unlock the mouse.
  LockedMouse: 0,

  // A mouse can hover over the WebRTC player so the user needs to click and
  // Drag to control the orientation of the camera.
  HoveringMouse: 1,
};

let inputOptions = {
  // The control scheme controls the behaviour of the mouse when it interacts
  // With the WebRTC player.
  /**
   * @说明 定义鼠标事件
   * ControlSchemeType.LockedMouse->鼠标点击切换模型鼠标与页面鼠标
   * ControlSchemeType.HoveringMouse->鼠标悬停自动切换
   */
  controlScheme: ControlSchemeType.HoveringMouse,

  // Browser keys are those which are typically used by the browser UI. We
  // Usually want to suppress these to allow, for example, UE4 to show shader
  // Complexity with the F5 key without the web page refreshing.
  suppressBrowserKeys: false,

  // UE4 has a faketouches option which fakes a single finger touch when the
  // User drags with their mouse. We may perform the reverse; a single finger
  // Touch may be converted into a mouse drag UE4 side. This allows a
  // Non-touch application to be controlled partially via a touch device.
  fakeMouseWithTouches: false,
};

function resizePlayerStyleToFillWindow(playerElement: HTMLVideoElement) {
  let videoElement = playerElement.getElementsByTagName("VIDEO") as unknown as HTMLVideoElement;

  // Fill the player display in window, keeping picture's aspect ratio.
  let windowAspectRatio = window.innerHeight / window.innerWidth;
  let playerAspectRatio = playerElement.clientHeight / playerElement.clientWidth;
  // We want to keep the video ratio correct for the video stream
  let videoAspectRatio = videoElement.videoHeight / videoElement.videoWidth;
  if (isNaN(videoAspectRatio)) {
    //Video is not initialised yet so set playerElement to size of window
    styleWidth = window.innerWidth;
    styleHeight = window.innerHeight;
    styleTop = 0;
    styleLeft = 0;
    //@ts-expect-error
    playerElement.style =
      "top: " +
      styleTop +
      "px; left: " +
      styleLeft +
      "px; width: " +
      styleWidth +
      "px; height: " +
      styleHeight +
      "px; cursor: " +
      styleCursor +
      "; " +
      styleAdditional;
  } else if (windowAspectRatio < playerAspectRatio) {
    // Window height is the constraining factor so to keep aspect ratio change width appropriately
    styleWidth = Math.floor(window.innerHeight / videoAspectRatio);
    styleHeight = window.innerHeight;
    styleTop = 0;
    styleLeft = Math.floor((window.innerWidth - styleWidth) * 0.5);
    //Video is now 100% of the playerElement, so set the playerElement style
    //@ts-expect-error
    playerElement.style =
      "top: " +
      styleTop +
      "px; left: " +
      styleLeft +
      "px; width: " +
      styleWidth +
      "px; height: " +
      styleHeight +
      "px; cursor: " +
      styleCursor +
      "; " +
      styleAdditional;
  } else {
    // Window width is the constraining factor so to keep aspect ratio change height appropriately
    styleWidth = window.innerWidth;
    styleHeight = Math.floor(window.innerWidth * videoAspectRatio);
    styleTop = Math.floor((window.innerHeight - styleHeight) * 0.5);
    styleLeft = 0;
    //Video is now 100% of the playerElement, so set the playerElement style
    //@ts-expect-error
    playerElement.style =
      "top: " +
      styleTop +
      "px; left: " +
      styleLeft +
      "px; width: " +
      styleWidth +
      "px; height: " +
      styleHeight +
      "px; cursor: " +
      styleCursor +
      "; " +
      styleAdditional;
  }
}

function resizePlayerStyleToActualSize(playerElement: HTMLDivElement) {
  let videoElement = playerElement.getElementsByTagName("VIDEO") as HTMLCollectionOf<HTMLVideoElement>;

  if (videoElement.length > 0) {
    // Display image in its actual size
    styleWidth = videoElement[0].videoWidth;
    styleHeight = videoElement[0].videoHeight;
    let Top = Math.floor((window.innerHeight - styleHeight) * 0.5);
    let Left = Math.floor((window.innerWidth - styleWidth) * 0.5);
    styleTop = Top > 0 ? Top : 0;
    styleLeft = Left > 0 ? Left : 0;
    //Video is now 100% of the playerElement, so set the playerElement style
    //@ts-expect-error
    playerElement.style =
      "top: " +
      styleTop +
      "px; left: " +
      styleLeft +
      "px; width: " +
      styleWidth +
      "px; height: " +
      styleHeight +
      "px; cursor: " +
      styleCursor +
      "; " +
      styleAdditional;
  }
}

function resizePlayerStyleToArbitrarySize(playerElement: HTMLVideoElement) {
  //Video is now 100% of the playerElement, so set the playerElement style
  //@ts-expect-error
  playerElement.style =
    "top: 0px; left: 0px; width: " + styleWidth + "px; height: " + styleHeight + "px; cursor: " + styleCursor + "; " + styleAdditional;
}

function showFreezeFrameOverlay() {
  if (freezeFrame.valid) {
    freezeFrameOverlay?.classList.add("freezeframeBackground");
    freezeFrameOverlay!.style.display = "block";
  }
}

function resizeFreezeFrameOverlay() {
  if (freezeFrame.width !== 0 && freezeFrame.height !== 0) {
    let displayWidth = 0;
    let displayHeight = 0;
    let displayTop = 0;
    let displayLeft = 0;
    let checkBox = document.getElementById("enlarge-display-to-fill-window-tgl") as HTMLInputElement;
    let playerElement = document.getElementById("player") as HTMLElement;
    if (checkBox !== null && checkBox.checked) {
      // We are fitting video to screen, we care about the screen (window) size
      let windowAspectRatio = window.innerWidth / window.innerHeight;
      let videoAspectRatio = freezeFrame.width / freezeFrame.height;
      if (windowAspectRatio < videoAspectRatio) {
        displayWidth = window.innerWidth;
        displayHeight = Math.floor(window.innerWidth / videoAspectRatio);
        displayTop = Math.floor((window.innerHeight - displayHeight) * 0.5);
        displayLeft = 0;
      } else {
        displayWidth = Math.floor(window.innerHeight * videoAspectRatio);
        displayHeight = window.innerHeight;
        displayTop = 0;
        displayLeft = Math.floor((window.innerWidth - displayWidth) * 0.5);
      }
    } else {
      // Video is coming in at native resolution, we care more about the player size
      let playerAspectRatio = playerElement.offsetWidth / playerElement.offsetHeight;
      let videoAspectRatio = freezeFrame.width / freezeFrame.height;
      if (playerAspectRatio < videoAspectRatio) {
        displayWidth = playerElement.offsetWidth;
        displayHeight = Math.floor(playerElement.offsetWidth / videoAspectRatio);
        displayTop = Math.floor((playerElement.offsetHeight - displayHeight) * 0.5);
        displayLeft = 0;
      } else {
        displayWidth = Math.floor(playerElement.offsetHeight * videoAspectRatio);
        displayHeight = playerElement.offsetHeight;
        displayTop = 0;
        displayLeft = Math.floor((playerElement.offsetWidth - displayWidth) * 0.5);
      }
    }
    let freezeFrameImage = (document.getElementById("freezeFrameOverlay") as HTMLDivElement).childNodes[0] as HTMLDivElement;
    freezeFrameOverlay!.style.width = playerElement.offsetWidth + "px";
    freezeFrameOverlay!.style.height = playerElement.offsetHeight + "px";
    freezeFrameOverlay!.style.left = 0 + "px";
    freezeFrameOverlay!.style.top = 0 + "px";

    freezeFrameImage.style.width = displayWidth + "px";
    freezeFrameImage.style.height = displayHeight + "px";
    freezeFrameImage.style.left = displayLeft + "px";
    freezeFrameImage.style.top = displayTop + "px";
  }
}

function resizePlayerStyle() {
  let playerElement = document.getElementById("player") as HTMLVideoElement;

  if (!playerElement) {
    return;
  }

  updateVideoStreamSize();

  if (playerElement.classList.contains("fixed-size")) {
    setupMouseAndFreezeFrame(playerElement);
    return;
  }

  let checkBox = document.getElementById("enlarge-display-to-fill-window-tgl");
  let windowSmallerThanPlayer = window.innerWidth < playerElement.videoWidth || window.innerHeight < playerElement.videoHeight;
  if (checkBox !== null) {
    //@ts-expect-error
    if (checkBox.checked || windowSmallerThanPlayer) {
      resizePlayerStyleToFillWindow(playerElement);
    } else {
      resizePlayerStyleToActualSize(playerElement as unknown as HTMLDivElement);
    }
  } else {
    resizePlayerStyleToArbitrarySize(playerElement);
  }

  setupMouseAndFreezeFrame(playerElement);
}

function setupMouseAndFreezeFrame(playerElement: HTMLVideoElement) {
  // Calculating and normalizing positions depends on the width and height of
  // The player.
  playerElementClientRect = playerElement.getBoundingClientRect();
  setupNormalizeAndQuantize();
  resizeFreezeFrameOverlay();
}

function updateVideoStreamSize() {
  if (!matchViewportResolution) {
    return;
  }
  let now = new Date().getTime();
  if (now - lastTimeResized > 1000) {
    let playerElement = document.getElementById("player");
    if (!playerElement) {
      return;
    }

    let descriptor = {
      ConsoleCommand: "setres " + playerElement.clientWidth + "x" + playerElement.clientHeight,
    };
    emitCommand(descriptor);
    lastTimeResized = new Date().getTime();
  } else {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateVideoStreamSize, 1000);
  }
}

// Fix for bug in iOS where windowsize is not correct at instance or orientation change
// https://github.com/dimsemenov/PhotoSwipe/issues/1315
let _orientationChangeTimeout;

// Function onOrientationChange(event) {
//     ClearTimeout(_orientationChangeTimeout);
//     _orientationChangeTimeout = setTimeout(function() {
//         ResizePlayerStyle();
//     }, 500);
// }

// Must be kept in sync with PixelStreamingProtocol::EToUE4Msg C++ enum.
const MessageType = {
  /**********************************************************************/

  /*
   * Control Messages. Range = 0..49.
   */
  IFrameRequest: 0,
  RequestQualityControl: 1,
  FpsRequest: 2,
  AverageBitrateRequest: 3,
  StartStreaming: 4,
  StopStreaming: 5,
  LatencyTest: 6,
  RequestInitialSettings: 7,

  /**********************************************************************/

  /*
   * Input Messages. Range = 50..89.
   */

  // Generic Input Messages. Range = 50..59.
  UIInteraction: 50,
  Command: 51,

  // Keyboard Input Message. Range = 60..69.
  KeyDown: 60,
  KeyUp: 61,
  KeyPress: 62,

  // Mouse Input Messages. Range = 70..79.
  MouseEnter: 70,
  MouseLeave: 71,
  MouseDown: 72,
  MouseUp: 73,
  MouseMove: 74,
  MouseWheel: 75,

  // Touch Input Messages. Range = 80..89.
  TouchStart: 80,
  TouchEnd: 81,
  TouchMove: 82,

  // Gamepad Input Messages. Range = 90..99
  GamepadButtonPressed: 90,
  GamepadButtonReleased: 91,
  GamepadAnalog: 92,

  /**************************************************************************/
};

// A generic message has a type and a descriptor.
function emitDescriptor(messageType: number, descriptor: any) {
  // Convert the dscriptor object into a JSON string.
  let descriptorAsString = JSON.stringify(descriptor);

  // Add the UTF-16 JSON string to the array byte buffer, going two bytes at
  // A time.
  let data = new DataView(new ArrayBuffer(1 + 2 + 2 * descriptorAsString.length));
  let byteIdx = 0;
  data.setUint8(byteIdx, messageType);
  byteIdx++;
  data.setUint16(byteIdx, descriptorAsString.length, true);
  byteIdx += 2;
  for (let i = 0; i < descriptorAsString.length; i++) {
    data.setUint16(byteIdx, descriptorAsString.charCodeAt(i), true);
    byteIdx += 2;
  }
  sendInputData(data.buffer);
}

// A UI interation will occur when the user presses a button powered by
// JavaScript as opposed to pressing a button which is part of the pixel
// Streamed UI from the UE4 client.
export function emitUIInteraction(descriptor: any) {
  emitDescriptor(MessageType.UIInteraction, descriptor);
}

// A build-in command can be sent to UE4 client. The commands are defined by a
// JSON descriptor and will be executed automatically.
// The currently supported commands are:
//
// 1. A command to run any console command:
//    "{ ConsoleCommand: <string> }"
//
// 2. A command to change the resolution to the given width and height.
//    "{ Resolution.Width: <value>, Resolution.Height: <value> } }"
//
function emitCommand(descriptor: { ConsoleCommand: string }) {
  emitDescriptor(MessageType.Command, descriptor);
}

function requestInitialSettings() {
  sendInputData(new Uint8Array([MessageType.RequestInitialSettings]).buffer);
}

function requestQualityControl() {
  if (!qualityController) {
    sendInputData(new Uint8Array([MessageType.RequestQualityControl]).buffer);
  }
}

let playerElementClientRect: { left: number; top: number } | undefined = undefined;
let normalizeAndQuantizeUnsigned: ((arg0: number, arg1: number) => any) | undefined = undefined;
let normalizeAndQuantizeSigned: ((arg0: any, arg1: any) => any) | undefined = undefined;

function setupNormalizeAndQuantize() {
  let playerElement = document.getElementById("player");
  let videoElement = playerElement!.getElementsByTagName("video");

  if (playerElement && videoElement.length > 0) {
    let playerAspectRatio = playerElement.clientHeight / playerElement.clientWidth;
    let videoAspectRatio = videoElement[0].videoHeight / videoElement[0].videoWidth;

    // Unsigned XY positions are the ratio (0.0..1.0) along a viewport axis,
    // Quantized into an uint16 (0..65536).
    // Signed XY deltas are the ratio (-1.0..1.0) along a viewport axis,
    // Quantized into an int16 (-32767..32767).
    // This allows the browser viewport and client viewport to have a different
    // Size.
    // Hack: Currently we set an out-of-range position to an extreme (65535)
    // As we can't yet accurately detect mouse enter and leave events
    // Precisely inside a video with an aspect ratio which causes mattes.
    if (playerAspectRatio > videoAspectRatio) {
      if (print_inputs) {
      }
      let ratio = playerAspectRatio / videoAspectRatio;
      // Unsigned.
      normalizeAndQuantizeUnsigned = (x: number, y: number) => {
        let normalizedX = x / playerElement.clientWidth;
        let normalizedY = ratio * (y / playerElement.clientHeight - 0.5) + 0.5;
        if (normalizedX < 0.0 || normalizedX > 1.0 || normalizedY < 0.0 || normalizedY > 1.0) {
          return {
            inRange: false,
            x: 65535,
            y: 65535,
          };
        }
        return {
          inRange: true,
          x: normalizedX * 65536,
          y: normalizedY * 65536,
        };
      };
      unquantizeAndDenormalizeUnsigned = (x: number, y: number) => {
        let normalizedX = x / 65536;
        let normalizedY = (y / 65536 - 0.5) / ratio + 0.5;
        return {
          x: normalizedX * playerElement.clientWidth,
          y: normalizedY * playerElement.clientHeight,
        };
      };
      // Signed.
      normalizeAndQuantizeSigned = (x: number, y: number) => {
        let normalizedX = x / (0.5 * playerElement.clientWidth);
        let normalizedY = (ratio * y) / (0.5 * playerElement.clientHeight);
        return {
          x: normalizedX * 32767,
          y: normalizedY * 32767,
        };
      };
    } else {
      if (print_inputs) {
      }
      let ratio = videoAspectRatio / playerAspectRatio;
      // Unsigned.
      normalizeAndQuantizeUnsigned = (x: number, y: number) => {
        let normalizedX = ratio * (x / playerElement.clientWidth - 0.5) + 0.5;
        let normalizedY = y / playerElement.clientHeight;
        if (normalizedX < 0.0 || normalizedX > 1.0 || normalizedY < 0.0 || normalizedY > 1.0) {
          return {
            inRange: false,
            x: 65535,
            y: 65535,
          };
        }
        return {
          inRange: true,
          x: normalizedX * 65536,
          y: normalizedY * 65536,
        };
      };
      unquantizeAndDenormalizeUnsigned = (x: number, y: number) => {
        let normalizedX = (x / 65536 - 0.5) / ratio + 0.5;
        let normalizedY = y / 65536;
        return {
          x: normalizedX * playerElement.clientWidth,
          y: normalizedY * playerElement.clientHeight,
        };
      };
      // Signed.
      normalizeAndQuantizeSigned = (x: number, y: number) => {
        let normalizedX = (ratio * x) / (0.5 * playerElement.clientWidth);
        let normalizedY = y / (0.5 * playerElement.clientHeight);
        return {
          x: normalizedX * 32767,
          y: normalizedY * 32767,
        };
      };
    }
  }
}

function emitMouseMove(x: number, y: number, deltaX: number, deltaY: number) {
  if (print_inputs) {
  }
  if (normalizeAndQuantizeUnsigned && normalizeAndQuantizeSigned) {
    let coord = normalizeAndQuantizeUnsigned(x, y);
    let delta = normalizeAndQuantizeSigned(deltaX, deltaY);
    let Data = new DataView(new ArrayBuffer(9));
    Data.setUint8(0, MessageType.MouseMove);
    Data.setUint16(1, coord.x, true);
    Data.setUint16(3, coord.y, true);
    Data.setInt16(5, delta.x, true);
    Data.setInt16(7, delta.y, true);
    sendInputData(Data.buffer);
  }
}

function emitMouseDown(button: number, x: number, y: number) {
  if (print_inputs) {
  }
  if (!normalizeAndQuantizeUnsigned) {
    return;
  }
  let coord = normalizeAndQuantizeUnsigned(x, y);
  let Data = new DataView(new ArrayBuffer(6));
  Data.setUint8(0, MessageType.MouseDown);
  Data.setUint8(1, button);
  Data.setUint16(2, coord.x, true);
  Data.setUint16(4, coord.y, true);
  sendInputData(Data.buffer);
}

function emitMouseUp(button: number, x: number, y: number) {
  if (print_inputs) {
  }
  if (!normalizeAndQuantizeUnsigned) {
    return;
  }
  let coord = normalizeAndQuantizeUnsigned(x, y);
  let Data = new DataView(new ArrayBuffer(6));
  Data.setUint8(0, MessageType.MouseUp);
  Data.setUint8(1, button);
  Data.setUint16(2, coord.x, true);
  Data.setUint16(4, coord.y, true);
  sendInputData(Data.buffer);
}

function emitMouseWheel(delta: number, x: number, y: number) {
  if (print_inputs) {
  }
  if (!normalizeAndQuantizeUnsigned) {
    return;
  }
  let coord = normalizeAndQuantizeUnsigned(x, y);
  let Data = new DataView(new ArrayBuffer(7));
  Data.setUint8(0, MessageType.MouseWheel);
  Data.setInt16(1, delta, true);
  Data.setUint16(3, coord.x, true);
  Data.setUint16(5, coord.y, true);
  sendInputData(Data.buffer);
}

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
const MouseButton = {
  MainButton: 0, // Left button.
  AuxiliaryButton: 1, // Wheel button.
  SecondaryButton: 2, // Right button.
  FourthButton: 3, // Browser Back button.
  FifthButton: 4, // Browser Forward button.
};

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
const MouseButtonsMask = {
  PrimaryButton: 1, // Left button.
  SecondaryButton: 2, // Right button.
  AuxiliaryButton: 4, // Wheel button.
  FourthButton: 8, // Browser Back button.
  FifthButton: 16, // Browser Forward button.
};

// If the user has any mouse buttons pressed then release them.
function releaseMouseButtons(buttons: number, x: number, y: number) {
  if (buttons & MouseButtonsMask.PrimaryButton) {
    emitMouseUp(MouseButton.MainButton, x, y);
  }
  if (buttons & MouseButtonsMask.SecondaryButton) {
    emitMouseUp(MouseButton.SecondaryButton, x, y);
  }
  if (buttons & MouseButtonsMask.AuxiliaryButton) {
    emitMouseUp(MouseButton.AuxiliaryButton, x, y);
  }
  if (buttons & MouseButtonsMask.FourthButton) {
    emitMouseUp(MouseButton.FourthButton, x, y);
  }
  if (buttons & MouseButtonsMask.FifthButton) {
    emitMouseUp(MouseButton.FifthButton, x, y);
  }
}

// If the user has any mouse buttons pressed then press them again.
function pressMouseButtons(buttons: number, x: number, y: number) {
  if (buttons & MouseButtonsMask.PrimaryButton) {
    emitMouseDown(MouseButton.MainButton, x, y);
  }
  if (buttons & MouseButtonsMask.SecondaryButton) {
    emitMouseDown(MouseButton.SecondaryButton, x, y);
  }
  if (buttons & MouseButtonsMask.AuxiliaryButton) {
    emitMouseDown(MouseButton.AuxiliaryButton, x, y);
  }
  if (buttons & MouseButtonsMask.FourthButton) {
    emitMouseDown(MouseButton.FourthButton, x, y);
  }
  if (buttons & MouseButtonsMask.FifthButton) {
    emitMouseDown(MouseButton.FifthButton, x, y);
  }
}

function registerInputs(playerElement: HTMLElement) {
  if (!playerElement) {
    return;
  }

  registerMouseEnterAndLeaveEvents(playerElement);
  registerTouchEvents(playerElement);
}

function createOnScreenKeyboardHelpers(htmlElement: HTMLInputElement) {
  if (document.getElementById("hiddenInput") === null) {
    hiddenInput = document.createElement("input");
    hiddenInput.id = "hiddenInput";
    hiddenInput.maxLength = 0;
    htmlElement.appendChild(hiddenInput);
  }

  if (document.getElementById("editTextButton") === null) {
    editTextButton = document.createElement("button");
    editTextButton.id = "editTextButton";
    editTextButton.innerHTML = "edit text";
    htmlElement.appendChild(editTextButton);

    // Hide the 'edit text' button.
    editTextButton.classList.add("hiddenState");

    editTextButton.addEventListener("click", function () {
      // Show the on-screen keyboard.
      hiddenInput!.focus();
    });
  }
}

function registerMouseEnterAndLeaveEvents(playerElement: HTMLElement) {
  playerElement.onmouseenter = function onmouseenter(e: any) {
    if (print_inputs) {
    }
    let Data = new DataView(new ArrayBuffer(1));
    Data.setUint8(0, MessageType.MouseEnter);
    sendInputData(Data.buffer);
    //@ts-expect-error
    playerElement.pressMouseButtons(e);
  };

  playerElement.onmouseleave = function onmouseleave(e: any) {
    if (print_inputs) {
    }
    let Data = new DataView(new ArrayBuffer(1));
    Data.setUint8(0, MessageType.MouseLeave);
    sendInputData(Data.buffer);
    //@ts-expect-error
    playerElement.releaseMouseButtons(e);
  };
}

// A locked mouse works by the user clicking in the browser player and the
// Cursor disappears and is locked. The user moves the cursor and the camera
// Moves, for example. The user presses escape to free the mouse.
function registerLockedMouseEvents(playerElement: HTMLDivElement) {
  //@ts-expect-error
  let x = playerElement.width / 2;
  //@ts-expect-error
  let y = playerElement.height / 2;

  //@ts-expect-error
  playerElement.requestPointerLock = playerElement.requestPointerLock || playerElement.mozRequestPointerLock;
  //@ts-expect-error
  document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

  playerElement.onclick = function onclick() {
    playerElement.requestPointerLock();
  };

  // Respond to lock state change events
  document.addEventListener("pointerlockchange", lockStateChange, false);
  document.addEventListener("mozpointerlockchange", lockStateChange, false);

  function lockStateChange() {
    if (document.pointerLockElement === playerElement) {
      document.addEventListener("mousemove", updatePosition, false);
    } else {
      document.removeEventListener("mousemove", updatePosition, false);
    }
  }

  function updatePosition(e: { movementX: number; movementY: number }) {
    x += e.movementX;
    y += e.movementY;
    //@ts-expect-error
    if (x > styleWidth) {
      //@ts-expect-error
      x -= styleWidth;
    }
    //@ts-expect-error
    if (y > styleHeight) {
      //@ts-expect-error
      y -= styleHeight;
    }
    if (x < 0) {
      //@ts-expect-error
      x = styleWidth + x;
    }
    if (y < 0) {
      //@ts-expect-error
      y = styleHeight - y;
    }
    emitMouseMove(x, y, e.movementX, e.movementY);
  }

  playerElement.onmousedown = function onmousedown(e: { button: any }) {
    emitMouseDown(e.button, x, y);
  };

  playerElement.onmouseup = function onmouseup(e: { button: any }) {
    emitMouseUp(e.button, x, y);
  };
  //@ts-expect-error

  playerElement.onmousewheel = function onmousewheel(e: { wheelDelta: any }) {
    emitMouseWheel(e.wheelDelta, x, y);
  };
  //@ts-expect-error

  playerElement.pressMouseButtons = function (e: { buttons: any }) {
    pressMouseButtons(e.buttons, x, y);
  };
  //@ts-expect-error

  playerElement.releaseMouseButtons = function (e: { buttons: any }) {
    releaseMouseButtons(e.buttons, x, y);
  };
}

// A hovering mouse works by the user clicking the mouse button when they want
// The cursor to have an effect over the video. Otherwise the cursor just
// Passes over the browser.
function registerHoveringMouseEvents(playerElement: {
  play?: () => Promise<any>;
  muted?: boolean;
  srcObject?: any;
  onmousemove?: any;
  onmousedown?: any;
  onmouseup?: any;
  oncontextmenu?: any;
  onmousewheel?: any;
  addEventListener?: any;
  pressMouseButtons?: any;
  releaseMouseButtons?: any;
}) {
  // StyleCursor = 'none'; // We will rely on UE4 client's software cursor.
  styleCursor = "default"; // Showing cursor

  playerElement.onmousemove = function onmousemove(e: {
    offsetX: any;
    offsetY: any;
    movementX: any;
    movementY: any;
    preventDefault: () => void;
  }) {
    emitMouseMove(e.offsetX, e.offsetY, e.movementX, e.movementY);
    e.preventDefault();
  };

  playerElement.onmousedown = function onmousedown(e: { button: any; offsetX: any; offsetY: any; preventDefault: () => void }) {
    emitMouseDown(e.button, e.offsetX, e.offsetY);
    e.preventDefault();
  };

  playerElement.onmouseup = function onmouseup(e: { button: any; offsetX: any; offsetY: any; preventDefault: () => void }) {
    emitMouseUp(e.button, e.offsetX, e.offsetY);
    e.preventDefault();
  };

  // When the context menu is shown then it is safest to release the button
  // Which was pressed when the event happened. This will guarantee we will
  // Get at least one mouse up corresponding to a mouse down event. Otherwise
  // The mouse can get stuck.
  // https://github.com/facebook/react/issues/5531
  playerElement.oncontextmenu = function oncontextmenu(e: { button: any; offsetX: any; offsetY: any; preventDefault: () => void }) {
    emitMouseUp(e.button, e.offsetX, e.offsetY);
    e.preventDefault();
  };

  if ("onmousewheel" in playerElement) {
    playerElement.onmousewheel = function onmousewheel(e: { wheelDelta: any; offsetX: any; offsetY: any; preventDefault: () => void }) {
      emitMouseWheel(e.wheelDelta, e.offsetX, e.offsetY);
      e.preventDefault();
    };
  } else {
    playerElement.addEventListener(
      "DOMMouseScroll",
      function (e: { detail: number; offsetX: any; offsetY: any; preventDefault: () => void }) {
        emitMouseWheel(e.detail * -120, e.offsetX, e.offsetY);
        e.preventDefault();
      },
      false,
    );
  }

  playerElement.pressMouseButtons = function (e: { buttons: any; offsetX: any; offsetY: any }) {
    pressMouseButtons(e.buttons, e.offsetX, e.offsetY);
  };

  playerElement.releaseMouseButtons = function (e: { buttons: any; offsetX: any; offsetY: any }) {
    releaseMouseButtons(e.buttons, e.offsetX, e.offsetY);
  };
}

function registerTouchEvents(playerElement: HTMLElement) {
  // We need to assign a unique identifier to each finger.
  // We do this by mapping each Touch object to the identifier.
  let fingers = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  let fingerIds = {};

  function rememberTouch(touch: { identifier: string | number }) {
    let finger = fingers.pop();
    if (finger === undefined) {
    }
    //@ts-expect-error
    fingerIds[touch.identifier] = finger;
  }

  function forgetTouch(touch: { identifier: string | number }) {
    //@ts-expect-error
    fingers.push(fingerIds[touch.identifier]);
    //@ts-expect-error
    delete fingerIds[touch.identifier];
  }

  function emitTouchData(type: number, touches: string | any[]) {
    let data = new DataView(new ArrayBuffer(2 + 7 * touches.length));
    data.setUint8(0, type);
    data.setUint8(1, touches.length);
    let byte = 2;
    for (let t = 0; t < touches.length; t++) {
      let touch = touches[t];
      let x = touch.clientX - playerElement.offsetLeft;
      let y = touch.clientY - playerElement.offsetTop;
      if (!normalizeAndQuantizeUnsigned) {
        return;
      }
      let coord = normalizeAndQuantizeUnsigned(x, y);
      data.setUint16(byte, coord.x, true);
      byte += 2;
      data.setUint16(byte, coord.y, true);
      byte += 2;
      //@ts-expect-error
      data.setUint8(byte, fingerIds[touch.identifier], true);
      byte += 1;
      //@ts-expect-error
      data.setUint8(byte, 255 * touch.force, true); // Force is between 0.0 and 1.0 so quantize into byte.
      byte += 1;
      //@ts-expect-error
      data.setUint8(byte, coord.inRange ? 1 : 0, true); // Mark the touch as in the player or not
      byte += 1;
    }

    sendInputData(data.buffer);
  }

  if (inputOptions.fakeMouseWithTouches) {
    let finger: { x: any; y: any; id: any } | undefined = undefined;

    //@ts-expect-error
    playerElement.ontouchstart = function ontouchstart(e: { changedTouches: any[]; preventDefault: () => void }) {
      if (finger === undefined) {
        let firstTouch = e.changedTouches[0];
        finger = {
          id: firstTouch.identifier,
          x: firstTouch.clientX - playerElementClientRect!.left,
          y: firstTouch.clientY - playerElementClientRect!.top,
        };
        // Hack: Mouse events require an enter and leave so we just
        // Enter and leave manually with each touch as this event
        // Is not fired with a touch device.
        //@ts-expect-error
        playerElement.onmouseenter(e);
        emitMouseDown(MouseButton.MainButton, finger.x, finger.y);
      }
      e.preventDefault();
    };

    //@ts-expect-error
    playerElement.ontouchend = function ontouchend(e: { changedTouches: string | any[]; preventDefault: () => void }) {
      for (let t = 0; t < e.changedTouches.length; t++) {
        let touch = e.changedTouches[t];
        if (touch.identifier === finger!.id) {
          let x = touch.clientX - playerElementClientRect!.left;
          let y = touch.clientY - playerElementClientRect!.top;
          emitMouseUp(MouseButton.MainButton, x, y);
          // Hack: Manual mouse leave event.
          //@ts-expect-error
          playerElement.onmouseleave(e);
          finger = undefined;
          break;
        }
      }
      e.preventDefault();
    };
    //@ts-expect-error
    playerElement.ontouchmove = function ontouchmove(e: { touches: string | any[]; preventDefault: () => void }) {
      for (let t = 0; t < e.touches.length; t++) {
        let touch = e.touches[t];
        if (touch.identifier === finger!.id) {
          let x = touch.clientX - playerElementClientRect!.left;
          let y = touch.clientY - playerElementClientRect!.top;
          emitMouseMove(x, y, x - finger!.x, y - finger!.y);
          finger!.x = x;
          finger!.y = y;
          break;
        }
      }
      e.preventDefault();
    };
  } else {
    //@ts-expect-error
    playerElement.ontouchstart = function ontouchstart(e: { changedTouches: string | any[]; preventDefault: () => void }) {
      // Assign a unique identifier to each touch.
      for (let t = 0; t < e.changedTouches.length; t++) {
        rememberTouch(e.changedTouches[t]);
      }

      if (print_inputs) {
      }
      emitTouchData(MessageType.TouchStart, e.changedTouches);
      e.preventDefault();
    };

    //@ts-expect-error
    playerElement.ontouchend = function ontouchend(e: { changedTouches: string | any[]; preventDefault: () => void }) {
      if (print_inputs) {
      }
      emitTouchData(MessageType.TouchEnd, e.changedTouches);

      // Re-cycle unique identifiers previously assigned to each touch.
      for (let t = 0; t < e.changedTouches.length; t++) {
        forgetTouch(e.changedTouches[t]);
      }
      e.preventDefault();
    };

    playerElement.ontouchmove = function ontouchmove(e: { touches: any; preventDefault: () => void }) {
      if (print_inputs) {
      }
      emitTouchData(MessageType.TouchMove, e.touches);
      e.preventDefault();
    };
  }
}

// Browser keys do not have a charCode so we only need to test keyCode.
function isKeyCodeBrowserKey(keyCode: number) {
  // Function keys or tab key.
  return (keyCode >= 112 && keyCode <= 123) || keyCode === 9;
}

// Must be kept in sync with JavaScriptKeyCodeToFKey C++ array. The index of the
// Entry in the array is the special key code given below.
const SpecialKeyCodes = {
  BackSpace: 8,
  Shift: 16,
  Control: 17,
  Alt: 18,
  RightShift: 253,
  RightControl: 254,
  RightAlt: 255,
};

// We want to be able to differentiate between left and right versions of some
// Keys.
function getKeyCode(e: KeyboardEvent) {
  if (e.keyCode === SpecialKeyCodes.Shift && e.code === "ShiftRight") {
    return SpecialKeyCodes.RightShift;
  } else if (e.keyCode === SpecialKeyCodes.Control && e.code === "ControlRight") {
    {
      return SpecialKeyCodes.RightControl;
    }
  } else if (e.keyCode === SpecialKeyCodes.Alt && e.code === "AltRight") {
    {
      {
        return SpecialKeyCodes.RightAlt;
      }
    }
  }
  {
    {
      {
        return e.keyCode;
      }
    }
  }
}

function registerKeyboardEvents() {
  document.onkeydown = function onkeydown(e) {
    if (print_inputs) {
    }
    if (e.key != "`" && e.key != ";" && e.key != "'") {
      //@ts-expect-error
      sendInputData(new Uint8Array([MessageType.KeyDown, getKeyCode(e), e.repeat]).buffer);
    }
    // Backspace is not considered a keypress in JavaScript but we need it
    // To be so characters may be deleted in a UE4 text entry field.
    if (e.keyCode === SpecialKeyCodes.BackSpace) {
      //@ts-expect-error
      document.onkeypress({ charCode: SpecialKeyCodes.BackSpace });
    }
    if (inputOptions.suppressBrowserKeys && isKeyCodeBrowserKey(e.keyCode)) {
      e.preventDefault();
    }
  };

  document.onkeyup = function onkeyup(e) {
    if (print_inputs) {
    }
    if (e.key != "`" && e.key != ";" && e.key != "'") {
      sendInputData(new Uint8Array([MessageType.KeyUp, getKeyCode(e)]).buffer);
    }
    if (inputOptions.suppressBrowserKeys && isKeyCodeBrowserKey(e.keyCode)) {
      e.preventDefault();
    }
  };

  document.onkeypress = function onkeypress(e) {
    if (print_inputs) {
    }
    let data = new DataView(new ArrayBuffer(3));
    data.setUint8(0, MessageType.KeyPress);
    data.setUint16(1, e.charCode, true);
    if (e.key != "`" && e.key != ";" && e.key != "'") {
      sendInputData(data.buffer);
    }
  };
}

function start(dom: HTMLElement, line: string) {
  if (!connect_on_load || is_reconnection) {
    showConnectOverlay(dom, line);
    shouldShowPlayOverlay = true;
    resizePlayerStyle();
  } else {
    connect(dom, line);
  }
}

export function connect(dom: HTMLElement, line: string) {
  "use strict";
  // oxlint-disable-next-line
  window.WebSocket = window.WebSocket;
  if (!window.WebSocket) {
    //Alert('Your browser doesn\'t support WebSocket');
    return;
  }
  ws = new WebSocket(line);
  ws.onmessage = function onmessage(event) {
    if (!ws_connected) {
      // 设置连接状态
      ws_connected = true;
      // 发布连接成功事件
      setTimeout(function onmessage() {
        const wsOpenEvent = document.createEvent("Event");
        wsOpenEvent.initEvent("ue_open", true, true);
        document.dispatchEvent(wsOpenEvent);
      }, 200);
    }
    let msg = JSON.parse(event.data);
    if (msg.type === "config") {
      if (navigator.userAgent.includes("UnrealEngine")) {
        dom && dom.remove();
      } else {
        dom && onConfig(dom, msg);
      }
    } else if (msg.type === "playerCount") {
    } else if (msg.type === "offer") {
      onWebRtcOffer(msg);
    } else if (msg.type === "answer") {
      onWebRtcAnswer(msg);
    } else if (msg.type === "iceCandidate") {
      onWebRtcIce(msg.candidate);
    } else if (msg.type === "warning" && msg.warning) {
    } else if (msg.type === "response") {
      for (let listener of responseEventListeners.values()) {
        listener(msg);
      }
    } else {
    }
  };

  ws.onerror = function onerror(event) {};

  ws.onclose = function onclose(event) {
    ws = undefined;
    is_reconnection = true;
    // Websocket断连时不影响webRtc
    // Destroy `webRtcPlayerObj` if any
    let playerDiv = document.getElementById("player");
    if (webRtcPlayerObj) {
      // PlayerDiv!.removeChild(webRtcPlayerObj.video);
      // WebRtcPlayerObj.close();
      // WebRtcPlayerObj = undefined;
    }
    // 发布流送失败事件（streamer失联）
    if (event.code == 1013 && event.reason == "Streamer is not connected") {
      var streamingFailedEvent = document.createEvent("Event");
      streamingFailedEvent.initEvent("streaming_failed", true, true);
      document.dispatchEvent(streamingFailedEvent);
    }
    // 发布流送失败事件（ICE连接失败）
    if (event.code == 1013 && event.reason == "ICE connection failed") {
      var streamingFailedEvent = document.createEvent("Event");
      streamingFailedEvent.initEvent("streaming_failed", true, true);
      document.dispatchEvent(streamingFailedEvent);
    }
    // 设置连接状态
    ws_connected = false;
    // 发布连接失败事件
    const wsCloseEvent = document.createEvent("Event");
    wsCloseEvent.initEvent("ue_close", true, true);
    document.dispatchEvent(wsCloseEvent);
  };
  window.ueWebSocket = ws;
}

// Config data received from WebRTC sender via the Cirrus web server
function onConfig(dom: HTMLElement, config: any) {
  let playerDiv = dom;
  let playerElement = setupWebRtcPlayer(playerDiv, config);
  resizePlayerStyle();
  // RegisterHoveringMouseEvents(playerElement);
  switch (inputOptions.controlScheme) {
    case ControlSchemeType.HoveringMouse:
      registerHoveringMouseEvents(playerElement);
      break;
    case ControlSchemeType.LockedMouse:
      registerLockedMouseEvents(playerElement as unknown as HTMLDivElement);
      break;
    default:
      registerLockedMouseEvents(playerElement as unknown as HTMLDivElement);
      break;
  }
}

export function load(dom: HTMLElement, line: string) {
  if (!line) {
    return;
  }
  if (ws) {
    ws.close();
  }
  registerKeyboardEvents();
  start(dom, line);
}
