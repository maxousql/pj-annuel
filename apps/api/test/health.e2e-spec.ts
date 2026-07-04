import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";

describe("GET /health", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app, {
      frontendUrl: "http://localhost:3000",
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns a stable API response", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);

    expect(response.body).toEqual({
      data: {
        service: "api",
        status: "ok",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
      },
      error: null,
    });
    expect(Number.isNaN(Date.parse(response.body.data.timestamp))).toBe(false);
  });
});
