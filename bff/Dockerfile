# Local / web-release verify image for @g2-server/bff
# Build (repo root; project .npmrc via BuildKit secret — not host ~/.npmrc):
#   docker build -f bff/Dockerfile --secret id=npmrc,src=.npmrc -t g2-bff .
# If Docker Hub times out (auth.docker.io), override base via compose BFF_BASE_IMAGE
# or: docker build --build-arg BUN_BASE_IMAGE=docker.m.daocloud.io/oven/bun:1.3.14 ...
ARG BUN_BASE_IMAGE=oven/bun:1.3.14
FROM ${BUN_BASE_IMAGE}

WORKDIR /app

COPY . .

# Scoped registry from project .npmrc (compose secret `npmrc` → repo .npmrc)
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    HUSKY=0 bun install --frozen-lockfile

ENV PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=5s --start-period=20s --retries=12 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "--cwd=bff", "src/main.ts"]
