import type { RunningHubInstanceType } from '../../ports/index.js';

/** Giá giờ (USD) của RunningHub theo loại máy, tài khoản Enterprise-Shared. Lite (0.15) tự động, không chọn được nên không hỗ trợ. */
export const INSTANCE_USD_PER_HOUR: Readonly<Record<RunningHubInstanceType, number>> = {
  default: 0.88,
  plus: 1.18,
  ultra: 2.35,
};

export const INSTANCE_TYPES = Object.keys(INSTANCE_USD_PER_HOUR) as RunningHubInstanceType[];

export function isInstanceType(v: unknown): v is RunningHubInstanceType {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(INSTANCE_USD_PER_HOUR, v);
}

/** Ước tính chi phí (USD) = giây x giá giờ / 3600. Trả undefined khi loại máy lạ hoặc số giây không hợp lệ. */
export function estimateCostUsd(instanceType: string | null | undefined, seconds: number | null | undefined): number | undefined {
  if (!isInstanceType(instanceType)) return undefined;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  return (seconds * INSTANCE_USD_PER_HOUR[instanceType]) / 3600;
}
