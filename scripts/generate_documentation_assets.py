from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "PROJECT_DOCUMENTATION" / "assets"


BG = "#0f172a"
PANEL = "#111c33"
PANEL_2 = "#17233f"
TEXT = "#e5eefc"
MUTED = "#9cb0cf"
ACCENT = "#53d3ff"
ACCENT_2 = "#7c9cff"
ACCENT_3 = "#42d392"
ACCENT_4 = "#ffcf5a"
RED = "#ff6b6b"


def font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw, xy1, xy2, color=TEXT, width=5, arrow_size=18):
    draw.line([xy1, xy2], fill=color, width=width)
    x1, y1 = xy1
    x2, y2 = xy2
    dx = x2 - x1
    dy = y2 - y1
    length = (dx * dx + dy * dy) ** 0.5 or 1
    ux = dx / length
    uy = dy / length
    px = -uy
    py = ux
    p1 = (x2 - ux * arrow_size + px * arrow_size * 0.6, y2 - uy * arrow_size + py * arrow_size * 0.6)
    p2 = (x2, y2)
    p3 = (x2 - ux * arrow_size - px * arrow_size * 0.6, y2 - uy * arrow_size - py * arrow_size * 0.6)
    draw.polygon([p1, p2, p3], fill=color)


def text_block(draw, xy, lines, size=28, fill=TEXT, bold=False, gap=8):
    f = font(size, bold=bold)
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=f, fill=fill)
        y += size + gap


def title_card(draw, title, subtitle):
    rounded_rect(draw, (70, 50, 1930, 170), 36, fill=PANEL, outline="#2c3d66", width=3)
    draw.text((120, 78), title, font=font(40, bold=True), fill=TEXT)
    draw.text((120, 132), subtitle, font=font(22), fill=MUTED)


def add_footer(draw, text):
    draw.text((70, 1120), text, font=font(18), fill=MUTED)


def card(draw, box, title, body, accent=ACCENT):
    x1, y1, x2, y2 = box
    rounded_rect(draw, box, 28, fill=PANEL_2, outline=accent, width=4)
    draw.text((x1 + 28, y1 + 22), title, font=font(26, bold=True), fill=TEXT)
    body_y = y1 + 68
    if isinstance(body, list):
        text_block(draw, (x1 + 28, body_y), body, size=21, fill=MUTED, gap=8)
    else:
        draw.multiline_text((x1 + 28, body_y), body, font=font(21), fill=MUTED, spacing=8)


def save(image: Image.Image, relative: str):
    path = ASSETS / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def make_canvas():
    return Image.new("RGB", (2000, 1200), BG), ImageDraw.Draw(Image.new("RGB", (1, 1)))


def base_image():
    img = Image.new("RGB", (2000, 1200), BG)
    draw = ImageDraw.Draw(img)
    # background accents
    draw.ellipse((-220, -180, 760, 720), fill="#14213d")
    draw.ellipse((1220, -120, 2220, 820), fill="#111d35")
    draw.ellipse((1260, 760, 2100, 1560), fill="#10182c")
    return img, draw


def generate_architecture_overview():
    img, draw = base_image()
    title_card(draw, "Hydro Sentinel - Architecture Overview", "Vue système globale: frontend, API, base de données, données géospatiales et pipeline Sebou")
    card(draw, (90, 220, 560, 470), "Frontend React/Vite", [
        "Dashboard, cartes, tableaux et graphiques",
        "Routes protégées et lazy loading",
        "TanStack Query + Zustand",
    ], accent=ACCENT)
    card(draw, (710, 220, 1290, 470), "FastAPI /api/v1", [
        "Auth, stations, mesures, dashboards",
        "Cartes thématiques et ingestion",
        "Validation Pydantic et routeurs dédiés",
    ], accent=ACCENT_2)
    card(draw, (1420, 220, 1910, 470), "PostgreSQL + asyncpg", [
        "app_inondation_db",
        "auth / api / sebou",
        "PostGIS et index spatiaux",
    ], accent=ACCENT_3)
    card(draw, (245, 670, 875, 955), "Données géospatiales", [
        "SHP, GeoJSON, GeoTIFF",
        "Bassins, stations, barrages",
        "Couche carte et produits thématiques",
    ], accent=ACCENT_4)
    card(draw, (1125, 670, 1755, 955), "Pipeline Sebou", [
        "Acquisition, prétraitement, détection",
        "Validation, export, agrégation",
        "Flood et snow analytics",
    ], accent=RED)
    arrow(draw, (560, 345), (710, 345), color=TEXT)
    arrow(draw, (1290, 345), (1420, 345), color=TEXT)
    arrow(draw, (1000, 470), (560, 670), color=ACCENT)
    arrow(draw, (1000, 470), (1125, 670), color=ACCENT)
    add_footer(draw, "Generated for PROJECT_DOCUMENTATION/assets - Hydro Sentinel")
    save(img, "architecture/architecture_overview.png")


