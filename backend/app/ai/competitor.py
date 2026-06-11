"""Competitor intelligence analysis using bid history + Claude narrative."""

from typing import Any, Dict, List, Optional
from uuid import UUID

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.ai.providers.claude import ClaudeProvider
from app.config import settings
from app.db.models import Bid
from app.logger import get_logger

logger = get_logger("competitor")


class CompetitorIntelligence:
    """Analyzes bid history to surface competitive positioning insights."""

    def __init__(self) -> None:
        self.provider = ClaudeProvider()

    async def analyze(
        self,
        org_id: UUID,
        sector: str,
        budget_range: Optional[tuple] = None,
        session: AsyncSession = None,
    ) -> Dict[str, Any]:
        """Run competitor intelligence analysis.

        Args:
            org_id: Organization UUID.
            sector: Procurement sector to analyze.
            budget_range: Optional (min_budget, max_budget) tuple.
            session: Async DB session.

        Returns:
            Dict with win_rate, budget_analysis, narrative, recommendations.
        """
        # Fetch bid history
        stmt = select(Bid).where(Bid.org_id == org_id)
        if sector:
            stmt = stmt.where(Bid.sector == sector)
        result = await session.execute(stmt)
        bids = result.scalars().all()

        if not bids:
            return {
                "sector": sector,
                "total_bids": 0,
                "win_rate": 0.0,
                "budget_analysis": {},
                "narrative": "Insufficient bid history for analysis.",
                "recommendations": [],
                "is_outside_winning_range": False,
            }

        # Convert to DataFrame
        df = pd.DataFrame(
            [
                {
                    "outcome": b.outcome.value if b.outcome else None,
                    "budget": b.budget or 0,
                    "compliance_pct": b.compliance_pct or 0,
                    "score": b.score or 0,
                    "sector": b.sector or "",
                    "response_days": b.response_days or 0,
                }
                for b in bids
            ]
        )

        total_bids = len(df)
        wins = df[df["outcome"] == "win"]
        win_rate = len(wins) / total_bids * 100 if total_bids > 0 else 0.0

        # Budget bucket analysis
        winning_budgets = wins["budget"].dropna()
        budget_analysis: Dict[str, Any] = {}
        if not winning_budgets.empty:
            budget_analysis = {
                "winning_budget_min": float(winning_budgets.min()),
                "winning_budget_max": float(winning_budgets.max()),
                "winning_budget_mean": float(winning_budgets.mean()),
                "winning_budget_median": float(winning_budgets.median()),
            }

        # Check if target budget is outside historical winning range
        is_outside_range = False
        if budget_range and budget_analysis:
            target_min, target_max = budget_range
            winning_min = budget_analysis.get("winning_budget_min", 0)
            winning_max = budget_analysis.get("winning_budget_max", float("inf"))
            is_outside_range = (
                target_max < winning_min * 0.7 or target_min > winning_max * 1.3
            )

        # Compliance stats
        compliance_stats = {
            "win_avg_compliance": float(wins["compliance_pct"].mean()) if not wins.empty else 0.0,
            "loss_avg_compliance": float(
                df[df["outcome"] == "loss"]["compliance_pct"].mean()
            ) if len(df[df["outcome"] == "loss"]) > 0 else 0.0,
        }

        # Win rate by compliance bucket
        df["compliance_bucket"] = pd.cut(
            df["compliance_pct"],
            bins=[0, 50, 70, 85, 100],
            labels=["<50%", "50-70%", "70-85%", ">85%"],
        )
        bucket_win_rates = (
            df[df["outcome"] == "win"].groupby("compliance_bucket").size()
            / df.groupby("compliance_bucket").size()
            * 100
        ).fillna(0)

        # Generate narrative with Claude
        history_summary = (
            f"Sector: {sector}\n"
            f"Total bids: {total_bids}\n"
            f"Win rate: {win_rate:.1f}%\n"
            f"Avg compliance on wins: {compliance_stats['win_avg_compliance']:.1f}%\n"
            f"Winning budget range: {budget_analysis.get('winning_budget_min', 'N/A')} - "
            f"{budget_analysis.get('winning_budget_max', 'N/A')}\n"
            f"Budget outside range: {is_outside_range}"
        )

        system_prompt = (
            "You are a competitive intelligence analyst. Provide 3-4 sentences of actionable "
            "insights about this organization's bid performance. Focus on patterns and recommendations."
        )

        message = await self.provider._client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=400,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze this bid history:\n{history_summary}",
                }
            ],
        )
        narrative = message.content[0].text.strip()

        # Build recommendations
        recommendations = []
        if win_rate < 30:
            recommendations.append("Win rate is below 30% — consider sector targeting improvements.")
        if compliance_stats["win_avg_compliance"] > 80 and compliance_stats["loss_avg_compliance"] < 65:
            recommendations.append("High compliance strongly correlates with wins — prioritize compliance coverage.")
        if is_outside_range:
            recommendations.append("Target budget is outside your historical winning range — reassess bid pricing.")

        logger.info(
            "Competitor intelligence complete",
            sector=sector,
            total_bids=total_bids,
            win_rate=win_rate,
        )

        return {
            "sector": sector,
            "total_bids": total_bids,
            "win_rate": round(win_rate, 2),
            "budget_analysis": budget_analysis,
            "compliance_stats": compliance_stats,
            "bucket_win_rates": bucket_win_rates.to_dict(),
            "narrative": narrative,
            "recommendations": recommendations,
            "is_outside_winning_range": is_outside_range,
        }
