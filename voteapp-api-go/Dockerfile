# syntax=docker/dockerfile:1.7

# ---------- 1. Build ----------
FROM golang:1.23-alpine AS build
WORKDIR /src

# Dependencies first: cached until go.mod / go.sum change
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY main.go ./

# Optional: replaces the TOKEN_VERSION placeholder in main.go (same as the repo's CI)
ARG VERSION=dev
ARG TARGETOS=linux
ARG TARGETARCH
RUN sed -i "s/TOKEN_VERSION/${VERSION}/g" main.go

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/api .

# ---------- 2. Runtime ----------
# static + CA certs + non-root user (UID 65532), no shell, no package manager
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/api"]

