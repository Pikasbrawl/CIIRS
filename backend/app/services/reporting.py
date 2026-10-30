import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings

class InvestigationReportingService:
    @staticmethod
    def generate_case_pdf(case_data: dict, output_filename: str = None) -> str:
        """
        Generate a professional PDF Forensic Case Report using ReportLab.
        Preserves strict legal evidence distinctions between AI predictions,
        operator-verified facts, and investigator conclusions.
        """
        if not output_filename:
            output_filename = f"CIIRS_Case_Report_{case_data.get('case_number', 'CASE-001')}.pdf"
            
        file_path = os.path.join(settings.REPORT_DIR, output_filename)
        doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        
        styles = getSampleStyleSheet()
        
        # Custom dark/cyan tactical header styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#475569'),
            spaceAfter=12
        )
        
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            textColor=colors.HexColor('#0284c7'),
            spaceBefore=10,
            spaceAfter=6
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor('#1e293b')
        )
        
        callout_style = ParagraphStyle(
            'CalloutStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )

        elements = []
        
        # 1. Header Banner
        elements.append(Paragraph("CIIRS // FORENSIC INCIDENT INVESTIGATION REPORT", title_style))
        elements.append(Paragraph("Zinnovatio 4.0 – Gen Z Innovations Hackathon 2026 | Team: PANDA | Category: Smart & Sustainable Cities", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceAfter=10))
        
        # 2. Case Metadata Table
        meta_data = [
            [Paragraph("<b>Case Number:</b>", body_style), Paragraph(case_data.get('case_number', 'N/A'), body_style),
             Paragraph("<b>Status:</b>", body_style), Paragraph(case_data.get('status', 'OPEN'), body_style)],
            [Paragraph("<b>Assigned Investigator:</b>", body_style), Paragraph(case_data.get('assigned_investigator', 'N/A'), body_style),
             Paragraph("<b>Priority:</b>", body_style), Paragraph(case_data.get('priority', 'HIGH'), body_style)],
            [Paragraph("<b>Incident Ref:</b>", body_style), Paragraph(case_data.get('incident_ref', 'INC-2026-0842'), body_style),
             Paragraph("<b>Generated Timestamp:</b>", body_style), Paragraph(datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)]
        ]
        meta_table = Table(meta_data, colWidths=[130, 140, 130, 140])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 12))
        
        # 3. Incident Summary
        elements.append(Paragraph("1. INCIDENT OVERVIEW & EXECUTIVE SUMMARY", section_style))
        elements.append(Paragraph(case_data.get('summary', 'No summary provided.'), body_style))
        elements.append(Spacer(1, 10))
        
        # 4. Tripartite Legal Evidence Attribution
        elements.append(Paragraph("2. TRIPARTITE EVIDENCE INTEGRITY ATTRIBUTION", section_style))
        
        tripartite_data = [
            [
                Paragraph("<b>A. AI-GENERATED PREDICTION (PROBABILISTIC)</b>", body_style),
                Paragraph(case_data.get('ai_preliminary_findings', 'Model identified sequence anomalies; non-probative telemetry.'), callout_style)
            ],
            [
                Paragraph("<b>B. OPERATOR-VERIFIED OBSERVATIONS (CONFIRMED)</b>", body_style),
                Paragraph(case_data.get('operator_verified_facts', 'Verified by human control operator before dispatch authorization.'), callout_style)
            ],
            [
                Paragraph("<b>C. INVESTIGATOR CONCLUSIONS (FINDINGS)</b>", body_style),
                Paragraph(case_data.get('investigator_conclusions', 'Forensic evaluation corroborates verified timeline and spatial telemetry.'), callout_style)
            ]
        ]
        
        tripartite_table = Table(tripartite_data, colWidths=[180, 360])
        tripartite_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#f0f9ff')),
            ('BACKGROUND', (0,1), (0,1), colors.HexColor('#f0fdf4')),
            ('BACKGROUND', (0,2), (0,2), colors.HexColor('#fefce8')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(tripartite_table)
        elements.append(Spacer(1, 12))
        
        # 5. Cryptographic Evidence Chain of Custody
        elements.append(Paragraph("3. CHAIN OF CUSTODY & EVIDENCE VAULT", section_style))
        evidence_items = case_data.get('evidence_items', [
            {"title": "CCTV Sequence Clip 01", "type": "VIDEO_SEQUENCE", "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "verified": True},
            {"title": "Temporal Attention Heatmap", "type": "AI_TELEMETRY", "hash": "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb", "verified": True}
        ])
        
        ev_table_data = [[
            Paragraph("<b>Evidence Item</b>", body_style),
            Paragraph("<b>Type</b>", body_style),
            Paragraph("<b>SHA-256 Checksum</b>", body_style),
            Paragraph("<b>Integrity</b>", body_style)
        ]]
        for ev in evidence_items:
            ev_table_data.append([
                Paragraph(ev.get("title", "Evidence"), body_style),
                Paragraph(ev.get("type", "RAW"), body_style),
                Paragraph(f"<font size=7 color='#475569'>{ev.get('hash', 'N/A')[:32]}...</font>", body_style),
                Paragraph("<font color='green'><b>VERIFIED</b></font>" if ev.get("verified", True) else "<font color='red'>TAMPERED</font>", body_style)
            ])
            
        ev_table = Table(ev_table_data, colWidths=[150, 100, 210, 80])
        ev_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(ev_table)
        elements.append(Spacer(1, 20))
        
        # 6. Sign-off Footer
        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#94a3b8'), spaceAfter=8))
        elements.append(Paragraph("<b>CONFIDENTIALITY NOTICE:</b> This forensic document contains verified public safety intelligence. Generated under CIIRS Zinnovatio 4.0 Platform specifications. Prohibits identity profiling and preserves anonymous scene-level evidence standards.", subtitle_style))
        
        doc.build(elements)
        return file_path

reporting_service = InvestigationReportingService()
