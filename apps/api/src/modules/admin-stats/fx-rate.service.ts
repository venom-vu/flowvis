import { Injectable, Logger } from "@nestjs/common";

const FX_URL = "https://open.er-api.com/v6/latest/USD";
const DEFAULT_FALLBACK = 25000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

/**
 * Tỉ giá USD→VNĐ lấy từ API công khai, cache 1 giờ.
 * API lỗi/timeout/dữ liệu sai thì dùng `USD_VND` trong env (mặc định 25000).
 */
@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);
  private cached: { rate: number; at: number } | null = null;

  private fallback(): number {
    const n = Number(process.env.USD_VND);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_FALLBACK;
  }

  async getUsdVnd(): Promise<number> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < CACHE_TTL_MS) return this.cached.rate;

    try {
      const res = await fetch(FX_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { rates?: Record<string, unknown> };
      const rate = Number(body.rates?.VND);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("thiếu rates.VND hợp lệ");
      this.cached = { rate, at: now };
      return rate;
    } catch (err) {
      this.logger.warn(`Không lấy được tỉ giá USD/VND (${(err as Error).message}); dùng giá trị env`);
      // Giữ tỉ giá cũ nếu có, tránh số liệu nhảy về env khi API chập chờn.
      return this.cached?.rate ?? this.fallback();
    }
  }
}
