"""Win probability scoring engine using pandas on bid history."""

from typing import Any, Dict, List, Optional
from uuid import UUID

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.db.models import Bid, ComplianceItem, ComplianceStatus, Requirement, Workspace
from app.logger import get_logger

logger = get_logger("win_score")

# Axis weights (must sum to 1.0)
AXIS_WEIGHTS = {
    "budget_fit": 0.20,
    "compliance_pct": 0.25,
    "past_win_rate": 0.20,
    "response_time": 0.10,
    "sector_match": 0.15,
    "gap_penalty": 0.10,
}


class WinScoreEngine:
    """Computes a 0-100 win probability score across 6 axes.

    Axes:
        - budget_fit: Match rate of budget bucket in historical bids.
        - compliance_pct: Current workspace compliance percentage.
        - past_win_rate: Sector win rate from bid history.
        - response_time: Benchmark against historical response times.
        - sector_match: Alignment of workspace sector with win history.
        - gap_penalty: Penalty score based on count of compliance gaps.
    """

    GO_THRESHOLD = settings.WIN_SCORE_GO_THRESHOLD

    async def compute(
        self,
        workspace_id: UUID,
        session: AsyncSession,
    ) -> Dict[str, Any]:
        """Compute full win score for a workspace.

        Args:
            workspace_id: Workspace to score.
            session: Async DB session.

        Returns:
            Dict with per-axis scores, overall score, and GO/NO-GO verdict.
        """
        workspace = await session.get(Workspace, workspace_id)
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        # --- Gather data ---

        # Compliance items
        compliance_stmt = select(ComplianceItem).where(
            ComplianceItem.workspace_id == workspace_id
        )
        comp_result = await session.execute(compliance_stmt)
        all_items = comp_result.scalars().all()

        # Bid history for org
        bid_stmt = select(Bid).where(Bid.org_id == workspace.org_id)
        bid_result = await session.execute(bid_stmt)
        all_bids = bid_result.scalars().all()

        # --- Score each axis ---
        axes: Dict[str, float] = {}

        axes["compliance_pct"] = self._score_compliance(all_items)
        axes["past_win_rate"] = self._score_past_win_rate(all_bids, workspace.sector)
        axes["budget_fit"] = self._score_budget_fit(all_bids, workspace.sector)
        axes["response_time"] = self._score_response_time(all_bids)
        axes["sector_match"] = self._score_sector_match(all_bids, workspace.sector)
        axes["gap_penalty"] = self._score_gap_penalty(all_items)

        # --- Weighted overall ---
        overall = sum(
            axes[k] * AXIS_WEIGHTS[k] for k in AXIS_WEIGHTS
        )
        overall = min(100.0, max(0.0, overall))

        verdict = "GO" if overall >= self.GO_THRESHOLD else "NO-GO"

        # Compliance percentage for reporting
        compliance_pct_raw = axes["compliance_pct"]

        logger.info(
            "Win score computed",
            workspace_id=str(workspace_id),
            overall=overall,
            verdict=verdict,
        )

        return {
            "workspace_id": str(workspace_id),
            "axes": {
                "budget_fit": round(axes["budget_fit"], 1),
                "compliance_pct": round(axes["compliance_pct"], 1),
                "past_win_rate": round(axes["past_win_rate"], 1),
                "response_time": round(axes["response_time"], 1),
                "sector_match": round(axes["sector_match"], 1),
                "gap_penalty": round(axes["gap_penalty"], 1),
            },
            "overall": round(overall, 1),
            "verdict": verdict,
            "go_threshold": self.GO_THRESHOLD,
            "total_requirements": len(all_items),
            "gap_count": sum(1 for i in all_items if i.status == ComplianceStatus.GAP),
        }

    # -----------------------------------------------------------------------
    # Axis scorers (each returns 0-100)
    # -----------------------------------------------------------------------

    def _score_compliance(self, items: List[ComplianceItem]) -> float:
        """Score based on current compliance percentage."""
        if not items:
            return 50.0
        passed = sum(1 for i in items if i.status == ComplianceStatus.PASS)
        partial = sum(1 for i in items if i.status == ComplianceStatus.PARTIAL)
        # Partial counts as 0.5
        effective = passed + (partial * 0.5)
        return (effective / len(items)) * 100

    def _score_past_win_rate(
        self,
        bids: List[Bid],
        sector: Optional[str],
    ) -> float:
        """Score based on historical win rate in matching sector."""
        if not bids:
            return 50.0  # No data → neutral

        df = pd.DataFrame(
            [
                {"sector": b.sector or "", "outcome": b.outcome.value if b.outcome else None}
                for b in bids
            ]
        )
        # Filter by sector if available
        if sector:
            sector_df = df[df["sector"].str.lower() == sector.lower()]
        else:
            sector_df = df

        if sector_df.empty:
            sector_df = df  # Fallback to all

        total = len(sector_df)
        wins = len(sector_df[sector_df["outcome"] == "win"])
        return (wins / total) * 100 if total > 0 else 50.0

    def _score_budget_fit(
        self,
        bids: List[Bid],
        sector: Optional[str],
    ) -> float:
        """Score how often our budget range aligns with historical winning bids."""
        if not bids:
            return 50.0

        df = pd.DataFrame(
            [
                {
                    "budget": b.budget or 0,
                    "outcome": b.outcome.value if b.outcome else None,
                    "sector": b.sector or "",
                }
                for b in bids
            ]
        )
        df = df[df["budget"] > 0]
        if df.empty:
            return 50.0

        if sector:
            sector_wins = df[(df["sector"].str.lower() == sector.lower()) & (df["outcome"] == "win")]
        else:
            sector_wins = df[df["outcome"] == "win"]

        if sector_wins.empty:
            return 50.0

        # Use IQR of winning budgets as the "good fit" range
        q1 = sector_wins["budget"].quantile(0.25)
        q3 = sector_wins["budget"].quantile(0.75)
        iqr = q3 - q1

        # If current bid budget is within 1 IQR of the median winning budget, high score
        median = sector_wins["budget"].median()
        # Without a specific current budget, score based on what fraction of bids are in range
        in_range = df[
            (df["budget"] >= q1 - 1.5 * iqr) & (df["budget"] <= q3 + 1.5 * iqr)
        ]
        return (len(in_range) / len(df)) * 100

    def _score_response_time(self, bids: List[Bid]) -> float:
        """Score based on response time benchmark vs historical average."""
        if not bids:
            return 70.0

        df = pd.DataFrame(
            [
                {
                    "response_days": b.response_days or 0,
                    "outcome": b.outcome.value if b.outcome else None,
                }
                for b in bids
                if b.response_days and b.response_days > 0
            ]
        )
        if df.empty:
            return 70.0

        wins = df[df["outcome"] == "win"]
        losses = df[df["outcome"] == "loss"]

        if wins.empty or losses.empty:
            return 70.0

        win_avg = wins["response_days"].mean()
        loss_avg = losses["response_days"].mean()

        # Faster response on wins → score proportionally
        if loss_avg > win_avg:
            score = min(100.0, (loss_avg - win_avg) / loss_avg * 100 + 50)
        else:
            score = 50.0

        return score

    def _score_sector_match(
        self,
        bids: List[Bid],
        sector: Optional[str],
    ) -> float:
        """Score how well the workspace sector aligns with historical wins."""
        if not sector or not bids:
            return 50.0

        df = pd.DataFrame(
            [
                {"sector": b.sector or "", "outcome": b.outcome.value if b.outcome else None}
                for b in bids
            ]
        )
        wins = df[df["outcome"] == "win"]
        if wins.empty:
            return 50.0

        sector_win_count = len(wins[wins["sector"].str.lower() == sector.lower()])
        sector_total = len(df[df["sector"].str.lower() == sector.lower()])
        total_wins = len(wins)

        # If sector has wins, weight heavily
        if sector_win_count > 0 and sector_total > 0:
            sector_win_rate = sector_win_count / sector_total
            win_share = sector_win_count / total_wins
            return min(100.0, (sector_win_rate + win_share) / 2 * 100)

        return 20.0  # Sector has no wins in history → low score

    def _score_gap_penalty(self, items: List[ComplianceItem]) -> float:
        """Penalize based on number of compliance gaps."""
        if not items:
            return 100.0

        gap_count = sum(1 for i in items if i.status == ComplianceStatus.GAP)
        total = len(items)
        gap_pct = gap_count / total

        # No gaps → 100, all gaps → 0
        return max(0.0, (1.0 - gap_pct) * 100)
