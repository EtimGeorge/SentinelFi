import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from pydantic import BaseModel, Field
from typing import List, Optional
import io
import pandas as pd
import tempfile
import re

# Production libraries (must be installed via requirements.txt)
from unstructured.partition.auto import partition
from unstructured.documents.elements import Table, Element

# --- Pydantic Models (Strict adherence to NestJS DTOs/PostgreSQL Schema) ---


class WBSItemBase(BaseModel):
    """Base model for a single, line-item budget proposal."""

    wbs_code: str = Field(
        ..., max_length=50, description="Unique hierarchical WBS code (e.g., '1.6.1')."
    )
    description: str = Field(
        ..., description="Human-readable description of the cost item."
    )
    unit_cost_budgeted: float = Field(
        ..., ge=0, description="Budgeted cost per unit (NGN)."
    )
    quantity_budgeted: float = Field(
        ..., ge=0.01, description="Budgeted quantity (e.g., 12 Man-Day)."
    )
    parent_wbs_id: Optional[str] = Field(
        None, description="UUID of the parent WBS item (null for Level 1)."
    )
    duration_days_budgeted: Optional[int] = Field(
        None, ge=0, description="Estimated duration in days."
    )


class ValidatedBudgetDraft(BaseModel):
    """The final, validated JSON object returned by the AI agent."""

    project_name: str = Field(
        ..., description="Name of the project the draft belongs to."
    )
    wbs_line_items: List[WBSItemBase] = Field(
        ..., description="List of structured, validated budget line items."
    )
    confidence_score: float = Field(
        ..., description="AI confidence score for the extraction (0.0 to 1.0)."
    )


# --- FastAPI Application Setup ---

app = FastAPI(
    title="SentinelFi AI Document Intelligence Agent",
    description="Microservice for OCR/NLP processing of financial documents to generate validated WBS budget drafts.",
    version="1.0.0",
)

# --- Core AI/Document Intelligence Function ---


def calculate_confidence_score(metrics: dict) -> float:
    """Calculates a rudimentary confidence score based on extraction metrics."""
    score = 0.0

    # Factor 1: Table Processing Success Rate (max 0.4)
    table_success_rate = (
        metrics["successful_tables"] / metrics["total_tables"]
        if metrics["total_tables"] > 0
        else 0
    )
    score += table_success_rate * 0.4

    # Factor 2: Row Extraction Success Rate (max 0.4)
    row_success_rate = (
        metrics["successful_rows"] / metrics["total_rows_attempted"]
        if metrics["total_rows_attempted"] > 0
        else 0
    )
    score += row_success_rate * 0.4

    # Factor 3: Data Conversion Error Rate (penalty, max -0.2)
    # Lower penalty for more errors, score decreases
    error_penalty = (
        metrics["data_conversion_errors"] / metrics["total_rows_attempted"]
        if metrics["total_rows_attempted"] > 0
        else 0
    )
    score -= error_penalty * 0.2

    # Ensure score is between 0 and 1
    return max(0.0, min(1.0, score))


