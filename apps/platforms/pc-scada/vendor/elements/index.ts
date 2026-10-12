import circleSvg from "./basic/circle.svg?raw";
import productPropertyPanelSvg from "./basic/product-property-panel.svg?raw";
import rectSvg from "./basic/rect.svg?raw";
import textSvg from "./basic/text.svg?raw";
import ctHubSvg from "./electrical/ct-hub.svg?raw";
import ctSensorSvg from "./electrical/ct-sensor.svg?raw";
import axialFanSvg from "./fans/axial-fan.svg?raw";
import axialFan2Svg from "./fans/axial-fan2.svg?raw";
import freshAirUnitSvg from "./fans/fresh-air-unit.svg?raw";
import boilerSvg from "./heating-cooling/boiler.svg?raw";
import boiler2Svg from "./heating-cooling/boiler2.svg?raw";
import batteryIndicatorSvg from "./industrial/battery-indicator.svg?raw";
import fanSvg from "./industrial/fan.svg?raw";
import gaugeSvg from "./industrial/gauge.svg?raw";
import pipeCrossSvg from "./industrial/pipe-cross.svg?raw";
import pipeElbowSvg from "./industrial/pipe-elbow.svg?raw";
import pipeStraightSvg from "./industrial/pipe-straight.svg?raw";
import pipeTeeSvg from "./industrial/pipe-tee.svg?raw";
import pipeSvg from "./industrial/pipe.svg?raw";
import powerMeterSvg from "./industrial/power-meter.svg?raw";
import pumpSvg from "./industrial/pump.svg?raw";
import pump3Svg from "./industrial/pump3.svg?raw";
import signalMeterSvg from "./industrial/signal-meter.svg?raw";
import smokeDetectorSvg from "./industrial/smoke-detector.svg?raw";
import smokeSensorGaugeSvg from "./industrial/smoke-sensor-gauge.svg?raw";
import industrialSwitchSvg from "./industrial/switch.svg?raw";
import temperatureGaugeSvg from "./industrial/temperature-gauge.svg?raw";
import toggleSwitchSvg from "./industrial/toggle-switch.svg?raw";
import valveBallSvg from "./industrial/valve-ball.svg?raw";
import valveCheckSvg from "./industrial/valve-check.svg?raw";
import valveGateSvg from "./industrial/valve-gate.svg?raw";
import valveHandwheelSvg from "./industrial/valve-handwheel.svg?raw";
import valveSvg from "./industrial/valve.svg?raw";
import gearPumpSvg from "./pumps/gear-pump.svg?raw";
import waterPumpSvg from "./pumps/water-pump.svg?raw";
import measuringTankSvg from "./tanks/measuring-tank.svg?raw";
import waterTankSvg from "./tanks/water-tank.svg?raw";

export const basicElements: Record<string, string> = {
  rect: rectSvg,
  circle: circleSvg,
  text: textSvg,
  "product-property-panel": productPropertyPanelSvg,
};

export const industrialElements: Record<string, string> = {
  valve: valveSvg,
  pump: pumpSvg,
  pipe: pipeSvg,
  "battery-indicator": batteryIndicatorSvg,
  fan: fanSvg,
  gauge: gaugeSvg,
  "pipe-cross": pipeCrossSvg,
  "pipe-elbow": pipeElbowSvg,
  "pipe-straight": pipeStraightSvg,
  "pipe-tee": pipeTeeSvg,
  "power-meter": powerMeterSvg,
  pump3: pump3Svg,
  "signal-meter": signalMeterSvg,
  "smoke-detector": smokeDetectorSvg,
  "smoke-sensor-gauge": smokeSensorGaugeSvg,
  "temperature-gauge": temperatureGaugeSvg,
  "industrial-switch": industrialSwitchSvg,
  "toggle-switch": toggleSwitchSvg,
  "valve-ball": valveBallSvg,
  "valve-check": valveCheckSvg,
  "valve-gate": valveGateSvg,
  "valve-handwheel": valveHandwheelSvg,
};

export const electricalElements: Record<string, string> = {
  "ct-sensor": ctSensorSvg,
  "ct-hub": ctHubSvg,
};

export const fanElements: Record<string, string> = {
  "axial-fan": axialFanSvg,
  "axial-fan2": axialFan2Svg,
  "fresh-air-unit": freshAirUnitSvg,
};

export const heatingCoolingElements: Record<string, string> = {
  boiler: boilerSvg,
  boiler2: boiler2Svg,
};

export const pumpElements: Record<string, string> = {
  "gear-pump": gearPumpSvg,
  "water-pump": waterPumpSvg,
};

export const tankElements: Record<string, string> = {
  "measuring-tank": measuringTankSvg,
  "water-tank": waterTankSvg,
};

export const allBuiltinElements: Record<string, string> = {
  ...basicElements,
  ...industrialElements,
  ...electricalElements,
  ...fanElements,
  ...heatingCoolingElements,
  ...pumpElements,
  ...tankElements,
};
