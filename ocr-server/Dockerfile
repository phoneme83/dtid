FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY lib ./lib
COPY public ./public
COPY server.js cli.js ./
# 언어 데이터(kor·eng)를 이미지에 미리 넣어 두면 폐쇄망에서도 동작한다 — README 「폐쇄망 설치」 참고
# COPY langdata ./langdata
# ENV OCR_LANG_PATH=/app/langdata
ENV PORT=8080 OCR_WORKERS=2 OCR_CACHE_PATH=/app/.cache
RUN mkdir -p /app/.cache && chown -R node:node /app
USER node
EXPOSE 8080
CMD ["node", "server.js"]
