#!/usr/bin/env python
import os
import sys

# Add backend folder to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import SessionLocal
from app.models import Asset, InvestorProfile, PortfolioSnapshot, Transaction


def clear_data():
    print("Conectando a la base de datos...")
    db = SessionLocal()
    try:
        print("Eliminando transacciones de prueba...")
        db.query(Transaction).delete()
        print("Eliminando snapshots históricos de prueba...")
        db.query(PortfolioSnapshot).delete()
        print("Eliminando activos de prueba...")
        db.query(Asset).delete()
        print("Eliminando perfiles de inversor de prueba...")
        db.query(InvestorProfile).delete()
        
        db.commit()
        print("\n¡Base de datos limpiada con éxito!")
        print("Los brokers por defecto (Interactive Brokers, DEGIRO, Trade Republic) se han conservado para tu comodidad.")
        print("Ya puedes arrancar la app e importar tu archivo Excel directamente.")
    except Exception as e:
        db.rollback()
        print(f"Error al limpiar la base de datos: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    clear_data()
