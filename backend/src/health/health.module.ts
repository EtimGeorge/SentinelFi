import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { HealthController } from "./health.controller";
import { AiAssistantModule } from "../ai-assistant/ai-assistant.module";

@Module({
  imports: [TerminusModule, HttpModule, AiAssistantModule],
  controllers: [HealthController],
})
export class HealthModule {}
