import datetime
import os
from pathlib import Path
from fpdf import FPDF

class CertificatePDF(FPDF):
    def header(self):
        # Path to the logo in the frontend assets
        logo_path = Path(__file__).parent.parent / "frontend" / "src" / "assets" / "unisabana_logo.png"
        if logo_path.exists():
            # Add logo at the center-top
            self.image(str(logo_path), x=80, y=10, w=50)
        self.ln(30)  # Move below logo

    def footer(self):
        self.set_y(-25)
        self.set_font("helvetica", "", 8)
        self.set_text_color(136, 136, 136)
        self.cell(0, 5, "Facultad de Ingeniería · Universidad de La Sabana", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 5, "Documento generado automáticamente", align="C")

def generate_pdf_bytes(profesor_name: str, records: list) -> bytes:
    pdf = CertificatePDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(0, 43, 92)  # #002B5C
    pdf.cell(0, 10, "Certificado de Docencia", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # Certification Text
    pdf.set_font("helvetica", "", 11)
    pdf.set_text_color(51, 51, 51)  # #333333
    text = (
        f"La Universidad de la Sabana certifica que el/la docente {profesor_name.upper()} "
        "ha impartido las siguientes asignaturas, cumpliendo con las horas establecidas "
        "durante los periodos académicos indicados a continuación."
    )
    pdf.multi_cell(0, 6, text, align="J")
    pdf.ln(10)

    # Table Header
    pdf.set_font("helvetica", "B", 10)
    pdf.set_fill_color(242, 242, 242)
    pdf.set_text_color(51, 51, 51)
    
    # Calculate column widths (Total A4 width is 210mm, margins are 10mm each side -> 190mm available)
    col1_w = 40
    col2_w = 110
    col3_w = 40
    
    pdf.cell(col1_w, 8, "Semestre", border=1, fill=True, align="C")
    pdf.cell(col2_w, 8, "Asignatura", border=1, fill=True, align="L")
    pdf.cell(col3_w, 8, "Horas", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")

    # Table Body
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(68, 68, 68)
    
    total_horas = 0
    for r in records:
        ciclo = r.get("ciclo_lectivo", "")
        asignatura = r.get("nombre_curso") or r.get("materia") or ""
        horas = r.get("horas_semestre", 0)
        total_horas += horas
        
        # Handle long text in Subject column
        x_before = pdf.get_x()
        y_before = pdf.get_y()
        
        # Draw semester
        pdf.cell(col1_w, 8, str(ciclo), border=1, align="C")
        
        # Draw subject (multicell for wrapping)
        pdf.set_xy(x_before + col1_w, y_before)
        # We find how many lines it will take to make cells same height if needed, 
        # but for simplicity, we just truncate or use a fixed height cell. 
        # To make it simple and elegant, we truncate if too long, or just let it be.
        subject_text = str(asignatura)[:55]
        pdf.cell(col2_w, 8, subject_text, border=1, align="L")
        
        # Draw hours
        pdf.set_xy(x_before + col1_w + col2_w, y_before)
        pdf.cell(col3_w, 8, str(horas), border=1, align="C", new_x="LMARGIN", new_y="NEXT")

    # Total Row
    pdf.set_font("helvetica", "B", 10)
    pdf.set_fill_color(249, 249, 249)
    pdf.cell(col1_w + col2_w, 8, "Total Horas:", border=1, fill=True, align="R")
    pdf.cell(col3_w, 8, str(total_horas), border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    
    # Footer date text
    pdf.set_font("helvetica", "", 11)
    pdf.set_text_color(51, 51, 51)
    
    # Spanish date format manually
    months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    now = datetime.datetime.now()
    formatted_date = f"{now.day} de {months[now.month - 1]} de {now.year}"
    
    footer_text = f"Se expide el presente certificado a solicitud del interesado para los fines que estime convenientes, a los {formatted_date}."
    pdf.multi_cell(0, 6, footer_text, align="J")
    
    return pdf.output(dest="S")
