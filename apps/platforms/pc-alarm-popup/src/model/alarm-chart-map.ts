import type { Component } from "vue";

export type AlarmChartModule = {
  ModalVoltageComponent?: Component;
  ModalHeatComponent?: Component;
  ModalUpsStatusComponent?: Component;
  ModalBatteryRemainderComponent?: Component;
};

export function buildAlarmChartComponentMap(mod: AlarmChartModule): Record<string, Component> {
  const voltage = mod.ModalVoltageComponent;
  const heat = mod.ModalHeatComponent;
  const ups = mod.ModalUpsStatusComponent;
  const battery = mod.ModalBatteryRemainderComponent;
  const map: Record<string, Component> = {};
  if (voltage) {
    Object.assign(map, {
      ua: voltage,
      ub: voltage,
      uc: voltage,
      i: voltage,
      ia: voltage,
      ib: voltage,
      ic: voltage,
      pressure: voltage,
    });
  }
  if (heat) {
    Object.assign(map, {
      temp_a: heat,
      temp_b: heat,
      temp_c: heat,
      temp: heat,
      hum: heat,
      bat_temp: heat,
    });
  }
  if (ups) {
    Object.assign(map, { work_mode: ups, ups_status: ups });
  }
  if (battery) {
    map.bat_time = battery;
  }
  return map;
}