def extract_wbs_data_from_elements(
    elements: List[Element],
) -> tuple[List[WBSItemBase], dict]:
    """
    Parses elements (especially Table elements) for WBS structure.
    This function applies the NGN Budget Template schema mapping.
    It now also returns metrics for confidence score calculation.
    """
    extracted_items: List[WBSItemBase] = []
    metrics = {
        "total_tables": 0,
        "successful_tables": 0,
        "total_rows_attempted": 0,
        "successful_rows": 0,
        "data_conversion_errors": 0,
    }

    # Robust column mapping for various possible header names
    COLUMN_MAPPING = {
        "wbs_code_col": ["S/N", "WBS Category", "WBS Code"],
        "description_col": [
            "Item Description",
            "Item Description (Detailed Breakdown)",
        ],
        "unit_cost_col": ["Unit Cost", "Unit Cost (NGN)"],
        "quantity_col": ["Quantity", "Quantity (Nos.)"],
        "duration_col": ["Man-day (from source document)", "Duration (Days)"],
    }

    # Regex for basic WBS code validation (e.g., 1.2.3, 1, 1.2)
    WBS_CODE_PATTERN = re.compile(r"^\d+(\.\d+)*$")

    for element_idx, element in enumerate(
        elements
    ):  # Added element_idx for better error reporting
        if isinstance(element, Table):
            metrics["total_tables"] += 1
            table_had_successful_rows = False
            try:
                df = pd.read_html(io.StringIO(element.text))[0]

                # Find actual column names based on mapping
                actual_cols = {}
                for key, possible_names in COLUMN_MAPPING.items():
                    for name in possible_names:
                        if name in df.columns:
                            actual_cols[key] = name
                            break

                # Ensure essential columns are present
                if (
                    not actual_cols.get("wbs_code_col")
                    or not actual_cols.get("description_col")
                    or not actual_cols.get("unit_cost_col")
                    or not actual_cols.get("quantity_col")
                ):
                    print(
                        f"Skipping table {element_idx} due to missing essential columns. Found: {df.columns.tolist()}"
                    )
                    continue

                for row_idx, row in df.iterrows():  # Added row_idx for better error reporting
                    metrics["total_rows_attempted"] += 1
                    wbs_code_raw = row.get(actual_cols["wbs_code_col"])

                    if not pd.notna(wbs_code_raw) or not isinstance(wbs_code_raw, str):
                        print(
                            f"Skipping row {row_idx} in table {element_idx}: WBS code is missing or not a string. Row: {row.to_dict()}"
                        )
                        continue

                    wbs_code = str(wbs_code_raw).strip()
                    if not WBS_CODE_PATTERN.match(wbs_code):
                        print(
                            f"Skipping row {row_idx} in table {element_idx}: Invalid WBS code format '{wbs_code}'. Row: {row.to_dict()}"
                        )
                        continue

                    try:
                        description = str(
                            row.get(actual_cols["description_col"], "N/A")
                        ).strip()
                        unit_cost_str = (
                            str(row.get(actual_cols["unit_cost_col"], 0))
                            .replace(",", "")
                            .replace("₦", "")
                            .strip()
                        )
                        quantity_str = (
                            str(row.get(actual_cols["quantity_col"], 0))
                            .replace(",", "")
                            .strip()
                        )
                        duration_str = (
                            str(row.get(actual_cols["duration_col"], "0"))
                            .split()[0]
                            .strip()
                        )

                        unit_cost_budgeted = float(unit_cost_str)
                        quantity_budgeted = float(quantity_str)
                        duration_days_budgeted = (
                            int(duration_str) if duration_str.isdigit() else 0
                        )

                        # CRITICAL: Attempt to create a valid Pydantic model instance
                        item = WBSItemBase(
                            wbs_code=wbs_code,
                            description=description,
                            unit_cost_budgeted=unit_cost_budgeted,
                            quantity_budgeted=quantity_budgeted,
                            duration_days_budgeted=duration_days_budgeted
                            if duration_days_budgeted > 0
                            else None,
                            parent_wbs_id=None,  # Hierarchy linking is a complex step deferred to the NestJS side after all lines are extracted
                        )
                        # Filter out invalid quantity/unit_cost
                        if item.unit_cost_budgeted > 0 and item.quantity_budgeted >= 0.01:
                            extracted_items.append(item)
                            metrics["successful_rows"] += 1
                            table_had_successful_rows = True
                        else:
                            print(
                                f"Skipping row {row_idx} in table {element_idx}: Zero or negative quantity/unit cost. Row: {row.to_dict()}"
                            )

                    except (ValueError, TypeError) as ve:
                        metrics["data_conversion_errors"] += 1
                        print(
                            f"Skipping row {row_idx} in table {element_idx} due to data conversion error: {ve}. Row: {row.to_dict()}"
                        )
                        continue

                if table_had_successful_rows:
                    metrics["successful_tables"] += 1

            except Exception as e:
                print(f"Error processing table {element_idx}: {e}")
                continue

    # CRITICAL: Deduplicate and filter out non-budget items (like total rows)
    # This filter is now mostly handled within the loop, but keep for final check.
    # The final_items list already contains filtered items from the loop
    # We still ensure all items have valid quantities/unit_costs after all processing.
    final_items = [
        item
        for item in extracted_items
        if item.unit_cost_budgeted > 0 or item.quantity_budgeted > 0
    ]

    return final_items, metrics

# --- Endpoints ---


@app.get("/", tags=["Health"])
async def read_root():
    return {"status": "ok", "service": "AI Document Intelligence Agent"}


@app.post(
    "/api/v1/ai/draft-budget", response_model=ValidatedBudgetDraft, tags=["AI Services"]
)
async def draft_budget_from_document(
    project_name: str = Form(..., description="Name of the project."),
    file: UploadFile = File(
        ..., description="The source financial document (PDF, DOCX, CSV, or Image)."
    ),
):
    """
    Analyzes a financial document using OCR/NLP to generate a structured WBS budget draft.
    """

    if file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds 10MB limit.")

    # CRITICAL: Partition the file to extract structured elements
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        # Stream file in chunks to avoid high memory usage for large files
        while contents := await file.read(1024 * 1024):  # Read 1MB chunks
            tmp.write(contents)
        tmp_path = tmp.name

    try:
        # The 'partition' function handles OCR, text extraction, table detection, etc.
        elements = partition(filename=tmp_path)

        # Process the structured elements
        wbs_line_items, metrics = extract_wbs_data_from_elements(elements)

        if not wbs_line_items:
            raise HTTPException(
                status_code=422,
                detail="No valid WBS budget line items could be extracted. Check document formatting.",
            )

        calculated_confidence = calculate_confidence_score(metrics)

        return ValidatedBudgetDraft(
            project_name=project_name,
            wbs_line_items=wbs_line_items,
            confidence_score=calculated_confidence,
        )

    except Exception as e:
        print(f"FATAL DOCUMENT PROCESSING ERROR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed due to internal error: {e}",
        )
    finally:
        os.unlink(tmp_path)  # Clean up the temporary file
