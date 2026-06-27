from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile, ZIP_DEFLATED
import xml.etree.ElementTree as ET


DOCX = Path(__file__).with_name("SkillSurokkha_Final_Project_Report_fixed.docx")

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

for prefix, uri in NS.items():
    if prefix not in {"ct", "rel"}:
        ET.register_namespace(prefix, uri)


FIGURE_31_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="430" viewBox="0 0 1000 430">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/></marker>
<style>
.title{font:700 26px Times New Roman,serif;fill:#123c35}
.box{fill:#eefcf5;stroke:#0f766e;stroke-width:2;rx:14}
.box2{fill:#eff6ff;stroke:#2563eb;stroke-width:2;rx:14}
.box3{fill:#fff7ed;stroke:#ea580c;stroke-width:2;rx:14}
.txt{font:700 17px Times New Roman,serif;fill:#111827;text-anchor:middle}
.small{font:400 14px Times New Roman,serif;fill:#374151;text-anchor:middle}
.arrow{stroke:#2563eb;stroke-width:2.5;fill:none;marker-end:url(#arrow)}
</style>
</defs>
<text x="500" y="35" text-anchor="middle" class="title">SkillSurokkha System Flowchart</text>
<rect x="35" y="80" width="150" height="70" class="box"/>
<text x="110" y="108" class="txt">Register/Login</text><text x="110" y="132" class="small">Freelancer, Client, Admin</text>
<path d="M185 115 H230" class="arrow"/>
<rect x="230" y="80" width="155" height="70" class="box"/>
<text x="307" y="108" class="txt">Profile Setup</text><text x="307" y="132" class="small">Skills and portfolio</text>
<path d="M385 115 H430" class="arrow"/>
<rect x="430" y="80" width="165" height="70" class="box2"/>
<text x="512" y="108" class="txt">Skill Verification</text><text x="512" y="132" class="small">Video, transcript, score</text>
<path d="M595 115 H640" class="arrow"/>
<rect x="640" y="80" width="155" height="70" class="box"/>
<text x="717" y="108" class="txt">Apply Project</text><text x="717" y="132" class="small">Proposal and budget</text>
<path d="M795 115 H840" class="arrow"/>
<rect x="840" y="80" width="130" height="70" class="box3"/>
<text x="905" y="108" class="txt">Client Hire</text><text x="905" y="132" class="small">Escrow funded</text>
<path d="M905 150 V205" class="arrow"/>
<rect x="815" y="205" width="180" height="75" class="box2"/>
<text x="905" y="235" class="txt">Realtime Messages</text><text x="905" y="259" class="small">Chat and attachments</text>
<path d="M815 242 H760" class="arrow"/>
<rect x="580" y="205" width="180" height="75" class="box"/>
<text x="670" y="235" class="txt">Submit Work</text><text x="670" y="259" class="small">ZIP, repo, demo, notes</text>
<path d="M580 242 H525" class="arrow"/>
<rect x="345" y="205" width="180" height="75" class="box2"/>
<text x="435" y="235" class="txt">AI Requirement Review</text><text x="435" y="259" class="small">Match against acceptance list</text>
<path d="M345 242 H290" class="arrow"/>
<rect x="110" y="205" width="180" height="75" class="box3"/>
<text x="200" y="235" class="txt">Client Decision</text><text x="200" y="259" class="small">Approve, revise, dispute</text>
<path d="M200 280 V335" class="arrow"/>
<rect x="110" y="335" width="180" height="65" class="box"/>
<text x="200" y="362" class="txt">Escrow Release</text><text x="200" y="385" class="small">Wallet and withdrawal</text>
</svg>"""


FIGURE_32_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="520" viewBox="0 0 1000 520">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#334155"/></marker>
<style>
.title{font:700 26px Times New Roman,serif;fill:#123c35}
.layer{fill:#f8fafc;stroke:#94a3b8;stroke-width:2;rx:18}
.front{fill:#ecfdf5;stroke:#059669;stroke-width:2;rx:14}
.api{fill:#eff6ff;stroke:#2563eb;stroke-width:2;rx:14}
.data{fill:#fff7ed;stroke:#ea580c;stroke-width:2;rx:14}
.service{fill:#f5f3ff;stroke:#7c3aed;stroke-width:2;rx:14}
.txt{font:700 18px Times New Roman,serif;fill:#111827;text-anchor:middle}
.small{font:400 14px Times New Roman,serif;fill:#374151;text-anchor:middle}
.arrow{stroke:#334155;stroke-width:2.4;fill:none;marker-end:url(#arrow)}
</style>
</defs>
<text x="500" y="35" text-anchor="middle" class="title">SkillSurokkha System Architecture</text>
<rect x="30" y="65" width="940" height="95" class="layer"/>
<rect x="70" y="88" width="250" height="50" class="front"/><text x="195" y="111" class="txt">Next.js Frontend</text><text x="195" y="131" class="small">React, Tailwind CSS, dashboard UI</text>
<rect x="375" y="88" width="250" height="50" class="front"/><text x="500" y="111" class="txt">User Roles</text><text x="500" y="131" class="small">Freelancer, Client, Administrator</text>
<rect x="680" y="88" width="250" height="50" class="front"/><text x="805" y="111" class="txt">Browser Workflow</text><text x="805" y="131" class="small">Profile, project, payment, messages</text>
<path d="M500 160 V195" class="arrow"/>
<rect x="30" y="195" width="940" height="110" class="layer"/>
<rect x="70" y="220" width="200" height="60" class="api"/><text x="170" y="245" class="txt">Express REST API</text><text x="170" y="267" class="small">Auth and role access</text>
<rect x="300" y="220" width="180" height="60" class="api"/><text x="390" y="245" class="txt">Project Module</text><text x="390" y="267" class="small">Post, apply, hire</text>
<rect x="520" y="220" width="180" height="60" class="api"/><text x="610" y="245" class="txt">Skill Module</text><text x="610" y="267" class="small">Video verification</text>
<rect x="730" y="220" width="200" height="60" class="api"/><text x="830" y="245" class="txt">Admin Module</text><text x="830" y="267" class="small">Review, disputes, payouts</text>
<path d="M170 280 V340" class="arrow"/><path d="M390 280 V340" class="arrow"/><path d="M610 280 V340" class="arrow"/><path d="M830 280 V340" class="arrow"/>
<rect x="30" y="340" width="940" height="125" class="layer"/>
<rect x="75" y="365" width="210" height="70" class="data"/><text x="180" y="392" class="txt">MySQL Database</text><text x="180" y="414" class="small">Users, projects, escrow, wallet</text>
<rect x="315" y="365" width="210" height="70" class="service"/><text x="420" y="392" class="txt">Socket.IO Server</text><text x="420" y="414" class="small">Realtime chat and unread count</text>
<rect x="555" y="365" width="210" height="70" class="service"/><text x="660" y="392" class="txt">AI/Media Services</text><text x="660" y="414" class="small">FFmpeg, Whisper, review scoring</text>
<rect x="795" y="365" width="140" height="70" class="data"/><text x="865" y="392" class="txt">Uploads</text><text x="865" y="414" class="small">Videos, ZIP, docs</text>
<path d="M285 400 H315" class="arrow"/><path d="M525 400 H555" class="arrow"/><path d="M765 400 H795" class="arrow"/>
<text x="500" y="495" class="small">REST API coordinates data, realtime events, AI analysis, escrow actions and administrator review.</text>
</svg>"""


def text_of(paragraph):
    return "".join(node.text or "" for node in paragraph.findall(f".//{{{NS['w']}}}t"))


def next_rid(rels_root):
    numbers = []
    for rel in rels_root.findall(f"{{{NS['rel']}}}Relationship"):
        rid = rel.attrib.get("Id", "")
        if rid.startswith("rId") and rid[3:].isdigit():
            numbers.append(int(rid[3:]))
    return f"rId{max(numbers, default=0) + 1}"


def drawing_paragraph(rid, doc_id, name, cx, cy):
    xml = f"""<w:p xmlns:w="{NS['w']}" xmlns:r="{NS['r']}" xmlns:wp="{NS['wp']}" xmlns:a="{NS['a']}" xmlns:pic="{NS['pic']}">
<w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>
<wp:inline distT="0" distB="0" distL="0" distR="0">
<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>
<wp:docPr id="{doc_id}" name="{name}"/>
<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic><pic:nvPicPr><pic:cNvPr id="{doc_id}" name="{name}"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic></a:graphicData></a:graphic>
</wp:inline></w:drawing></w:r></w:p>"""
    return ET.fromstring(xml)


with ZipFile(DOCX, "r") as zin:
    files = {name: zin.read(name) for name in zin.namelist()}

doc_root = ET.fromstring(files["word/document.xml"])
rels_root = ET.fromstring(files["word/_rels/document.xml.rels"])
content_root = ET.fromstring(files["[Content_Types].xml"])

svg_default = False
for node in content_root.findall(f"{{{NS['ct']}}}Default"):
    if node.attrib.get("Extension") == "svg":
        svg_default = True
if not svg_default:
    node = ET.SubElement(content_root, f"{{{NS['ct']}}}Default")
    node.set("Extension", "svg")
    node.set("ContentType", "image/svg+xml")

rid31 = next_rid(rels_root)
rel31 = ET.SubElement(rels_root, f"{{{NS['rel']}}}Relationship")
rel31.set("Id", rid31)
rel31.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image")
rel31.set("Target", "media/figure31.svg")

rid32 = next_rid(rels_root)
rel32 = ET.SubElement(rels_root, f"{{{NS['rel']}}}Relationship")
rel32.set("Id", rid32)
rel32.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image")
rel32.set("Target", "media/figure32.svg")

body = doc_root.find(f"{{{NS['w']}}}body")
children = list(body)
for index, child in enumerate(children):
    current = text_of(child)
    if current.startswith("Figure 3.1 presents the complete workflow"):
        body.remove(child)
        body.insert(index, drawing_paragraph(rid31, 101, "Figure 3.1 System Flowchart", 6035040, 2590800))
        break

children = list(body)
for index, child in enumerate(children):
    current = text_of(child)
    if current.startswith("Figure 3.2 presents the layered system architecture"):
        body.remove(child)
        body.insert(index, drawing_paragraph(rid32, 102, "Figure 3.2 System Architecture", 6035040, 3139440))
        break

files["word/document.xml"] = ET.tostring(doc_root, encoding="utf-8", xml_declaration=True)
files["word/_rels/document.xml.rels"] = ET.tostring(rels_root, encoding="utf-8", xml_declaration=True)
files["[Content_Types].xml"] = ET.tostring(content_root, encoding="utf-8", xml_declaration=True)
files["word/media/figure31.svg"] = FIGURE_31_SVG.encode("utf-8")
files["word/media/figure32.svg"] = FIGURE_32_SVG.encode("utf-8")

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
