# GEM 重依赖以 Platform remote 进仓（player/map/scada/graph/visual/iot/alarm-charts）

通用设备监测完整迁移需要旧仓 cube-player、map-plugins、scada、graph-editor、visual-sdk、iot-socket、alarm-charts。本决定：全部落为 `@g2-platform/*` MF remote（逻辑名 `pcPlayer` / `pcMap` / `pcScada` / `pcGraphEditor` / `pcVisualSdk` / `pcIotSocket` / `pcAlarmCharts`），由页面库经 Profile 装载消费；禁止 Domain/页面库直依赖 antdv/leaflet/scada 内部包。对齐 ADR-0040/0050/0059。物理目录 `apps/platforms/pc-*`；scada 内部 `@cube-scada/*` 以 platform 包内 vendor + Vite alias 收敛。

## 状态

Accepted

## 落地备注（GEM 完整迁移）

GEM 为页面库（`@g2-pages/generic-equipment-monitor`，Profile `pageLibrary`），**不**作为独立 Domain remote。由应用域宿主（现 `@g2-domain/access-control`）在 `install` 中 `loadPlatform` 上述逻辑名并挂自有 routes；页面库经 shared / 宿主注入消费（player 直接组件、SCADA Tab 拼 viewer URL，与 CubeScada iframe 模式对齐）。对齐 ADR-0059。

构建说明：`pcPlayer` 以薄 `CubePlayer` 为可发布入口（旧 wasm 源保留）；`pcMap` / `pcGraphEditor` / `pcVisualSdk` 当前以可发布薄 API/ stub 进仓，完整 leaflet/X6/babylon 源在同包待依赖齐备后加深；MF `dts: false` 避免 vendor 类型图阻塞 publish。
