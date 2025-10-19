# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /site
COPY . .
ARG API_BASE_URL
ARG SITE_BASE_URL
ENV API_BASE_URL=$API_BASE_URL \
    SITE_BASE_URL=$SITE_BASE_URL
RUN node scripts/inject-config.js && node build.js

FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /site/ .
RUN rm -f build.js Dockerfile README.md || true \
    && rm -rf data || true
EXPOSE 80
