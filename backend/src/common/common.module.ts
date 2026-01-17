import { Module, Global } from '@nestjs/common';
import { BudgetControlService } from './budget-control.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [BudgetControlService],
  exports: [BudgetControlService],
})
export class CommonModule {}
