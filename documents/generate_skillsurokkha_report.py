from datetime import date
from html import escape
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED


OUT = Path(__file__).with_name("SkillSurokkha_Final_Project_Report.docx")
TABLE_WIDTH = 9000


def t(value):
    return escape(str(value), quote=False)


def run(text, bold=False, italic=False, size=24):
    props = []
    if bold:
        props.append("<w:b/>")
    if italic:
        props.append("<w:i/>")
    props.append(f'<w:sz w:val="{size}"/>')
    props.append(f'<w:szCs w:val="{size}"/>')
    return (
        "<w:r><w:rPr>"
        + "".join(props)
        + f'</w:rPr><w:t xml:space="preserve">{t(text)}</w:t></w:r>'
    )


def para(text="", style=None, align=None, bold=False, italic=False, size=24, page_break=False):
    props = []
    if style:
        props.append(f'<w:pStyle w:val="{style}"/>')
    if align:
        props.append(f'<w:jc w:val="{align}"/>')
    body = run(text, bold=bold, italic=italic, size=size) if text else ""
    if page_break:
        body += '<w:r><w:br w:type="page"/></w:r>'
    return "<w:p><w:pPr>" + "".join(props) + "</w:pPr>" + body + "</w:p>"


def bullet(text):
    return (
        '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
        '<w:jc w:val="both"/>'
        "</w:pPr>"
        + run(text)
        + "</w:p>"
    )


def page_break():
    return para(page_break=True)


def table(rows, widths=None):
    column_count = len(rows[0])
    if widths:
        total = sum(widths)
        widths = [round(width * TABLE_WIDTH / total) for width in widths]
        widths[-1] += TABLE_WIDTH - sum(widths)
    else:
        base = TABLE_WIDTH // column_count
        widths = [base] * column_count
        widths[-1] += TABLE_WIDTH - sum(widths)
    xml = [
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>'
        f'<w:tblW w:w="{TABLE_WIDTH}" w:type="dxa"/>'
        '<w:jc w:val="center"/>'
        '<w:tblLayout w:type="fixed"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="999999"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="999999"/></w:tblBorders>'
        "</w:tblPr><w:tblGrid>"
    ]
    for width in widths:
        xml.append(f'<w:gridCol w:w="{width}"/>')
    xml.append("</w:tblGrid>")
    for r, row in enumerate(rows):
        xml.append("<w:tr>")
        for i, cell in enumerate(row):
            shade = '<w:shd w:fill="E8F3EE"/>' if r == 0 else ""
            xml.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{widths[i]}" w:type="dxa"/>{shade}</w:tcPr>'
                + para(str(cell), align="left", bold=(r == 0), size=22)
                + "</w:tc>"
            )
        xml.append("</w:tr>")
    xml.append("</w:tbl>")
    return "".join(xml)


def figure_box(caption, description):
    return (
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:sz w:val="20"/></w:rPr>'
        '<w:t>[Insert screenshot or diagram here]</w:t></w:r></w:p>'
        + para(description, align="center", italic=True, size=20)
        + para(caption, align="center", bold=True, size=21)
    )


def section(title, level=1):
    align = "center" if level == 1 and title.lower().startswith("chapter") else None
    return para(title, style=f"Heading{level}", align=align, bold=True, size=32 if level == 1 else 28)


def add_paragraphs(parts, items):
    for item in items:
        parts.append(para(item, size=24))


def styles_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="360" w:after="200"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:color="auto"/></w:tblBorders></w:tblPr>
  </w:style>
</w:styles>"""


def numbering_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>"""


def footer_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:fldSimple w:instr="PAGE">
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>1</w:t></w:r>
    </w:fldSimple>
  </w:p>
