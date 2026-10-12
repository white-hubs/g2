import { defineComponent } from "vue";
import { useRoute } from "vue-router";

import { AttendanceDetailModal } from "./components/attendance-detail-modal";
import { AttendancePanel } from "./components/attendance-panel";
import { ControlButtonPanel } from "./components/control-button-panel";
import { ControlledDevicePanel } from "./components/controlled-device-panel";
import { EventRecordsModal } from "./components/event-records-modal";
import { FloorMapModal } from "./components/floor-map-modal";
import { HostNavigator } from "./components/host-navigator";
import { HostStatusBar } from "./components/host-status-bar";
import { MonitorConfigModal } from "./components/monitor-config-modal";
import { MonitorMetricPanel } from "./components/monitor-metric-panel";
import { MonitorOverviewPanel } from "./components/monitor-overview-panel";
import { OperationLogModal } from "./components/operation-log-modal";
import { PasswordAuthModal } from "./components/password-auth-modal";
import { RangeEditorModal } from "./components/range-editor-modal";
import { RecentEventsPanel } from "./components/recent-events-panel";
import { useFireHostControl } from "./composables/use-fire-host-control";
import { useFloorMap } from "./composables/use-floor-map";
import type { ControlAction } from "./models";
import { DeviceSelectModal, type DeviceSelectRecord } from "@/components/device-select-modal";
import { PageLayout } from "@/pc-ui-runtime";
import { TabPane, Tabs } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

import styles from "./fire-host-control.module.css";

