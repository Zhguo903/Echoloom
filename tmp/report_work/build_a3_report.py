from __future__ import annotations

import argparse
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor, Twips


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "report" / "EchoLoom_A3_Report.docx"

# EchoLoom report layout tokens.
FONT = "Calibri"
BODY = RGBColor(40, 50, 65)
NAVY = RGBColor(23, 32, 57)
SLATE = RGBColor(52, 64, 86)
BLUE = RGBColor(46, 116, 181)
GOLD = RGBColor(170, 139, 84)
SAGE = RGBColor(102, 139, 120)
MUTED = RGBColor(95, 103, 119)
LIGHT_GRAY = "F2F4F7"
LIGHT_SAGE = "EEF3F0"
LIGHT_GOLD = "F7F2E8"
LIGHT_BLUE = "EDF3F8"
RISK_FILL = "FBEFEF"
WHITE = RGBColor(255, 255, 255)
CONTENT_DXA = 9360
TABLE_INDENT_DXA = 120
CELL_MARGINS = {"top": 90, "bottom": 90, "start": 120, "end": 120}


def apply_table_geometry(table, widths, *, table_width_dxa, indent_dxa, cell_margins_dxa):
    """Keep the report's table, grid, and cell widths consistent in Word."""
    widths = [int(width) for width in widths]
    if not widths or any(width <= 0 for width in widths):
        raise ValueError("Table column widths must be positive.")
    if sum(widths) != table_width_dxa or len(table.columns) != len(widths):
        raise ValueError("Table columns must match the requested total width.")
    if any(len(row.cells) != len(widths) for row in table.rows):
        raise ValueError("Report table rows must have one cell per column.")

    def element(parent, tag, **attributes):
        child = parent.find(qn(f"w:{tag}"))
        if child is None:
            child = OxmlElement(f"w:{tag}")
            parent.append(child)
        for key, value in attributes.items():
            child.set(qn(f"w:{key}"), str(value))
        return child

    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    properties = table._tbl.tblPr
    element(properties, "tblW", type="dxa", w=table_width_dxa)
    element(properties, "tblInd", type="dxa", w=indent_dxa)
    element(properties, "tblLayout", type="fixed")
    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths:
        column = OxmlElement("w:gridCol")
        column.set(qn("w:w"), str(width))
        grid.append(column)
    for column, width in zip(table.columns, widths):
        column.width = Twips(width)
    for row in table.rows:
        row.height = None
        for cell, width in zip(row.cells, widths):
            cell.width = Twips(width)
            properties = cell._tc.get_or_add_tcPr()
            element(properties, "tcW", type="dxa", w=width)
            margins = element(properties, "tcMar")
            for side, margin in cell_margins_dxa.items():
                element(margins, side, type="dxa", w=margin)


SOURCES = {
    "S1": (
        "ESA, 2026 Essential Facts About the U.S. Video Game Industry",
        "https://www.theesa.com/resources/essential-facts-about-the-us-video-game-industry/2026-data/",
        "212.3M U.S. weekly players; 46% female; average player age 37.",
    ),
    "S2": (
        "Sensor Tower, State of Gaming 2026 press release",
        "https://sensortower.com/press/press-release-sensor-tower-state-of-gaming-gaming-drove-52-billion-downloads-82b-iap-revenue-on-mobile-and-12b-premium-revenue-on-steam",
        "2025 gaming downloads and mobile IAP revenue; retention and monetization trend.",
    ),
    "S3": (
        "Sensor Tower, State of Mobile 2026 press release",
        "https://sensortower.com/press/press-release-boosted-by-gen-ai-services-consumers-spent-more-money-in-apps-than-games-for-first-time",
        "2025 global app IAP, time spent, and generative AI growth.",
    ),
    "S4": (
        "TechCrunch reporting Appfigures AI companion market estimates",
        "https://techcrunch.com/2025/08/12/ai-companion-apps-on-track-to-pull-in-120m-in-2025/",
        "337 revenue-generating companion apps, 220M downloads, and 2025 revenue estimates.",
    ),
    "S5": (
        "Character.AI c.ai+ subscription page",
        "https://character.ai/subscribe",
        "USD 9.99 monthly / USD 94.99 annual benchmark and premium feature set.",
    ),
    "S6": (
        "Character.AI, Smarter Memory for Smarter Chats",
        "https://blog.character.ai/memory/",
        "Story Memory, Facts, pins, editing, and memory-usage visibility.",
    ),
    "S7": (
        "Character.AI, About (c.ai) reads",
        "https://labs.character.ai/reads/about",
        "Serialized human-led fiction with paid chapter unlocks and planned character chat integration.",
    ),
    "S8": (
        "Replika, Choosing a Subscription",
        "https://help.replika.com/hc/en-us/articles/39551043419149-Choosing-a-Subscription",
        "Free, Pro, Ultra, and Platinum features including voice, image, memory, and calls.",
    ),
    "S9": (
        "Replika, Changing relationship status",
        "https://help.replika.com/hc/en-us/articles/360046490131-How-do-I-change-my-relationship-status",
        "Profile-selected relationship modes and paid romantic-partner access.",
    ),
    "S10": (
        "Nomi.ai product site",
        "https://nomi.ai/",
        "Long-term memory, relationship customization, voice, and chat-first positioning.",
    ),
    "S11": (
        "Nomi.ai affiliate/product feature page",
        "https://nomi.ai/nomi-ai-girlfriend-affiliate-program/",
        "Proactive messaging, group chat, memory, customization, and creator/community distribution.",
    ),
    "S12": (
        "Infold Games official site",
        "https://www.infoldgames.com/en/home",
        "Love and Deepspace positioning and publisher evidence.",
    ),
    "S13": (
        "Sensor Tower, Top 5 Otome Games Performance in the U.S., Q1 2025",
        "https://sensortower.com/blog/2025-q1-unified-top-5-otome%20games-units-us-60789073241bc16eb88c6e7f",
        "Evidence that an established U.S. otome category exists and is actively measured.",
    ),
    "S14": (
        "FTC inquiry into AI chatbots acting as companions",
        "https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions",
        "Safety, monetization, disclosure, data handling, and youth-risk expectations.",
    ),
    "S15": (
        "FAN EXPO Canada 2026 official schedule",
        "https://fanexpocanada1.zendesk.com/hc/en-us/articles/4407858207763-When-is-FAN-EXPO-Canada",
        "Toronto event dates and location for in-person recruitment.",
    ),
    "S16": (
        "Anime North official site",
        "https://www.animenorth.com/",
        "Toronto anime, manga, music, games, and Japanese-culture community event.",
    ),
    "S17": (
        "University of Toronto Anime and Manga Association",
        "https://sop.utoronto.ca/group/anime-and-manga-association/",
        "Local target-community recruitment channel.",
    ),
    "S18": (
        "University of Toronto Rhythm Game Club",
        "https://www.utrg.ca/",
        "Local gaming community with Discord and in-person events.",
    ),
    "S19": (
        "Anirevo Toronto 2026 official site",
        "https://toronto.animerevolution.ca/",
        "November 13-15, 2026 Toronto anime convention and community channel.",
    ),
    "S20": (
        "Toronto Game Expo 2026 official site",
        "https://www.torontogameexpo.ca/",
        "November 7-8, 2026 gaming, anime, and fandom event.",
    ),
}


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_table_row_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_run_font(run, size=None, color=None, bold=None, italic=None, font=FONT):
    run.font.name = font
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), font)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), font)
    if size is not None:
        run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def set_cell_shading(cell, fill: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_borders(cell, color="D9DEE6", size="4"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.find(qn("w:tcBorders"))
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = borders.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_paragraph_box(paragraph, fill="F7F2E8", border="C8B28D"):
    p_pr = paragraph._p.get_or_add_pPr()
    shd = p_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        p_pr.append(shd)
    shd.set(qn("w:fill"), fill)
    p_bdr = p_pr.find(qn("w:pBdr"))
    if p_bdr is None:
        p_bdr = OxmlElement("w:pBdr")
        p_pr.append(p_bdr)
    left = p_bdr.find(qn("w:left"))
    if left is None:
        left = OxmlElement("w:left")
        p_bdr.append(left)
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), "18")
    left.set(qn("w:space"), "8")
    left.set(qn("w:color"), border)


def add_hyperlink(paragraph, text, url, color="2E74B5"):
    part = paragraph.part
    r_id = part.relate_to(
        url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)
    new_run = OxmlElement("w:r")
    r_pr = OxmlElement("w:rPr")
    r_fonts = OxmlElement("w:rFonts")
    r_fonts.set(qn("w:ascii"), FONT)
    r_fonts.set(qn("w:hAnsi"), FONT)
    color_element = OxmlElement("w:color")
    color_element.set(qn("w:val"), color)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    r_pr.append(r_fonts)
    r_pr.append(color_element)
    r_pr.append(underline)
    new_run.append(r_pr)
    text_element = OxmlElement("w:t")
    text_element.text = text
    new_run.append(text_element)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


