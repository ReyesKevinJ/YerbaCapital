use crate::{
    registry::{Lot, PhysicalStatus, RegistryParams},
    types::VaultParams,
    Error,
};

pub const YEAR_SECONDS: i128 = 31_536_000;
const BPS: i128 = 10_000;

pub fn interest(principal: i128, rate_bps: u32, elapsed: u64) -> Result<i128, Error> {
    if principal < 0 {
        return Err(Error::AmountInvalid);
    }
    let numerator = principal
        .checked_mul(i128::from(rate_bps))
        .and_then(|n| n.checked_mul(i128::from(elapsed)))
        .ok_or(Error::MathOverflow)?;
    let denominator = BPS.checked_mul(YEAR_SECONDS).ok_or(Error::MathOverflow)?;
    let quotient = numerator
        .checked_div(denominator)
        .ok_or(Error::MathOverflow)?;
    if numerator
        .checked_rem(denominator)
        .ok_or(Error::MathOverflow)?
        == 0
    {
        Ok(quotient)
    } else {
        quotient.checked_add(1).ok_or(Error::MathOverflow)
    }
}

pub fn capacity(
    lot: &Lot,
    remaining_kg: u64,
    params: &VaultParams,
    quality: &RegistryParams,
    now: u64,
) -> Result<i128, Error> {
    if lot.physical_status == PhysicalStatus::Impaired {
        return Err(Error::LotImpaired);
    }
    if lot.physical_status != PhysicalStatus::Verified {
        return Err(Error::InvalidLotStatus);
    }
    if remaining_kg < quality.min_lot_kg || remaining_kg > lot.net_kg {
        return Err(Error::WeightInvalid);
    }
    if lot.moisture_bps < quality.moisture_min_bps || lot.moisture_bps > quality.moisture_max_bps {
        return Err(Error::MoistureOutOfBand);
    }
    if lot.valuation <= 0 || lot.valued_kg == 0 {
        return Err(Error::AmountInvalid);
    }
    let age = now
        .checked_sub(lot.valued_at)
        .ok_or(Error::ValuationStale)?;
    if age > params.valuation_max_age_secs {
        return Err(Error::ValuationStale);
    }
    let distance_low = lot
        .moisture_bps
        .checked_sub(quality.moisture_min_bps)
        .ok_or(Error::MathOverflow)?;
    let distance_high = quality
        .moisture_max_bps
        .checked_sub(lot.moisture_bps)
        .ok_or(Error::MathOverflow)?;
    let edge =
        distance_low <= params.moisture_edge_bps || distance_high <= params.moisture_edge_bps;
    let mut haircut = params.base_haircut_bps;
    if edge {
        haircut = haircut
            .checked_add(params.edge_risk_bps)
            .ok_or(Error::MathOverflow)?;
    }
    if lot.moisture_drift {
        haircut = haircut
            .checked_add(params.drift_risk_bps)
            .ok_or(Error::MathOverflow)?;
    }
    let retained = 10_000u32
        .checked_sub(haircut)
        .ok_or(Error::ParamOutOfBounds)?;
    let value = lot
        .valuation
        .checked_mul(i128::from(remaining_kg))
        .and_then(|n| n.checked_div(i128::from(lot.valued_kg)))
        .ok_or(Error::MathOverflow)?;
    let adjusted = value
        .checked_mul(i128::from(retained))
        .and_then(|n| n.checked_div(BPS))
        .ok_or(Error::MathOverflow)?;
    adjusted
        .checked_mul(i128::from(params.max_ltv_bps))
        .and_then(|n| n.checked_div(BPS))
        .ok_or(Error::MathOverflow)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn interest_rounds_up_and_never_capitalizes_or_wraps() {
        assert_eq!(
            interest(50_000_000_000, 1_200, 7_884_000),
            Ok(1_500_000_000)
        );
        assert_eq!(interest(1, 1, 1), Ok(1));
        assert_eq!(interest(1, 0, 1), Ok(0));
        assert_eq!(interest(1, 1, 0), Ok(0));
        assert_eq!(interest(-1, 1, 1), Err(Error::AmountInvalid));
        assert_eq!(
            interest(i128::MAX, 10_000, u64::MAX),
            Err(Error::MathOverflow)
        );
    }
}
