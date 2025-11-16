from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT

def create_invitation():
    doc = SimpleDocTemplate("docs/chanuka/grants applications/Template – Invitation Letter for Goethe Mobility Grant.pdf", pagesize=letter)
    styles = getSampleStyleSheet()

    # Custom styles
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=2,
        alignment=TA_LEFT
    )

    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=14,
        spaceAfter=20,
        alignment=TA_LEFT
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6,
        alignment=TA_JUSTIFY
    )

    signature_style = ParagraphStyle(
        'Signature',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=2,
        alignment=TA_LEFT
    )

    story = []

    # Letterhead
    story.append(Paragraph("Chanuka Civic Engagement Platform", header_style))
    story.append(Paragraph("Nairobi, Kenya", header_style))
    story.append(Paragraph("Email: info@chanuka.org", header_style))
    story.append(Paragraph("Website: www.chanuka.org", header_style))
    story.append(Spacer(1, 0.3*inch))

    # Date
    story.append(Paragraph("November 11, 2025", header_style))
    story.append(Spacer(1, 0.2*inch))

    # Recipient
    story.append(Paragraph("Goethe-Institut Kenya", header_style))
    story.append(Paragraph("Westlands Road", header_style))
    story.append(Paragraph("Nairobi, Kenya", header_style))
    story.append(Spacer(1, 0.2*inch))

    # Subject
    story.append(Paragraph("<b>Subject: Invitation for Chanuka Platform Collaboration under Goethe Mobility Grant</b>", header_style))
    story.append(Spacer(1, 0.2*inch))

    # Salutation
    story.append(Paragraph("Dear Goethe-Institut Team,", body_style))
    story.append(Spacer(1, 0.1*inch))

    # Introduction
    story.append(Paragraph(
        "We are pleased to invite the Goethe-Institut Kenya to collaborate with Chanuka, Kenya's premier civic engagement platform, in developing innovative approaches to democratic participation and cultural exchange through the Goethe Mobility Grant program.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # About Chanuka
    story.append(Paragraph(
        "Chanuka (meaning 'to illuminate' in Swahili) is a digital platform that makes Kenya's legislative processes transparent and accessible to all citizens. Our mission is to bridge the gap between complex governance systems and public understanding, fostering informed civic participation across diverse communities.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Collaboration Proposal
    story.append(Paragraph(
        "We propose a collaborative project that would leverage the Goethe Mobility Grant to:<br/>"
        "• Exchange knowledge between German and Kenyan civic technology experts<br/>"
        "• Develop multilingual features supporting German-English-Swahili interfaces<br/>"
        "• Create joint workshops on digital democracy and civic engagement<br/>"
        "• Establish partnerships between Kenyan civil society and German institutions<br/>"
        "• Pilot cross-cultural approaches to legislative transparency",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Benefits
    story.append(Paragraph(
        "This collaboration would provide mutual benefits:<br/>"
        "• For Goethe-Institut: Enhanced engagement with Kenyan civil society and demonstration of Germany's commitment to global democracy<br/>"
        "• For Chanuka: Access to German expertise in civic technology and international networking opportunities<br/>"
        "• For both partners: Creation of sustainable models for cross-cultural democratic innovation",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Next Steps
    story.append(Paragraph(
        "We would welcome the opportunity to discuss this collaboration in detail and explore how the Goethe Mobility Grant could support our joint efforts. Our team is available to present the Chanuka platform and discuss specific project proposals that align with the grant's objectives.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Closing
    story.append(Paragraph(
        "We look forward to the possibility of working together to strengthen democratic participation and cultural understanding between our nations.",
        body_style
    ))
    story.append(Spacer(1, 0.1*inch))

    # Sign-off
    story.append(Paragraph("Sincerely,", signature_style))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Dr. Sarah Wanjiku", signature_style))
    story.append(Paragraph("Executive Director", signature_style))
    story.append(Paragraph("Chanuka Civic Engagement Platform", signature_style))

    doc.build(story)

if __name__ == "__main__":
    create_invitation()