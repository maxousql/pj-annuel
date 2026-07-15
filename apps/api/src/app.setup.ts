import {
  type INestApplication,
  RequestMethod,
  ValidationPipe,
} from "@nestjs/common";

import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { buildCorsOptions } from "./config/http.config";
import {
  createRateLimitMiddleware,
  securityHeadersMiddleware,
} from "./config/security.middleware";

export const API_PREFIX = "api";
export const HEALTH_PATH = "health";
export const READINESS_PATH = "health/ready";

type AppSetupOptions = {
  frontendUrl?: string | undefined;
};

export function configureApp(
  app: INestApplication,
  options: AppSetupOptions = {},
): void {
  if (process.env.TRUST_PROXY_HOPS) {
    const hops = Number(process.env.TRUST_PROXY_HOPS);
    const instance = app.getHttpAdapter().getInstance() as {
      set?: (name: string, value: number) => void;
    };

    if (Number.isInteger(hops) && hops >= 1)
      instance.set?.("trust proxy", hops);
  }

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: HEALTH_PATH, method: RequestMethod.GET },
      { path: READINESS_PATH, method: RequestMethod.GET },
    ],
  });
  app.enableCors(buildCorsOptions(options.frontendUrl));
  app.use(securityHeadersMiddleware);
  app.use(createRateLimitMiddleware());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
}
