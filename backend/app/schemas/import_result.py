"""
Import result Pydantic schema for Excel import responses.
"""

from pydantic import BaseModel


class ImportResultResponse(BaseModel):
    """Schema for import result response."""

    sheets_processed: int
    total_imported: int
    errors: list[str]
    warnings: list[str]
    duplicates_skipped: int