export const FireHostControl = defineComponent({
  name: "FireHostControl",
  setup() {
    const route = useRoute();
    const { pageTitle } = usePageName();
    const hostId = Array.isArray(route.query.hostId) ? route.query.hostId[0] : route.query.hostId;
    const control = useFireHostControl();
    control.setPreferredHost(hostId ? String(hostId) : "");
    const floorMap = useFloorMap(control.eventsList);

    const renderTabContent = () => (
      <div class={[styles.tabContent, control.activeTab.value === "ctrl" && styles.controlTabContent]}>
        {control.activeTab.value === "ctrl" ? (
          control.currentHost.value ? (
            <>
              <HostStatusBar
                host={control.currentHost.value}
                onOpenEvents={control.eventRecords.open}
                onOpenLogs={control.operationLogs.open}
              />
              <div class={styles.monitorRow}>
                <MonitorOverviewPanel
                  feeds={control.currentVideoFeeds.value}
                  activeIndex={control.currentVideoIndex.value}
                  fullscreen={control.isFullScreenVideo.value}
                  loading={control.isVideoConfigLoading.value}
                  onPrevious={() => control.switchVideo(-1)}
                  onNext={() => control.switchVideo(1)}
                  onSelect={control.selectVideo}
                  onToggleFullscreen={control.toggleVideoFullscreen}
                />
                <RecentEventsPanel
                  events={control.eventsList.value}
                  onOpenAll={control.eventRecords.open}
                  onLocate={floorMap.openFromEvent}
                />
              </div>
              <ControlButtonPanel
                actions={control.controlButtons.value}
                loading={control.isButtonConfigLoading.value}
                pending={control.isHostCommandPending.value}
                onControl={(action: ControlAction) => control.controlHost(action)}
              />
              <ControlledDevicePanel
                devices={control.devicesList.value}
                activePanel={control.controlDevicePanel.value}
                total={control.controlPointTotal.value}
                loading={control.isControlPointLoading.value}
                loadingMore={control.isControlPointLoadingMore.value}
                hasMore={control.hasMoreControlPoints.value}
                indicatorConfig={control.indicatorLightConfig.value}
                indicatorConfigLoading={control.isIndicatorLightConfigLoading.value}
                onControl={control.controlDevice}
                onPanelChange={control.changeControlDevicePanel}
                onLoadMore={() => control.loadControlPoints(control.currentHostId.value)}
              />
            </>
          ) : (
            <div class={styles.workspaceEmpty}>{control.isHostLoading.value ? "正在加载消防主机..." : "暂无可远程控制的消防主机"}</div>
          )
        ) : null}
        {control.activeTab.value === "water" ? (
          <MonitorMetricPanel
            type="water"
            devices={control.waterMetrics.value}
            onConfigure={() => control.openMonitorConfig("water")}
            onAddDevice={() => control.openDevicePicker("water")}
            onEditRange={control.openRangeEditor}
          />
        ) : null}
        {control.activeTab.value === "electric" ? (
          <MonitorMetricPanel
            type="electric"
            devices={control.electricMetrics.value}
            onConfigure={() => control.openMonitorConfig("electric")}
            onAddDevice={() => control.openDevicePicker("electric")}
            onEditRange={control.openRangeEditor}
          />
        ) : null}
        {control.activeTab.value === "attendance" ? (
          <AttendancePanel
            records={control.attendanceRecords.value}
            pageNumber={control.attendancePageNumber.value}
            pageSize={control.attendancePageSize.value}
            total={control.attendanceTotal.value}
            loading={control.isAttendanceLoading.value}
            onDetail={control.openAttendanceDetail}
            onPush={control.pushAttendance}
            onSearch={control.searchAttendanceRecords}
            onPageChange={control.changeAttendancePage}
          />
        ) : null}
      </div>
    );

    const renderRemoteControl = () => (
      <div class={styles.controlWorkspace}>
        <HostNavigator
          hosts={control.hostList.value}
          currentHostId={control.currentHostId.value}
          total={control.hostTotal.value}
          loading={control.isHostLoading.value}
          loadingMore={control.isHostLoadingMore.value}
          hasMore={control.hasMoreHosts.value}
          onChange={control.changeHost}
          onLoadMore={() => control.loadHosts()}
        />
        <main class={styles.controlMain}>
          <div class={styles.tabBar}>
            <Tabs activeKey={control.activeTab.value} onChange={control.changeTab}>
              <TabPane tab="远程控制" key="ctrl" />
              <TabPane tab="消防用水" key="water" />
              <TabPane tab="消防用电" key="electric" />
              <TabPane tab="远程监管" key="attendance" />
            </Tabs>
          </div>
          {renderTabContent()}
        </main>
      </div>
    );

    const slots = {
      "layout-content": () => (
        <div class={styles.pageContent}>
          {renderRemoteControl()}

          <PasswordAuthModal
            visible={control.isPasswordModalVisible.value}
            password={control.passwordInput.value}
            showPassword={control.showPassword.value}
            actionName={control.passwordActionName.value}
            danger={control.passwordIsDanger.value}
            errorMessage={control.passwordErrorMessage.value}
            submitting={control.isPasswordSubmitting.value}
            onUpdatePassword={(value) => (control.passwordInput.value = value)}
            onToggleVisibility={() => (control.showPassword.value = !control.showPassword.value)}
            onCancel={control.closePasswordModal}
            onConfirm={control.verifyPassword}
          />
          <EventRecordsModal
            visible={control.eventRecords.isVisible.value}
            events={control.eventRecords.records.value}
            loading={control.eventRecords.isLoading.value}
            pageNumber={control.eventRecords.pageNumber.value}
            pageSize={control.eventRecords.pageSize.value}
            total={control.eventRecords.total.value}
            onPageChange={control.eventRecords.changePage}
            onClose={control.eventRecords.close}
          />
          <OperationLogModal
            visible={control.operationLogs.isVisible.value}
            logs={control.operationLogs.records.value}
            loading={control.operationLogs.isLoading.value}
            pageNumber={control.operationLogs.pageNumber.value}
            pageSize={control.operationLogs.pageSize.value}
            total={control.operationLogs.total.value}
            onPageChange={control.operationLogs.changePage}
            onClose={control.operationLogs.close}
          />
          <DeviceSelectModal
            visible={control.isDevicePickerVisible.value}
            title={`选择关联设备 · ${control.pickerTarget.value === "water" ? "消防用水" : "消防用电"}`}
            width="1120px"
            pageSize={10}
            filterFields={["keyword", "categoryCode", "brandName", "areaId"]}
            queryParams={{ filterTagCodes: ["builtin.app::fire-management"] }}
            submit={async (devices: DeviceSelectRecord[]) => {
              control.selectedCandidateIds.value = devices.map((device) => String(device.id));
              return control.confirmDevicePicker();
            }}
            onSelectionChange={(devices: DeviceSelectRecord[]) => {
              control.selectedCandidateIds.value = devices.map((device) => String(device.id));
            }}
            onUpdate:visible={(visible: boolean) => (control.isDevicePickerVisible.value = visible)}
          />
          <MonitorConfigModal
            visible={control.isMonitorConfigVisible.value}
            type={control.configTarget.value}
            devices={control.monitorMetrics.value}
            saving={control.isMonitorConfigSaving.value}
            onSave={control.saveMonitorConfig}
            onClose={() => (control.isMonitorConfigVisible.value = false)}
          />
          <RangeEditorModal
            device={control.editingMetric.value}
            point={control.editingPoint.value}
            onClose={() => {
              control.editingMetric.value = null;
              control.editingPoint.value = null;
            }}
            onSave={control.saveRange}
          />
          <AttendanceDetailModal
            visible={control.isAttendanceDetailVisible.value}
            record={control.activeAttendance.value}
            onClose={() => (control.isAttendanceDetailVisible.value = false)}
          />
          <FloorMapModal
            visible={floorMap.isVisible.value}
            activePoint={floorMap.activePoint.value}
            points={floorMap.sameLocationPoints.value}
            areaName={floorMap.selectedAreaName.value}
            imageUrl={floorMap.currentMapImage.value}
            loading={floorMap.isLoading.value}
            imageRect={floorMap.imageRect.value}
            setImageFrameRef={floorMap.setImageFrameRef}
            setImageRef={floorMap.setImageRef}
            onImageLoad={floorMap.handleImageLoad}
            onClose={floorMap.close}
          />
        </div>
      ),
    };
    return () => <PageLayout title={pageTitle || "消防主机远程控制"} v-slots={slots} showFooter={false} />;
  },
});

export default FireHostControl;
