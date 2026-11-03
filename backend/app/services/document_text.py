"""Extract bounded plain text from supported local source documents."""

from __future__ import annotations

from pathlib import Path
from zipfile import BadZipFile, ZipFile


class DocumentReadError(ValueError):
    pass


def read_document_text(path: Path, source_type: str) -> tuple[str, list[str]]:
    """Return text and page/section chunks; chunks preserve evidence locations."""
    kind = source_type.lower()
    if kind in {"txt", "markdown", "md", "csv", "json"}:
        try:
            text = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError as exc:
            raise DocumentReadError("Text source must be valid UTF-8") from exc
        if not text.strip():
            raise DocumentReadError("Document has no readable text")
        return text, [text]

    if kind == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(path), strict=True)
            if reader.is_encrypted:
                raise DocumentReadError("Password-protected PDFs are not supported")
            if len(reader.pages) > 500:
                raise DocumentReadError("PDF exceeds the 500-page processing limit")
            pages = [(page.extract_text() or "") for page in reader.pages]
        except DocumentReadError:
            raise
        except Exception as exc:
            raise DocumentReadError("PDF is corrupted or could not be parsed") from exc
        text = "\n".join(pages)
        if not text.strip():
            raise DocumentReadError("PDF contains no extractable text; scanned image OCR is not available")
        return text, pages

    if kind == "docx":
        try:
            with ZipFile(path) as archive:
                if sum(info.file_size for info in archive.infolist()) > 50 * 1024 * 1024:
                    raise DocumentReadError("DOCX expands beyond the 50 MB processing limit")
            from docx import Document
            document = Document(str(path))
            parts = [p.text for p in document.paragraphs if p.text.strip()]
            parts.extend(" | ".join(cell.text for cell in row.cells) for table in document.tables for row in table.rows)
        except DocumentReadError:
            raise
        except (BadZipFile, KeyError, ValueError) as exc:
            raise DocumentReadError("DOCX is corrupted or invalid") from exc
        except Exception as exc:
            raise DocumentReadError("DOCX could not be parsed") from exc
        text = "\n".join(parts)
        if not text.strip():
            raise DocumentReadError("DOCX contains no readable text")
        return text, [text]

    raise DocumentReadError("Unsupported source type")
