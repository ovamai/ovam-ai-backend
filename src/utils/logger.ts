import winston from 'winston';
import tracer from 'dd-trace';
import DailyRotateFile from 'winston-daily-rotate-file';

const logLevel: string =
  process.env.NODE_ENV === 'PRODUCTION' ? 'info' : 'debug';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      const span = tracer.scope().active();
      let traceId: string = 'no-trace',
        spanId: string = 'no-span';
      if (span) {
        const context = span.context();
        traceId = context.toTraceId ? context.toTraceId() : 'no-trace';
        spanId = context.toSpanId ? context.toSpanId() : 'no-span';
      }
      return `${timestamp} ${level} [trace_id:${traceId} span_id:${spanId}]: ${message}`;
    }),
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '7d',
    }),
    new winston.transports.File({ filename: 'logs/app.log' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

if (process.env.NODE_ENV !== 'PRODUCTION') {
  logger.add(new winston.transports.Console());
}
export default logger;
