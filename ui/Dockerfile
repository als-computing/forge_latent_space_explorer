FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}

COPY ui/package*.json ./
RUN npm install

COPY ui/ .

RUN npm run build

FROM nginx:alpine

COPY ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html/

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
