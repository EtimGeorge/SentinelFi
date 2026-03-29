import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from "@nestjs/common";
import { ClientService } from "./client.service";
import { CreateClientDto, UpdateClientDto } from "./client.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantAccessGuard } from "../common/guards/tenant-access.guard";

@Controller("clients")
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class ClientController {
  private readonly logger = new Logger(ClientController.name);

  constructor(private readonly clientService: ClientService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createClientDto: CreateClientDto, @Req() req: any) {
    this.logger.log(
      `Creating client: "${createClientDto.name}" for tenant: ${req.user?.tenant_id}`,
    );

    try {
      const client = await this.clientService.create(createClientDto);
      return {
        success: true,
        data: client,
        message: `Client "${client.name}" created successfully`,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create client: ${error.message}`,
        error.stack,
      );
      throw error; // Let NestJS exception filters handle it
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const clients = await this.clientService.findAll();
    return clients; // Return array directly for simplicity
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async findOne(@Param("id") id: string) {
    return this.clientService.findOne(id);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  async update(
    @Param("id") id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    this.logger.log(`Updating client: ${id}`);

    try {
      const updated = await this.clientService.update(id, updateClientDto);
      return {
        success: true,
        data: updated,
        message: `Client "${updated.name}" updated successfully`,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to update client ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string) {
    this.logger.log(`Soft-deleting client: ${id}`);

    try {
      await this.clientService.remove(id);
      return {
        success: true,
        message: "Client deactivated successfully",
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to delete client ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