def generate_frontend_backend_flow():
    img, draw = base_image()
    title_card(draw, "Frontend / Backend Flow", "Navigation, requêtes API, réponse JSON et mise à jour de l'interface")
    card(draw, (110, 280, 470, 580), "Utilisateur", [
        "Clique sur une page",
        "Change un filtre",
        "Sélectionne une station ou un bassin",
    ], accent=ACCENT_4)
    card(draw, (570, 280, 1010, 580), "Frontend", [
        "React Router",
        "Suspense et lazy loading",
        "React Query pour les appels réseau",
    ], accent=ACCENT)
    card(draw, (1085, 280, 1485, 580), "API FastAPI", [
        "Validation",
        "Routes métier",
        "Réponses structurées",
    ], accent=ACCENT_2)
    card(draw, (1540, 280, 1890, 580), "Base de données", [
        "Vues api.*",
        "Tables auth/sebou",
        "Requêtes asynchrones",
    ], accent=ACCENT_3)
    card(draw, (675, 720, 1325, 980), "Rendu", [
        "Carte, KPI, tableaux et graphiques",
        "État de chargement visible",
        "Erreur métier lisible",
    ], accent=RED)
    arrow(draw, (470, 430), (570, 430), color=TEXT)
    arrow(draw, (1010, 430), (1085, 430), color=TEXT)
    arrow(draw, (1485, 430), (1540, 430), color=TEXT)
    arrow(draw, (1260, 580), (980, 720), color=ACCENT)
    add_footer(draw, "Hydro Sentinel documentation asset")
    save(img, "diagrams/frontend_backend_flow.png")


def generate_data_pipeline():
    img, draw = base_image()
    title_card(draw, "Data Pipeline", "Du fichier ou de la source jusqu'au dashboard")
    blocks = [
        ("Sources", (100, 360, 360, 620), ACCENT),
        ("Validation", (460, 360, 720, 620), ACCENT_2),
        ("Processing", (820, 360, 1080, 620), ACCENT_3),
        ("API", (1180, 360, 1440, 620), ACCENT_4),
        ("Dashboard", (1540, 360, 1800, 620), RED),
    ]
    for label, box, accent in blocks:
        card(draw, box, label, [
            "Étape du flux",
        ], accent=accent)
    for (_, box1, _), (_, box2, _) in zip(blocks, blocks[1:]):
        arrow(draw, (box1[2], 490), (box2[0], 490), color=TEXT)
    card(draw, (420, 760, 1580, 990), "Principes d'orchestration", [
        "Ne pas charger plus que nécessaire au premier rendu.",
        "Valider avant exposition.",
        "Distinguer la donnée source du produit de visualisation.",
    ], accent=ACCENT)
    add_footer(draw, "Flowchart generated as PNG")
    save(img, "diagrams/data_pipeline.png")


def generate_spatial_flow():
    img, draw = base_image()
    title_card(draw, "Spatial Flow", "Import spatial, normalisation, vues géographiques et rendu cartographique")
    card(draw, (90, 310, 410, 590), "SHP / GeoJSON", ["Données vectorielles", "Formats métier", "Emprise, attributs, géométrie"], accent=ACCENT_4)
    card(draw, (520, 310, 860, 590), "Import spatial", ["/import/spatial", "/admin/shp/upload", "Contrôles de structure"], accent=ACCENT)
    card(draw, (930, 310, 1270, 590), "Validation", ["CRS, géométrie, attributs", "Prévisualisation", "Nettoyage"], accent=ACCENT_2)
    card(draw, (1340, 310, 1680, 590), "Stockage spatial", ["PostGIS", "Index GIST", "Couche réutilisable"], accent=ACCENT_3)
    card(draw, (450, 730, 1550, 1020), "Map rendering", ["HydroMap et ThematicMapViewer consomment les couches et les produits thématiques", "Chargement conditionnel et affichage progressif"], accent=RED)
    arrow(draw, (410, 450), (520, 450), color=TEXT)
    arrow(draw, (860, 450), (930, 450), color=TEXT)
    arrow(draw, (1270, 450), (1340, 450), color=TEXT)
    arrow(draw, (1010, 590), (980, 730), color=ACCENT)
    add_footer(draw, "Spatial assets overview")
    save(img, "diagrams/spatial_flow.png")


