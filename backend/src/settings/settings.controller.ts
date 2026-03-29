import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Post,
} from "@nestjs/common";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { SettingsService } from "./settings.service";
import { SettingsEntity } from "./settings.entity";
import { UpdateSettingsDto } from "./dto/settings.dto";
import { SendTestEmailDto } from "./dto/send-test-email.dto";

@Controller("super/settings")
@UseGuards(RolesGuard)
@Roles(Role.SuperAdmin)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSettings(): Promise<SettingsEntity> {
    return this.settingsService.getSettings();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateSettings(
    @Body() updateSettingsDto: UpdateSettingsDto,
  ): Promise<SettingsEntity> {
    return this.settingsService.updateSettings(updateSettingsDto);
  }

  @Post("test-email")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async sendTestEmail(
    @Body() sendTestEmailDto: SendTestEmailDto,
  ): Promise<{ message: string }> {
    await this.settingsService.sendTestEmail(sendTestEmailDto.to);
    return {
      message: `Test email successfully sent to ${sendTestEmailDto.to}.`,
    };
  }
}
