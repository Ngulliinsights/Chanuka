from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib import colors

def create_overview():
    doc = SimpleDocTemplate("docs/chanuka/grants applications/Chanuka – 1-Page Overview.pdf", pagesize=letter)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
        alignment=TA_CENTER
    )

    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=8,
        spaceBefore=8
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=4,
        alignment=TA_JUSTIFY
    )

    story = []

    # Title
    story.append(Paragraph("Chanuka: Legislative Transparency Platform", title_style))
    story.append(Spacer(1, 0.15*inch))

    # Mission
    story.append(Paragraph("Mission", heading_style))
    story.append(Paragraph(
        "To illuminate Kenya's legislative processes, making governance transparent, accessible, and participatory for all citizens.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Key Features
    story.append(Paragraph("Key Features", heading_style))

    features_data = [
        ["Bill Tracking", "Real-time monitoring of legislative progress, amendments, and voting records"],
        ["Stakeholder Mapping", "Visual representation of relationships between sponsors, contributors, and legislation"],
        ["Conflict Detection", "Automated analysis of potential conflicts of interest in legislative processes"],
        ["Public Engagement", "Tools for citizen comments, petitions, and community discussions"],
        ["Educational Resources", "Simplified explanations of legal concepts and legislative procedures"],
        ["Mobile Access", "Responsive design optimized for smartphones and low-bandwidth connections"]
    ]

    features_table = Table(features_data, colWidths=[1.5*inch, 4.5*inch])
    features_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(features_table)
    story.append(Spacer(1, 0.1*inch))

    # Impact Metrics
    story.append(Paragraph("Expected Impact", heading_style))

    impact_data = [
        ["Users", "500,000+ engaged citizens within 2 years"],
        ["Bills Tracked", "Complete coverage of Kenyan Parliament legislation"],
        ["Conflicts Identified", "Automated detection of legislative conflicts"],
        ["Civic Literacy", "Improved public understanding of governance"],
        ["Accountability", "Enhanced transparency in legislative processes"]
    ]

    impact_table = Table(impact_data, colWidths=[1.5*inch, 4.5*inch])
    impact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(impact_table)
    story.append(Spacer(1, 0.1*inch))

    # Technical Approach
    story.append(Paragraph("Technical Approach", heading_style))
    story.append(Paragraph(
        "• Open-source architecture for sustainability and transparency<br/>"
        "• Cloud-based deployment for scalability and reliability<br/>"
        "• AI-assisted analysis for conflict detection and content summarization<br/>"
        "• Multi-language support (English, Swahili, and local languages)<br/>"
        "• API-first design enabling integration with existing government systems",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Partnership Opportunities
    story.append(Paragraph("Partnership Opportunities", heading_style))
    story.append(Paragraph(
        "• Government agencies for data integration and official recognition<br/>"
        "• Civil society organizations for community outreach and validation<br/>"
        "• Academic institutions for research and evaluation<br/>"
        "• Technology partners for platform development and scaling<br/>"
        "• International organizations for knowledge exchange and funding",
        body_style
    ))

    doc.build(story)

if __name__ == "__main__":
    create_overview()