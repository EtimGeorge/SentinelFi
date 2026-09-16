import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { SearchService } from "./search.service";
import { TenantId } from "../common/decorators/tenant-id.decorator";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query("query") query: string,
    @TenantId() tenantId: string | null,
  ) {
    if (typeof query !== "string" || query.trim().length === 0) {
      throw new BadRequestException("Search query must be a non-empty string.");
    }
    // SuperAdmin has no tenant_id (null); tenant users are always scoped.
    return this.searchService.search(query, tenantId);
  }
}