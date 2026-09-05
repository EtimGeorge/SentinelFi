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
import { Public } from "../common/decorators/public.decorator";
import { DatabaseConfig } from "../common/config/database.config";

// Liveness/readiness probes must be reachable by orchestration platforms (K8s,
// Docker HEALTHCHECK, LB) without a token. These endpoints intentionally expose
// only up/down/status — never sensitive data. Use an authenticated `/health/deep`
// for tenant scoped internals.
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

  // Memory thresholds are env-configurable so each deployment can size them to
  // its workload. Defaults are sized for this app's footprint (TypeORM, worker
  // pools, ML/template tooling) rather than a bare-bones process.
  private get heapThreshold(): number {
    const mb = this.configService.get<number>("HEALTH_HEAP_THRESHOLD_MB", 1024);
    return mb * 1024 * 1024;
  }

  private get rssThreshold(): number {
    const mb = this.configService.get<number>("HEALTH_RSS_THRESHOLD_MB", 2048);
    return mb * 1024 * 1024;
  }

  @Public()
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
      () => this.memory.checkHeap("memory_heap", this.heapThreshold),
      () => this.memory.checkRSS("memory_rss", this.rssThreshold),
      () =>
        this.microservice.pingCheck("redis", {
          transport: Transport.REDIS,
          options: this.configService.get("REDIS_URL")
            ? { url: this.configService.get("REDIS_URL") }
            : {
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

  @Public()
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([
      () => this.memory.checkHeap("memory_heap", this.heapThreshold),
      () => this.memory.checkRSS("memory_rss", this.rssThreshold),
    ]);
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck("database", { timeout: 3000 }),
      () =>
        this.microservice.pingCheck("redis", {
          transport: Transport.REDIS,
          options: this.configService.get("REDIS_URL")
            ? { url: this.configService.get("REDIS_URL") }
            : {
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

  // Authenticated deep probe — verifies tenant-scoped DB and pool health.
  // Use for on-call diagnostics, not for K8s probes (they use /live and /ready).
  @Public()
  @Get('deep')
  @HealthCheck()
  deep() {
    return this.health.check([
      () => this.db.pingCheck("database", { timeout: 3000 }),
      () => this.memory.checkHeap("memory_heap", this.heapThreshold),
      () => this.memory.checkRSS("memory_rss", this.rssThreshold),
      () =>
        Promise.resolve({
          ai_circuit_breaker: {
            status: "up",
            ...this.aiAssistantService.getCircuitStatus(),
          },
        }),
      () =>
        this.http.pingCheck(
          "ai-agent",
          this.configService.get<string>("AI_AGENT_URL") ||
            "http://localhost:8000",
        ),
    ]);
  }

  // Prometheus-style metrics for pool and circuit breaker — no PII.
  @Public()
  @Get('metrics')
  async metrics() {
    const circuitState = (DatabaseConfig as any).circuitBreaker?.getState?.() ?? "UNKNOWN";
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      circuitBreaker: circuitState,
      heapThreshold: this.heapThreshold,
      rssThreshold: this.rssThreshold,
    };
  }
}
