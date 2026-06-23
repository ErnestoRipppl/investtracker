"""
Asset model representing a financial instrument (stock, ETF, bond, etc.).
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.transaction import Transaction


class Asset(Base):
    """
    Represents a financial asset/instrument in the portfolio.

    Attributes:
        id: Primary key, auto-incremented.
        ticker: Unique stock ticker symbol (e.g., 'AAPL', 'MSFT').
        name: Human-readable name of the asset.
        asset_type: Type of asset ('stock', 'etf', 'bond', 'crypto', 'fund').
        sector: Industry sector (e.g., 'Technology', 'Healthcare').
        currency: Trading currency (default 'EUR').
        exchange: Exchange where the asset is traded.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(20), default="stock", nullable=False)
    sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="EUR", nullable=False)
    exchange: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)

    # Relationships
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="asset", cascade="all, delete-orphan"
    )

    @classmethod
    def determine_type(cls, ticker: str) -> str:
        """
        Determine the asset type ('crypto', 'etf', 'stock') based on the ticker.
        """
        t = ticker.strip().upper()
        # Clean suffixes (e.g. BTC-EUR -> BTC, ETH.DE -> ETH)
        base = t.split("-")[0].split(".")[0]
        
        crypto_symbols = {
            "BTC", "ETH", "SOL", "ADA", "DOT", "XRP", "DOGE", "LTC", "LINK", 
            "UNI", "AVAX", "RENDER", "USDT", "USDC", "BNB", "TRX", "SHIB", 
            "MATIC", "TON", "XLM", "NEAR", "LDO", "ICP", "FIL", "HBAR", "VET"
        }
        
        if base in crypto_symbols or any(c in t for c in ("BTC-", "ETH-", "SOL-", "RENDER-")):
            return "crypto"
            
        if any(ext in t for ext in (".DE", ".AS", ".PA", ".MI", ".L")) or "ETF" in t:
            return "etf"
            
        return "stock"

    def __repr__(self) -> str:
        return f"<Asset(id={self.id}, ticker='{self.ticker}', name='{self.name}')>"