def add_field(run, instruction: str):
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    value = OxmlElement("w:t")
    value.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, instr, separate, value, end])


def set_picture_alt(inline_shape, alt_text: str):
    inline_shape._inline.docPr.set("descr", alt_text)
    inline_shape._inline.docPr.set("title", alt_text)


def add_picture(doc, path: Path, width: float, alt: str, caption: str | None = None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(5 if caption else 10)
    run = p.add_run()
    shape = run.add_picture(str(path), width=Inches(width))
    set_picture_alt(shape, alt)
    if caption:
        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.paragraph_format.space_before = Pt(0)
        cap.paragraph_format.space_after = Pt(10)
        r = cap.add_run(caption)
        set_run_font(r, size=9, color=MUTED, italic=True)


def make_numbering(doc, fmt: str, level_text: str, bullet=False):
    numbering = doc.part.numbering_part.element
    abstract_ids = [
        int(el.get(qn("w:abstractNumId"))) for el in numbering.findall(qn("w:abstractNum"))
    ]
    num_ids = [int(el.get(qn("w:numId"))) for el in numbering.findall(qn("w:num"))]
    abstract_id = max(abstract_ids, default=-1) + 1
    num_id = max(num_ids, default=0) + 1

    abstract = OxmlElement("w:abstractNum")
    abstract.set(qn("w:abstractNumId"), str(abstract_id))
    multi = OxmlElement("w:multiLevelType")
    multi.set(qn("w:val"), "singleLevel")
    abstract.append(multi)
    lvl = OxmlElement("w:lvl")
    lvl.set(qn("w:ilvl"), "0")
    start = OxmlElement("w:start")
    start.set(qn("w:val"), "1")
    num_fmt = OxmlElement("w:numFmt")
    num_fmt.set(qn("w:val"), fmt)
    lvl_text_el = OxmlElement("w:lvlText")
    lvl_text_el.set(qn("w:val"), level_text)
    lvl_jc = OxmlElement("w:lvlJc")
    lvl_jc.set(qn("w:val"), "left")
    p_pr = OxmlElement("w:pPr")
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "num")
    tab.set(qn("w:pos"), "720")
    tabs.append(tab)
    ind = OxmlElement("w:ind")
    ind.set(qn("w:left"), "720")
    ind.set(qn("w:hanging"), "360")
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:after"), "160")
    spacing.set(qn("w:line"), "280")
    spacing.set(qn("w:lineRule"), "auto")
    p_pr.extend([tabs, ind, spacing])
    lvl.extend([start, num_fmt, lvl_text_el, lvl_jc, p_pr])
    if bullet:
        r_pr = OxmlElement("w:rPr")
        fonts = OxmlElement("w:rFonts")
        fonts.set(qn("w:ascii"), "Symbol")
        fonts.set(qn("w:hAnsi"), "Symbol")
        r_pr.append(fonts)
        lvl.append(r_pr)
    abstract.append(lvl)
    numbering.append(abstract)

    num = OxmlElement("w:num")
    num.set(qn("w:numId"), str(num_id))
    abstract_ref = OxmlElement("w:abstractNumId")
    abstract_ref.set(qn("w:val"), str(abstract_id))
    num.append(abstract_ref)
    numbering.append(num)
    return num_id


def apply_num(paragraph, num_id):
    p_pr = paragraph._p.get_or_add_pPr()
    num_pr = OxmlElement("w:numPr")
    ilvl = OxmlElement("w:ilvl")
    ilvl.set(qn("w:val"), "0")
    num_id_el = OxmlElement("w:numId")
    num_id_el.set(qn("w:val"), str(num_id))
    num_pr.extend([ilvl, num_id_el])
    p_pr.append(num_pr)


def add_body(doc, text, bold_lead: str | None = None, italic=False, after=6):
    p = doc.add_paragraph(style="Normal")
    p.paragraph_format.space_after = Pt(after)
    if bold_lead and text.startswith(bold_lead):
        r1 = p.add_run(bold_lead)
        set_run_font(r1, bold=True, color=BODY)
        r2 = p.add_run(text[len(bold_lead) :])
        set_run_font(r2, color=BODY, italic=italic)
    else:
        r = p.add_run(text)
        set_run_font(r, color=BODY, italic=italic)
    return p


def add_bullets(doc, items, num_id):
    for item in items:
        p = doc.add_paragraph(style="Normal")
        apply_num(p, num_id)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing = 1.167
        if isinstance(item, tuple):
            lead, rest = item
            r1 = p.add_run(lead)
            set_run_font(r1, bold=True, color=BODY)
            r2 = p.add_run(rest)
            set_run_font(r2, color=BODY)
        else:
            r = p.add_run(item)
            set_run_font(r, color=BODY)


def add_numbered(doc, items, num_id):
    for item in items:
        p = doc.add_paragraph(style="Normal")
        apply_num(p, num_id)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing = 1.167
        r = p.add_run(item)
        set_run_font(r, color=BODY)


def add_callout(doc, label, text, fill=LIGHT_GOLD, border="C8B28D"):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.08)
    p.paragraph_format.right_indent = Inches(0.08)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.line_spacing = 1.1
    set_paragraph_box(p, fill=fill, border=border)
    r1 = p.add_run(label + " ")
    set_run_font(r1, bold=True, color=SLATE)
    r2 = p.add_run(text)
    set_run_font(r2, color=BODY)
    return p


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    r = p.add_run(text)
    set_run_font(r, bold=True, color=SLATE)
    p.paragraph_format.keep_with_next = True
    return p


def add_table(doc, headers, rows, widths, font_size=9.2, header_fill=LIGHT_GRAY):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_ALIGN_PARAGRAPH.LEFT
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    prevent_table_row_split(hdr)
    for i, header in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_shading(cell, header_fill)
        set_cell_borders(cell)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(header)
        set_run_font(r, size=font_size, bold=True, color=SLATE)
    for row in rows:
        table_row = table.add_row()
        prevent_table_row_split(table_row)
        cells = table_row.cells
        for i, value in enumerate(row):
            cell = cells[i]
            set_cell_borders(cell)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            if isinstance(value, tuple) and len(value) == 2 and value[0].startswith("http"):
                add_hyperlink(p, value[1], value[0])
            else:
                r = p.add_run(str(value))
                set_run_font(r, size=font_size, color=BODY)
    apply_table_geometry(
        table,
        widths,
        table_width_dxa=CONTENT_DXA,
        indent_dxa=TABLE_INDENT_DXA,
        cell_margins_dxa=CELL_MARGINS,
    )
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(4)
    return table


def configure_document(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)
    section.different_first_page_header_footer = True

    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal._element.rPr.rFonts.set(qn("w:ascii"), FONT)
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), FONT)
    normal.font.size = Pt(11)
    normal.font.color.rgb = BODY
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.10

    heading_tokens = {
        1: (16, 16, 8),
        2: (13, 12, 6),
        3: (12, 8, 4),
    }
    for level, (size, before, after) in heading_tokens.items():
        style = doc.styles[f"Heading {level}"]
        style.font.name = FONT
        style._element.rPr.rFonts.set(qn("w:ascii"), FONT)
        style._element.rPr.rFonts.set(qn("w:hAnsi"), FONT)
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = SLATE
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    hp.paragraph_format.space_after = Pt(4)
    hr = hp.add_run("EchoLoom  |  Assignment 3 Evidence Report")
    set_run_font(hr, size=8.5, bold=True, color=MUTED)
    p_pr = hp._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "4")
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), "D9DEE6")
    p_bdr.append(bottom)
    p_pr.append(p_bdr)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fr = fp.add_run("Page ")
    set_run_font(fr, size=8.5, color=MUTED)
    field_run = fp.add_run()
    set_run_font(field_run, size=8.5, color=MUTED)
    add_field(field_run, "PAGE")

    first_footer = section.first_page_footer
    ffp = first_footer.paragraphs[0]
    ffp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ffr = ffp.add_run("CSC454 / CSC491  |  Summer 2026")
    set_run_font(ffr, size=8.5, color=MUTED)


