"""
Import/export router — Excel file upload and processing.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.import_result import ImportResultResponse
from app.services.excel_importer import import_transactions

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/excel", response_model=ImportResultResponse)
async def import_excel(
    file: UploadFile = File(..., description="Excel file (.xlsx) with transactions"),
    db: Session = Depends(get_db),
) -> ImportResultResponse:
    """
    Upload an Excel file and import transactions.

    The Excel file should have columns matching the Spanish headers:
    Fecha, Ticker / Activo, Tipo (Compra/Venta), Cantidad,
    Precio Unit. (€), Comisión (€), Total Invertido (€), Notas.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó un archivo.")

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Use archivos .xlsx o .xls.",
        )

    try:
        contents = await file.read()
        result = import_transactions(db, contents)
        return ImportResultResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando el archivo: {str(e)}",
        )
