import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
)

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")


def generate_pdf_report(patient: dict, sample_image_path: str, result: dict, report_id: int) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    output_path = os.path.join(REPORTS_DIR, f"report_{report_id}.pdf")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleCustom", parent=styles["Title"], textColor=colors.HexColor("#1f4e5f"))
    disclaimer_style = ParagraphStyle(
        "Disclaimer", parent=styles["Normal"], textColor=colors.HexColor("#8a6d00"),
        backColor=colors.HexColor("#fff8e1"), borderPadding=8, fontSize=9,
    )

    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    story = []

    story.append(Paragraph("Parkinson's Handwriting Screening Report", title_style))
    story.append(Spacer(1, 0.5 * cm))

    # Patient details table
    patient_data = [
        ["Name", patient.get("name", "-")],
        ["Age", str(patient.get("age", "-"))],
        ["Gender", patient.get("gender", "-")],
        ["Report Date", result.get("generated_at", "-")],
    ]
    patient_table = Table(patient_data, colWidths=[4 * cm, 10 * cm])
    patient_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 0.7 * cm))

    # Uploaded drawing thumbnail
    if os.path.exists(sample_image_path):
        story.append(Paragraph("Uploaded Sample", styles["Heading2"]))
        story.append(RLImage(sample_image_path, width=6 * cm, height=6 * cm))
        story.append(Spacer(1, 0.5 * cm))

    # Result summary
    story.append(Paragraph("Screening Result", styles["Heading2"]))
    result_data = [
        ["Predicted classification", result["predicted_label"].capitalize()],
        ["Confidence", f"{result['confidence']}%"],
        ["Likelihood band", result["severity_band"]],
        ["Smoothness score", f"{result['features']['smoothness_score']} / 100"],
        ["Tremor index", str(result["features"]["tremor_index"])],
    ]
    result_table = Table(result_data, colWidths=[6 * cm, 8 * cm])
    result_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eaf3f5")),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 0.8 * cm))

    story.append(Paragraph(
        "<b>Important:</b> " + result["disclaimer"],
        disclaimer_style,
    ))

    doc.build(story)
    return output_path


def generate_batch_pdf_report(patient: dict, samples: list, result: dict, report_id: int) -> str:
    """
    Batch version of generate_pdf_report - lays out ALL uploaded drawings
    (not just one), each with its own individual verdict, plus the
    majority-vote summary and averaged metrics.

    samples: list of dicts, one per uploaded drawing, in the same order they
             were submitted:
             {"image_path": str, "predicted_label": str, "confidence": float,
              "drawing_type": str}
    result: aggregate dict - same shape as the single-report `result` plus
            "votes_parkinson", "votes_healthy", "total_samples":
            {"predicted_label", "confidence", "severity_band", "cnn_score",
             "classical_score", "features": {"tremor_index", "smoothness_score"},
             "generated_at", "disclaimer", "votes_parkinson", "votes_healthy",
             "total_samples"}
    """
    os.makedirs(REPORTS_DIR, exist_ok=True)
    output_path = os.path.join(REPORTS_DIR, f"batch_report_{report_id}.pdf")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleCustom", parent=styles["Title"], textColor=colors.HexColor("#1f4e5f"))
    disclaimer_style = ParagraphStyle(
        "Disclaimer", parent=styles["Normal"], textColor=colors.HexColor("#8a6d00"),
        backColor=colors.HexColor("#fff8e1"), borderPadding=8, fontSize=9,
    )
    caption_style = ParagraphStyle(
        "Caption", parent=styles["Normal"], fontSize=7.5, alignment=1, leading=9.5,
    )
    missing_style = ParagraphStyle(
        "Missing", parent=styles["Normal"], fontSize=8, alignment=1, textColor=colors.HexColor("#999999"),
    )

    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    story = []

    story.append(Paragraph("Parkinson's Handwriting Screening Report (Batch)", title_style))
    story.append(Spacer(1, 0.5 * cm))

    # Patient details table
    patient_data = [
        ["Name", patient.get("name", "-")],
        ["Age", str(patient.get("age", "-"))],
        ["Gender", patient.get("gender", "-")],
        ["Report Date", result.get("generated_at", "-")],
    ]
    patient_table = Table(patient_data, colWidths=[4 * cm, 10 * cm])
    patient_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 0.7 * cm))

    # Majority-vote summary
    story.append(Paragraph("Majority Vote Result", styles["Heading2"]))
    total = result.get("total_samples", len(samples))
    votes_p = result.get("votes_parkinson", 0)
    votes_h = result.get("votes_healthy", 0)
    winning_votes = votes_p if result["predicted_label"] == "parkinson" else votes_h
    result_data = [
        ["Final classification", result["predicted_label"].capitalize()],
        ["Vote breakdown", f"{winning_votes} of {total} drawings"],
        ["Average confidence", f"{result['confidence']}%"],
        ["Likelihood band", result["severity_band"]],
        ["Avg. smoothness score", f"{result['features']['smoothness_score']} / 100"],
        ["Avg. tremor index", str(result["features"]["tremor_index"])],
    ]
    result_table = Table(result_data, colWidths=[6 * cm, 8 * cm])
    result_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eaf3f5")),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 0.8 * cm))

    # Grid of ALL uploaded drawings, each with its own verdict
    story.append(Paragraph(f"All {len(samples)} Uploaded Drawings", styles["Heading2"]))
    story.append(Spacer(1, 0.2 * cm))

    COLS = 5
    THUMB = 3.0 * cm

    grid_rows = []
    img_row, caption_row = [], []
    for i, s in enumerate(samples, start=1):
        image_path = s.get("image_path")
        if image_path and os.path.exists(image_path):
            cell_img = RLImage(image_path, width=THUMB, height=THUMB)
        else:
            cell_img = Paragraph("(image missing)", missing_style)

        label = (s.get("predicted_label") or "-").capitalize()
        conf = s.get("confidence", "-")
        dtype = (s.get("drawing_type") or "-").capitalize()
        cell_caption = Paragraph(f"#{i} &middot; {dtype}<br/>{label} ({conf}%)", caption_style)

        img_row.append(cell_img)
        caption_row.append(cell_caption)

        if len(img_row) == COLS:
            grid_rows.append(img_row)
            grid_rows.append(caption_row)
            img_row, caption_row = [], []

    if img_row:
        while len(img_row) < COLS:
            img_row.append("")
            caption_row.append("")
        grid_rows.append(img_row)
        grid_rows.append(caption_row)

    grid_table = Table(grid_rows, colWidths=[THUMB + 0.4 * cm] * COLS)
    grid_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(grid_table)
    story.append(Spacer(1, 0.8 * cm))

    story.append(Paragraph(
        "<b>Important:</b> " + result["disclaimer"],
        disclaimer_style,
    ))

    doc.build(story)
    return output_path
