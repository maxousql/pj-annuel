import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { resolveApiPort } from "./config/http.config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configureApp(app, {
    frontendUrl: process.env.FRONTEND_URL,
  });

  await app.listen(resolveApiPort(process.env));
}

void bootstrap();
