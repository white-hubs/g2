import { PcIcon } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { defineComponent } from "vue";

export interface CardPanelPreviewProperty {
  propertyCode: string;
  propertyName: string;
  unit: string | null;
}

export const CardPanelPreview = defineComponent({
  name: "CardPanelPreview",
  props: {
    productName: { type: String, default: "设备卡片" },
    properties: { type: Array as PropType<CardPanelPreviewProperty[]>, default: () => [] },
  },
  setup: (props) => (): JSX.Element => (
    <aside class="card-panel-preview" aria-label="卡片实时预览">
      <div class="card-panel-preview-title">
        <PcIcon iconClass="icon-kapianshitu" size={15} />
        <span>卡片实时预览</span>
      </div>
      <div class="card-panel-preview-card">
        <div class="card-panel-preview-header">
          <span class="card-panel-preview-icon">
            <PcIcon iconClass="icon-dianqishebei" size={18} />
          </span>
          <div>
            <strong>{props.productName}</strong>
            <small>实时监测数据</small>
          </div>
          <span class="card-panel-preview-online">在线</span>
        </div>
        {props.properties.length ? (
          <div class="card-panel-preview-metrics">
            {props.properties.map((property) => (
              <div key={property.propertyCode}>
                <span>{property.propertyName}</span>
                <strong>
                  —<small>{property.unit ?? ""}</small>
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <div class="card-panel-preview-empty">勾选右侧点位后在此预览</div>
        )}
        <div class="card-panel-preview-footer">
          <span>健康状态</span>
          <strong>正常</strong>
        </div>
      </div>
    </aside>
  ),
});
