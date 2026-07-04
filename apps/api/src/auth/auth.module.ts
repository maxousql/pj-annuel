import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { PasswordPolicyConstraint } from "./utils/password-policy";

@Module({
  controllers: [AuthController],
  exports: [AuthGuard, AuthService],
  imports: [DatabaseModule],
  providers: [AuthService, AuthGuard, PasswordPolicyConstraint],
})
export class AuthModule {}
