import {
  Controller,
  Post,
  Body,
  Get,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'auth/guards/roles.guard';
import { Roles } from 'auth/decorators/roles.decorator';
import { Role } from 'shared/types/role.enum';
import { SuperAdminService } from './superadmin.service';
import { CreateTenantDto, UpdateTenantDto, GetTenantsDto } from './dto/create-tenant.dto'; // Using combined DTO file for now

@Controller('super/tenants') // Base path: /api/v1/super/tenants
@UseGuards(AuthGuard('jwt'), RolesGuard) // Protect all routes with JWT and Roles Guard
@Roles(Role.SuperAdmin) // Ensure only SuperAdmin can access these routes
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * API Endpoint: POST /api/v1/super/tenants
   * Creates a new tenant, its schema, and initial admin user.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.superAdminService.createTenant(createTenantDto);
  }

  /**
   * API Endpoint: GET /api/v1/super/tenants
   * Retrieves a paginated and filtered list of tenants.
   */
  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllTenants(@Query() getTenantsDto: GetTenantsDto) {
    return this.superAdminService.findAllTenants(getTenantsDto);
  }

  /**
   * API Endpoint: PATCH /api/v1/super/tenants/:id
   * Updates an existing tenant's properties (e.g., name, isActive).
   */
  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTenant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.superAdminService.updateTenant(id, updateTenantDto);
  }
}
