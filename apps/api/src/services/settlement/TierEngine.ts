import { HttpError, type SettlementTierConfigRecord } from '@antigravity/db';

export interface TierResolution {
  tierApplied: number;
  tierRate: number;
}

export class TierEngine {
  validate(config: SettlementTierConfigRecord): void {
    if (!Number.isInteger(config.tier1_max_load) || config.tier1_max_load < 0) {
      throw new HttpError('Tier configuration is invalid: tier1_max_load must be >= 0.', 500, 'INTERNAL_ERROR');
    }

    if (!Number.isInteger(config.tier2_max_load) || config.tier2_max_load <= config.tier1_max_load) {
      throw new HttpError('Tier configuration is invalid: tier2_max_load must exceed tier1_max_load.', 500, 'INTERNAL_ERROR');
    }

    const rates = [Number(config.tier1_rate), Number(config.tier2_rate), Number(config.tier3_rate)];
    if (rates.some((rate) => !Number.isFinite(rate) || rate < 0)) {
      throw new HttpError('Tier configuration contains an invalid rate.', 500, 'INTERNAL_ERROR');
    }
  }

  resolveTier(config: SettlementTierConfigRecord, tierBasisLoadCount: number): TierResolution {
    this.validate(config);

    if (!Number.isInteger(tierBasisLoadCount) || tierBasisLoadCount < 0) {
      throw new HttpError('tierBasisLoadCount must be a non-negative integer.', 400, 'VALIDATION_ERROR');
    }

    if (tierBasisLoadCount <= config.tier1_max_load) {
      return {
        tierApplied: 1,
        tierRate: Number(config.tier1_rate),
      };
    }

    if (tierBasisLoadCount <= config.tier2_max_load) {
      return {
        tierApplied: 2,
        tierRate: Number(config.tier2_rate),
      };
    }

    return {
      tierApplied: 3,
      tierRate: Number(config.tier3_rate),
    };
  }
}