def build_report(output_path: Path = OUTPUT):
    doc = Document()
    configure_document(doc)
    bullet_num = make_numbering(doc, "bullet", "•", bullet=True)
    number_num = make_numbering(doc, "decimal", "%1.")

    # Cover
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(28)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    shape = p.add_run().add_picture(str(ROOT / "assets/brand/echoloom-mark.png"), width=Inches(1.15))
    set_picture_alt(shape, "EchoLoom brand mark")

    kicker = doc.add_paragraph()
    kicker.alignment = WD_ALIGN_PARAGRAPH.CENTER
    kicker.paragraph_format.space_before = Pt(12)
    kicker.paragraph_format.space_after = Pt(10)
    kr = kicker.add_run("ASSIGNMENT 3  |  EVIDENCE AND PRESENTATION REPORT")
    set_run_font(kr, size=10, bold=True, color=GOLD)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(8)
    tr = title.add_run("EchoLoom")
    set_run_font(tr, size=31, bold=True, color=NAVY)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(20)
    sr = subtitle.add_run("Story-first AI relationships with memory users can see and control")
    set_run_font(sr, size=15, color=SLATE)

    brand = doc.add_paragraph()
    brand.alignment = WD_ALIGN_PARAGRAPH.CENTER
    brand.paragraph_format.space_after = Pt(28)
    br = brand.add_run("Stories weave. Companions stay.")
    set_run_font(br, size=11, italic=True, color=MUTED)

    metadata = [
        ("Course", "CSC454 and CSC491, University of Toronto"),
        ("Term", "Summer 2026"),
        ("Prepared by", "[REPLACE WITH FULL TEAM MEMBER NAME(S)]"),
        ("Prepared", "August 4, 2026"),
        ("Final due", "Friday, August 7, 2026 at 1:30 p.m."),
        ("Presentation", "8 minutes"),
    ]
    for label, value in metadata:
        mp = doc.add_paragraph()
        mp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        mp.paragraph_format.space_after = Pt(3)
        r1 = mp.add_run(label + ": ")
        set_run_font(r1, size=10.5, bold=True, color=SLATE)
        r2 = mp.add_run(value)
        set_run_font(r2, size=10.5, color=BODY)

    add_callout(
        doc,
        "Required before hand-in:",
        "Replace the team placeholders and add teammate photos/experience. Attach the six raw interview notes. The repository preserves the aggregate findings, but not participant-level notes or quotes.",
        fill="FFF4CC",
        border="C59A00",
    )
    doc.add_page_break()

    # Executive summary and report map
    add_heading(doc, "Executive summary", 1)
    add_body(
        doc,
        "EchoLoom addresses a specific gap between authored romance games and open-ended AI companion chat. Authored games create attraction through story and coherent characters, but usually constrain how a player can respond. AI companion apps provide free conversation, but users can experience repetitive chat, identity drift, opaque memory, or intimacy that feels selected rather than earned. EchoLoom combines a premium visual-novel opening with free-text interaction, five psychologically distinct characters, visible source-linked memory, explicit contact permission, and recoverable branches.",
    )
    add_body(
        doc,
        "The current offline MVP is materially beyond a paper prototype. It implements the 17-second Xu Cheng mystery, five evidence routes, seven EchoLink contacts, free-text first contact, qualitative relationship and communication state, typed memory, export/import, schema-v6 migration, and branch rewind. The automated suite passes, checking 31 required files, 25 served resources, onboarding defaults, relationship constraints, reply timing, migrations, round-trip state, consent boundaries, and character-specific behavior.",
    )
    add_body(
        doc,
        "Market evidence supports a real but crowded opportunity. The ESA reports 212.3 million Americans play video games at least one hour per week and 46% of players are female [S1]. Sensor Tower reports USD 82 billion in mobile-game IAP revenue in 2025 [S2]. Appfigures estimates reported by TechCrunch show 337 revenue-generating AI companion apps, 220 million cumulative downloads by July 2025, and USD 82 million of revenue in the first half of 2025 [S4]. EchoLoom should therefore enter as a narrow, testable story-first wedge rather than claim the whole gaming or AI market.",
    )
    add_callout(
        doc,
        "Recommended first-year objective:",
        "Validate comprehension, retention quality, and willingness to pay with 300 closed-beta testers and 30 paying founding users - not scale at any cost.",
        fill=LIGHT_SAGE,
        border="668B78",
    )

    add_heading(doc, "How to use this report", 2)
    add_bullets(
        doc,
        [
            ("For the slide deck: ", "use the 'Slide-ready content' and 8-minute blueprint in Sections 2-14."),
            ("For speaking notes: ", "use the short evidence and interpretation paragraphs; do not read them word for word."),
            ("For the appendix: ", "copy the interview summary, raw-note templates, product-evolution images, build evidence, and source list."),
            ("For accuracy: ", "keep claims labeled as project evidence, interview findings, external estimates, or future hypotheses."),
        ],
        bullet_num,
    )

    add_heading(doc, "Report map", 2)
    report_map = [
        "Assignment coverage and submission readiness",
        "Company and value proposition",
        "Team",
        "User interviews and new insights",
        "Problem and opportunity",
        "First-customer persona and validation recruitment",
        "Solution and latest demo",
        "Updated build plan and technical feasibility",
        "Competition",
        "Market opportunity",
        "Go-to-market and business model",
        "Two-week, six-month, and one-year plan",
        "The Ask",
        "Eight-minute presentation blueprint",
        "Appendices: interviews, product evolution, build evidence, sources, and checklist",
    ]
    report_map_rows = []
    for i in range(8):
        left = f"{i + 1}. {report_map[i]}"
        right_index = i + 8
        right = f"{right_index + 1}. {report_map[right_index]}" if right_index < len(report_map) else ""
        report_map_rows.append((left, right))
    add_table(
        doc,
        ["Sections 1-8", "Sections 9-15"],
        report_map_rows,
        [4680, 4680],
        font_size=8.5,
    )

    # 1 Coverage
    add_heading(doc, "1. Assignment coverage and submission readiness", 1)
    add_body(
        doc,
        "The brief requests core presentation content plus appendix evidence. The matrix below shows where each requirement is handled and where private source material is still required.",
    )
    coverage_rows = [
        ("Company: logo + clear value proposition", "Section 2; brand asset and two-line positioning", "Ready"),
        ("Team: names, program, university, photos, experience", "Section 3; fill-ready structure", "Needs personal details"),
        ("Users interviewed + insights", "Section 4 and Appendix A; aggregate n=6 evidence", "Raw notes missing"),
        ("Problem/opportunity + size", "Section 5; interview evidence + external market numbers", "Ready"),
        ("Persona + future interview plan + channels + places", "Section 6; recruitment cohorts and Toronto channels", "Ready"),
        ("Solution + latest CSC491 demo", "Section 7; tested flow and current screenshots", "Ready"),
        ("Updated build plan + feedback + feasibility + stack", "Section 8 and Appendix C", "Ready"),
        ("Competition strengths and weaknesses", "Section 9; product and substitute matrix", "Ready"),
        ("Market size, industry overview, timing", "Section 10; category evidence and bottom-up SOM", "Ready"),
        ("GTM + price + special differentiator", "Section 11; channels, offer, metrics", "Ready"),
        ("Next two weeks, six months, one year", "Section 12; milestone and resource plan", "Ready"),
        ("The Ask", "Section 13; users, mentors, and pilot resources", "Ready"),
        ("8-minute presentation quality", "Section 14; timed run-of-show and demo path", "Ready"),
        ("Appendix: interview notes", "Appendix A; six templates", "Needs raw notes"),
        ("Appendix: evolution screenshots", "Appendix B; early and current product images", "Ready"),
        ("Research source links", "Appendix D", "Ready"),
    ]
    add_table(doc, ["Assignment requirement", "Report evidence", "Status"], coverage_rows, [3500, 4060, 1800], font_size=8.8)
    add_callout(
        doc,
        "Integrity rule:",
        "Do not convert the six interviews into percentages and do not invent participant quotes. Present recurring themes as exploratory findings and external statistics as separate market evidence.",
        fill=RISK_FILL,
        border="9B1C1C",
    )

    # 2 Company
    add_heading(doc, "2. Company slide: EchoLoom", 1)
    add_callout(
        doc,
        "Slide-ready value proposition:",
        "A story-first AI relationship experience where characters remember, disagree, and grow across branches the player controls.",
        fill=LIGHT_BLUE,
        border="586580",
    )
    add_bullets(
        doc,
        [
            ("Company name: ", "EchoLoom"),
            ("Brand line: ", "Stories weave. Companions stay."),
            ("Functional value line: ", "Meet characters through a shared mystery, then continue the relationship through free conversation and memory you can inspect."),
            ("Category: ", "story-first interactive relationship entertainment; positioned between romance visual novels and AI companions."),
        ],
        bullet_num,
    )
    add_body(
        doc,
        "Use the existing EchoLoom lockup or mark. The poetic brand line should not stand alone: the functional line makes the customer value immediately understandable. The company slide should be visually sparse and take no more than 25 seconds to present.",
    )
    add_picture(
        doc,
        ROOT / "assets/brand/echoloom-lockup.png",
        2.2,
        "EchoLoom logo lockup",
        "Existing EchoLoom lockup for the company slide.",
    )

    # 3 Team
    add_heading(doc, "3. Team slide", 1)
    add_callout(
        doc,
        "Slide-ready headline:",
        "A student team combining product research, interactive narrative, and full-stack prototyping.",
        fill=LIGHT_GOLD,
        border="C8B28D",
    )
    add_body(
        doc,
        "The assignment requires facts that are not stored in the repository. Replace the fields below before submission and add a clear headshot for every teammate. Do not add job titles; organize by expertise and evidence.",
    )
    team_rows = [
        ("[Insert]", "[Full name]", "[Program / major / minor]", "University of Toronto", "[Companies / internships / relevant experience]", "[Optional startup-related interest]"),
    ]
    add_table(
        doc,
        ["Photo", "Name", "Program", "University", "Experience", "Relevant interest"],
        team_rows,
        [900, 1300, 1500, 1400, 2700, 1560],
        font_size=8.5,
    )
    add_bullets(
        doc,
        [
            "Add one square headshot per teammate, using the same crop and neutral background.",
            "List internship or employer names only when accurate; one line is enough.",
            "Connect expertise to the work shown: user research, story design, interface design, JavaScript, testing, visual assets, or business analysis.",
        ],
        bullet_num,
    )

    # 4 Users
    add_heading(doc, "4. User analysis from interviews", 1)
    add_callout(
        doc,
        "Slide-ready headline:",
        "Six exploratory interviews point to one core need: emotional continuity matters more than endless content.",
        fill=LIGHT_SAGE,
        border="668B78",
    )
    add_heading(doc, "Who we have spoken to", 2)
    add_body(
        doc,
        "The project research basis records six qualitative interviews. The sample is small and skewed toward young women with prior interest in otome games, interactive fiction, AI companionship, or character co-creation. This is appropriate for early discovery, but it is not representative market research. Participant-level demographics and raw notes were not present in the repository and must be added in Appendix A before hand-in.",
    )
    add_heading(doc, "Most important findings", 2)
    insight_rows = [
        ("Attachment", "Users attach to a specific character and shared history, not a large catalogue."),
        ("Story first", "Users often need credible story and conflict before they want daily conversation."),
        ("Consistency", "Psychological consistency matters more than visual realism alone; a believable character may disagree, refuse, or make mistakes."),
        ("Independent life", "Characters need work, friends, obligations, and unresolved choices outside the user."),
        ("Expression", "Pure open chat can be repetitive, while fixed options often fail to express the user's real intent."),
        ("Memory", "Long-term memory should include user facts, character facts, shared events, promises, boundaries, relationship judgments, and unresolved issues."),
        ("Control", "Memory needs to be visible, editable where appropriate, deletable, exportable, and linked to its source."),
        ("Tone", "Default replies should be concise and conversational rather than ornate AI essays."),
        ("Ethics", "Streaks, quotas, jealousy, guilt, and punishment for absence damage the relationship experience."),
    ]
    add_table(doc, ["Theme", "Interview insight"], insight_rows, [1800, 7560], font_size=9.1, header_fill=LIGHT_SAGE)
    add_heading(doc, "What changed because of the research", 2)
    add_bullets(
        doc,
        [
            "The prototype opens with the Xu Cheng mystery rather than a generic chatbot or immediate romance selection.",
            "Free text remains available, while suggested responses communicate intent instead of writing a full line for the player.",
            "Five characters have different core conflicts, knowledge, boundaries, work, and contact permissions.",
            "Long-term relationship state, recent communication pulse, player expression, and mutual agreement are separated.",
            "Memory is typed, source-linked, branch-aware, exportable, and user-controllable.",
            "Absence does not reduce affection; only explicit commitments create follow-up consequences.",
        ],
        bullet_num,
    )
    add_callout(
        doc,
        "New insight to emphasize:",
        "The winning product is not 'more romantic AI.' It is a trustworthy continuity system that lets story, character autonomy, and user control coexist.",
        fill=LIGHT_GOLD,
        border="C8B28D",
    )

    # 5 Problem
    add_heading(doc, "5. Problem or opportunity slide", 1)
    add_callout(
        doc,
        "Slide-ready problem statement:",
        "Romance-story fans are forced to choose between coherent but closed stories and expressive but unstable AI chat.",
        fill=RISK_FILL,
        border="9B1C1C",
    )
    add_heading(doc, "The customer problem", 2)
    add_bullets(
        doc,
        [
            ("Authored romance games: ", "strong character design and story, but limited expression and little relationship continuity outside scripted content."),
            ("Open-ended AI companions: ", "free conversation and personalization, but the user often supplies the plot, protects continuity, and manages prompts."),
            ("The emotional failure mode: ", "when memory, personality, boundaries, or relationship history drift, the user does not experience a small feature defect; they experience loss of the character they cared about."),
        ],
        bullet_num,
    )
    add_heading(doc, "How large is the adjacent demand?", 2)
    add_bullets(
        doc,
        [
            "212.3 million Americans play video games at least one hour per week; 46% of players are female [S1]. This establishes a broad, diverse interactive-entertainment base, not EchoLoom's immediate customer count.",
            "Mobile games generated USD 82 billion in IAP revenue in 2025, with 52 billion game downloads across mobile, PC, and console [S2]. Consumers demonstrably pay for persistent interactive entertainment.",
            "Appfigures estimates 337 active, revenue-generating AI companion apps and 220 million global downloads by July 2025. The segment generated an estimated USD 82 million in the first half of 2025 [S4]. Consumers also pay for relationship-oriented AI products.",
            "The six interviews identify continuity, story credibility, memory control, and autonomy as the narrower unmet need. The project has not yet measured prevalence or willingness to pay, which is the next validation step.",
        ],
        bullet_num,
    )
    add_callout(
        doc,
        "Opportunity framing:",
        "EchoLoom does not need to win the entire game or AI companion market. It needs to prove that a story-first, memory-transparent product can earn a small high-intent segment that current categories underserve.",
        fill=LIGHT_BLUE,
        border="586580",
    )

    # 6 Persona
    add_heading(doc, "6. Persona slide and further validation", 1)
    add_callout(
        doc,
        "Slide-ready persona:",
        "Maya Chen, 22: a mobile-first romance-story fan who wants emotional continuity without writing complex prompts.",
        fill=LIGHT_GOLD,
        border="C8B28D",
    )
    persona_rows = [
        ("Context", "University student in Toronto; plays romance visual novels, interactive fiction, or character-driven mobile games in short evening sessions."),
        ("Goals", "Become attached through story; express her own intent; return without recapping everything; explore branches without destroying the relationship."),
        ("Frustrations", "Generic sweetness, out-of-character replies, forgotten events, forced fixed choices, long setup prompts, and monetization that punishes absence."),
        ("Behavior", "Discovers games through TikTok/YouTube and peers; discusses characters in Discord/Reddit; saves fan art, edits, and story clips."),
        ("Trigger", "A visually polished mystery and one character whose values feel distinct within the first 5-10 minutes."),
        ("Buying criterion", "Would pay only after seeing consistent memory and enough authored story; rejects pay-per-message and gacha-like pressure."),
        ("Why first", "Matches the discovery sample, can articulate continuity failures, and is reachable through local and online fandom communities."),
    ]
    add_table(doc, ["Dimension", "Draft persona"], persona_rows, [1900, 7460], font_size=9.0, header_fill=LIGHT_GOLD)

    add_heading(doc, "Who to interview next and why", 2)
    validation_rows = [
        ("8 romance / otome / interactive-fiction players", "Validate story hook, character differentiation, and willingness to pay for authored chapters."),
        ("4 active AI companion or role-play users", "Validate memory control, personality consistency, privacy expectations, and switching friction."),
        ("3 story-game players who avoid AI companions", "Test whether 'AI relationship' language creates resistance and whether story-first framing changes it."),
        ("2 privacy or AI-safety practitioners", "Review data controls, youth boundaries, disclosures, and production architecture before live-model testing."),
    ]
    add_table(doc, ["Recruitment cohort", "Business-model hypothesis validated"], validation_rows, [3600, 5760], font_size=9.0)

    add_heading(doc, "Where to find them", 2)
    add_bullets(
        doc,
        [
            "University of Toronto Anime and Manga Association and related art/music communities [S17].",
            "University of Toronto Rhythm Game Club and its Discord/in-person meetings [S18].",
            "FAN EXPO Canada in Toronto, August 27-30, 2026 [S15].",
            "Anirevo Toronto, November 13-15, 2026 [S19], and Toronto Game Expo, November 7-8, 2026 [S20].",
            "Anime North's Toronto community and 2027 event cycle [S16].",
            "Online: TikTok, YouTube, Instagram, Discord, Reddit communities for otome games, visual novels, role-play, and AI companions; recruit transparently and obtain consent before recording notes.",
        ],
        bullet_num,
    )
    add_heading(doc, "Interview questions that validate the business", 2)
    add_numbered(
        doc,
        [
            "Tell me about the last character-based game or AI companion you stopped using. What ended the habit?",
            "Show me how you currently keep story or relationship continuity across sessions.",
            "At what point would you want free conversation with a story character - before, during, or after an authored chapter?",
            "Which memories would you expect to view, correct, delete, or export?",
            "What would make a character's disagreement feel believable rather than frustrating?",
            "Which pricing structure feels fair: chapter packs, subscription, one-time purchase, or none? Why?",
            "Would CAD 12.99 per month feel obviously too high, reasonable, or suspiciously low after one complete story arc?",
            "What would stop you from trusting this product with personal conversation?",
        ],
        number_num,
    )

    # 7 Solution
    add_heading(doc, "7. Solution slide and latest demo", 1)
    add_callout(
        doc,
        "Slide-ready solution:",
        "Story creates attraction; free conversation continues the relationship; visible memory keeps it coherent.",
        fill=LIGHT_SAGE,
        border="668B78",
    )
    add_heading(doc, "What EchoLoom does", 2)
    add_bullets(
        doc,
        [
            "Begins with a 17-second identity correction that erases Xu Cheng from every record but leaves the player with a contradictory memory.",
            "Presents five simultaneous evidence routes. Choosing one decides who the player meets first, not a romantic lock-in.",
            "Gives Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng distinct work, knowledge, values, boundaries, and independent relationships.",
            "Keeps free-text input alongside optional intent prompts; suggestions never speak a complete line for the player.",
            "Tracks relationship state in natural language and separates character state, player expression, mutual agreement, and recent communication context.",
            "Makes memory source-linked, typed, branch-aware, editable where appropriate, deletable, exportable, and recoverable through rewind.",
            "Runs offline with no API key, enabling reliable classroom demonstration and testable product rules.",
        ],
        bullet_num,
    )
    add_heading(doc, "Latest demo path for CSC491", 2)
    demo_steps = [
        ("Step 1: ", "Show the opening and the five evidence signals; say that all five come from the same crisis."),
        ("Step 2: ", "Select Qi An and show that the first rescue changes evidence and initial impressions, not romance or commitment."),
        ("Step 3: ", "Reach the first EchoLink contact and type one short free-text line; point out that the suggestions express intent only."),
        ("Step 4: ", "Return to the Observatory home and show the five-person network, Chapter Two, and contact permission."),
        ("Step 5: ", "Open EchoLink or Archive and state that messages, memory, promises, and relationships rewind together by branch."),
    ]
    add_bullets(doc, demo_steps, bullet_num)
    add_picture(
        doc,
        ROOT / "tmp/report_work/current-five-signals.png",
        2.35,
        "Current EchoLoom five-signal mobile screen",
        "Current MVP: five distinct evidence routes in the 393 x 852 reference frame.",
    )
    add_heading(doc, "What is implemented versus proposed", 2)
    scope_rows = [
        ("Implemented", "Opening, five rescue routes, qualitative results, first free-text contact, Observatory home, EchoLink tabs and threads, memory, export/import, schema-v6 migration, branch rewind, bilingual interface, PWA cache."),
        ("Implemented as simulation", "Deterministic character replies, generated-scene mock, simulated photo/voice records, asynchronous reply timing, relationship and communication rules."),
        ("Not yet production", "Live model backend, real calls/audio, notifications, moderation service, cloud sync, production analytics, app-store release, payment processing."),
    ]
    add_table(doc, ["Status", "Scope"], scope_rows, [1800, 7560], font_size=9.0)

    # 8 Build plan
    add_heading(doc, "8. Updated build plan and technical feasibility", 1)
    add_callout(
        doc,
        "Slide-ready build update:",
        "The product moved from a single-character feature demo to a tested five-character story-first system because research made continuity and context the core risk.",
        fill=LIGHT_BLUE,
        border="586580",
    )
    add_heading(doc, "How feedback changed the build", 2)
    change_rows = [
        ("Early direction", "Single character, light visual shell, feature-first navigation", "Current direction", "Five-character shared mystery, premium Observatory shell, story-first onboarding"),
        ("Early interaction", "Fixed choices plus open chat", "Current direction", "Free text supported by intent-only prompts and character boundaries"),
        ("Early relationship", "Simpler relationship state", "Current direction", "Character state, player signals, agreements, and communication pulse separated"),
        ("Early memory", "Timeline concept", "Current direction", "Typed, source-linked, editable/deletable/exportable branch memory"),
        ("Early continuity", "Linear local experience", "Current direction", "Schema-v6 export/import and isolated recoverable branches"),
        ("Early engagement", "Daily relationship concept", "Current direction", "No streaks, guilt, message quotas, or absence punishment"),
    ]
    add_table(doc, ["Area", "Earlier prototype", "Area", "Current MVP"], change_rows, [1400, 3200, 1400, 3360], font_size=8.5)

    add_heading(doc, "Current stack and tools", 2)
    stack_rows = [
        ("Interface", "Plain HTML, CSS, and browser JavaScript; no framework and no build step."),
        ("Local server", "Node.js standard modules only; zero production dependencies."),
        ("Persistence", "Browser localStorage, schema-v6 migration, JSON export/import, and isolated branch snapshots."),
        ("Offline intelligence", "Deterministic EchoEngine with storyReply, chatReply, generateScene, and sceneReply interfaces."),
        ("Assets", "Original SVG/PNG character, brand, and environment art; responsive 393 x 852 mobile reference."),
        ("Offline delivery", "Service worker and PWA manifest; no API key required."),
        ("Quality", "Automated smoke/state/engine tests plus mobile and desktop browser verification."),
    ]
    add_table(doc, ["Layer", "Current implementation"], stack_rows, [1900, 7460], font_size=9.1)

    add_heading(doc, "Feasibility assessment", 2)
    feasibility_rows = [
        ("Offline classroom MVP", "High", "Already implemented and tested. Maintain as a fallback."),
        ("Usability validation", "High", "Can be completed with the current prototype and 12-15 moderated sessions."),
        ("Secure live-model alpha", "Medium", "Requires server-side credentials, scoped retrieval, moderation, cost controls, evaluations, and fallback."),
        ("Reliable long-term memory", "Medium", "Needs retrieval quality, provenance, conflict handling, editing controls, and regression evaluation."),
        ("Production mobile release", "Medium-low in 12 months", "Feasible as PWA/closed beta; native stores, payments, policy review, and content scale add work."),
        ("Large live content catalogue", "Low for a student team", "Authoring and character QA are the binding resources; prioritize one deep arc over many shallow characters."),
    ]
    add_table(doc, ["Workstream", "Assessment", "Reason"], feasibility_rows, [2600, 1500, 5260], font_size=8.9)
    add_callout(
        doc,
        "Primary technical risk:",
        "A live model can produce fluent dialogue before it produces reliable identity continuity. Production work should prioritize memory provenance, character evaluation, and safe refusal behavior before adding more media modes.",
        fill=RISK_FILL,
        border="9B1C1C",
    )

    # 9 Competition
    add_heading(doc, "9. Competition slide", 1)
    add_callout(
        doc,
        "Slide-ready competitive position:",
        "EchoLoom combines the authored attraction of romance games with the expression of AI chat and adds user-controlled relationship provenance.",
        fill=LIGHT_GOLD,
        border="C8B28D",
    )
    competition_rows = [
        ("Love and Deepspace", "Premium romance production, authored characters, large live-content engine, proven otome demand [S12][S13].", "Content-led relationship; does not make free-text AI continuity, source-linked memory, or branch rewind the product core."),
        ("Character.AI", "Large character variety, flexible role-play, voice, paid premium tier, expanding Story Memory/Facts [S5][S6].", "Broad creator-led chat makes the user responsible for choosing quality and context; (c.ai) reads shows it is moving closer to serialized story [S7]."),
        ("Replika", "Long-running companion model, avatar, activities, voice, background calls, images, and paid tiers [S8].", "Users can select relationship status through the profile; romantic modes and reward currencies are closer to configured companionship than earned story development [S9]."),
        ("Nomi", "Strong memory positioning, proactive messages, customization, voice, group chat, and an established companion community [S10][S11].", "Chat-first 'ideal partner' positioning offers less authored shared conflict and no evidence of source-linked branch rewind on its public product pages."),
        ("EchoLoom", "Authored mystery first; five autonomous characters; free text; explicit contact permission; visible typed memory; qualitative relationship explanation; reversible branches.", "Current limits are a small research sample, offline deterministic replies, limited authored chapters, no production safety/backend, and no willingness-to-pay data."),
    ]
    add_table(doc, ["Alternative", "Strength", "Strategic gap / trade-off"], competition_rows, [1700, 3650, 4010], font_size=8.3)
    add_heading(doc, "Defensible wedge", 2)
    add_bullets(
        doc,
        [
            ("Not a catalogue race: ", "depth and continuity for five characters matter more than thousands of user-generated profiles."),
            ("Not a graphics race: ", "a student team cannot outspend major romance games, so it must win on agency, memory transparency, and branch control."),
            ("Not a generic chatbot: ", "the authored mystery gives users something to care about before asking them to maintain a conversation."),
            ("Trust as product infrastructure: ", "the user's ability to inspect, correct, delete, export, and rewind memory is part of the value proposition."),
        ],
        bullet_num,
    )

    # 10 Market
    add_heading(doc, "10. The market", 1)
    add_callout(
        doc,
        "Slide-ready market message:",
        "Two proven spending behaviors are converging: mobile character entertainment and paid AI companionship.",
        fill=LIGHT_BLUE,
        border="586580",
    )
    market_rows = [
        ("Broad interactive-entertainment context", "212.3M U.S. weekly game players; 46% female [S1].", "Shows a large, diverse audience accustomed to games; not an EchoLoom user forecast."),
        ("Global mobile-game spend", "USD 82B mobile-game IAP revenue in 2025 [S2].", "Shows consumers pay for persistent mobile entertainment."),
        ("Global app spend", "USD 167B global IAP in 2025; non-games exceeded games for the first time [S3].", "Shows subscription/app monetization is mature and AI apps are growing."),
        ("Direct AI-companion evidence", "337 revenue-generating apps; 220M cumulative downloads by July 2025; USD 82M H1 2025 revenue estimate [S4].", "Shows direct demand, heavy competition, and category concentration."),
        ("Otome substitute evidence", "Sensor Tower tracks a top-five U.S. otome cohort and identifies Love and Deepspace among leaders [S13].", "Shows romance-game demand exists in the intended launch geography."),
    ]
    add_table(doc, ["Market layer", "Evidence", "Meaning for EchoLoom"], market_rows, [2200, 3300, 3860], font_size=8.7)

    add_heading(doc, "TAM, SAM, and SOM without false precision", 2)
    sizing_rows = [
        ("TAM context", "USD 82B global mobile-game IAP market [S2] plus the growing non-game app economy [S3].", "Context only; EchoLoom cannot claim this as addressable revenue."),
        ("Direct category proxy", "USD 82M H1 2025 AI-companion revenue estimate and 220M cumulative downloads [S4].", "Best public proxy for paid companion demand, but includes products unlike EchoLoom."),
        ("Initial SAM", "English/Chinese-speaking, 18+ mobile users in North America who already use romance games, interactive fiction, role-play, or AI companions.", "Size after a survey and store-keyword study; do not multiply broad gaming totals by guessed percentages."),
        ("Year-one SOM", "300 closed-beta testers -> 10% paid conversion -> 30 founders at CAD 12.99/month = CAD 389.70 MRR or CAD 4,676.40 annualized.", "A bottom-up validation goal, not a revenue forecast."),
    ]
    add_table(doc, ["Layer", "Definition / calculation", "Interpretation"], sizing_rows, [1700, 4600, 3060], font_size=8.6)

    add_heading(doc, "Why the industry is ready", 2)
    add_bullets(
        doc,
        [
            "Consumers already pay for both character-driven mobile entertainment and AI companion subscriptions [S2][S4][S5].",
            "Memory is becoming a named competitive feature: Character.AI now exposes Story Memory, Facts, pins, and memory usage [S6]. The market is teaching users to expect continuity tools.",
            "The category is crowded, so generic chat is not enough. A narrow story-first product can be legible in a market where the top 10% of companion apps capture most revenue [S4].",
            "Regulatory and trust expectations are rising. The FTC is asking companion providers about safety, monetization, disclosures, youth impacts, and data handling [S14]. EchoLoom's local-first prototype and explicit memory controls are strategically relevant, but not a substitute for production compliance.",
        ],
        bullet_num,
    )

    # 11 GTM
    add_heading(doc, "11. Go-to-market, price, and the special something", 1)
    add_callout(
        doc,
        "Slide-ready GTM:",
        "Start with 30 design partners inside reachable fandom communities, prove the first 10 minutes, then grow through creator-led story clips and event demos.",
        fill=LIGHT_SAGE,
        border="668B78",
    )
    add_heading(doc, "Beachhead acquisition plan", 2)
    gtm_rows = [
        ("1. Design partners", "UT-SAMA, UTRG, classmates, and relevant Discord groups [S17][S18].", "30 moderated testers", "Fast qualitative learning; founders can recruit directly."),
        ("2. Community proof", "Short character-conflict clips, before/after branch stories, and memory-control demos on TikTok and YouTube.", "100 waitlist / alpha users", "Show the story-first difference visually; avoid generic AI ads."),
        ("3. Toronto fandom events", "FAN EXPO Canada, Anirevo Toronto, Toronto Game Expo, and Anime North community [S15][S16][S19][S20].", "Live demos + QR waitlist", "Concentrated access to character-driven entertainment fans."),
        ("4. Creator partnerships", "Small otome, visual-novel, fan-fiction, and role-play creators.", "5-10 micro-creators", "Credibility and feedback matter more than broad paid reach at this stage."),
    ]
    add_table(doc, ["Phase", "Channel", "Target", "Why this channel"], gtm_rows, [1600, 3200, 1700, 2860], font_size=8.4)

    add_heading(doc, "Proposed business model", 2)
    add_bullets(
        doc,
        [
            ("Free discovery: ", "the 17-second prologue, one first rescue, first EchoLink contact, and local archive export."),
            ("Founding subscription hypothesis: ", "CAD 12.99/month or CAD 119/year after a complete authored arc is available."),
            ("Paid value: ", "additional authored chapters, extended branch slots, live-model story generation when safe, and deeper creator tools."),
            ("Fairness rules: ", "no pay-per-message, no randomized romance/gacha, no streaks, no guilt for leaving, and no relationship advantage sold through consumable currency."),
            ("Benchmark: ", "Character.AI lists c.ai+ at USD 9.99/month and USD 94.99/year [S5]; Nomi publicly discusses a roughly USD 16/month base membership [S10]. EchoLoom's price must be tested against its smaller content library and stronger story package."),
        ],
        bullet_num,
    )
    add_heading(doc, "The special something: relationship provenance", 2)
    add_body(
        doc,
        "EchoLoom's differentiator is not one feature. It is a coherent system in which every durable relationship change can be traced to a story event, source-linked memory, explicit agreement, or kept promise - and the user can inspect or rewind the branch. This makes continuity understandable without reducing intimacy to a score.",
    )
    add_heading(doc, "GTM success metrics", 2)
    metric_rows = [
        ("Hook comprehension", ">= 80% can explain why Xu Cheng matters after the prologue."),
        ("Choice comprehension", ">= 80% can explain that the first signal is not a romantic lock-in."),
        ("Character differentiation", ">= 70% can name two characters' conflicting values after one session."),
        ("First-contact activation", ">= 60% complete a rescue and send a free-text message."),
        ("Memory value", ">= 40% inspect, edit, export, or rewind memory when prompted by a real need."),
        ("Price signal", ">= 10% of qualified closed-beta testers choose a real or deposit-backed founding plan."),
        ("Ethical retention", "Track voluntary 7-day return and completed story goals; never optimize streaks, guilt, or message volume alone."),
    ]
    add_table(doc, ["Metric", "Prototype target"], metric_rows, [2800, 6560], font_size=9.0)

    # 12 Plan
    add_heading(doc, "12. Plan for the next two weeks, six months, and one year", 1)
    add_callout(
        doc,
        "Slide-ready roadmap:",
        "Validate comprehension now, build a safe closed alpha in six months, and earn a 300-user beta before expanding the content catalogue.",
        fill=LIGHT_BLUE,
        border="586580",
    )
    roadmap_rows = [
        ("Next 2 weeks", "Aug. 4-18, 2026", "Run 12-15 moderated tests; fill team/interview appendix; fix first-signal, free-text, and memory comprehension; rehearse 8-minute demo; define event instrumentation without collecting sensitive content.", "Current team + prototype", "Validated problem/flow and polished classroom hand-in"),
        ("6 months", "By Feb. 2027", "Recruit 100 closed-alpha users; implement optional secure model backend and scoped retrieval; keep offline fallback; create character-continuity evaluation suite; complete privacy/safety review; ship 2-3 polished authored chapters; test price with a real commitment.", "Team + 1 technical mentor + 1 narrative/art collaborator + cloud credits", "Evidence that continuity and paid value survive beyond novelty"),
        ("1 year", "By Aug. 2027", "Reach 300 beta testers and 30 paying founders; bilingual PWA beta; 3 complete character arcs within one shared mystery; robust export/delete controls; documented moderation and incident process; creator pilot only if core continuity targets pass.", "Small cross-functional team; modest hosting/research budget", "A credible niche beta, not premature mass-market scale"),
    ]
    add_table(doc, ["Horizon", "Date", "Milestones", "Resources", "Exit evidence"], roadmap_rows, [1300, 1200, 3450, 1850, 1560], font_size=8.1)
    add_heading(doc, "Resource realism", 2)
    add_bullets(
        doc,
        [
            "Keep the offline engine as the classroom and regression fallback even after a live model is introduced.",
            "Limit new content to three complete arcs before adding more characters; authored quality is the scarcest resource.",
            "Use a closed 18+ alpha until safety, privacy, disclosure, and escalation practices are reviewed.",
            "Treat 300 testers and 30 paying users as learning milestones, not traction theater.",
        ],
        bullet_num,
    )

    # 13 Ask
    add_heading(doc, "13. The Ask", 1)
    add_callout(
        doc,
        "Slide-ready ask:",
        "Help us recruit 15 target users, find two specialist mentors, and fund a small closed-alpha learning loop.",
        fill=LIGHT_GOLD,
        border="C8B28D",
    )
    ask_rows = [
        ("User introductions", "15 people who play otome/romance games, interactive fiction, role-play, or AI companion products.", "The immediate risk is not code; it is whether the story-first wedge and memory controls are understood and valued."),
        ("Mentorship", "One interactive-narrative/mobile-games mentor and one AI safety/privacy/backend mentor for two reviews each.", "The team needs help with authored content economics and safe production architecture before live-model scale."),
        ("Pilot resources", "CAD 1,000 in research incentives and hosting/model credits for a three-month closed alpha.", "A small budget can fund 20 incentives plus controlled inference/evaluation without implying a fundraising round."),
        ("Optional collaborator", "A character illustrator or narrative designer interested in one complete arc.", "The product should deepen quality before expanding catalogue breadth."),
    ]
    add_table(doc, ["Ask", "Specific request", "Why it is reasonable now"], ask_rows, [1800, 3600, 3960], font_size=8.8)
    add_body(
        doc,
        "Do not ask for large investment yet. The current evidence supports a prototype and a focused validation plan, not a venture-scale forecast. A strong ask should leave the audience knowing exactly whom to introduce and what the next learning milestone is.",
    )

    # 14 Presentation blueprint
    add_heading(doc, "14. Eight-minute presentation blueprint", 1)
    add_callout(
        doc,
        "Presentation rule:",
        "Use 12 core slides plus a live demo inside the Solution section. Speak to one conclusion per slide and keep all source links in the appendix.",
        fill=LIGHT_SAGE,
        border="668B78",
    )
    timing_rows = [
        ("0:00-0:25", "1. Company", "Logo + functional value proposition"),
        ("0:25-0:45", "2. Team", "Names, programs, university, experience"),
        ("0:45-1:20", "3. Users", "Six interviews + three strongest insights"),
        ("1:20-1:55", "4. Problem", "Closed stories vs unstable open chat + two market numbers"),
        ("1:55-2:25", "5. Persona", "Maya + where the next 15 interviewees come from"),
        ("2:25-3:00", "6. Solution", "Story -> free text -> visible memory -> rewind"),
        ("3:00-4:20", "Live demo", "Five signals, first contact, Observatory/EchoLink"),
        ("4:20-5:00", "7. Build plan", "Research-driven changes, stack, feasibility"),
        ("5:00-5:35", "8. Competition", "Four alternatives + relationship-provenance wedge"),
        ("5:35-6:10", "9. Market", "Direct AI-companion proxy + bottom-up year-one SOM"),
        ("6:10-6:50", "10. GTM", "Design partners, community clips, events, CAD 12.99 test"),
        ("6:50-7:30", "11. Roadmap", "Two weeks, six months, one year; resources and gates"),
        ("7:30-8:00", "12. Ask", "15 users, 2 mentors, CAD 1,000 pilot support"),
    ]
    add_table(doc, ["Time", "Slide", "Only message to land"], timing_rows, [1600, 2200, 5560], font_size=8.9)

    add_heading(doc, "80-second live demo script", 2)
    add_bullets(
        doc,
        [
            ("0-15 sec: ", "Show the five simultaneous signals. 'This is one crisis and five interpretations, not a dating selection screen.'"),
            ("15-35 sec: ", "Select Qi An and show evidence/result language. 'The choice changes what the player learns and how three people interpret the action; it cannot create romance or commitment.'"),
            ("35-55 sec: ", "Show first EchoLink contact and type one short line. 'Free text is primary; suggestions express intent only.'"),
            ("55-70 sec: ", "Return to Observatory home. 'The character has work, contact permission, memory, and a relationship state separate from recent messaging.'"),
            ("70-80 sec: ", "Show Archive/EchoLink. 'Messages, memories, promises, and relationships rewind together, and the branch being left remains recoverable.'"),
        ],
        bullet_num,
    )
    add_heading(doc, "Delivery checklist", 2)
    add_bullets(
        doc,
        [
            "Preload the tested state and keep a second browser tab at the Observatory home as a fallback.",
            "Do not read from a phone or paper; memorize the transition sentence for each slide.",
            "Use no more than three numbers aloud: six interviews, 220M AI-companion downloads, and the 300-user/30-payer year-one validation goal.",
            "Say when a number is an estimate and when a design choice remains a hypothesis.",
            "Rehearse twice under 7:40 so a slow click does not exceed eight minutes.",
        ],
        bullet_num,
    )
    doc.add_page_break()

    # Appendix A
    add_heading(doc, "Appendix A. Interview evidence pack", 1)
    add_heading(doc, "A1. Aggregate findings currently available", 2)
    add_body(
        doc,
        "Repository evidence confirms six qualitative interviews and the recurring themes listed below. It does not contain dates, participant profiles, transcripts, direct quotes, or individual note files. Keep this aggregate summary, then insert the raw notes before submission.",
    )
    add_bullets(
        doc,
        [
            "Character identity and relationship history matter more than catalogue size.",
            "Story and conflict create credibility before daily conversation.",
            "Psychological consistency, refusal, mistakes, and values make a character believable.",
            "Pure chat can be repetitive; fixed choices can misrepresent intent.",
            "Memory needs multiple types and direct user control.",
            "Characters should have work, friends, goals, and pressure outside the user.",
            "Short, information-dense replies are preferred by default.",
            "Manipulative retention mechanics damage trust.",
        ],
        bullet_num,
    )
    doc.add_page_break()
    add_heading(doc, "A2. Raw interview-note templates to complete", 2)
    for i in range(1, 7):
        add_heading(doc, f"Interview {i}", 3)
        raw_rows = [
            ("Date / duration", "[REPLACE]"),
            ("Participant profile", "[REPLACE: age range, relevant habits, no unnecessary identifying details]"),
            ("Recruitment source", "[REPLACE]"),
            ("Products currently used", "[REPLACE]"),
            ("Problem evidence", "[REPLACE WITH WRITTEN NOTES]"),
            ("Key quote(s)", "[REPLACE WITH ACCURATE QUOTES ONLY]"),
            ("Behavior observed", "[REPLACE]"),
            ("Implication / hypothesis", "[REPLACE; distinguish inference from participant statement]"),
            ("Consent / recording status", "[VERIFY BEFORE INCLUDING PERSONAL DETAILS]"),
        ]
        add_table(doc, ["Field", "Interview record"], raw_rows, [2100, 7260], font_size=8.7, header_fill=LIGHT_SAGE)

    # Appendix B
    doc.add_page_break()
    add_heading(doc, "Appendix B. Product evolution screenshots", 1)
    add_body(
        doc,
        "The early screenshots show the original light, single-character Aren prototype. The current screenshots show the August 4, 2026 five-character Observatory build. This progression directly supports the CSC491 rubric item asking whether the team followed the plan or explained changes.",
    )
    add_heading(doc, "B1. Early feature-first prototype", 2)
    add_picture(
        doc,
        ROOT / "docs/preview-splash.png",
        6.1,
        "Early EchoLoom desktop presentation and light mobile splash",
        "Early state: light visual shell, feature-demo navigation, and a single-character relationship concept.",
    )
    add_picture(
        doc,
        ROOT / "docs/preview-discovery.png",
        6.1,
        "Early EchoLoom single-character discovery screen",
        "Early discovery: one character (Aren) and a direct entry into his world.",
    )
    doc.add_page_break()
    add_picture(
        doc,
        ROOT / "docs/preview-story.png",
        6.1,
        "Early EchoLoom story screen with fixed suggestions and free input",
        "Early story interaction: a short crisis scene with input and suggested intents.",
    )
    doc.add_page_break()
    add_picture(
        doc,
        ROOT / "docs/preview-echoes.png",
        6.1,
        "Early EchoLoom memory timeline",
        "Early memory concept: pinned, remembered, and unresolved events.",
    )
    doc.add_page_break()
    add_picture(
        doc,
        ROOT / "docs/preview-together.png",
        6.1,
        "Early EchoLoom generated-scene input",
        "Early co-creation concept: natural-language scene generation with visual inspiration.",
    )
    doc.add_page_break()
    add_heading(doc, "B2. Current story-first five-character MVP", 2)
    add_picture(
        doc,
        ROOT / "tmp/report_work/current-opening.png",
        2.4,
        "Current EchoLoom night-observatory opening on mobile",
        "Current opening: branded night-observatory presentation and persistent story record.",
    )
    add_picture(
        doc,
        ROOT / "tmp/report_work/current-five-signals.png",
        2.4,
        "Current EchoLoom five-character evidence signal roster",
        "Current route structure: five people, five forms of evidence, no automatic romantic lock-in.",
    )
    doc.add_page_break()
    add_picture(
        doc,
        ROOT / "tmp/report_work/current-first-contact.png",
        2.4,
        "Current EchoLoom first free-text character contact",
        "Current first contact: intent prompts remain optional and free text is explicit.",
    )
    add_picture(
        doc,
        ROOT / "tmp/report_work/current-observatory-home.png",
        2.4,
        "Current EchoLoom Observatory home",
        "Current home: chapter progress, contact permission, EchoLink preview, and five-person network.",
    )
    add_picture(
        doc,
        ROOT / "tmp/report_work/current-echolink.png",
        2.4,
        "Current EchoLoom EchoLink conversation interface",
        "Current EchoLink: asynchronous messaging, private intent metadata, media modes, and free text.",
    )

    # Appendix C
    doc.add_page_break()
    add_heading(doc, "Appendix C. CSC491 build-plan and progress evidence", 1)
    add_heading(doc, "C1. Why the plan changed", 2)
    add_body(
        doc,
        "The team did not abandon the plan because of other classes. It changed the plan because the research identified a different core product risk. A single-character feature demo could demonstrate chat and memory, but it could not test whether story creates attraction, whether multiple characters stay distinct, or whether contact permission and branch state remain coherent. The current build directly operationalizes those research questions.",
    )
    progress_rows = [
        ("Aug. 3", "Story-first onboarding and Observatory shell", "Replaced prototype-first entry with branded prologue, player naming, signal scan, rescue, EchoLink activation, first contact, and home."),
        ("Aug. 3", "Single-send reply feedback", "Added thread-scoped typing state and token-checked reply scheduling to prevent duplicate sends."),
        ("Aug. 3", "Chronological replies", "Preserved insertion order so replies cannot appear above the user message that triggered them."),
        ("Aug. 3", "Five-character foundation", "Added Qi An, Shen Yao, Li Chuan, Zhou Tang, and Wen Sheng with separate journeys, evidence, roles, and contact logic."),
        ("Aug. 3", "Portrait and logo system", "Unified original brand assets and three-asset character presentation across cards, avatars, and homes."),
        ("Aug. 4", "Xu Cheng mainline", "Reframed the opening around an ordinary meeting, 17-second correction, five evidence routes, and a 37-day future message."),
        ("Aug. 4", "Night-observatory redesign", "Created a coherent premium visual system while preserving original assets, state, and accessibility constraints."),
        ("Aug. 4", "Mobile usability follow-ups", "Fixed scroll, header safety, type legibility, identity form density, and event-result reachability."),
    ]
    add_table(doc, ["Date", "Build milestone", "Evidence of progress"], progress_rows, [1200, 2700, 5460], font_size=8.6)
    add_heading(doc, "C2. Current validation evidence", 2)
    add_bullets(
        doc,
        [
            "npm test passes: smoke test and state/engine test both report PASS.",
            "Automated checks cover 31 required files and 25 served resources.",
            "State checks cover schema-v6 onboarding, rescue constraints, relationship-aware timing, v4/v3/v2/v1 migration, save/load/reset, round-trip messages, consent boundaries, and character-specific behavior.",
            "The current five-signal, first-contact, Observatory, and EchoLink screens were verified at the 393 x 852 reference viewport on August 4, 2026.",
            "Browser verification found no warnings or errors in the tested path.",
            "The offline demo still starts through npm start at http://127.0.0.1:5173.",
        ],
        bullet_num,
    )
    add_heading(doc, "C3. Known risks and honest boundaries", 2)
    add_bullets(
        doc,
        [
            "The six-interview sample is exploratory and does not validate market size or pricing.",
            "The five-character opening may create choice overload; comprehension must be tested.",
            "Eleven internal dimensions may be useful for implementation but too complex for users; the interface should continue to summarize them in natural language.",
            "The live-model architecture, safety system, and production memory retrieval are not implemented.",
            "The content library is still shallow relative to established romance games.",
            "Current generated scenes and media are simulations; no real calls, recordings, or background notifications exist.",
        ],
        bullet_num,
    )

    # Appendix D sources
    doc.add_page_break()
    add_heading(doc, "Appendix D. Research source links", 1)
    add_body(
        doc,
        "External numbers were checked on August 4, 2026. Appfigures and Sensor Tower values are market-intelligence estimates and should be described as estimates. Product-feature claims use official company pages where available.",
    )
    source_rows = []
    for key, (label, url, supports) in SOURCES.items():
        source_rows.append((key, label + " - " + supports, (url, "Open source")))
    add_table(doc, ["Ref", "Source and use", "Link"], source_rows, [650, 6900, 1810], font_size=8.2)

    add_heading(doc, "Internal project evidence", 2)
    internal_rows = [
        ("docs/PRODUCT_BRIEF.md", "Positioning, prototype question, target users, principles, demo scope."),
        ("docs/RESEARCH_BASIS.md", "Six-interview synthesis, direct findings, demo mapping, and unvalidated hypotheses."),
        ("docs/RESEARCH_TRACEABILITY.md", "Interview-theme to prototype-behavior traceability."),
        ("docs/PRODUCT_SPEC.md", "Character cores, relationship model, memory model, acceptance questions."),
        ("docs/MAIN_STORY.md", "Xu Cheng premise, five evidence routes, chapters, endings, demo boundary."),
        ("docs/ARCHITECTURE.md", "Current stack, runtime flow, state schema, compatibility, model-provider boundary."),
        ("docs/DEMO_FLOW.md and docs/DEMO_SCRIPT.md", "Latest demonstration path and honest scope language."),
        ("PLANS.md", "Dated build changes, validation evidence, and research-driven rationale."),
        ("app/ and tools/", "Current product implementation and automated checks."),
    ]
    add_table(doc, ["Repository source", "Evidence used"], internal_rows, [3000, 6360], font_size=8.8)

    # Appendix E checklist
    add_heading(doc, "Appendix E. Final hand-in checklist", 1)
    add_bullets(
        doc,
        [
            "Replace every [REPLACE] field and delete unused team rows.",
            "Add consistent teammate photos, program/major/minor, university, internship companies, and relevant interests.",
            "Insert all six raw interview notes and accurate participant-level details with consent.",
            "Convert this report into the presentation deck using the 12-slide blueprint; keep sources in appendix slides.",
            "Use the EchoLoom logo plus the functional value proposition on Slide 1.",
            "Use no more than three major interview insights on the user slide.",
            "Label Appfigures/Sensor Tower values as estimates and label year-one SOM as a team target.",
            "Preload the demo and keep a fallback Observatory tab ready.",
            "Run npm test immediately before presenting.",
            "Rehearse under 7:40 without reading from a phone or paper.",
            "Submit and present by Friday, August 7, 2026 at 1:30 p.m.",
        ],
        bullet_num,
    )
    add_callout(
        doc,
        "Final quality gate:",
        "The story should be easy to repeat in one sentence: EchoLoom earns attachment through a shared mystery, then protects continuity through free conversation, character autonomy, and memory the player controls.",
        fill=LIGHT_GOLD,
        border="C8B28D",
    )

    # Core metadata and save.
    props = doc.core_properties
    props.title = "EchoLoom Assignment 3 Evidence and Presentation Report"
    props.subject = "CSC454 and CSC491 Summer 2026"
    props.author = "EchoLoom team"
    props.keywords = "EchoLoom, Assignment 3, CSC454, CSC491, AI relationships, interactive fiction"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_path)
    print(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the EchoLoom coursework report.")
    parser.add_argument("--output", type=Path, default=OUTPUT, help="Destination DOCX file.")
    build_report(parser.parse_args().output)
