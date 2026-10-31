import os
import json
import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger("ciirs.reporting")

class InvestigationReportGenerator:
    """
    Generates evidence-backed investigation reports.
    Strict rule: Never hallucinate or fabricate events, people, or timestamps.
    """
    def __init__(self, openai_api_key: str = "", model_name: str = "gpt-4o-mini"):
        self.api_key = openai_api_key
        self.model_name = model_name

    def generate_summary(self, incident: Dict[str, Any], events: List[Dict[str, Any]], matches: List[Dict[str, Any]], gaps: List[Dict[str, Any]]) -> str:
        """
        Generates executive summary. If OpenAI API key is provided and valid, uses LLM
        with strict grounding prompt. Otherwise uses deterministic structured synthesis.
        """
        if self.api_key:
            try:
                import requests
                prompt = f"""
You are the CIIRS (CCTV Incident Intelligence & Reconstruction System) reporting engine.
Generate an objective, fact-based intelligence summary strictly based on the provided surveillance events.
STRICT RULES:
1. Do NOT invent people, timestamps, actions, or conclusions.
2. Rely ONLY on the listed events and candidate matches.
3. Explicitly state any coverage gaps or limitations.

INCIDENT: {incident.get('title')}
WINDOW: {incident.get('time_window_start')} to {incident.get('time_window_end')}
CAMERAS: {incident.get('camera_ids')}
EVENTS RETRIEVED ({len(events)}):
{json.dumps([{'time': e.get('timestamp_seconds'), 'camera': e.get('camera_name', e.get('camera_id')), 'type': e.get('event_type'), 'desc': e.get('description')} for e in events[:25]], indent=2)}

CROSS-CAMERA CANDIDATES ({len(matches)}):
{json.dumps([{'src': m.get('source_camera_id'), 'dst': m.get('target_camera_id'), 'sim': m.get('similarity_score')} for m in matches[:10]], indent=2)}

COVERAGE GAPS ({len(gaps)}):
{json.dumps(gaps, indent=2)}
"""
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json={
                        "model": self.model_name,
                        "messages": [
                            {"role": "system", "content": "You are a professional CCTV intelligence investigation analyst. Summarize solely based on grounded data."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2
                    },
                    timeout=10
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"LLM API call failed ({e}), falling back to deterministic synthesis.")

        # Deterministic Grounded Synthesis
        return self._deterministic_summary(incident, events, matches, gaps)

    def _deterministic_summary(self, inc: Dict[str, Any], events: List[Dict[str, Any]], matches: List[Dict[str, Any]], gaps: List[Dict[str, Any]]) -> str:
        cam_count = len(inc.get('camera_ids', []))
        total_ev = len(events)
        total_m = len(matches)
        
        breakdown = {}
        for e in events:
            t = e.get("event_type", "other")
            breakdown[t] = breakdown.get(t, 0) + 1

        lines = [
            f"EXECUTIVE SUMMARY — INCIDENT RECONSTRUCTION",
            f"Case: {inc.get('title', 'Surveillance Investigation')}",
            f"Investigation Window: {inc.get('time_window_start')} - {inc.get('time_window_end')}",
            f"Active Status: {inc.get('status', 'investigating').upper()}",
            "",
            f"1. OVERVIEW & METHODOLOGY",
            f"CIIRS automated reconstruction analyzed CCTV streams across {cam_count} surveillance camera sector(s).",
            f"A total of {total_ev} chronological events were algorithmically extracted from optical tracking and detection streams.",
            f"{total_m} candidate cross-camera appearance associations met the visual similarity threshold.",
            "",
            f"2. EVENT DISPOSITION",
        ]
        for ev_type, count in breakdown.items():
            lines.append(f" • {ev_type.replace('_', ' ').title()}: {count} occurrence(s)")
        
        lines.append("")
        lines.append("3. CROSS-CAMERA SUBJECT CORRELATION")
        if matches:
            for idx, m in enumerate(matches[:5], 1):
                sim = m.get('similarity_score', 0) * 100
                lines.append(f" • Candidate #{idx}: {sim:.1f}% feature similarity between Camera {m.get('source_camera_id', '')[:8]} and Camera {m.get('target_camera_id', '')[:8]}")
        else:
            lines.append(" • No candidate matches crossed the similarity threshold in the analyzed window.")

        lines.append("")
        lines.append("4. FOOTAGE INTEGRITY & GAPS")
        if gaps:
            lines.append(f"NOTICE: {len(gaps)} camera recording interval(s) were missing or incomplete:")
            for g in gaps:
                lines.append(f" • {g.get('camera_name', 'Camera')}: {g.get('reason', 'Missing footage')}")
        else:
            lines.append("Continuous video coverage was confirmed across all requested cameras for the entire 30-minute window.")

        lines.append("")
        lines.append("5. HUMAN REVIEW & EVIDENTIARY DISCLAIMER")
        lines.append("All cross-camera associations and event classifications are computer-assisted candidates and do not constitute absolute certainty. Final verification rests with the primary investigating officer.")
        
        return "\n".join(lines)

    def export_pdf(self, incident: Dict[str, Any], events: List[Dict[str, Any]], matches: List[Dict[str, Any]], gaps: List[Dict[str, Any]], summary_text: str, output_path: str) -> str:
        """
        Exports a high-grade intelligence dossier PDF using ReportLab
        """
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            doc = SimpleDocTemplate(
                output_path,
                pagesize=letter,
                rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
            )

            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=18,
                textColor=colors.HexColor('#0f172a'),
                spaceAfter=6
            )
            sub_style = ParagraphStyle(
                'DocSub',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#475569'),
                spaceAfter=12
            )
            h2_style = ParagraphStyle(
                'DocH2',
                parent=styles['Heading2'],
                fontSize=12,
                textColor=colors.HexColor('#1e3a8a'),
                spaceBefore=10,
                spaceAfter=6
            )
            body_style = ParagraphStyle(
                'DocBody',
                parent=styles['Normal'],
                fontSize=9,
                leading=13,
                textColor=colors.HexColor('#1e293b')
            )
            table_header_style = ParagraphStyle(
                'TableHeader',
                parent=styles['Normal'],
                fontSize=8,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#ffffff')
            )
            table_cell_style = ParagraphStyle(
                'TableCell',
                parent=styles['Normal'],
                fontSize=8,
                leading=10,
                textColor=colors.HexColor('#0f172a')
            )

            story = []

            # Header Banner
            story.append(Paragraph("<b>CONFIDENTIAL // LAW ENFORCEMENT & SECURITY INTELLIGENCE</b>", sub_style))
            story.append(Paragraph(f"CIIRS Incident Intelligence Report: {incident.get('title', 'Case File')}", title_style))
            story.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Automated Reconstruction System", sub_style))
            story.append(Spacer(1, 8))

            # Case Metadata Table
            meta_data = [
                [Paragraph("<b>Incident ID:</b>", table_cell_style), Paragraph(str(incident.get('id', 'N/A')), table_cell_style),
                 Paragraph("<b>Review Status:</b>", table_cell_style), Paragraph(str(incident.get('status', 'Investigating')).upper(), table_cell_style)],
                [Paragraph("<b>Time Window Start:</b>", table_cell_style), Paragraph(str(incident.get('time_window_start', 'N/A')), table_cell_style),
                 Paragraph("<b>Time Window End:</b>", table_cell_style), Paragraph(str(incident.get('time_window_end', 'N/A')), table_cell_style)],
                [Paragraph("<b>Total Events:</b>", table_cell_style), Paragraph(str(len(events)), table_cell_style),
                 Paragraph("<b>Candidate Matches:</b>", table_cell_style), Paragraph(str(len(matches)), table_cell_style)]
            ]
            meta_table = Table(meta_data, colWidths=[100, 160, 100, 160])
            meta_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(meta_table)
            story.append(Spacer(1, 12))

            # Executive Summary Section
            story.append(Paragraph("1. Executive Summary", h2_style))
            for para in summary_text.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.replace('\n', '<br/>'), body_style))
                    story.append(Spacer(1, 4))

            # Chronological Timeline Table
            story.append(Spacer(1, 8))
            story.append(Paragraph("2. Chronological Event Timeline", h2_style))
            event_rows = [[
                Paragraph("<b>Time</b>", table_header_style),
                Paragraph("<b>Camera</b>", table_header_style),
                Paragraph("<b>Event Type</b>", table_header_style),
                Paragraph("<b>Description</b>", table_header_style),
                Paragraph("<b>Status</b>", table_header_style)
            ]]
            for ev in events[:20]: # Show up to 20 key events
                t_str = str(ev.get('timestamp_seconds', '0')) + "s"
                c_name = ev.get('camera_name', str(ev.get('camera_id', 'Cam'))[:8])
                e_type = str(ev.get('event_type', '')).replace('_', ' ').title()
                desc = str(ev.get('description', ''))
                status = str(ev.get('review_status', 'candidate')).title()
                event_rows.append([
                    Paragraph(t_str, table_cell_style),
                    Paragraph(c_name, table_cell_style),
                    Paragraph(e_type, table_cell_style),
                    Paragraph(desc, table_cell_style),
                    Paragraph(status, table_cell_style)
                ])

            ev_table = Table(event_rows, colWidths=[45, 90, 85, 230, 70])
            ev_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(ev_table)

            # Cross-Camera Candidates Section
            if matches:
                story.append(Spacer(1, 8))
                story.append(Paragraph("3. Cross-Camera Candidate Appearances", h2_style))
                match_rows = [[
                    Paragraph("<b>Source Camera</b>", table_header_style),
                    Paragraph("<b>Target Camera</b>", table_header_style),
                    Paragraph("<b>Similarity Score</b>", table_header_style),
                    Paragraph("<b>Match Status</b>", table_header_style)
                ]]
                for m in matches[:10]:
                    s_cam = m.get('source_camera_name', str(m.get('source_camera_id', 'Cam 1'))[:8])
                    t_cam = m.get('target_camera_name', str(m.get('target_camera_id', 'Cam 2'))[:8])
                    score = f"{m.get('similarity_score', 0)*100:.1f}%"
                    m_stat = str(m.get('match_status', 'Candidate')).title()
                    match_rows.append([
                        Paragraph(s_cam, table_cell_style),
                        Paragraph(t_cam, table_cell_style),
                        Paragraph(score, table_cell_style),
                        Paragraph(m_stat, table_cell_style)
                    ])

                match_table = Table(match_rows, colWidths=[130, 130, 120, 140])
                match_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f766e')),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
                    ('TOPPADDING', (0,0), (-1,-1), 4),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ]))
                story.append(match_table)

            doc.build(story)
            return output_path
        except Exception as e:
            logger.error(f"Failed exporting PDF report with ReportLab: {e}")
            # Fallback text file
            txt_path = output_path.replace('.pdf', '.txt')
            with open(txt_path, 'w') as f:
                f.write(summary_text)
            return txt_path
