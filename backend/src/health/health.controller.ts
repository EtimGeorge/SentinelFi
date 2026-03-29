import { Controller, Get } from "@nestjs/common";
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
} from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import { AiAssistantService } from "../ai-assistant/ai-assistant.service";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
    private configService: ConfigService,
    private aiAssistantService: AiAssistantService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database", { timeout: 3000 }),
      () =>
        this.http.pingCheck(
          "ai-agent",
          this.configService.get<string>("AI_AGENT_URL") ||
            "http://localhost:8000",
        ),
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS("memory_rss", 300 * 1024 * 1024), // 300MB
      () =>
        this.microservice.pingCheck("redis", {
          transport: Transport.REDIS,
          options: {
            host: this.configService.get("REDIS_HOST") || "localhost",
            port: this.configService.get("REDIS_PORT") || 6379,
          },
        }),
      () =>
        Promise.resolve({
          ai_circuit_breaker: {
            status: "up",
            ...this.aiAssistantService.getCircuitStatus(),
          },
        }),
    ]);
  }
}
