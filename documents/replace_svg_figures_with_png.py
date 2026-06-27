from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile, ZIP_DEFLATED
import xml.etree.ElementTree as ET


BASE = Path(__file__).parent
DOCX = BASE / "SkillSurokkha_Final_Project_Report_fixed.docx"
FIG31 = BASE / "figure31.png"
FIG32 = BASE / "figure32.png"

CT = "http://schemas.openxmlformats.org/package/2006/content-types"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"

ET.register_namespace("", REL)


with ZipFile(DOCX, "r") as zin:
    files = {name: zin.read(name) for name in zin.namelist()}

rels_root = ET.fromstring(files["word/_rels/document.xml.rels"])
for rel in rels_root.findall(f"{{{REL}}}Relationship"):
    target = rel.attrib.get("Target")
    if target == "media/figure31.svg":
        rel.set("Target", "media/figure31.png")
    elif target == "media/figure32.svg":
        rel.set("Target", "media/figure32.png")

content_root = ET.fromstring(files["[Content_Types].xml"])
has_png = any(node.attrib.get("Extension") == "png" for node in content_root.findall(f"{{{CT}}}Default"))
if not has_png:
    node = ET.SubElement(content_root, f"{{{CT}}}Default")
    node.set("Extension", "png")
    node.set("ContentType", "image/png")

files["word/_rels/document.xml.rels"] = ET.tostring(rels_root, encoding="utf-8", xml_declaration=True)
files["[Content_Types].xml"] = ET.tostring(content_root, encoding="utf-8", xml_declaration=True)
files["word/media/figure31.png"] = FIG31.read_bytes()
files["word/media/figure32.png"] = FIG32.read_bytes()
files.pop("word/media/figure31.svg", None)
files.pop("word/media/figure32.svg", None)

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
