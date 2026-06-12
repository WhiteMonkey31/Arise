"""Analytics API for bid history insights."""

from typing import Any, Dict, List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.users import current_active_user
from app.db.database import get_session
from app.db.models import Bid, User
from app.logger import get_logger

logger = get_logger("analytics_api")
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# Schemas
class BidHistoryRow(BaseModel):
    id: str
    sector: Optional[str]
    budget: Optional[float]
    outcome: Optional[str]
    compliance_pct: Optional[float]
    score: Optional[float]
    bid_manager: Optional[str]
    response_days: Optional[int]


class WinRateBySector(BaseModel):
    sector: str
    total_bids: int
    wins: int
    win_rate: float


class ScoreVsOutcomePoint(BaseModel):
    score: float
    outcome: str
    sector: Optional[str]
    compliance_pct: Optional[float]


class ComplianceVsWinRate(BaseModel):
    compliance_bucket: str
    total_bids: int
    win_rate: float


# Endpoints
@router.get("/bid-history", response_model=List[BidHistoryRow])
async def get_bid_history(
    sector: Optional[str] = Query(default=None),
    outcome: Optional[str] = Query(default=None),
    limit: int = Query(default=120, le=500),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> List[BidHistoryRow]:
    """Return bid history rows (up to 120 by default) for the org."""
    stmt = select(Bid).where(Bid.org_id == current_user.org_id)
    if sector:
        stmt = stmt.where(Bid.sector == sector)
    if outcome:
        stmt = stmt.where(Bid.outcome == outcome)
    stmt = stmt.limit(limit).order_by(Bid.submitted_at.desc())

    result = await session.execute(stmt)
    bids = result.scalars().all()

    return [
        BidHistoryRow(
            id=str(b.id),
            sector=b.sector,
            budget=b.budget,
            outcome=b.outcome.value if b.outcome else None,
            compliance_pct=b.compliance_pct,
            score=b.score,
            bid_manager=b.bid_manager,
            response_days=b.response_days,
        )
        for b in bids
    ]


@router.get("/win-rate-by-sector", response_model=List[WinRateBySector])
async def get_win_rate_by_sector(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> List[WinRateBySector]:
    """Return win rate grouped by sector."""
    stmt = select(Bid).where(
        Bid.org_id == current_user.org_id,
        Bid.outcome.is_not(None),
        Bid.sector.is_not(None),
    )
    result = await session.execute(stmt)
    bids = result.scalars().all()

    if not bids:
        return []

    df = pd.DataFrame(
        [
            {
                "sector": b.sector,
                "outcome": b.outcome.value if b.outcome else None,
            }
            for b in bids
        ]
    )

    grouped = df.groupby("sector").agg(
        total_bids=("outcome", "count"),
        wins=("outcome", lambda x: (x == "win").sum()),
    ).reset_index()
    grouped["win_rate"] = (grouped["wins"] / grouped["total_bids"] * 100).round(1)
    grouped = grouped.sort_values("win_rate", ascending=False)

    return [
        WinRateBySector(
            sector=row["sector"],
            total_bids=int(row["total_bids"]),
            wins=int(row["wins"]),
            win_rate=float(row["win_rate"]),
        )
        for _, row in grouped.iterrows()
    ]


@router.get("/score-vs-outcome", response_model=List[ScoreVsOutcomePoint])
async def get_score_vs_outcome(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> List[ScoreVsOutcomePoint]:
    """Return score vs win/loss scatter data for all scored bids."""
    stmt = select(Bid).where(
        Bid.org_id == current_user.org_id,
        Bid.score.is_not(None),
        Bid.outcome.is_not(None),
    )
    result = await session.execute(stmt)
    bids = result.scalars().all()

    return [
        ScoreVsOutcomePoint(
            score=b.score,
            outcome=b.outcome.value if b.outcome else "unknown",
            sector=b.sector,
            compliance_pct=b.compliance_pct,
        )
        for b in bids
    ]


@router.get("/compliance-vs-win-rate", response_model=List[ComplianceVsWinRate])
async def get_compliance_vs_win_rate(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
) -> List[ComplianceVsWinRate]:
    """Return compliance % bucketed vs win rate for correlation chart."""
    stmt = select(Bid).where(
        Bid.org_id == current_user.org_id,
        Bid.compliance_pct.is_not(None),
        Bid.outcome.is_not(None),
    )
    result = await session.execute(stmt)
    bids = result.scalars().all()

    if not bids:
        return []

    df = pd.DataFrame(
        [
            {
                "compliance_pct": b.compliance_pct,
                "outcome": b.outcome.value if b.outcome else None,
            }
            for b in bids
        ]
    )

    df["bucket"] = pd.cut(
        df["compliance_pct"],
        bins=[0, 50, 65, 80, 90, 100],
        labels=["0-50%", "50-65%", "65-80%", "80-90%", "90-100%"],
        right=True,
        include_lowest=True,
    )

    grouped = (
        df.groupby("bucket")
        .agg(
            total_bids=("outcome", "count"),
            wins=("outcome", lambda x: (x == "win").sum()),
        )
        .reset_index()
    )
    grouped["win_rate"] = (grouped["wins"] / grouped["total_bids"] * 100).round(1)

    return [
        ComplianceVsWinRate(
            compliance_bucket=str(row["bucket"]),
            total_bids=int(row["total_bids"]),
            win_rate=float(row["win_rate"]),
        )
        for _, row in grouped.iterrows()
        if row["total_bids"] > 0
    ]
