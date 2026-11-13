import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { TopupsModule } from '../topups/topups.module.js';
import { AdminStatsController } from './admin-stats.controller.js';
import { AdminStatsService } from './admin-stats.service.js';
import { FxRateService } from './fx-rate.service.js';

@Module({
  imports: [AuthModule, TasksModule, TopupsModule, AuditModule],
  controllers: [AdminStatsController],
  providers: [AdminStatsService, FxRateService],
})
export class AdminStatsModule {}
