# Composition Profile 源格式采用 YAML

组装清单以 **YAML** 书写，落在 `deploy/compositions/`（如 `prod.pc.yaml` / 后续 h5、租户增量）。由 `@g2-composition/schema` 做校验，非法清单 CI/本地检查失败。不采用手写 JSON 为主格式；也不在骨架期强制「YAML 编译为 JSON 再分发」管线——门面加载时可解析 YAML 或规范化为内存对象。运行时远程下发形态若日后需要 JSON，另议，不回改「人写源为 YAML」的约定。
