import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CurrencyService } from "./currency.service";
import { CurrencyExchangeRateEntity } from "./currency.entity";
import { Repository, ObjectLiteral } from "typeorm";
import { HttpException, HttpStatus } from "@nestjs/common";

// Define a type for the repository mock for proper typing
type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe("CurrencyService", () => {
  let service: CurrencyService;
  let repository: MockRepository<CurrencyExchangeRateEntity>;

  // Mock data
  const mockDate = new Date();
  const mockRateEntity = {
    id: "uuid-1",
    fromCurrency: "USD",
    toCurrency: "NGN",
    rate: 1500,
    lastUpdated: mockDate,
    source: "ExchangeRate-API",
    createdAt: mockDate,
    updatedAt: mockDate,
  } as CurrencyExchangeRateEntity;

  const mockRepoFactory = () => ({
    findOne: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        {
          provide: getRepositoryToken(CurrencyExchangeRateEntity),
          useFactory: mockRepoFactory,
        },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
    repository = module.get(getRepositoryToken(CurrencyExchangeRateEntity));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("convertAmount", () => {
    it("should return 1:1 rate for same currency", async () => {
      const result = await service.convertAmount(100, "USD", "USD");
      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1);
    });

    it("should convert USD to target currency correctly", async () => {
      repository.findOne!.mockResolvedValue(mockRateEntity);

      const result = await service.convertAmount(100, "USD", "NGN");

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fromCurrency: "USD", toCurrency: "NGN" },
        }),
      );
      expect(result.convertedAmount).toBe(150000); // 100 * 1500
      expect(result.rate).toBe(1500);
    });

    it("should convert target currency to USD correctly (inverse)", async () => {
      repository.findOne!.mockResolvedValue(mockRateEntity);

      const result = await service.convertAmount(1500, "NGN", "USD");

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fromCurrency: "USD", toCurrency: "NGN" },
        }),
      );
      expect(result.convertedAmount).toBe(1); // 1500 / 1500
      expect(result.rate).toBeCloseTo(0.0006666, 5); // 1/1500
    });

    it("should convert cross-currency correctly (EUR -> NGN)", async () => {
      const eurRate = { ...mockRateEntity, toCurrency: "EUR", rate: 0.92 };
      const ngnRate = { ...mockRateEntity, toCurrency: "NGN", rate: 1500 };

      repository
        .findOne!.mockResolvedValueOnce(eurRate) // Get EUR rate (USD->EUR)
        .mockResolvedValueOnce(ngnRate); // Get NGN rate (USD->NGN)

      // 100 EUR -> ? NGN
      // 100 EUR in USD = 100 / 0.92 = 108.69 USD
      // 108.69 USD in NGN = 108.69 * 1500 = 163043.47 NGN
      const result = await service.convertAmount(100, "EUR", "NGN");

      expect(repository.findOne).toHaveBeenCalledTimes(2);
      expect(result.convertedAmount).toBeCloseTo(163043.478, 2);
      expect(result.rate).toBeCloseTo(1630.43478, 2);
    });

    it("should throw NOT_FOUND if rate is missing", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.convertAmount(100, "USD", "XYZ")).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe("updateExchangeRates", () => {
    // Mock global fetch
    global.fetch = jest.fn();

    it("should fetch and upsert rates successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          result: "success",
          time_last_update_unix: Date.now() / 1000,
          conversion_rates: {
            NGN: 1500,
            EUR: 0.92,
            GBP: 0.79,
          },
        }),
      });

      await service.updateExchangeRates();

      // Should skip USD and update others
      // Supported currencies list in service usually has ~12 items minus USD
      expect(repository.upsert).toHaveBeenCalled();
    });

    it("should throw error on API failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
      });

      await expect(service.updateExchangeRates()).rejects.toThrow(
        HttpException,
      );
    });
  });
});