</w:ftr>"""


def document_xml():
    parts = []
    today = date(2026, 6, 27).strftime("%d %B, %Y")

    parts += [
        para("SkillSurokkha", align="center", bold=True, size=44),
        para("A Trusted Freelance Marketplace with AI Skill Verification and Secure Escrow", align="center", italic=True, size=26),
        para("by", align="center", size=24),
        para("[Student Name] (Exam Roll: [Roll])", align="center", bold=True, size=24),
        para("[Student Name] (Exam Roll: [Roll])", align="center", bold=True, size=24),
        para("[Student Name] (Exam Roll: [Roll])", align="center", bold=True, size=24),
        para("A project report submitted to the Institute of Information Technology", align="center", size=24),
        para("in partial fulfilment of the requirements for the degree of Bachelor of Science in Information Technology", align="center", size=24),
        para("Supervisor: Dr. M. Shamim Kaiser", align="center", bold=True, size=24),
        para("Professor, IIT, JU", align="center", size=24),
        para("Institute of Information Technology, Jahangirnagar University", align="center", size=24),
        para("Savar, Dhaka-1342", align="center", size=24),
        para(today, align="center", size=24),
        page_break(),
    ]

    parts += [
        para("DECLARATION", align="center", bold=True, size=32),
        para("This project report is submitted to the Institute of Information Technology, Jahangirnagar University, Savar, Dhaka in partial fulfilment of the requirements for having the B.Sc. (Hons.) degree in Information Technology. This report is prepared for the 2nd year 2nd semester course project work and course viva. We hereby declare that the project work titled SkillSurokkha is based on the results developed and observed by ourselves. Materials, ideas and technologies taken from other sources are mentioned in the reference section. This report, neither in whole nor in part, has been previously submitted for any degree."),
        para("CANDIDATE'S SIGNATURE", bold=True),
        para("[Student Name]          [Student Name]          [Student Name]", align="center"),
        para("Exam Roll: [Roll]       Exam Roll: [Roll]       Exam Roll: [Roll]", align="center"),
        page_break(),
        para("CERTIFICATE", align="center", bold=True, size=32),
        para('The project titled "SkillSurokkha" submitted by the students of Session 2021-2022 has been accepted as satisfactory in partial fulfilment of the requirement for the degree of Bachelor of Science in Information Technology.'),
        para("Dr. M. Shamim Kaiser", bold=True),
        para("Professor, Institute of Information Technology, Jahangirnagar University, Savar, Dhaka-1342, Bangladesh."),
        para("Supervisor", bold=True),
        para("Accepted and approved in partial fulfilment of the requirement for the degree Bachelor of Science (Honours) in Information Technology.", align="center"),
        para("BOARD OF EXAMINERS", align="center", bold=True),
        table([
            ["Name", "Designation"],
            ["Professor Dr. M. Shamim Kaiser", "Chairman"],
            ["Dr. Fahima Tabassum", "Member"],
            ["Md. Mahmudur Rahman", "Member"],
            ["Professor Md. Obaidur Rahman, PhD", "External Member"],
        ], [4500, 3000]),
        page_break(),
        para("DEDICATION", align="center", bold=True, size=32),
        para("With deep love and gratitude, we dedicate this project to our parents, teachers and well-wishers. Their patience, support and encouragement helped us continue the work and complete the project with confidence."),
        page_break(),
        para("ACKNOWLEDGEMENT", align="center", bold=True, size=32),
        para("First and foremost, we thank the Almighty for giving us the opportunity, patience and strength to complete this project successfully. Working on SkillSurokkha gave us practical experience in full-stack web development, database design, real-time communication and AI-assisted workflow design."),
        para("We are deeply grateful to our respected supervisor, Dr. M. Shamim Kaiser, Professor, Institute of Information Technology, Jahangirnagar University, for his valuable guidance, suggestions and continuous support. We also express our gratitude to all faculty members of IIT, JU for creating an academic environment where we could apply classroom knowledge to a real software project."),
        page_break(),
        para("ABSTRACT", align="center", bold=True, size=32),
        para("Freelancing has become an important earning opportunity for skilled professionals, but many online marketplaces still face problems related to trust, skill authenticity, payment security, communication gaps and dispute handling. SkillSurokkha is a web-based freelance marketplace designed to reduce these problems by combining role-based user management, AI-assisted skill verification, project posting, proposal submission, secure escrow payment, real-time messaging, automated project requirement review, deadline monitoring, dispute handling and wallet withdrawal workflow. The frontend of the system is developed using Next.js, React and Tailwind CSS, while the backend is built with Node.js, Express.js, MySQL and Socket.IO. Skill verification videos are analyzed through FFmpeg, FFprobe and speech-to-text providers such as Hugging Face Whisper or a local Whisper fallback. Submitted project work can be checked against client-defined acceptance requirements using an AI-assisted evaluation service. The system supports three major roles: freelancer, client and administrator. Freelancers can create rich profiles, verify skills, apply to projects, submit work and request withdrawals. Clients can create projects, fund escrow, hire freelancers, review submitted work and approve payment release. Administrators can manage users, pending reviews, disputes and payout processing. The result is a practical marketplace prototype that focuses on trust, accountability and safer digital work transactions."),
        para("Keywords: Freelance Marketplace, Skill Verification, AI Review, Escrow Payment, Next.js, Express.js, MySQL, Socket.IO, Whisper, Project Evaluation."),
        page_break(),
    ]

    parts += [
        para("TABLE OF CONTENTS", align="center", bold=True, size=32),
        para("Declaration ............................................................................................ i"),
        para("Certificate ............................................................................................. ii"),
        para("Dedication ............................................................................................ iii"),
        para("Acknowledgement ................................................................................ iv"),
        para("Abstract ................................................................................................. v"),
        para("List of Figures ..................................................................................... ix"),
        para("List of Tables ....................................................................................... x"),
        para("Chapter 1: Introduction ....................................................................... 1"),
        para("Chapter 2: Literature Review .............................................................. 5"),
        para("Chapter 3: Methodology ..................................................................... 9"),
        para("Chapter 4: Result and Discussion ....................................................... 18"),
        para("Chapter 5: Conclusion ........................................................................ 33"),
        para("References .......................................................................................... 35"),
        page_break(),
        para("LIST OF FIGURES", align="center", bold=True, size=32),
        para("Figure 3.1: System flowchart for SkillSurokkha"),
        para("Figure 3.2: System architecture of SkillSurokkha"),
        para("Figure 3.3: Entity relationship overview"),
        para("Figure 4.1: Landing page"),
        para("Figure 4.2: Authentication modal"),
        para("Figure 4.3: Freelancer dashboard"),
        para("Figure 4.4: Client project creation"),
        para("Figure 4.5: Skill verification upload"),
        para("Figure 4.6: Project application workflow"),
        para("Figure 4.7: Realtime messaging page"),
        para("Figure 4.8: Project submission and AI review"),
        para("Figure 4.9: Admin dashboard"),
        page_break(),
        para("LIST OF TABLES", align="center", bold=True, size=32),
        para("Table 3.1: Software specification"),
        para("Table 3.2: Hardware specification"),
        para("Table 3.3: Major database entities"),
        para("Table 3.4: API module summary"),
        page_break(),
    ]

    parts.append(section("Chapter 1: Introduction"))
    parts.append(section("Background Study", 2))
    add_paragraphs(parts, [
        "The growth of remote work and digital services has created new income opportunities for students, designers, developers, writers and many other professionals. Freelance marketplaces help clients find skilled workers and help freelancers earn through project-based work. However, the success of such platforms depends on trust. Clients must trust that a freelancer actually has the claimed skills, and freelancers must trust that their payment will be protected after completing the work.",
        "Traditional freelance platforms often depend on profile descriptions, manual reviews and client feedback. These methods are useful, but they can be slow or incomplete for new freelancers who do not yet have a long work history. Payment disputes, missed deadlines, unclear requirements and weak communication can also reduce confidence in an online marketplace.",
        "SkillSurokkha addresses these issues by building a trust-oriented freelance marketplace. The system includes AI-assisted skill verification through short video explanations, secure escrow funding before hiring, real-time messaging after hiring, AI-assisted requirement matching for delivered project work, deadline tracking and administrative dispute resolution. It is designed as a full-stack web application using modern technologies such as Next.js, Node.js, Express.js, MySQL and Socket.IO.",
    ])
    parts.append(section("Motivation", 2))
    add_paragraphs(parts, [
        "The motivation behind this project came from the practical problems faced by new freelancers and small clients. A new freelancer may have strong ability but no verified proof, while a client may hesitate to hire someone without reliable evidence. Similarly, freelancers may be afraid of delivering work without guaranteed payment. These problems are especially important in developing countries where online income can create meaningful opportunities.",
        "SkillSurokkha attempts to reduce this trust gap. A freelancer can submit a short skill verification video, answer task-based questions and receive a preliminary AI score. A client must fund an escrow before hiring, which gives the freelancer confidence that payment is reserved. Project requirements are captured clearly during project creation so that submitted work can be reviewed against measurable acceptance criteria.",
    ])
    parts.append(section("Problem Statement", 2))
    add_paragraphs(parts, [
        "Many freelance workflows suffer from unreliable skill claims, unclear project requirements, delayed payments, poor communication and weak dispute management. Existing marketplaces may provide large-scale solutions, but for a student project and local context there is a need for a simple, integrated and understandable platform that combines skill verification, protected hiring, communication and project delivery review in one system.",
    ])
    parts.append(section("Objectives", 2))
    for item in [
        "To develop a role-based freelance marketplace for freelancers, clients and administrators.",
        "To allow freelancers to create detailed profiles including skills, portfolio, availability and hourly rate.",
        "To implement AI-assisted skill verification using video upload, media metadata checking and speech transcription.",
        "To allow clients to post projects with budget, deadline, required skills and acceptance requirements.",
        "To support proposal submission, shortlisting, escrow funding and freelancer hiring.",
        "To provide real-time authenticated messaging between client and hired freelancer.",
        "To evaluate submitted work against project requirements and support revision, approval and escrow release.",
        "To provide admin features for user management, pending skill review, dispute handling and withdrawal processing.",
    ]:
        parts.append(bullet(item))
    parts.append(section("Research Outline", 2))
    parts.append(para("This report is divided into five chapters. Chapter 1 introduces the background, motivation, problem statement and objectives of SkillSurokkha. Chapter 2 reviews existing freelance marketplace and skill verification concepts. Chapter 3 explains the methodology, system analysis, architecture, database design and implementation tools. Chapter 4 presents the implemented results and discusses major system pages and workflows. Chapter 5 concludes the report with limitations and future plans."))
    parts.append(page_break())

    parts.append(section("Chapter 2: Literature Review"))
    parts.append(section("Overview", 2))
    add_paragraphs(parts, [
        "Freelance marketplaces, secure payment systems and online identity verification have been researched and implemented in many forms. Platforms such as Upwork, Fiverr and Freelancer connect clients and freelancers globally. They provide job posting, bidding, messaging and review systems. However, trust-building mechanisms vary from platform to platform.",
        "Modern platforms increasingly use automated checks, portfolio verification, payment protection and dispute workflows. AI tools are also becoming useful for analyzing text, extracting information and assisting reviewers. SkillSurokkha follows this trend by using AI support in two areas: skill verification video analysis and submitted project requirement review.",
    ])
    parts.append(section("Existing Systems", 2))
    for item in [
        "Upwork provides job posting, freelancer profiles, proposals, contracts, escrow and reviews.",
        "Fiverr focuses on service packages where freelancers sell predefined gigs.",
        "Freelancer.com supports bidding contests, hourly work and project-based hiring.",
        "LinkedIn and GitHub can show professional identity and portfolio but do not provide complete project escrow and delivery review in the same workflow.",
    ]:
        parts.append(bullet(item))
    parts.append(section("Limitations of Existing Systems", 2))
    for item in [
        "New freelancers may struggle to prove ability without previous reviews.",
        "Manual verification can be slow and expensive.",
        "Clients may provide vague project requirements, causing revision disputes later.",
        "Freelancers may feel insecure if payment protection is weak or unclear.",
        "Some platforms are complex for small projects and beginner users.",
    ]:
        parts.append(bullet(item))
    parts.append(section("Contribution of This Project", 2))
    for item in [
        "Combines profile management, project posting, proposals, escrow, messaging and work review in one prototype.",
        "Uses short verification videos and transcript-based scoring to support skill authenticity.",
        "Requires client-defined acceptance requirements for every project.",
        "Stores project resubmissions as versioned records for accountability.",
        "Supports administrator review for skill verification, disputes and payout workflows.",
    ]:
        parts.append(bullet(item))
    parts.append(section("Summary", 2))
    parts.append(para("The literature review shows that marketplace trust depends on skill proof, clear requirements, protected payment and communication. SkillSurokkha focuses on these areas and implements a practical full-stack solution suitable for academic demonstration and future extension."))
    parts.append(page_break())

    parts.append(section("Chapter 3: Methodology"))
    parts.append(section("Analysis", 2))
    add_paragraphs(parts, [
        "The system was analyzed by identifying three main user roles: freelancer, client and administrator. Freelancers need profile creation, skill verification, project search, proposal submission, messaging, work submission and withdrawal features. Clients need project creation, applicant review, escrow funding, hiring, work review, revision request and approval features. Administrators need platform monitoring, user moderation, pending review handling, dispute resolution and withdrawal processing.",
        "The platform follows a client-server architecture. The frontend communicates with the backend through REST APIs. Realtime features use Socket.IO. Data is stored in a MySQL database. Uploaded files such as profile pictures, proposal documents, verification videos and project archives are stored in backend upload/private directories according to the workflow.",
    ])
    parts.append(figure_box("Figure 3.1: System flowchart for SkillSurokkha", "Client posts project -> funds escrow -> hires freelancer -> realtime communication -> freelancer submits work -> AI requirement review -> client approves/revises -> escrow release."))
    parts.append(section("Design", 2))
    parts.append(para("The design is modular so that each major workflow can be maintained independently. Authentication and role authorization protect the API. Profile and project modules manage marketplace data. Skill analysis and project evaluation services perform automated checks. Notification and realtime message services keep users updated."))
    parts.append(figure_box("Figure 3.2: System architecture of SkillSurokkha", "Next.js frontend, Express.js REST API, MySQL database, Socket.IO realtime server, AI/media services and admin workflow."))
    parts.append(section("System Architecture Overview", 2))
    for item in [
        "Frontend Interface: Next.js, React, Tailwind CSS, Framer Motion, SweetAlert2 and React Icons.",
        "Backend API Layer: Express.js routes for authentication, profile, projects, skills, payments, messages, notifications, dashboard and admin features.",
        "Database Layer: MySQL tables initialized automatically at backend startup.",
        "AI Skill Analysis: FFprobe metadata inspection, FFmpeg audio extraction and Whisper-based transcription.",
        "Project Evaluation: Requirement-by-requirement review of submitted source archives, repository URL, live URL and implementation notes.",
        "Realtime Layer: Socket.IO authenticated messaging with typing indicators, unread counts and sent/seen state.",
    ]:
        parts.append(bullet(item))
    parts.append(section("Database Design", 2))
    parts.append(figure_box("Figure 3.3: Entity relationship overview", "Users connect to profiles, projects, applications, escrows, skill verifications, conversations, messages, submissions, disputes, reviews and wallet transactions."))
    parts.append(table([
        ["Entity", "Purpose"],
        ["users", "Stores admin, freelancer and client account information."],
        ["profiles", "Stores user profile, skills, portfolio, education, experience and company information."],
        ["projects", "Stores client projects, budget, deadline, requirements and project status."],
        ["applications", "Stores freelancer proposals, budgets, delivery dates and application status."],
        ["escrows", "Stores protected payment information, provider reference and release/refund status."],
        ["skill_verifications", "Stores skill video, transcript, AI score, authenticity report and badge reference."],
        ["work_submissions", "Stores versioned project deliveries and AI evaluation report."],
        ["conversations/messages", "Stores realtime project communication."],
        ["notifications", "Stores user notifications and read state."],
        ["project_disputes", "Stores disputes opened by client or freelancer."],
        ["wallet_transactions/withdrawal_requests", "Stores freelancer earnings and payout requests."],
    ], [2600, 5200]))
    parts.append(section("Software and Hardware Specification", 2))
    parts.append(table([
        ["Required Software", "Version/Tool", "Purpose"],
        ["Node.js", "Modern LTS", "Backend runtime and frontend tooling"],
        ["Next.js", "14.2.31", "Frontend framework"],
        ["React", "18.3.1", "User interface"],
        ["Tailwind CSS", "3.4.17", "Frontend styling"],
        ["Express.js", "4.21.2", "REST API backend"],
        ["MySQL", "8.x recommended", "Relational database"],
        ["Socket.IO", "4.8.3", "Realtime messaging"],
        ["FFmpeg/FFprobe", "System install", "Video/audio processing and metadata"],
        ["Hugging Face Whisper or Local Whisper", "Configurable", "Speech transcription for skill verification"],
    ], [2400, 2200, 3300]))
    parts.append(table([
        ["Hardware Component", "Minimum Requirement"],
        ["Processor", "Intel Core i3 / AMD Ryzen 3 or higher"],
        ["RAM", "8 GB or higher"],
        ["Storage", "100 GB HDD/SSD for database and uploaded files"],
        ["Network", "Stable internet connection for API, AI provider and realtime features"],
        ["Display", "1366x768 resolution or higher"],
        ["Operating System", "Windows, Ubuntu or macOS"],
    ], [3200, 4700]))
    parts.append(section("Software Implementation", 2))
    parts.append(para("Frontend implementation is contained mainly in the Next.js application. It provides a bilingual landing page, authentication modal, dashboards, project workflow screens, skill verification form, messaging interface, notification page and payment/withdrawal views."))
    parts.append(para("Backend implementation is organized into routes and services. Routes define API endpoints, middleware protects authentication and roles, services perform verification, notifications, realtime messaging, deadline sync, project evaluation, payment session handling and escrow release."))
    parts.append(table([
        ["API Module", "Main Responsibility"],
        ["/api/auth", "Registration, OTP verification, login and current user."],
        ["/api/profiles", "Freelancer/client profile and profile picture upload."],
        ["/api/projects", "Project creation, applications, escrow, hire, submission, revision and approval."],
        ["/api/skills", "Skill verification video upload, badges and admin review."],
        ["/api/messages", "Conversation list, message history and attachments."],
        ["/api/notifications", "Notification list and read state."],
        ["/api/payments", "Escrow and released payment history."],
        ["/api/admin", "User moderation, overview, pending review, disputes and withdrawals."],
    ], [2400, 5200]))
    parts.append(page_break())

    parts.append(section("Chapter 4: Result and Discussion"))
    result_sections = [
        ("Landing Page", "Figure 4.1: Landing page", "The landing page introduces SkillSurokkha as a trusted freelance platform. It contains navigation, language switching, sign-in/get-started actions and a visual overview of verified skills and secure escrow."),
        ("Registration and Login", "Figure 4.2: Authentication modal", "The authentication modal supports account creation and login. During registration, users select a role such as freelancer or client and verify contact information through OTP workflow."),
        ("Freelancer Dashboard", "Figure 4.3: Freelancer dashboard", "The freelancer dashboard provides access to profile editing, skill verification, project browsing, applications, messages, payments and notifications."),
        ("Client Project Creation", "Figure 4.4: Client project creation", "Clients can create projects by entering title, description, budget, deadline, required skills and acceptance requirements. Requirements are stored as structured JSON for later AI-assisted review."),
        ("Skill Verification Upload", "Figure 4.5: Skill verification upload", "Freelancers upload a short video for a specific skill. The backend validates file type and duration, checks media metadata, extracts audio, transcribes the explanation and creates a preliminary score and authenticity report."),
        ("Project Application Workflow", "Figure 4.6: Project application workflow", "A freelancer can apply to open projects only after meeting the skill activation threshold. The proposal includes cover letter, budget, delivery date and optional document attachment."),
        ("Realtime Messaging", "Figure 4.7: Realtime messaging page", "After hiring, a conversation is created between client and freelancer. Socket.IO supports message sending, attachments, typing indicators, unread count and sent/seen state."),
        ("Project Submission and AI Review", "Figure 4.8: Project submission and AI review", "The hired freelancer submits a ZIP archive, repository URL, live demo URL and implementation notes. The system analyzes the delivery against original requirements and stores a versioned evaluation report."),
        ("Admin Dashboard", "Figure 4.9: Admin dashboard", "Administrators can monitor users, pending skill reviews, disputes, escrow/payment status and withdrawal requests. Admin review remains important where automated checks require human decision."),
    ]
    for title, caption, text_value in result_sections:
        parts.append(section(title, 2))
        parts.append(para(text_value))
        parts.append(figure_box(caption, text_value))
    parts.append(section("Discussion", 2))
    add_paragraphs(parts, [
        "The implemented prototype meets the major objectives of the project. It supports end-to-end marketplace workflow from registration to project completion. The AI-assisted parts are designed as support tools rather than final autonomous judges. This is important because skill quality and project completeness often require human understanding.",
        "Escrow funding and staged release improve payment confidence. Requirement-based submission review also encourages clients to write clearer acceptance criteria. Realtime messaging reduces communication delay after hiring. The admin panel gives the platform owner control over exceptional situations such as disputes, failed analysis and payout processing.",
    ])
    parts.append(page_break())

    parts.append(section("Chapter 5: Conclusion"))
    parts.append(section("Overview", 2))
    parts.append(para("SkillSurokkha is a full-stack freelance marketplace prototype focused on trust, verification and secure project delivery. The system integrates role-based access, profiles, project posting, proposal workflow, escrow, realtime messaging, skill verification, automated project requirement review, notifications, disputes and withdrawal handling. Through this project, practical knowledge of frontend development, backend API design, MySQL database design, file upload handling, realtime communication and AI-assisted services was applied."))
    parts.append(section("Limitations", 2))
    for item in [
        "The AI skill analysis is a preliminary assessment and not a complete proof of skill quality.",
        "The MVP authenticity report is not a deepfake detector.",
        "Production payment gateways and provider webhooks need full integration before real financial use.",
        "AI project review depends on clear requirements and may still need manual client/admin judgment.",
        "Large file processing requires strong hosting resources and storage planning.",
        "More automated tests and security hardening are needed before deployment.",
    ]:
        parts.append(bullet(item))
    parts.append(section("Future Plans", 2))
    for item in [
        "Integrate production-ready payment provider webhooks for bKash, Nagad, bank card and international payment channels.",
        "Add stronger identity verification and fraud detection.",
        "Improve AI skill analysis with rubric-based scoring and reviewer feedback loops.",
        "Add richer admin analytics, project success metrics and marketplace reporting.",
        "Add mobile application support for freelancers and clients.",
        "Deploy the system on cloud infrastructure with secure storage, monitoring and backup.",
    ]:
        parts.append(bullet(item))
    parts.append(section("References", 2))
    for ref in [
        "Next.js Documentation. (n.d.). Retrieved from https://nextjs.org/docs",
        "React Documentation. (n.d.). Retrieved from https://react.dev",
        "Express.js Documentation. (n.d.). Retrieved from https://expressjs.com",
        "MySQL Documentation. (n.d.). Retrieved from https://dev.mysql.com/doc/",
        "Socket.IO Documentation. (n.d.). Retrieved from https://socket.io/docs/",
        "Tailwind CSS Documentation. (n.d.). Retrieved from https://tailwindcss.com/docs",
        "Hugging Face Inference Documentation. (n.d.). Retrieved from https://huggingface.co/docs",
        "OpenAI Whisper. (n.d.). Retrieved from https://github.com/openai/whisper",
        "FFmpeg Documentation. (n.d.). Retrieved from https://ffmpeg.org/documentation.html",
        "Node.js Documentation. (n.d.). Retrieved from https://nodejs.org/docs",
    ]:
        parts.append(para(ref, size=22))

    body = "".join(parts)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>{body}
<w:sectPr>
  <w:footerReference w:type="default" r:id="rId3"/>
  <w:pgSz w:w="11906" w:h="16838"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
</w:sectPr>
</w:body></w:document>"""


def write_docx():
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>"""
    core = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>SkillSurokkha Final Project Report</dc:title>
  <dc:creator>SkillSurokkha Team</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-06-27T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-27T00:00:00Z</dcterms:modified>
</cp:coreProperties>"""
    app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>"""
    with ZipFile(OUT, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/_rels/document.xml.rels", doc_rels)
        z.writestr("word/document.xml", document_xml())
        z.writestr("word/styles.xml", styles_xml())
        z.writestr("word/numbering.xml", numbering_xml())
        z.writestr("word/footer1.xml", footer_xml())
        z.writestr("docProps/core.xml", core)
        z.writestr("docProps/app.xml", app)


if __name__ == "__main__":
    write_docx()
    print(OUT)
