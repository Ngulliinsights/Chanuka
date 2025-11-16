from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER

def create_concept_note():
    doc = SimpleDocTemplate("docs/chanuka/grants applications/Chanuka – Concept Note.pdf", pagesize=letter)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=TA_CENTER
    )

    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        spaceBefore=12
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6,
        alignment=TA_JUSTIFY
    )

    story = []

    # Title
    story.append(Paragraph("Chanuka: Illuminating Legislative Transparency in Kenya", title_style))
    story.append(Spacer(1, 0.25*inch))

    # Executive Summary
    story.append(Paragraph("Executive Summary", heading_style))
    story.append(Paragraph(
        "Chanuka is a pioneering civic engagement platform that transforms Kenya's legislative process from opaque bureaucracy into transparent, accessible democracy. By making governance visible, understandable, and actionable, Chanuka empowers citizens to participate meaningfully in the laws that shape their lives. This concept note outlines our innovative approach to bridging the gap between complex legislation and public understanding, fostering informed civic participation across Kenya.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # The Problem
    story.append(Paragraph("The Problem: Democratic Deficit in Legislative Transparency", heading_style))
    story.append(Paragraph(
        "Kenya's democratic framework provides robust institutions, yet citizens often feel disconnected from legislative processes. Complex legal language, limited public access to bill information, and insufficient tools for tracking legislative relationships create barriers to meaningful civic engagement. This opacity undermines accountability and allows special interests to influence legislation without public scrutiny.",
        body_style
    ))
    story.append(Paragraph(
        "Current challenges include: inaccessible bill texts, unclear stakeholder relationships, lack of conflict-of-interest analysis, and insufficient public education on legislative processes. These issues disproportionately affect marginalized communities who lack the resources to navigate complex governance systems.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # The Solution
    story.append(Paragraph("The Solution: Chanuka Platform", heading_style))
    story.append(Paragraph(
        "Chanuka (Swahili for 'to illuminate' or 'to enlighten') addresses these challenges through a comprehensive digital platform that democratizes legislative information. Our solution combines advanced data analysis, user-friendly interfaces, and community engagement tools to make governance transparent and participatory.",
        body_style
    ))
    story.append(Paragraph(
        "Key platform features include: automated bill tracking and analysis, stakeholder relationship mapping, conflict-of-interest detection, public comment systems, and educational resources on legislative processes. The platform serves citizens, journalists, advocacy organizations, and policymakers.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Project Objectives
    story.append(Paragraph("Project Objectives", heading_style))
    story.append(Paragraph(
        "1. Develop a comprehensive legislative transparency platform accessible to all Kenyan citizens<br/>"
        "2. Establish automated systems for tracking bill sponsors, amendments, and voting patterns<br/>"
        "3. Create tools for identifying potential conflicts of interest in legislation<br/>"
        "4. Build community engagement features that facilitate public participation in governance<br/>"
        "5. Provide educational resources to improve civic literacy and democratic participation",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Methodology
    story.append(Paragraph("Methodology and Implementation", heading_style))
    story.append(Paragraph(
        "Chanuka employs a multi-phase approach combining technology development, data integration, and community outreach. Phase 1 focuses on core platform development with integration of existing parliamentary data sources. Phase 2 introduces advanced analytical features including AI-assisted conflict detection and stakeholder mapping. Phase 3 expands community engagement tools and mobile accessibility.",
        body_style
    ))
    story.append(Paragraph(
        "Technical implementation leverages open-source technologies for sustainability and includes comprehensive security measures to protect sensitive legislative data while ensuring public access.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Expected Impact
    story.append(Paragraph("Expected Impact and Outcomes", heading_style))
    story.append(Paragraph(
        "Chanuka aims to achieve measurable improvements in Kenya's democratic participation:<br/>"
        "• Increased public awareness of legislative processes (target: 500,000 engaged users within 2 years)<br/>"
        "• Enhanced accountability through transparent stakeholder relationship mapping<br/>"
        "• Improved civic literacy through accessible educational content<br/>"
        "• Strengthened democratic institutions through informed public participation<br/>"
        "• Reduced corruption through automated conflict-of-interest detection",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Sustainability
    story.append(Paragraph("Sustainability and Scale", heading_style))
    story.append(Paragraph(
        "Chanuka is designed for long-term sustainability through a hybrid funding model combining philanthropic support, government partnerships, and user-generated revenue. The platform's open-source architecture ensures adaptability and reduces dependency on external funding. Strategic partnerships with Kenyan civil society organizations will support ongoing maintenance and expansion.",
        body_style
    ))
    story.append(Paragraph(
        "Scalability features include modular architecture, cloud-based deployment, and multi-language support to serve Kenya's diverse linguistic landscape.",
        body_style
    ))

    doc.build(story)

if __name__ == "__main__":
    create_concept_note()