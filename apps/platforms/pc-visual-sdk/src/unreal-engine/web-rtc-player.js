export function webRtcPlayer(parOptions) {
  parOptions = typeof parOptions !== "undefined" ? parOptions : {};

  const self = this;
  const urlParams = new URLSearchParams(window.location.search);

  //* *********************
  // Config setup
  //* *********************
  this.cfg = typeof parOptions.peerConnectionOptions !== "undefined" ? parOptions.peerConnectionOptions : {};
  this.cfg.sdpSemantics = "unified-plan";
  // this.cfg.rtcAudioJitterBufferMaxPackets = 10;
  // this.cfg.rtcAudioJitterBufferFastAccelerate = true;
  // this.cfg.rtcAudioJitterBufferMinDelayMs = 0;

  // If this is true in Chrome 89+ SDP is sent that is incompatible with UE Pixel Streaming 4.26 and below.
  // However 4.27 Pixel Streaming does not need this set to false as it supports `offerExtmapAllowMixed`.
  // tdlr; uncomment this line for older versions of Pixel Streaming that need Chrome 89+.
  this.cfg.offerExtmapAllowMixed = false;

  this.forceTURN = urlParams.has("ForceTURN");
  if (this.forceTURN) {
    this.cfg.iceTransportPolicy = "relay";
  }

  this.cfg.bundlePolicy = "balanced";
  this.forceMaxBundle = urlParams.has("ForceMaxBundle");
  if (this.forceMaxBundle) {
    this.cfg.bundlePolicy = "max-bundle";
  }

  //* *********************
  // Variables
  //* *********************
  this.pcClient = null;
  this.dcClient = null;
  this.tnClient = null;

  this.sdpConstraints = {
    offerToReceiveAudio: 1, // Note: if you don't need audio you can get improved latency by turning this off.
    offerToReceiveVideo: 1,
    voiceActivityDetection: false,
  };

  // See https://www.w3.org/TR/webrtc/#dom-rtcdatachannelinit for values (this is needed for Firefox to be consistent with Chrome.)
  this.dataChannelOptions = { ordered: true };

  // This is useful if the video/audio needs to autoplay (without user input) as browsers do not allow autoplay non-muted of sound sources without user interaction.
  this.startVideoMuted = typeof parOptions.startVideoMuted !== "undefined" ? parOptions.startVideoMuted : false;
  this.autoPlayAudio = typeof parOptions.autoPlayAudio !== "undefined" ? parOptions.autoPlayAudio : true;

  // To enable mic in browser use SSL/localhost and have ?useMic in the query string.
  this.useMic = urlParams.has("useMic");
  if (!this.useMic) {
  }

  // When ?useMic check for SSL or localhost
  const isLocalhostConnection = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const isHttpsConnection = location.protocol === "https:";
  if (this.useMic && !isLocalhostConnection && !isHttpsConnection) {
    this.useMic = false;
  }

  // Prefer SFU or P2P connection
  this.preferSFU = urlParams.has("preferSFU");

  // Latency tester
  this.latencyTestTimings = {
    TestStartTimeMs: null,
    UEReceiptTimeMs: null,
    UEEncodeMs: null,
    UECaptureToSendMs: null,
    UETransmissionTimeMs: null,
    BrowserReceiptTimeMs: null,
    FrameDisplayDeltaTimeMs: null,
    Reset: function () {
      this.TestStartTimeMs = null;
      this.UEReceiptTimeMs = null;
      this.UEEncodeMs = null;
      this.UECaptureToSendMs = null;
      this.UETransmissionTimeMs = null;
      this.BrowserReceiptTimeMs = null;
      this.FrameDisplayDeltaTimeMs = null;
    },
    SetUETimings: function (UETimings) {
      this.UEReceiptTimeMs = UETimings.ReceiptTimeMs;
      this.UEEncodeMs = UETimings.EncodeMs;
      this.UECaptureToSendMs = UETimings.CaptureToSendMs;
      this.UETransmissionTimeMs = UETimings.TransmissionTimeMs;
      this.BrowserReceiptTimeMs = Date.now();
      this.OnAllLatencyTimingsReady(this);
    },
    SetFrameDisplayDeltaTime: function (DeltaTimeMs) {
      if (this.FrameDisplayDeltaTimeMs == null) {
        this.FrameDisplayDeltaTimeMs = Math.round(DeltaTimeMs);
        this.OnAllLatencyTimingsReady(this);
      }
    },
    OnAllLatencyTimingsReady: function () {},
  };

  //* *********************
  // Functions
  //* *********************

  // Create Video element and expose that as a parameter
  this.createWebRtcVideo = function () {
    const video = document.createElement("video");

    video.id = "streamingVideo";
    video.playsInline = true;
    video.disablepictureinpicture = true;
    video.muted = self.startVideoMuted;

    video.addEventListener(
      "loadedmetadata",
      function () {
        if (self.onVideoInitialised) {
          self.onVideoInitialised();
        }
      },
      true,
    );

    // Check if request video frame callback is supported
    if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
      // The API is supported!

      const onVideoFrameReady = (now, metadata) => {
        if (metadata.receiveTime && metadata.expectedDisplayTime) {
          const receiveToCompositeMs = metadata.presentationTime - metadata.receiveTime;
          self.aggregatedStats.receiveToCompositeMs = receiveToCompositeMs;
        }

        // Re-register the callback to be notified about the next frame.
        video.requestVideoFrameCallback(onVideoFrameReady);
      };

      // Initially register the callback to be notified about the first frame.
      video.requestVideoFrameCallback(onVideoFrameReady);
    }

    return video;
  };

  this.video = this.createWebRtcVideo();
  this.availableVideoStreams = new Map();

  const onsignalingstatechange = function (state) {
    console.info("Signaling state change. |", state.srcElement.signalingState, "|");
  };

  const oniceconnectionstatechange = function (state) {
    console.info("Browser ICE connection |", state.srcElement.iceConnectionState, "|");

    const connectionState = state.srcElement.iceConnectionState;
    if (connectionState === "disconnected" || connectionState === "failed" || connectionState === "closed") {
      if (self.onConnectionFailed) {
        self.onConnectionFailed();
      }
    }
  };

  const onicegatheringstatechange = function (state) {
    console.info("Browser ICE gathering |", state.srcElement.iceGatheringState, "|");
  };

  const handleOnTrack = function (e) {
    if (e.track) {
    }

    if (e.track.kind === "audio") {
      handleOnAudioTrack(e.streams[0]);
    } else if (e.track.kind === "video") {
      for (const s of e.streams) {
        if (!self.availableVideoStreams.has(s.id)) {
          self.availableVideoStreams.set(s.id, s);
        }
      }

      self.video.srcObject = e.streams[0];

      // All tracks are added "muted" by WebRTC/browser and become unmuted when media is being sent
      e.track.onunmute = () => {
        self.video.srcObject = e.streams[0];
        self.onNewVideoTrack(e.streams);
      };
    }
  };

  const handleOnAudioTrack = function (audioMediaStream) {
    if (self.video.srcObject && self.video.srcObject !== audioMediaStream) {
      // create a new audio element
      const audioElem = document.createElement("Audio");
      audioElem.srcObject = audioMediaStream;

      // there is no way to autoplay audio (even muted), so we defer audio until first click
      if (!self.autoPlayAudio) {
        const clickToPlayAudio = function () {
          audioElem.play();
          self.video.removeEventListener("click", clickToPlayAudio);
        };

        self.video.addEventListener("click", clickToPlayAudio);
      } else {
        // we assume the user has clicked somewhere on the page and autoplaying audio will work

        audioElem.play();
      }
    }
  };

  const onDataChannel = function (dataChannelEvent) {
    // This is the primary data channel code path when we are "receiving"
    self.dcClient = dataChannelEvent.channel;
    setupDataChannelCallbacks(self.dcClient);
  };

  const createDataChannel = function (pc, label, options) {
    // This is the primary data channel code path when we are "offering"
    const datachannel = pc.createDataChannel(label, options);
    setupDataChannelCallbacks(datachannel);
    return datachannel;
  };

  const setupDataChannelCallbacks = function (datachannel) {
    try {
      // Inform browser we would like binary data as an ArrayBuffer (FF chooses Blob by default!)
      datachannel.binaryType = "arraybuffer";

      datachannel.onopen = function () {
        if (self.onDataChannelConnected) {
          self.onDataChannelConnected();
        }
      };

      datachannel.onclose = function (e) {};

      datachannel.onmessage = function (e) {
        if (self.onDataChannelMessage) {
          self.onDataChannelMessage(e.data);
        }
      };

      datachannel.onerror = function (e) {};

      return datachannel;
    } catch (e) {
      return null;
    }
  };

  const onicecandidate = function (e) {
    const candidate = e.candidate;
    if (candidate?.candidate) {
      if (self.onWebRtcCandidate) {
        self.onWebRtcCandidate(candidate);
      }
    }
  };

  const handleCreateOffer = function (pc) {
    pc.createOffer(self.sdpConstraints).then(
      function (offer) {
        // Munging is where we modifying the sdp string to set parameters that are not exposed to the browser's WebRTC API
        mungeSDPOffer(offer);

        // Set our munged SDP on the local peer connection so it is "set" and will be send across
        pc.setLocalDescription(offer);
        if (self.onWebRtcOffer) {
          self.onWebRtcOffer(offer);
        }
      },
      function () {},
    );
  };

  const mungeSDPOffer = function (offer) {
    // turn off video-timing sdp sent from browser
    // offer.sdp = offer.sdp.replace("http://www.webrtc.org/experiments/rtp-hdrext/playout-delay", "");

    // this indicate we support stereo (Chrome needs this)
    offer.sdp = offer.sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1;sprop-maxcapturerate=48000");
  };

  const setupPeerConnection = function (pc) {
    // Setup peerConnection events
    pc.onsignalingstatechange = onsignalingstatechange;
    pc.oniceconnectionstatechange = oniceconnectionstatechange;
    pc.onicegatheringstatechange = onicegatheringstatechange;

    pc.ontrack = handleOnTrack;
    pc.onicecandidate = onicecandidate;
    pc.ondatachannel = onDataChannel;
  };

  const generateAggregatedStatsFunction = function () {
    if (!self.aggregatedStats) {
      self.aggregatedStats = {};
    }

    return function (stats) {
      const newStat = {};

      stats.forEach((stat) => {
        if (stat.type === "inbound-rtp" && !stat.isRemote && (stat.mediaType === "video" || stat.id.toLowerCase().includes("video"))) {
          newStat.timestamp = stat.timestamp;
          newStat.bytesReceived = stat.bytesReceived;
          newStat.framesDecoded = stat.framesDecoded;
          newStat.packetsLost = stat.packetsLost;
          newStat.bytesReceivedStart = self.aggregatedStats?.bytesReceivedStart
            ? self.aggregatedStats.bytesReceivedStart
            : stat.bytesReceived;
          newStat.framesDecodedStart = self.aggregatedStats?.framesDecodedStart
            ? self.aggregatedStats.framesDecodedStart
            : stat.framesDecoded;
          newStat.timestampStart = self.aggregatedStats?.timestampStart ? self.aggregatedStats.timestampStart : stat.timestamp;

          if (self.aggregatedStats?.timestamp) {
            if (self.aggregatedStats.bytesReceived) {
              // bitrate = bits received since last time / number of ms since last time
              // This is automatically in kbits (where k=1000) since time is in ms and stat we want is in seconds (so a '* 1000' then a '/ 1000' would negate each other)
              newStat.bitrate =
                (8 * (newStat.bytesReceived - self.aggregatedStats.bytesReceived)) / (newStat.timestamp - self.aggregatedStats.timestamp);
              newStat.bitrate = Math.floor(newStat.bitrate);
              newStat.lowBitrate =
                self.aggregatedStats.lowBitrate && self.aggregatedStats.lowBitrate < newStat.bitrate
                  ? self.aggregatedStats.lowBitrate
                  : newStat.bitrate;
              newStat.highBitrate =
                self.aggregatedStats.highBitrate && self.aggregatedStats.highBitrate > newStat.bitrate
                  ? self.aggregatedStats.highBitrate
                  : newStat.bitrate;
            }

            if (self.aggregatedStats.bytesReceivedStart) {
              newStat.avgBitrate =
                (8 * (newStat.bytesReceived - self.aggregatedStats.bytesReceivedStart)) /
                (newStat.timestamp - self.aggregatedStats.timestampStart);
              newStat.avgBitrate = Math.floor(newStat.avgBitrate);
            }

            if (self.aggregatedStats.framesDecoded) {
              // framerate = frames decoded since last time / number of seconds since last time
              newStat.framerate =
                (newStat.framesDecoded - self.aggregatedStats.framesDecoded) /
                ((newStat.timestamp - self.aggregatedStats.timestamp) / 1000);
              newStat.framerate = Math.floor(newStat.framerate);
              newStat.lowFramerate =
                self.aggregatedStats.lowFramerate && self.aggregatedStats.lowFramerate < newStat.framerate
                  ? self.aggregatedStats.lowFramerate
                  : newStat.framerate;
              newStat.highFramerate =
                self.aggregatedStats.highFramerate && self.aggregatedStats.highFramerate > newStat.framerate
                  ? self.aggregatedStats.highFramerate
                  : newStat.framerate;
            }

            if (self.aggregatedStats.framesDecodedStart) {
              newStat.avgframerate =
                (newStat.framesDecoded - self.aggregatedStats.framesDecodedStart) /
                ((newStat.timestamp - self.aggregatedStats.timestampStart) / 1000);
              newStat.avgframerate = Math.floor(newStat.avgframerate);
            }
          }
        }

        // Read video track stats
        if (stat.type === "track" && (stat.trackIdentifier === "video_label" || stat.kind === "video")) {
          newStat.framesDropped = stat.framesDropped;
          newStat.framesReceived = stat.framesReceived;
          newStat.framesDroppedPercentage = (stat.framesDropped / stat.framesReceived) * 100;
          newStat.frameHeight = stat.frameHeight;
          newStat.frameWidth = stat.frameWidth;
          newStat.frameHeightStart = self.aggregatedStats?.frameHeightStart ? self.aggregatedStats.frameHeightStart : stat.frameHeight;
          newStat.frameWidthStart = self.aggregatedStats?.frameWidthStart ? self.aggregatedStats.frameWidthStart : stat.frameWidth;
        }

        if (
          stat.type === "candidate-pair" &&
          Object.prototype.hasOwnProperty.call(stat, "currentRoundTripTime") &&
          stat.currentRoundTripTime !== 0
        ) {
          newStat.currentRoundTripTime = stat.currentRoundTripTime;
        }
      });

      if (self.aggregatedStats.receiveToCompositeMs) {
        newStat.receiveToCompositeMs = self.aggregatedStats.receiveToCompositeMs;
        self.latencyTestTimings.SetFrameDisplayDeltaTime(self.aggregatedStats.receiveToCompositeMs);
      }

      self.aggregatedStats = newStat;

      if (self.onAggregatedStats) {
        self.onAggregatedStats(newStat);
      }
    };
  };

  const setupTransceiversAsync = async function (pc) {
    const hasTransceivers = pc.getTransceivers().length > 0;

    // Setup a transceiver for getting UE video
    pc.addTransceiver("video", { direction: "recvonly" });

    // Setup a transceiver for sending mic audio to UE and receiving audio from UE
    if (!self.useMic) {
      pc.addTransceiver("audio", { direction: "recvonly" });
    } else {
      const audioSendOptions = self.useMic
        ? {
            autoGainControl: false,
            channelCount: 1,
            echoCancellation: false,
            latency: 0,
            noiseSuppression: false,
            sampleRate: 48000,
            volume: 1.0,
          }
        : false;

      // Note using mic on android chrome requires SSL or chrome://flags/ "unsafely-treat-insecure-origin-as-secure"
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioSendOptions });
      if (stream) {
        if (hasTransceivers) {
          for (const transceiver of pc.getTransceivers()) {
            if (transceiver?.receiver?.track && transceiver.receiver.track.kind === "audio") {
              for (const track of stream.getTracks()) {
                if (track.kind && track.kind === "audio") {
                  transceiver.sender.replaceTrack(track);
                  transceiver.direction = "sendrecv";
                }
              }
            }
          }
        } else {
          for (const track of stream.getTracks()) {
            if (track.kind && track.kind === "audio") {
              pc.addTransceiver(track, { direction: "sendrecv" });
            }
          }
        }
      } else {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }
    }
  };

  //* *********************
  // Public functions
  //* *********************

  this.setVideoEnabled = function (enabled) {
    self.video.srcObject.getTracks().forEach((track) => (track.enabled = enabled));
  };

  this.startLatencyTest = function (onTestStarted) {
    // Can't start latency test without a video element
    if (!self.video) {
      return;
    }

    self.latencyTestTimings.Reset();
    self.latencyTestTimings.TestStartTimeMs = Date.now();
    onTestStarted(self.latencyTestTimings.TestStartTimeMs);
  };

  // This is called when revceiving new ice candidates individually instead of part of the offer
  this.handleCandidateFromServer = function (iceCandidate) {
    const candidate = new RTCIceCandidate(iceCandidate);

    // if forcing TURN, reject any candidates not relay
    if (self.forceTURN) {
      // check if no relay address is found, if so, we are assuming it means no TURN server
      if (!candidate.candidate.includes("relay")) {
        return;
      }
    }

    self.pcClient.addIceCandidate(candidate).catch(function (e) {});
  };

  // Called externaly to create an offer for the server
  this.createOffer = function () {
    if (self.pcClient) {
      self.pcClient.close();
      self.pcClient = null;
    }
    self.pcClient = new RTCPeerConnection(self.cfg);
    setupPeerConnection(self.pcClient);

    setupTransceiversAsync(self.pcClient).finally(function () {
      self.dcClient = createDataChannel(self.pcClient, "cirrus", self.dataChannelOptions);
      handleCreateOffer(self.pcClient);
    });
  };

  // Called externaly when an offer is received from the server
  this.receiveOffer = function (offer) {
    const offerDesc = new RTCSessionDescription(offer);

    if (!self.pcClient) {
      self.pcClient = new RTCPeerConnection(self.cfg);
      setupPeerConnection(self.pcClient);

      // Put things here that happen post transceiver setup
      self.pcClient.setRemoteDescription(offerDesc).then(() => {
        setupTransceiversAsync(self.pcClient).finally(function () {
          self.pcClient
            .createAnswer()
            .then((answer) => self.pcClient.setLocalDescription(answer))
            .then(() => {
              if (self.onWebRtcAnswer) {
                self.onWebRtcAnswer(self.pcClient.currentLocalDescription);
              }
            })
            .then(() => {
              const receivers = self.pcClient.getReceivers();
              for (const receiver of receivers) {
                receiver.playoutDelayHint = 0;
              }
            })
            .catch((error) => {});
        });
      });
    }
  };

  // Called externaly when an answer is received from the server
  this.receiveAnswer = function (answer) {
    const answerDesc = new RTCSessionDescription(answer);
    self.pcClient.setRemoteDescription(answerDesc);

    const receivers = self.pcClient.getReceivers();
    for (const receiver of receivers) {
      receiver.playoutDelayHint = 0;
    }
  };

  this.close = function () {
    if (self.pcClient) {
      self.pcClient.close();
      self.pcClient = null;
    }
    if (self.aggregateStatsIntervalId) {
      clearInterval(self.aggregateStatsIntervalId);
    }
  };

  // Sends data across the datachannel
  this.send = function (data) {
    if (self.dcClient && self.dcClient.readyState === "open") {
      self.dcClient.send(data);
    }
  };

  this.getStats = function (onStats) {
    if (self.pcClient && onStats) {
      self.pcClient.getStats(null).then((stats) => {
        onStats(stats);
      });
    }
  };

  this.aggregateStats = function (checkInterval) {
    const calcAggregatedStats = generateAggregatedStatsFunction();
    const printAggregatedStats = () => {
      self.getStats(calcAggregatedStats);
    };
    self.aggregateStatsIntervalId = setInterval(printAggregatedStats, checkInterval);
  };
}
