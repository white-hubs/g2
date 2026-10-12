# 首个真实迁入域为 access-control（prod 示范）

在 PC 骨架门禁通过后，首个从旧仓迁入新仓的真实业务域选定为 **access-control**（`@g2-domain/access-control`），作为 **prod 真实应用迁移示范**：逻辑与 UI 1:1；经 `accessControlClient` + 本仓 BFF `/gw-bff/access-control`；挂载前缀 `/d/access-control`（见 ADR-0058）；迁完即从 qiankun `microApps` 摘掉该应用（G8），只走 MF。

原草案曾以 fire-management 作彩排目标；因源仓暂不可用，改为 access-control。fire-management 等其它域后置，不得跳过示范直接大批量迁门户域。