def generate_database_schema():
    img, draw = base_image()
    title_card(draw, "Database Schema", "auth / api / sebou : les trois blocs de la base Hydro Sentinel")
    card(draw, (110, 250, 430, 470), "auth", [
        "user",
        "JWT",
        "rôles et accès",
    ], accent=ACCENT_4)
    card(draw, (760, 220, 1240, 530), "api", [
        "v_basin",
        "v_station",
        "v_timeseries_station",
        "v_latest_station_pivot",
        "v_top_critical_24h",
        "v_map_points_kpi",
    ], accent=ACCENT)
    card(draw, (1480, 220, 1890, 530), "sebou", [
        "daily_statistics",
        "flood_extents",
        "snow_extents",
        "alerts",
        "quality_reports",
    ], accent=ACCENT_3)
    card(draw, (520, 700, 1480, 980), "Flux", [
        "Le backend lit les vues api.* pour alimenter le dashboard et les cartes.",
        "Les tables sebou.* stockent les résultats d'analyse et les indicateurs de traitement.",
        "auth.user gère l'authentification.",
    ], accent=RED)
    arrow(draw, (430, 360), (760, 360), color=TEXT)
    arrow(draw, (1240, 360), (1480, 360), color=TEXT)
    arrow(draw, (1020, 530), (1020, 700), color=ACCENT)
    add_footer(draw, "Database overview PNG")
    save(img, "database/schema_overview.png")


def generate_database_erd():
    img, draw = base_image()
    title_card(draw, "Database ERD", "Relations conceptuelles utilisées dans la documentation")
    card(draw, (90, 290, 420, 550), "auth.user", [
        "id",
        "email",
        "role",
        "is_superuser",
    ], accent=ACCENT_4)
    card(draw, (560, 290, 930, 550), "api.v_station", [
        "station_id",
        "station_name",
        "basin_id",
        "geom",
    ], accent=ACCENT)
    card(draw, (1060, 290, 1430, 550), "api.v_basin", [
        "basin_id",
        "basin_name",
        "geom",
    ], accent=ACCENT_2)
    card(draw, (1560, 290, 1910, 550), "sebou.daily_statistics", [
        "date",
        "snow_area_km2",
        "flood_area_km2",
        "quality_score",
    ], accent=ACCENT_3)
    card(draw, (360, 750, 1640, 1020), "Relations", [
        "v_station et v_basin structurent les lectures cartographiques.",
        "daily_statistics alimente la synthèse thématique.",
        "Les vues KPI consolident les données pour le dashboard.",
    ], accent=RED)
    arrow(draw, (420, 420), (560, 420), color=TEXT)
    arrow(draw, (930, 420), (1060, 420), color=TEXT)
    arrow(draw, (1430, 420), (1560, 420), color=TEXT)
    add_footer(draw, "ERD simplified for documentation")
    save(img, "database/erd.png")


def generate_layer_catalog():
    img, draw = base_image()
    title_card(draw, "Layer Catalog", "Couches visibles et lecture cartographique")
    rows = [
        ("Stations", "Points d'observation", ACCENT),
        ("Bassins", "Emprises hydrologiques", ACCENT_2),
        ("Barrages", "Ouvrages", ACCENT_3),
        ("Flood", "Vigilance inondation", ACCENT_4),
        ("Snow", "Couverture neige", RED),
    ]
    y = 250
    for name, desc, color in rows:
        rounded_rect(draw, (120, y, 1880, y + 145), 24, fill=PANEL_2, outline=color, width=3)
        draw.text((160, y + 26), name, font=font(30, bold=True), fill=TEXT)
        draw.text((420, y + 32), desc, font=font(24), fill=MUTED)
        draw.text((1500, y + 32), "Vector / raster / thematic", font=font(22), fill=color)
        y += 165
    add_footer(draw, "Layer catalog preview")
    save(img, "maps/layer_catalog.png")


