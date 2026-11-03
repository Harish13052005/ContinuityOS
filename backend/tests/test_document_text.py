from io import BytesIO

import pytest
from docx import Document
from reportlab.pdfgen.canvas import Canvas

from app.services.document_text import DocumentReadError, read_document_text


def test_reads_utf8_text_and_rejects_empty(tmp_path):
    path = tmp_path / "notes.txt"
    path.write_text("\ufeffDecision: keep the source record.", encoding="utf-8")
    content, chunks = read_document_text(path, "txt")
    assert content.startswith("Decision:")
    assert chunks == [content]
    path.write_text("  ", encoding="utf-8")
    with pytest.raises(DocumentReadError, match="no readable text"):
        read_document_text(path, "txt")


def test_reads_docx_paragraphs_and_table(tmp_path):
    document = Document()
    document.add_paragraph("Task: review the handover document.")
    table = document.add_table(rows=1, cols=2)
    table.cell(0, 0).text = "Owner"
    table.cell(0, 1).text = "Reviewer"
    path = tmp_path / "notes.docx"
    document.save(path)
    content, _ = read_document_text(path, "docx")
    assert "Task: review the handover document." in content
    assert "Owner | Reviewer" in content


def test_reads_pdf_text_with_page_locations(tmp_path):
    output = BytesIO()
    canvas = Canvas(output)
    canvas.drawString(72, 720, "Decision: retain page-level evidence.")
    canvas.showPage()
    canvas.drawString(72, 720, "Milestone: reviewer demonstration.")
    canvas.save()
    path = tmp_path / "notes.pdf"
    path.write_bytes(output.getvalue())
    content, pages = read_document_text(path, "pdf")
    assert "Decision: retain page-level evidence." in content
    assert len(pages) == 2
    assert pages[1].strip() == "Milestone: reviewer demonstration."


def test_corrupted_pdf_is_reported_as_a_document_error(tmp_path):
    path = tmp_path / "bad.pdf"
    path.write_bytes(b"%PDF-1.4\nnot a valid pdf")
    with pytest.raises(DocumentReadError, match="corrupted"):
        read_document_text(path, "pdf")
