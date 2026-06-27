from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile, ZIP_DEFLATED
import xml.etree.ElementTree as ET


DOCX = Path(__file__).with_name("SkillSurokkha_Final_Project_Report_fixed.docx")
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

ET.register_namespace("w", W)
ET.register_namespace("r", R)


def paragraph_text(paragraph):
    return "".join(node.text or "" for node in paragraph.findall(f".//{{{W}}}t"))


def set_paragraph_text(paragraph, value):
    text_nodes = paragraph.findall(f".//{{{W}}}t")
    if not text_nodes:
        run = ET.SubElement(paragraph, f"{{{W}}}r")
        text = ET.SubElement(run, f"{{{W}}}t")
        text_nodes = [text]
    text_nodes[0].text = value
    text_nodes[0].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    for extra in text_nodes[1:]:
        extra.text = ""


def set_align(paragraph, value):
    ppr = paragraph.find(f"{{{W}}}pPr")
    if ppr is None:
        ppr = ET.Element(f"{{{W}}}pPr")
        paragraph.insert(0, ppr)
    jc = ppr.find(f"{{{W}}}jc")
    if jc is None:
        jc = ET.SubElement(ppr, f"{{{W}}}jc")
    jc.set(f"{{{W}}}val", value)


toc_updates = {
    "Declaration ............................................................................................ i": "Declaration ............................................................................................ 2",
    "Certificate ............................................................................................. ii": "Certificate ............................................................................................. 3",
    "Dedication ............................................................................................ iii": "Dedication ............................................................................................ 4",
    "Acknowledgement ................................................................................ iv": "Acknowledgement ................................................................................ 5",
    "Abstract ................................................................................................. v": "Abstract ................................................................................................. 6",
    "List of Figures ..................................................................................... ix": "List of Figures ..................................................................................... 8",
    "List of Tables ....................................................................................... x": "List of Tables ....................................................................................... 9",
    "Chapter 1: Introduction ....................................................................... 1": "Chapter 1: Introduction ....................................................................... 10",
    "Chapter 2: Literature Review .............................................................. 5": "Chapter 2: Literature Review .............................................................. 12",
    "Chapter 3: Methodology ..................................................................... 9": "Chapter 3: Methodology ..................................................................... 14",
    "Chapter 4: Result and Discussion ....................................................... 18": "Chapter 4: Result and Discussion ....................................................... 18",
    "Chapter 5: Conclusion ........................................................................ 33": "Chapter 5: Conclusion ........................................................................ 26",
    "References .......................................................................................... 35": "References .......................................................................................... 27",
}

figure_updates = {
    "[Insert screenshot or diagram here]": [
        "Figure 3.1 presents the complete workflow of SkillSurokkha from user registration to final payment release.",
        "Figure 3.2 presents the layered system architecture of SkillSurokkha and shows how the frontend, backend, database, realtime server and AI services work together.",
    ],
    "Client posts project -> funds escrow -> hires freelancer -> realtime communication -> freelancer submits work -> AI requirement review -> client approves/revises -> escrow release.": (
        "The process begins when a user registers and logs in as a freelancer, client or administrator. "
        "A freelancer completes profile setup and submits a skill verification video. After the system analyzes the video and activates the freelancer account, the freelancer can apply to open projects. "
        "A client creates a project with budget, deadline, required skills and clear acceptance requirements, funds escrow, reviews proposals and hires a freelancer. "
        "After hiring, both parties communicate through realtime messaging. The freelancer submits the completed work using a ZIP archive, repository link, live demo link or implementation notes. "
        "The backend evaluates the submission against the original requirements. Based on the result, the client can approve the work, request a revision or open a dispute. "
        "When the work is approved, escrow is released to the freelancer wallet and the freelancer can request withdrawal."
    ),
    "Next.js frontend, Express.js REST API, MySQL database, Socket.IO realtime server, AI/media services and admin workflow.": (
        "The architecture contains a Next.js and React frontend that communicates with an Express.js REST API. "
        "The backend applies authentication and role-based authorization before accessing marketplace modules such as profiles, projects, applications, skills, payments, notifications and admin controls. "
        "MySQL stores all structured data including users, profiles, projects, escrows, skill verifications, submissions, conversations and wallet transactions. "
        "Socket.IO handles authenticated realtime messaging, typing status, unread counts and sent/seen updates. "
        "AI and media services support skill verification through FFmpeg, FFprobe and Whisper-based transcription, while project evaluation checks submitted work against client-defined acceptance requirements. "
        "The administrator layer supervises pending reviews, disputes, user moderation and withdrawal processing."
    ),
}


with ZipFile(DOCX, "r") as zin:
    files = {name: zin.read(name) for name in zin.namelist()}

root = ET.fromstring(files["word/document.xml"])
placeholder_count = 0
for paragraph in root.findall(f".//{{{W}}}p"):
    current = paragraph_text(paragraph)
    if current in toc_updates:
        set_paragraph_text(paragraph, toc_updates[current])
        set_align(paragraph, "left")
    elif current == "[Insert screenshot or diagram here]":
        replacement = figure_updates[current][placeholder_count] if placeholder_count < 2 else ""
        placeholder_count += 1
        set_paragraph_text(paragraph, replacement)
        set_align(paragraph, "both")
    elif current in figure_updates:
        set_paragraph_text(paragraph, figure_updates[current])
        set_align(paragraph, "both")

files["word/document.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)

with NamedTemporaryFile(delete=False, suffix=".docx", dir=DOCX.parent) as temp:
    temp_path = Path(temp.name)

try:
    with ZipFile(temp_path, "w", ZIP_DEFLATED) as zout:
        for name, data in files.items():
            zout.writestr(name, data)
    temp_path.replace(DOCX)
finally:
    if temp_path.exists():
        temp_path.unlink()

print(DOCX)