def generate_workflow_hydro():
    img, draw = base_image()
    title_card(draw, "Hydro-Meteo Sebou Workflow", "Du filtre utilisateur à la synthèse cartographique")
    steps = [
        ("Filters", (110, 370, 340, 560), ACCENT),
        ("KPI", (420, 370, 650, 560), ACCENT_2),
        ("Map", (730, 370, 960, 560), ACCENT_3),
        ("Table", (1040, 370, 1270, 560), ACCENT_4),
        ("Charts", (1350, 370, 1580, 560), RED),
        ("Synthesis", (1660, 370, 1890, 560), "#7aa2ff"),
    ]
    for label, box, accent in steps:
        card(draw, box, label, ["Étape"], accent=accent)
    for (_, box1, _), (_, box2, _) in zip(steps, steps[1:]):
        arrow(draw, (box1[2], 465), (box2[0], 465), color=TEXT)
    card(draw, (260, 720, 1740, 1020), "Lecture métier", [
        "La page démarre par les KPI pour donner une image immédiate.",
        "La carte et les tableaux s'affichent ensuite de manière progressive.",
        "Les interactions restent cohérentes entre surveillance, données et synthèse.",
    ], accent=ACCENT)
    add_footer(draw, "Workflow asset")
    save(img, "workflows/hydro_meteo_sebou_workflow.png")


def generate_ingestion_workflow():
    img, draw = base_image()
    title_card(draw, "Ingestion Workflow", "Upload, analyse, validation et exposition")
    steps = [
        ("Upload", (120, 360, 360, 560), ACCENT_4),
        ("Analyze", (450, 360, 690, 560), ACCENT),
        ("Validate", (780, 360, 1020, 560), ACCENT_2),
        ("Execute", (1110, 360, 1350, 560), ACCENT_3),
        ("Store", (1440, 360, 1680, 560), RED),
        ("Expose", (1770, 360, 1910, 560), "#7aa2ff"),
    ]
    for label, box, accent in steps:
        card(draw, box, label, ["Step"], accent=accent)
    for (_, box1, _), (_, box2, _) in zip(steps, steps[1:]):
        arrow(draw, (box1[2], 460), (box2[0], 460), color=TEXT)
    card(draw, (300, 720, 1700, 1030), "Backend focus", [
        "Le backend analyse la structure de l'import avant exécution.",
        "Les données sont validées puis stockées dans les vues ou tables cibles.",
        "L'utilisateur reçoit un retour exploitable dans l'interface.",
    ], accent=ACCENT)
    add_footer(draw, "Ingestion asset")
    save(img, "workflows/ingestion_workflow.png")


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    generate_architecture_overview()
    generate_frontend_backend_flow()
    generate_data_pipeline()
    generate_spatial_flow()
    generate_database_schema()
    generate_database_erd()
    generate_layer_catalog()
    generate_workflow_hydro()
    generate_ingestion_workflow()
    (ASSETS / "PNG_ASSETS.md").write_text(
        "# PNG Assets\n\n"
        "Liste des images PNG generes pour la documentation Hydro Sentinel.\n\n"
        "## Architecture\n\n"
        "- `architecture/architecture_overview.png`\n\n"
        "## Diagrammes\n\n"
        "- `diagrams/frontend_backend_flow.png`\n"
        "- `diagrams/data_pipeline.png`\n"
        "- `diagrams/spatial_flow.png`\n\n"
        "## Base de donnees\n\n"
        "- `database/schema_overview.png`\n"
        "- `database/erd.png`\n\n"
        "## Cartographie\n\n"
        "- `maps/layer_catalog.png`\n\n"
        "## Workflows\n\n"
        "- `workflows/hydro_meteo_sebou_workflow.png`\n"
        "- `workflows/ingestion_workflow.png`\n",
        encoding="utf-8",
    )
    print(f"PNG assets generated in {ASSETS}")


if __name__ == "__main__":
    main()
