import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { RunningHubInstanceType, RunningHubRunMode } from '../../ports/index.js';
import { INSTANCE_TYPES, isInstanceType } from '../tasks/instance-pricing.js';
import { PIPELINE_CONFIGS, type PipelineConfig } from './pipeline-config.js';

@Injectable()
export class PipelinesService implements OnModuleInit {
  /** Thiếu biến workflow bắt buộc thì không khởi động (api và worker cùng nạp module này). */
  onModuleInit(): void {
    const missing = Object.values(PIPELINE_CONFIGS)
      .filter((c) => c.requiredAtStartup && !this.getWorkflowId(c))
      .map((c) => c.workflowEnvVar);
    if (missing.length) {
      throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(', ')}`);
    }
    for (const c of Object.values(PIPELINE_CONFIGS)) {
      this.getInstanceType(c);
    }
  }

  getConfig(pipeline: string): PipelineConfig | null {
    return PIPELINE_CONFIGS[pipeline] ?? null;
  }

  getWorkflowId(config: PipelineConfig): string | null {
    const v = process.env[config.workflowEnvVar]?.trim();
    return v ? v : null;
  }

  /** Loại máy RunningHub của pipeline (mặc định `default`); giá trị lạ thì ném lỗi (không đoán). */
  getInstanceType(config: PipelineConfig): RunningHubInstanceType {
    const raw = process.env[config.instanceEnvVar]?.trim().toLowerCase();
    if (!raw) return 'default';
    if (!isInstanceType(raw)) {
      throw new Error(`${config.instanceEnvVar} không hợp lệ: "${raw}" (chỉ nhận ${INSTANCE_TYPES.map((t) => `"${t}"`).join(', ')})`);
    }
    return raw;
  }

  /** Cách gọi RunningHub của pipeline: `ai-app` hoặc `workflow` (cố định trong cấu hình). */
  getRunMode(config: PipelineConfig): RunningHubRunMode {
    return config.runMode;
  }
}
