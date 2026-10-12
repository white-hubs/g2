# CI 采用自建 GitLab CI；本阶段只配够用，真实验收手工完成

Status: accepted（修正：非 Jenkins）

CI 平台为公司 **自建 GitLab**，以仓库根（或约定路径）的 **`.gitlab-ci.yml`** 为流水线定义；不沿用旧仓遗留的 Jenkins groovy 主路径，也不在本阶段另起 GitHub Actions。本阶段目标是「配置够用」：安装依赖、oxlint/oxfmt check、turbo 空壳/骨架 build 等基础门禁即可，不追求完整发布矩阵或替代验收。架构/PoC **真实验收由人工本地或环境验证**完成；后续阶段再加厚 CI。
