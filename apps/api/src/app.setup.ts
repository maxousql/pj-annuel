import {
  type INestApplication,
  RequestMethod,
  ValidationPipe,
} from "@nestjs/common";

import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { buildCorsOptions } from "./config/http.config";

export const API_PREFIX = "api";
export const HEALTH_PATH = "health";

type AppSetupOptions = {
  frontendUrl?: string | undefined;
};

export function configureApp(
  app: INestApplication,
  options: AppSetupOptions = {},
): void {
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: HEALTH_PATH, method: RequestMethod.GET }],
  });
  app.enableCors(buildCorsOptions(options.frontendUrl));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
}
