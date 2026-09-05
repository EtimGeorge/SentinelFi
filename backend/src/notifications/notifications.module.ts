import { Module, forwardRef } from "@nestjs/common";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService], // Export service to be used by other modules if needed
})
export class NotificationsModule {}
