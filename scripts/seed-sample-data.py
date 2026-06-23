#!/usr/bin/env python
import os
import sys
from datetime import date
from decimal import Decimal
import json

# Add backend folder to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import SessionLocal, init_db
from app.models import Asset, Broker, InvestorProfile, PortfolioSnapshot, Transaction

def seed_data():
    print("Initializing database...")
    init_db()
    
    db = SessionLocal()
    try:
        # Clear existing data to allow re-running
        print("Clearing existing data...")
        db.query(Transaction).delete()
        db.query(PortfolioSnapshot).delete()
        db.query(Asset).delete()
        db.query(InvestorProfile).delete()
        db.query(Broker).delete()
        db.commit()

        # Seed Brokers
        print("Seeding brokers...")
        ib = Broker(
            name="Interactive Brokers",
            commission_type="fixed",
            commission_fixed_eur=Decimal("1.25"),
            commission_pct=Decimal("0.0"),
            min_commission_eur=Decimal("1.25"),
            max_commission_eur=None,
            custody_fee_annual_pct=Decimal("0.0"),
            fx_spread_pct=Decimal("0.002"),
            is_default=True
        )
        degiro = Broker(
            name="DEGIRO",
            commission_type="fixed",
            commission_fixed_eur=Decimal("1.00"),
            commission_pct=Decimal("0.0"),
            min_commission_eur=Decimal("1.00"),
            max_commission_eur=None,
            custody_fee_annual_pct=Decimal("0.0"),
            fx_spread_pct=Decimal("0.0025"),
            is_default=False
        )
        tr = Broker(
            name="Trade Republic",
            commission_type="fixed",
            commission_fixed_eur=Decimal("1.00"),
            commission_pct=Decimal("0.0"),
            min_commission_eur=Decimal("1.00"),
            max_commission_eur=None,
            custody_fee_annual_pct=Decimal("0.0"),
            fx_spread_pct=Decimal("0.0"),
            is_default=False
        )
        db.add_all([ib, degiro, tr])
        db.commit()

        # Seed Assets
        print("Seeding assets...")
        aapl = Asset(
            ticker="AAPL",
            name="Apple Inc.",
            asset_type="stock",
            sector="Technology",
            currency="USD",
            exchange="NASDAQ"
        )
        msft = Asset(
            ticker="MSFT",
            name="Microsoft Corporation",
            asset_type="stock",
            sector="Technology",
            currency="USD",
            exchange="NASDAQ"
        )
        vwce = Asset(
            ticker="VWCE.DE",
            name="Vanguard FTSE All-World UCITS ETF",
            asset_type="etf",
            sector="Global",
            currency="EUR",
            exchange="XETRA"
        )
        btc = Asset(
            ticker="BTC-EUR",
            name="Bitcoin EUR",
            asset_type="crypto",
            sector="Technology",
            currency="EUR",
            exchange="Binance"
        )
        db.add_all([aapl, msft, vwce, btc])
        db.commit()

        # Seed Transactions
        print("Seeding transactions...")
        txs = [
            Transaction(
                asset_id=vwce.id,
                transaction_type="buy",
                quantity=Decimal("50"),
                unit_price=Decimal("98.50"),
                commission=Decimal("1.25"),
                total_invested=Decimal("4926.25"),
                date=date(2026, 1, 15),
                broker_id=ib.id,
                notes="Compra inicial ETF global"
            ),
            Transaction(
                asset_id=aapl.id,
                transaction_type="buy",
                quantity=Decimal("15"),
                unit_price=Decimal("170.00"),
                commission=Decimal("1.25"),
                total_invested=Decimal("2551.25"),
                date=date(2026, 1, 20),
                broker_id=ib.id,
                notes="Posición inicial Apple"
            ),
            Transaction(
                asset_id=btc.id,
                transaction_type="buy",
                quantity=Decimal("0.10"),
                unit_price=Decimal("42000.00"),
                commission=Decimal("5.00"),
                total_invested=Decimal("4205.00"),
                date=date(2026, 2, 5),
                broker_id=ib.id,
                notes="Exposición Bitcoin"
            ),
            Transaction(
                asset_id=vwce.id,
                transaction_type="buy",
                quantity=Decimal("30"),
                unit_price=Decimal("101.20"),
                commission=Decimal("1.25"),
                total_invested=Decimal("3037.25"),
                date=date(2026, 2, 15),
                broker_id=ib.id,
                notes="Aportación mensual ETF"
            ),
            Transaction(
                asset_id=msft.id,
                transaction_type="buy",
                quantity=Decimal("10"),
                unit_price=Decimal("390.00"),
                commission=Decimal("1.25"),
                total_invested=Decimal("3901.25"),
                date=date(2026, 3, 10),
                broker_id=ib.id,
                notes="Microsoft inversión"
            ),
            Transaction(
                asset_id=vwce.id,
                transaction_type="buy",
                quantity=Decimal("30"),
                unit_price=Decimal("103.50"),
                commission=Decimal("1.25"),
                total_invested=Decimal("3106.25"),
                date=date(2026, 3, 15),
                broker_id=ib.id,
                notes="Aportación mensual ETF"
            ),
            Transaction(
                asset_id=aapl.id,
                transaction_type="buy",
                quantity=Decimal("10"),
                unit_price=Decimal("175.50"),
                commission=Decimal("1.25"),
                total_invested=Decimal("1756.25"),
                date=date(2026, 4, 12),
                broker_id=ib.id,
                notes="Incrementar Apple"
            ),
            Transaction(
                asset_id=btc.id,
                transaction_type="buy",
                quantity=Decimal("0.05"),
                unit_price=Decimal("58000.00"),
                commission=Decimal("5.00"),
                total_invested=Decimal("2905.00"),
                date=date(2026, 4, 25),
                broker_id=ib.id,
                notes="Compra BTC en retroceso"
            ),
            Transaction(
                asset_id=vwce.id,
                transaction_type="buy",
                quantity=Decimal("40"),
                unit_price=Decimal("106.00"),
                commission=Decimal("1.25"),
                total_invested=Decimal("4241.25"),
                date=date(2026, 5, 15),
                broker_id=ib.id,
                notes="Aportación mensual ETF"
            ),
            Transaction(
                asset_id=aapl.id,
                transaction_type="sell",
                quantity=Decimal("5"),
                unit_price=Decimal("192.00"),
                commission=Decimal("1.25"),
                total_invested=Decimal("958.75"),
                date=date(2026, 5, 20),
                broker_id=ib.id,
                notes="Toma parcial de beneficios Apple"
            ),
            Transaction(
                asset_id=msft.id,
                transaction_type="buy",
                quantity=Decimal("5"),
                unit_price=Decimal("415.00"),
                commission=Decimal("1.25"),
                total_invested=Decimal("2076.25"),
                date=date(2026, 6, 5),
                broker_id=ib.id,
                notes="Ampliar Microsoft"
            ),
        ]
        db.add_all(txs)
        db.commit()

        # Seed Investor Profile
        print("Seeding investor profile...")
        profile = InvestorProfile(
            profile_type="Growth",
            risk_tolerance_score=75,
            time_horizon_years=15,
            investment_objective="Crecimiento de capital a largo plazo y maximización de retorno ajustado al riesgo",
            monthly_contribution=Decimal("1000.00"),
            max_acceptable_drawdown_pct=Decimal("25.00"),
            questionnaire_answers=json.dumps({
                "situacion_financiera_1": "ahorro_alto",
                "situacion_financiera_2": "ingresos_estables",
                "horizonte_temporal_1": "mas_10_anos",
                "tolerancia_riesgo_1": "aceptar_volatilidad",
                "tolerancia_riesgo_2": "comprar_mas",
                "experiencia_1": "avanzada",
                "objetivos_1": "maximo_retorno"
            }),
            recommended_allocation=json.dumps({
                "renta_variable": 75.0,
                "renta_fija": 15.0,
                "alternativos": 8.0,
                "liquidez": 2.0
            }),
            is_active=True
        )
        db.add(profile)
        db.commit()

        # Seed Portfolio Snapshots for historical chart
        print("Seeding portfolio snapshots...")
        snapshots = [
            PortfolioSnapshot(
                date=date(2026, 1, 31),
                total_invested=Decimal("7477.50"),
                total_value_eur=Decimal("7650.00"),
                total_pnl=Decimal("172.50"),
                holdings_json=json.dumps({
                    "VWCE.DE": {"qty": 50, "avg_price": 98.50, "market_price": 100.00},
                    "AAPL": {"qty": 15, "avg_price": 170.00, "market_price": 176.66}
                })
            ),
            PortfolioSnapshot(
                date=date(2026, 2, 28),
                total_invested=Decimal("14719.75"),
                total_value_eur=Decimal("14890.00"),
                total_pnl=Decimal("170.25"),
                holdings_json=json.dumps({
                    "VWCE.DE": {"qty": 80, "avg_price": 99.5125, "market_price": 101.50},
                    "AAPL": {"qty": 15, "avg_price": 170.00, "market_price": 172.00},
                    "BTC-EUR": {"qty": 0.10, "avg_price": 42050.00, "market_price": 41800.00}
                })
            ),
            PortfolioSnapshot(
                date=date(2026, 3, 31),
                total_invested=Decimal("21727.25"),
                total_value_eur=Decimal("22240.00"),
                total_pnl=Decimal("512.75"),
                holdings_json=json.dumps({
                    "VWCE.DE": {"qty": 110, "avg_price": 100.60, "market_price": 104.20},
                    "AAPL": {"qty": 15, "avg_price": 170.00, "market_price": 174.50},
                    "MSFT": {"qty": 10, "avg_price": 390.125, "market_price": 395.00},
                    "BTC-EUR": {"qty": 0.10, "avg_price": 42050.00, "market_price": 43500.00}
                })
            ),
            PortfolioSnapshot(
                date=date(2026, 4, 30),
                total_invested=Decimal("26388.50"),
                total_value_eur=Decimal("27550.00"),
                total_pnl=Decimal("1161.50"),
                holdings_json=json.dumps({
                    "VWCE.DE": {"qty": 110, "avg_price": 100.60, "market_price": 105.80},
                    "AAPL": {"qty": 25, "avg_price": 172.20, "market_price": 178.20},
                    "MSFT": {"qty": 10, "avg_price": 390.125, "market_price": 402.00},
                    "BTC-EUR": {"qty": 0.15, "avg_price": 47366.6666, "market_price": 57000.00}
                })
            ),
            PortfolioSnapshot(
                date=date(2026, 5, 31),
                total_invested=Decimal("29671.00"),
                total_value_eur=Decimal("31220.00"),
                total_pnl=Decimal("1549.00"),
                holdings_json=json.dumps({
                    "VWCE.DE": {"qty": 150, "avg_price": 102.05, "market_price": 107.50},
                    "AAPL": {"qty": 20, "avg_price": 172.20, "market_price": 190.50},
                    "MSFT": {"qty": 10, "avg_price": 390.125, "market_price": 415.00},
                    "BTC-EUR": {"qty": 0.15, "avg_price": 47366.6666, "market_price": 59200.00}
                })
            ),
            PortfolioSnapshot(
                date=date(2026, 6, 21),
                total_invested=Decimal("31747.25"),
                total_value_eur=Decimal("33850.00"),
                total_pnl=Decimal("2102.75"),
                holdings_json=json.dumps({
                    "VWCE.DE": {"qty": 150, "avg_price": 102.05, "market_price": 108.90},
                    "AAPL": {"qty": 20, "avg_price": 172.20, "market_price": 195.40},
                    "MSFT": {"qty": 15, "avg_price": 398.4166, "market_price": 420.20},
                    "BTC-EUR": {"qty": 0.15, "avg_price": 47366.6666, "market_price": 61200.00}
                })
            ),
        ]
        db.add_all(snapshots)
        db.commit()

        print("Database seeded successfully with premium test data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
