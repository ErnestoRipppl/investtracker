"""
Market data service using yfinance.

Provides cached price lookups with exponential backoff on failure.
All prices returned as Decimal for financial precision.
"""

import logging
import math
import random
import time
from datetime import datetime
from decimal import Decimal

import yfinance as yf

logger = logging.getLogger(__name__)

# Cache: ticker -> (price, timestamp, stale)
_price_cache: dict[str, tuple[Decimal, datetime, bool]] = {}

CACHE_TTL = 900  # 15 minutes


def _is_cache_valid(ticker: str) -> bool:
    """Check if cached price for ticker is still within TTL."""
    if ticker not in _price_cache:
        return False
    _, timestamp, _ = _price_cache[ticker]
    elapsed = (datetime.utcnow() - timestamp).total_seconds()
    return elapsed < CACHE_TTL


def _fetch_price_yfinance(ticker: str) -> Decimal | None:
    """
    Fetch a single price from yfinance, with smart mapping for known tickers.

    Args:
        ticker: Stock ticker symbol.

    Returns:
        Current price as Decimal, or None if unavailable.
    """
    actual_ticker = ticker
    is_usd = False

    # Smart mapping for common European/crypto assets on Yahoo Finance
    if ticker == "EUNL":
        actual_ticker = "EUNL.DE"
    elif ticker == "RENDER":
        actual_ticker = "RENDER-USD"
        is_usd = True

    try:
        stock = yf.Ticker(actual_ticker)
        info = stock.fast_info
        price_val = getattr(info, "last_price", None)
        if price_val is not None:
            price_float = float(price_val)
            if math.isfinite(price_float):
                price_dec = Decimal(str(round(price_float, 4)))
                if is_usd:
                    rate = get_eur_usd_rate()
                    price_dec = (price_dec / rate).quantize(Decimal("0.0001"))
                return price_dec
                
        hist = stock.history(period="1d")
        if not hist.empty and "Close" in hist.columns:
            non_nan_close = hist["Close"].dropna()
            if not non_nan_close.empty:
                val = float(non_nan_close.iloc[-1])
                if math.isfinite(val):
                    price_dec = Decimal(str(round(val, 4)))
                    if is_usd:
                        rate = get_eur_usd_rate()
                        price_dec = (price_dec / rate).quantize(Decimal("0.0001"))
                    return price_dec
    except Exception as e:
        logger.warning(f"yfinance error for {ticker} (fetched as {actual_ticker}): {e}")
    return None


def get_current_price(ticker: str) -> dict:
    """
    Get current price for a ticker with caching and fast retry.

    Tries yfinance first. On failure, retries once.
    If attempts fail, returns cached price or None.

    Args:
        ticker: Stock ticker symbol (e.g., 'AAPL', 'MSFT').

    Returns:
        dict with 'price' (Decimal or None) and 'stale' (bool).
    """
    # Return cached if valid
    if _is_cache_valid(ticker):
        price, _, _ = _price_cache[ticker]
        return {"price": price, "stale": False}

    # Fast retry: max 2 attempts, no long sleep to prevent API hangs
    max_retries = 2
    for attempt in range(max_retries):
        price = _fetch_price_yfinance(ticker)
        if price is not None:
            _price_cache[ticker] = (price, datetime.utcnow(), False)
            return {"price": price, "stale": False}

        if attempt < max_retries - 1:
            time.sleep(0.1)

    # All retries failed — return stale cache if available
    if ticker in _price_cache:
        cached_price, ts, _ = _price_cache[ticker]
        _price_cache[ticker] = (cached_price, ts, True)
        logger.warning(f"Returning stale price for {ticker}")
        return {"price": cached_price, "stale": True}

    logger.error(f"No price available for {ticker}")
    return {"price": None, "stale": True}


