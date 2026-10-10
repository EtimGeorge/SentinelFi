import { Test, TestingModule } from "@nestjs/testing";
import { AiAssistantController } from "./ai-assistant.controller";
import { AiAssistantService } from "./ai-assistant.service";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

describe("AiAssistantController", () => {
  let controller: AiAssistantController;
  const chatStream = jest.fn();
  const mockService = {
    chat: jest.fn(),
    analyzeDashboard: jest.fn(),
    forecast: jest.fn(),
    explainSection: jest.fn(),
    generateReportNarrative: jest.fn(),
    createReportSchedule: jest.fn(),
    getReportSchedules: jest.fn(),
    deleteReportSchedule: jest.fn(),
    fillForm: jest.fn(),
    explainVariance: jest.fn(),
    chatStream,
  };

  const makeReq = (overrides: any = {}) => ({
    user: { id: "u1", tenant_id: "t1", roles: ["Admin"] },
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAssistantController],
      providers: [
        { provide: AiAssistantService, useValue: mockService },
        {
          provide: TENANT_DATA_SOURCE,
          useValue: { getRepository: () => ({ findOne: jest.fn() }) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<AiAssistantController>(AiAssistantController);
  });

  it("is defined", () => {
    expect(controller).toBeDefined();
  });

  it("chatStream pipes an async-generator stream as SSE without hanging", async () => {
    async function* gen() {
      yield 'data: {"content":"hi"}\n\n';
      yield "data: [DONE]\n\n";
    }
    chatStream.mockResolvedValue({ stream: gen() });
    const written: string[] = [];
    const res: any = {
      setHeader: jest.fn(),
      write: jest.fn((c: string) => {
        written.push(c);
        return true;
      }),
      end: jest.fn(),
      once: jest.fn(),
    };
    await controller.chatStream(
      { message: "hello", sessionId: "s1" } as any,
      makeReq() as any,
      res,
    );
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(written.join("")).toContain("[DONE]");
    expect(res.end).toHaveBeenCalled();
  });

  it("chatStream pipes a Node readable stream from Python", async () => {
    const fakeReadable: any = {
      pipe: jest.fn(() => ({})),
      on: jest.fn(),
    };
    chatStream.mockResolvedValue({ stream: fakeReadable });
    let piped = false;
    const res: any = {
      setHeader: jest.fn(),
      write: jest.fn(() => true),
      end: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
    };
    // observe pipe call
    fakeReadable.pipe.mockImplementation(() => {
      piped = true;
      return res;
    });
    await controller.chatStream(
      { message: "hello", sessionId: "s1" } as any,
      makeReq() as any,
      res,
    );
    expect(piped).toBe(true);
  });

  it("fillForm rejects empty files before hitting the AI service", async () => {
    await expect(
      controller.fillForm(
        { size: 0, originalname: "a.pdf" } as any,
        { targetForm: "invoice" } as any,
        makeReq() as any,
      ),
    ).rejects.toThrow();
    expect(mockService.fillForm).not.toHaveBeenCalled();
  });
});
