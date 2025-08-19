
FROM rabbitmq:3.12-management-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy configuration
COPY rabbitmq.conf /etc/rabbitmq/

# Enable management plugin
RUN rabbitmq-plugins enable rabbitmq_management

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD rabbitmq-diagnostics -q ping

EXPOSE 5672 15672