def get_bulk_prices(tickers: list[str]) -> dict[str, dict]:
    """
    Get prices for multiple tickers.

    Uses yfinance's download for efficiency, falling back to individual
    lookups for failures.

    Args:
        tickers: List of ticker symbols.

    Returns:
        dict mapping ticker -> {'price': Decimal|None, 'stale': bool}.
    """
    results: dict[str, dict] = {}

    # Map tickers to actual Yahoo symbols and track which ones are in USD
    mapped_tickers = []
    ticker_info = {} # actual_symbol -> (original_symbol, is_usd)
    for t in tickers:
        actual = t
        is_usd = False
        if t == "EUNL":
            actual = "EUNL.DE"
        elif t == "RENDER":
            actual = "RENDER-USD"
            is_usd = True
        mapped_tickers.append(actual)
        ticker_info[actual] = (t, is_usd)

    # Try bulk download first
    try:
        if mapped_tickers:
            data = yf.download(
                mapped_tickers, period="1d", progress=False, threads=True
            )
            if not data.empty:
                if len(mapped_tickers) == 1:
                    actual = mapped_tickers[0]
                    original, is_usd = ticker_info[actual]
                    if "Close" in data.columns:
                        col = data["Close"]
                        non_nan_col = col.dropna()
                        if not non_nan_col.empty:
                            price_val = float(non_nan_col.iloc[-1])
                            if math.isfinite(price_val):
                                price = Decimal(str(round(price_val, 4)))
                                if is_usd:
                                    rate = get_eur_usd_rate()
                                    price = (price / rate).quantize(Decimal("0.0001"))
                                _price_cache[original] = (price, datetime.utcnow(), False)
                                results[original] = {"price": price, "stale": False}
                else:
                    close = data.get("Close")
                    if close is not None:
                        for actual, (original, is_usd) in ticker_info.items():
                            try:
                                col = close[actual] if actual in close.columns else None
                                if col is not None and not col.empty:
                                    non_nan_col = col.dropna()
                                    if not non_nan_col.empty:
                                        price_val = float(non_nan_col.iloc[-1])
                                        if math.isfinite(price_val):
                                            price = Decimal(str(round(price_val, 4)))
                                            if is_usd:
                                                rate = get_eur_usd_rate()
                                                price = (price / rate).quantize(Decimal("0.0001"))
                                            _price_cache[original] = (
                                                price, datetime.utcnow(), False
                                            )
                                            results[original] = {
                                                "price": price, "stale": False
                                            }
                            except Exception:
                                pass
    except Exception as e:
        logger.warning(f"Bulk download failed: {e}")

    # Fill in missing tickers individually
    for ticker in tickers:
        if ticker not in results:
            results[ticker] = get_current_price(ticker)

    return results


def get_eur_usd_rate() -> Decimal:
    """
    Get the current EUR/USD exchange rate via yfinance.

    Returns:
        EUR/USD rate as Decimal. Defaults to 1.0800 on failure.
    """
    try:
        ticker = yf.Ticker("EURUSD=X")
        info = ticker.fast_info
        rate_val = getattr(info, "last_price", None)
        if rate_val is not None:
            rate_float = float(rate_val)
            if math.isfinite(rate_float):
                return Decimal(str(round(rate_float, 4)))

        hist = ticker.history(period="1d")
        if not hist.empty and "Close" in hist.columns:
            non_nan_close = hist["Close"].dropna()
            if not non_nan_close.empty:
                rate_float = float(non_nan_close.iloc[-1])
                if math.isfinite(rate_float):
                    return Decimal(str(round(rate_float, 4)))
    except Exception as e:
        logger.warning(f"Failed to get EUR/USD rate: {e}")

    return Decimal("1.0800")  # Default fallback


def refresh_cache(tickers: list[str] | None = None) -> dict:
    """
    Force refresh the price cache for given tickers or all cached tickers.

    Args:
        tickers: Optional list of tickers to refresh. If None, refreshes all.

    Returns:
        dict with 'refreshed' count and 'failed' list.
    """
    if tickers is None:
        tickers = list(_price_cache.keys())

    refreshed = 0
    failed = []

    for ticker in tickers:
        price = _fetch_price_yfinance(ticker)
        if price is not None:
            _price_cache[ticker] = (price, datetime.utcnow(), False)
            refreshed += 1
        else:
            failed.append(ticker)

    return {"refreshed": refreshed, "failed": failed}
