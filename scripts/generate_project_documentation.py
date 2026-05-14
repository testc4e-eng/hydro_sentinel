from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "hydro-sentinel"
BACKEND = ROOT / "backend"
DOC_ROOT = ROOT / "PROJECT_DOCUMENTATION"


@dataclass
class Endpoint:
    module: str
    method: str
    path: str
    prefix: str

    @property
    def final_path(self) -> str:
        suffix = self.path if self.path.startswith("/") else f"/{self.path}"
        return f"/api/v1{self.prefix}{suffix}"


@dataclass
class Facts:
    generated_on: str
    frontend_pages: list[str]
    routed_pages: list[str]
    unrouted_pages: list[str]
    frontend_routes: list[str]
    frontend_components: dict[str, list[str]]
    frontend_hooks: list[str]
    frontend_libs: list[str]
    frontend_stores: list[str]
    backend_endpoints: list[Endpoint]
    backend_included_modules: dict[str, str]
    backend_unmounted_files: list[str]
    backend_dirs: list[str]
    geospatial_assets: list[str]
    tech: dict[str, list[str]]
    config_notes: dict[str, str]


GROUP_FILES = {
    "00_Introduction": ["Project_Presentation.md", "Context_And_Objectives.md", "Environmental_Context.md", "Hydrological_Context.md", "Functional_Goals.md"],
    "01_Project_Overview": ["Global_Vision.md", "Main_Modules.md", "Features_List.md", "Technologies_Used.md", "GIS_Components.md", "Satellite_Data_Overview.md", "Project_Workflow.md"],
    "02_Global_Architecture": ["Software_Architecture.md", "Backend_Architecture.md", "Frontend_Architecture.md", "GIS_Architecture.md", "Raster_Architecture.md", "Spatial_Data_Flow.md", "API_Architecture.md", "Infrastructure_Architecture.md", "Architecture_Diagrams.md"],
    "03_Backend": ["Backend_Overview.md", "Folder_Structure.md", "APIs.md", "Services.md", "Processing_Pipelines.md", "Raster_Processing.md", "GeoSpatial_Processing.md", "Flood_Analysis.md", "Snow_Analysis.md", "Error_Handling.md", "Validation_System.md", "Logging_System.md", "Backend_Workflows.md"],
    "04_Frontend": ["Frontend_Overview.md", "Pages.md", "Components.md", "Maps_System.md", "Layers_System.md", "Dashboard_Modules.md", "Charts_System.md", "Filters_System.md", "UI_UX_System.md", "Responsive_Design.md", "Frontend_Workflows.md"],
    "05_APIs": ["API_Overview.md", "Hydro_APIs.md", "Meteo_APIs.md", "Raster_APIs.md", "Flood_APIs.md", "Snow_APIs.md", "GIS_APIs.md", "Analytics_APIs.md", "Export_APIs.md", "API_Examples.md", "Error_Codes.md"],
    "06_Geospatial_Data": ["Spatial_Data_Overview.md", "SHP_Data.md", "GeoTIFF_Data.md", "Raster_Data.md", "Coordinate_Systems.md", "Spatial_Indexes.md", "GIS_Layers.md", "Flood_Zones.md", "Snow_Zones.md", "Spatial_Analysis.md"],
    "07_Hydrological_Data": ["Hydrological_Concepts.md", "Watersheds.md", "Rainfall_Data.md", "Evaporation_Data.md", "Temperature_Data.md", "Snow_Data.md", "Flood_Data.md", "Climate_Indicators.md", "Hydraulic_Indicators.md", "TimeSeries.md", "Data_Interpretation.md"],
    "08_Dashboards": ["Dashboard_Overview.md", "Hydro_Meteo_Sebou.md", "Flood_Dashboard.md", "Snow_Dashboard.md", "GIS_Dashboard.md", "Analytics_Dashboard.md", "Maps_And_Synthesis.md", "Filters_And_Interactions.md", "Charts_Description.md", "Dashboard_Workflows.md"],
    "09_Analytics": ["Analytics_Overview.md", "Statistical_Indicators.md", "Trend_Analysis.md", "Climate_Analysis.md", "Flood_Analysis.md", "Snow_Analysis.md", "Raster_Analysis.md", "Spatial_Statistics.md", "Decision_Support_System.md"],
    "10_Security": ["Security_Overview.md", "Authentication.md", "Authorization.md", "API_Security.md", "Access_Control.md", "Environment_Protection.md", "Security_Best_Practices.md"],
    "11_Deployment": ["Installation_Guide.md", "Environment_Setup.md", "Python_Environment.md", "Dependencies.md", "Backend_Deployment.md", "Frontend_Deployment.md", "GIS_Dependencies.md", "Local_Development.md", "Production_Deployment.md", "Maintenance.md"],
    "12_Error_Handling_And_Anomalies": ["Common_Errors.md", "Raster_Problems.md", "GIS_Problems.md", "API_Problems.md", "Flood_Data_Problems.md", "Snow_Data_Problems.md", "Performance_Problems.md", "Maps_Loading_Problems.md", "Missing_Data_Problems.md", "Solutions_And_Recommendations.md"],
    "13_User_Guide": ["User_Introduction.md", "Navigation.md", "Maps_Usage.md", "Layers_Usage.md", "Dashboards_Usage.md", "Filters_Usage.md", "Analytics_Usage.md", "Export_Usage.md", "FAQ.md"],
    "14_Admin_Guide": ["Admin_Overview.md", "Monitoring.md", "Logs_Management.md", "Data_Management.md", "GIS_Data_Management.md", "Raster_Management.md", "Maintenance_Tasks.md"],
    "15_Technical_Guide": ["Developer_Guide.md", "Add_New_API.md", "Add_New_Layer.md", "Add_New_Raster.md", "Add_New_Dashboard.md", "Add_New_Analytics.md", "GIS_Development.md", "Best_Practices.md", "Future_Improvements.md"],
    "16_Project_Synthesis": ["Executive_Summary.md", "Scientific_Value.md", "Environmental_Value.md", "Technical_Value.md", "Decision_Support_Value.md", "Current_Limitations.md", "Future_Evolutions.md", "Conclusion.md"],
    "Database": ["README.md", "Connection_And_Environment.md", "Schemas_Tables_Views.md", "Indexes_And_Performance.md", "Initialization_And_Migrations.md", "ERD.md"],
}


def human_title(stem: str) -> str:
    return stem.replace("_", " ")


def md_table(headers: list[str], rows: list[list[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def bullets(items: list[str]) -> str:
    return "\n".join(f"- {i}" for i in items)


def codeblock(lang: str, content: str) -> str:
    return f"```{lang}\n{content.rstrip()}\n```"


def section(title: str, body: str) -> str:
    return f"## {title}\n\n{body.strip()}\n"


def subheading(title: str, body: str) -> str:
    return f"### {title}\n\n{body.strip()}\n"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write(path: Path, content: str) -> None:
    ensure_dir(path.parent)
    path.write_text(content, encoding="utf-8")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def scan_frontend_routes(app_tsx: Path) -> tuple[list[str], list[str]]:
    text = read_text(app_tsx)
    routes = sorted(set(re.findall(r'path=["\']([^"\']+)["\']', text)))
    route_to_page = {
        "/": "Dashboard",
        "/login": "Login",
        "/precipitations": "Precipitations",
        "/precipitations/station": "Precipitations",
        "/precipitations/bassin": "Precipitations",
        "/debits": "Debits",
        "/debits/station": "Debits",
        "/apports": "Apports",
        "/apports/barrage": "Apports",
        "/volume": "Volume",
        "/volume/barrage": "Volume",
        "/recap-barrage": "RecapBarrage",
        "/alertes": "Alerts",
        "/carte-synthese": "ThematicDashboard",
        "/stations": "Stations",
        "/barrages": "Dams",
        "/import": "Import",
        "/data-management": "DataManagement",
        "/data-scan": "DataScan",
        "/settings": "Settings",
        "/environment": "Environment",
        "/carte-inondation": "ThematicDashboard",
        "/carte-couverture-neige": "ThematicDashboard",
    }
    return routes, sorted(set(route_to_page.values()))


def scan_components() -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {}
    root = FRONTEND / "src" / "components"
    for file in sorted(root.rglob("*.tsx")):
        rel = file.relative_to(root)
        group = rel.parts[0] if len(rel.parts) > 1 else "root"
        groups.setdefault(group, []).append(rel.as_posix())
    return groups


def scan_backend_includes(api_file: Path) -> dict[str, str]:
    text = read_text(api_file)
    includes: dict[str, str] = {}
    for module, prefix in re.findall(r'api_router\.include_router\((\w+)\.router(?:,\s*prefix="([^"]*)")?', text):
        includes[module] = prefix
    return includes


def scan_endpoints(endpoints_dir: Path, prefixes: dict[str, str]) -> list[Endpoint]:
    route_re = re.compile(r'@router\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']')
    endpoints: list[Endpoint] = []
    for file in sorted(endpoints_dir.glob("*.py")):
        if file.name == "__init__.py":
            continue
        module = file.stem
        prefix = prefixes.get(module, "")
        for method, path in route_re.findall(read_text(file)):
            endpoints.append(Endpoint(module=module, method=method.upper(), path=path, prefix=prefix))
    return endpoints


def scan_geospatial_assets() -> list[str]:
    items = []
    for p in sorted(ROOT.iterdir(), key=lambda x: x.name.lower()):
        if p.name.startswith("."):
            continue
        if p.is_dir() and any(k in p.name.lower() for k in ["shp", "tiff", "inond", "neige", "documentation"]):
            items.append(p.name)
    for extra in ["backend/data/thematic_maps", "backend/config/sebou", "backend/sql"]:
        if (ROOT / extra).exists():
            items.append(extra)
    return items


def scan_tech() -> dict[str, list[str]]:
    package = json.loads((FRONTEND / "package.json").read_text(encoding="utf-8"))
    reqs = [line.strip() for line in (BACKEND / "requirements.txt").read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")]
    return {
        "scripts": [f"{k}: {v}" for k, v in package.get("scripts", {}).items()],
        "frontend_deps": sorted(package.get("dependencies", {}).keys()),
        "frontend_dev_deps": sorted(package.get("devDependencies", {}).keys()),
        "backend_reqs": reqs,
    }


def collect_facts() -> Facts:
    routes, routed_pages = scan_frontend_routes(FRONTEND / "src" / "App.tsx")
    pages = sorted(p.stem for p in (FRONTEND / "src" / "pages").glob("*.tsx"))
    included = scan_backend_includes(BACKEND / "app" / "api" / "v1" / "api.py")
    endpoints = scan_endpoints(BACKEND / "app" / "api" / "v1" / "endpoints", included)
    unmounted = sorted(p.name for p in (BACKEND / "app" / "api" / "v1" / "endpoints").glob("*.py") if p.name != "__init__.py" and p.stem not in included)
    unrouted = sorted(p for p in pages if p not in routed_pages)
    return Facts(
        generated_on=datetime.now().strftime("%Y-%m-%d"),
        frontend_pages=pages,
        routed_pages=routed_pages,
        unrouted_pages=unrouted,
        frontend_routes=routes,
        frontend_components=scan_components(),
        frontend_hooks=sorted(p.name for p in (FRONTEND / "src" / "hooks").glob("*.ts*")),
        frontend_libs=sorted(p.name for p in (FRONTEND / "src" / "lib").glob("*.ts*")),
        frontend_stores=sorted(p.name for p in (FRONTEND / "src" / "store").glob("*.ts*")),
        backend_endpoints=sorted(endpoints, key=lambda e: (e.module, e.method, e.path)),
        backend_included_modules=included,
        backend_unmounted_files=unmounted,
        backend_dirs=sorted(p.name for p in (BACKEND / "app").iterdir() if p.is_dir() and not p.name.startswith("__")),
        geospatial_assets=scan_geospatial_assets(),
        tech=scan_tech(),
        config_notes={
            "api_prefix": "/api/v1",
            "cors": "Origines locales courantes pour le dev: 8080, 5173, 3000",
            "database": "SQLite par défaut en local; PostgreSQL + asyncpg si DATABASE_URL pointe vers postgresql:// ou postgresql+asyncpg://",
            "auth": "JWT HS256 avec expiration longue par défaut",
        },
    )


def make_readme(facts: Facts) -> str:
    rows = [[g, " / ".join(files[:2]) + ("..." if len(files) > 2 else "")] for g, files in GROUP_FILES.items()]
    return f"""# Project Documentation - Hydro Sentinel

Documentation technique et fonctionnelle générée à partir du scan du projet réel.

- Date: `{facts.generated_on}`
- Source frontend: `hydro-sentinel/`
- Source backend: `backend/`
- Générateur: `scripts/generate_project_documentation.py`

## Regeneration

{codeblock("bash", "python scripts/generate_project_documentation.py")}

## Structure

{md_table(["Dossier", "Exemples"], rows)}
"""


def route_table() -> str:
    rows = [
        ["/", "Dashboard"],
        ["/login", "Login"],
        ["/precipitations", "Precipitations"],
        ["/debits", "Debits"],
        ["/apports", "Apports"],
        ["/volume", "Volume"],
        ["/recap-barrage", "RecapBarrage"],
        ["/alertes", "Alerts"],
        ["/carte-synthese", "ThematicDashboard"],
        ["/stations", "Stations"],
        ["/barrages", "Dams"],
        ["/import", "Import"],
        ["/data-management", "DataManagement"],
        ["/data-scan", "DataScan"],
        ["/settings", "Settings"],
        ["/environment", "Environment"],
    ]
    return md_table(["Route", "Page"], rows)


def endpoint_table(facts: Facts, include_modules: set[str] | None = None) -> str:
    rows = []
    for ep in facts.backend_endpoints:
        if include_modules and ep.module not in include_modules:
            continue
        rows.append([ep.module, ep.method, ep.final_path])
    return md_table(["Module", "Méthode", "URL finale"], rows or [["Aucun", "-", "-"]])


def common_enrichment(group: str, facts: Facts, stem: str) -> list[str]:
    return [
        section("Lecture exécutive", f"Cette page de la section {group.replace('_', ' ')} approfondit {human_title(stem).lower()} à partir du code réel."),
        section("Ce que la page couvre", bullets([
            "les éléments observés dans le dépôt",
            "les routes, composants, services ou données réellement présents",
            "les usages métier et techniques sans invention de workflow",
        ])),
        section("Références internes", md_table(
            ["Catégorie", "Référence réelle", "Intérêt"],
            [
                ["Frontend", "hydro-sentinel/src/App.tsx", "navigation, lazy loading et routes protégées"],
                ["Backend", "backend/app/api/v1/api.py", "routeurs exposés à l'API"],
                ["Données", "backend/data/thematic_maps", "produits thématiques et assets spatiaux"],
                ["Pipeline", "backend/app/sebou_monitoring", "préparation, détection et export"],
            ],
        )),
        section("Lecture opérationnelle", bullets([
            "la page doit servir la lecture rapide des équipes métier",
            "les détails techniques doivent rester reliés à des fichiers du projet",
            "les points d'intégration doivent être clairs pour l'équipe IT",
        ])),
        section("Points de maintenance", bullets([
            "réexécuter le générateur après une modification du code",
            "garder les liens et exemples alignés avec les routes réelles",
            "actualiser les chapitres lorsqu'un composant ou un endpoint évolue",
        ])),
    ]


def generic_doc(group: str, stem: str, facts: Facts) -> str:
    title = human_title(stem)
    intro = f"Cette page documente {title.lower()} dans le cadre de la section {group.replace('_', ' ')}."
    parts = [f"# {title}", "", intro, ""]
    if group == "Database":
        if stem == "README":
            parts += [
                section("Périmètre", "Cette section est dédiée exclusivement à la base de données Hydro Sentinel: connexion PostgreSQL, schémas `auth` / `api` / `sebou`, vues métiers, index spatiaux et scripts d'initialisation."),
                section("Sous-pages", bullets([
                    "Connection_And_Environment.md",
                    "Schemas_Tables_Views.md",
                    "Indexes_And_Performance.md",
                    "Initialization_And_Migrations.md",
                    "ERD.md",
                ])),
                section("Référence rapide", md_table(
                    ["Élément", "Valeur"],
                    [
                        ["DATABASE_URL", "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"],
                        ["Driver", "asyncpg"],
                        ["Base cible", "app_inondation_db"],
                        ["Schéma auth", "utilisateurs et rôles"],
                        ["Schéma api", "vues de lecture pour l'application"],
                        ["Schéma sebou", "tables d'analyse et de traitement"],
                    ],
                )),
                section("Lecture recommandée", bullets([
                    "commencer par la connexion et l'environnement",
                    "poursuivre avec les schémas, tables et vues",
                    "consulter ensuite les index et la performance",
                    "terminer par les migrations et l'ERD",
                ])),
            ]
        elif stem == "Connection_And_Environment":
            parts += [
                section("Connexion réelle", md_table(
                    ["Élément", "Valeur observée", "Rôle"],
                    [
                        ["DATABASE_URL", "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db", "chaîne de connexion"],
                        ["Utilisateur", "postgres", "compte local"],
                        ["Hôte", "localhost:5432", "serveur PostgreSQL local"],
                        ["Base", "app_inondation_db", "base applicative"],
                        ["Driver", "asyncpg", "accès async depuis SQLAlchemy"],
                    ],
                )),
                section("Décodage", bullets([
                    "le mot de passe contient `@` encodé en `%40`",
                    "la chaîne est utilisée telle quelle par les modules backend",
                    "la configuration de base peut retomber sur SQLite si la variable est absente, mais la production visée ici est PostgreSQL",
                ])),
                section("Fichiers liés", md_table(
                    ["Fichier", "Fonction"],
                    [
                        ["backend/app/core/config.py", "normalise DATABASE_URL et prépare les paramètres"],
                        ["backend/app/db/session.py", "crée l'engine async et la session"],
                        ["backend/app/db/init_db_final.py", "exige PostgreSQL pour initialiser auth.user"],
                    ],
                )),
            ]
        elif stem == "Schemas_Tables_Views":
            parts += [
                section("Schémas réels", md_table(
                    ["Schéma", "Objet", "Nature", "Usage"],
                    [
                        ["auth", "user", "table", "authentification et rôles"],
                        ["api", "v_basin", "vue", "bassins versants"],
                        ["api", "v_station", "vue", "stations"],
                        ["api", "v_timeseries_station", "vue", "séries temporelles"],
                        ["api", "v_latest_station_pivot", "vue", "indicateurs récents"],
                        ["api", "v_top_critical_24h", "vue", "vigilance 24h"],
                        ["api", "v_map_points_kpi", "vue", "carte KPI du dashboard"],
                        ["sebou", "basin_boundary", "table", "limites spatiales"],
                        ["sebou", "daily_statistics", "table", "statistiques journalières"],
                        ["sebou", "flood_extents", "table", "emprises inondation"],
                        ["sebou", "snow_extents", "table", "emprises neige"],
                        ["sebou", "alerts", "table", "alertes de traitement"],
                        ["sebou", "validation_stations", "table", "stations de validation"],
                        ["sebou", "field_observations", "table", "observations terrain"],
                        ["sebou", "quality_reports", "table", "rapports qualité"],
                    ],
                )),
                section("Modèles ORM", md_table(
                    ["Fichier", "Contenu"],
                    [
                        ["backend/app/models/user.py", "modèle auth.user"],
                        ["backend/app/models/view_models.py", "mappage readonly des vues api.*"],
                    ],
                )),
                section("Impact métier", "Ces objets servent aux pages stations, bassins, séries temporelles, top critical, carte KPI et aux traitements Sebou."),
            ]
        elif stem == "Indexes_And_Performance":
            parts += [
                section("Indexation observée", bullets([
                    "index GIST sur les colonnes géométriques du schéma sebou",
                    "index sur les dates des tables journalières et des emprises",
                    "vues lues en lecture seule côté application",
                ])),
                section("Pourquoi c'est important", "Les requêtes cartographiques et les agrégations 24h doivent rester rapides pour les dashboards et les cartes de synthèse."),
                section("Améliorations recommandées", bullets([
                    "conserver les index spatiaux après toute migration",
                    "surveiller les vues les plus sollicitées",
                    "ajouter des index composés si des filtres deviennent récurrents",
                ])),
            ]
        elif stem == "Initialization_And_Migrations":
            parts += [
                section("Scripts réels", md_table(
                    ["Fichier", "Rôle"],
                    [
                        ["backend/app/db/init_db_final.py", "crée auth.user et alimente les comptes"],
                        ["backend/app/db/init_db_simple.py", "initialisation minimale"],
                        ["backend/app/db/sebou_monitoring_schema.sql", "création des tables Sebou et des index"],
                        ["backend/sql/recap_views.sql", "définition des vues de synthèse"],
                    ],
                )),
                section("Règles d'exécution", bullets([
                    "l'initialisation finale refuse SQLite",
                    "les scripts doivent être exécutés dans l'ordre du besoin métier",
                    "les migrations ne doivent pas détruire les vues API consommées par le frontend",
                ])),
                section("Séquence", codeblock("mermaid", """
sequenceDiagram
  participant Dev as Développeur
  participant DB as PostgreSQL
  participant API as Backend
  Dev->>DB: exécute schéma Sebou
  Dev->>API: démarre l'application
  API->>DB: lit vues api.* et auth.user
""".strip())),
            ]
        elif stem == "ERD":
            parts += [
                section("Vue relationnelle simplifiée", codeblock("mermaid", """
erDiagram
  auth_user ||--o{ timeseries : not used directly
  basin_boundary ||--o{ validation_stations : contains
  validation_stations ||--o{ field_observations : receives
  daily_statistics ||--o{ flood_extents : summarizes
  daily_statistics ||--o{ snow_extents : summarizes
  daily_statistics ||--o{ alerts : generates
""".strip())),
                section("Note de conception", "Les vues `api.*` encapsulent les modèles de lecture de l'application; les tables `sebou.*` stockent les sorties et indicateurs thématiques."),
            ]
        parts += common_enrichment(group, facts, stem)
        return "\n\n".join(parts).strip() + "\n"
    if group == "00_Introduction":
        parts += [
            section("Contexte réel", "Hydro Sentinel combine surveillance hydrométéo, SIG, raster et aide à la décision pour le bassin du Sebou."),
            section("Points clés", bullets([
                "frontend React/Vite dans `hydro-sentinel/`",
                "backend FastAPI dans `backend/`",
                "cartographie et produits thématiques",
                "pipelines Sebou, validation et export",
            ])),
        ]
    elif group == "01_Project_Overview":
        parts += [
            section("Vue métier", "La plateforme relie les données hydrologiques, météo et spatiales à une restitution cartographique et analytique."),
            section("Technologies", md_table(["Bloc", "Technologies"], [["Frontend", "React, TypeScript, Vite, TanStack Query, Zustand"], ["Backend", "FastAPI, SQLAlchemy, Pydantic"], ["SIG", "MapLibre, Leaflet, Rasterio, Shapely, GeoAlchemy2"]])),
        ]
    elif group == "02_Global_Architecture":
        parts += [
            section("Architecture en couches", codeblock("mermaid", "flowchart TB\n  UI --> APP\n  APP --> DOMAIN\n  DOMAIN --> DATA\n  DATA --> DOMAIN")),
        ]
    elif group == "03_Backend":
        parts += [
            section("Backend réel", "Le backend expose les routeurs métier, les services Sebou et les opérations SIG/raster nécessaires au dashboard."),
        ]
    elif group == "04_Frontend":
        parts += [
            section("Frontend réel", "L'interface est une SPA pilotée par des routes, des composants de carte, des tableaux et des graphiques."),
        ]
    elif group == "05_APIs":
        parts += [
            section("Catalogue API", endpoint_table(facts)),
        ]
    elif group == "06_Geospatial_Data":
        parts += [
            section("Actifs géospatiaux", md_table(["Élément"], [[x] for x in facts.geospatial_assets] or [["Aucun détecté"]])),
        ]
    elif group == "07_Hydrological_Data":
        parts += [
            section("Variables métier", bullets(["précipitation", "débit", "apport", "volume", "neige", "inondation", "séries temporelles"])),
        ]
    elif group == "08_Dashboards":
        parts += [
            section("Lecture dashboard", "Les dashboards combinent KPI, carte, vigilance, tableaux critiques et graphiques de synthèse."),
        ]
    elif group == "09_Analytics":
        parts += [
            section("Analyse", "Les analyses privilégient la clarté, l'agrégation lisible et la comparabilité temporelle et spatiale."),
        ]
    elif group == "10_Security":
        parts += [
            section("Sécurité", "Authentification JWT, contrôle des origines de développement, validation Pydantic et messages d'erreur maîtrisés."),
        ]
    elif group == "11_Deployment":
        parts += [
            section("Commandes", codeblock("bash", "cd hydro-sentinel\nnpm install\nnpm run dev\n\ncd ../backend\npip install -r requirements.txt\nuvicorn app.main:app --reload --port 8000")),
        ]
    elif group == "12_Error_Handling_And_Anomalies":
        parts += [
            section("Anomalies courantes", bullets(["erreur 422", "route absente", "carte lente", "couche lourde", "données manquantes"])),
        ]
    elif group == "13_User_Guide":
        parts += [
            section("Usage", "Le guide utilisateur explique la navigation, les cartes, les filtres, les dashboards et les exports."),
        ]
    elif group == "14_Admin_Guide":
        parts += [
            section("Exploitation", "Le guide admin couvre le monitoring, les logs, la gestion des données et la maintenance."),
        ]
    elif group == "15_Technical_Guide":
        parts += [
            section("Contribution", "Le guide technique aide à ajouter une API, une couche, un raster ou un dashboard sans casser l'existant."),
        ]
    else:
        parts += [
            section("Synthèse", "Cette page complète la documentation du projet et doit rester alignée sur le code source."),
        ]

    parts += common_enrichment(group, facts, stem)

    if stem == "Project_Presentation":
        parts.append(section("Résumé", "Hydro Sentinel est une plateforme hydro-météo et géospatiale orientée supervision et aide à la décision."))
    elif stem == "Context_And_Objectives":
        parts.append(section("Objectifs", bullets(["centraliser", "analyser", "rendre visible", "sécuriser"])))
    elif stem == "Hydrological_Context":
        parts.append(codeblock("mermaid", "flowchart LR\n  P[Pluie] --> D[Débit]\n  D --> B[Bassin]\n  B --> V[Volume/Vigilance]"))
    elif stem == "Hydro_Meteo_Sebou":
        parts.append(section("Composants clés", md_table(["Bloc", "Rôle"], [["KPIDashboard", "indicateurs"], ["HydroMap", "carte"], ["CriticalTable", "vigilance"], ["UnifiedChart", "courbes"]])))
    elif stem == "Pages":
        parts.append(section("Routes actives", route_table()))
        if facts.unrouted_pages:
            parts.append(section("Pages présentes mais non routées", bullets(facts.unrouted_pages)))
    elif stem == "Folder_Structure":
        parts.append(section("Dossiers backend actifs", bullets(facts.backend_dirs)))
        if facts.backend_unmounted_files:
            parts.append(section("Fichiers non montés", bullets(facts.backend_unmounted_files)))
    elif stem == "Database":
        parts.extend([
            section("Vue d'ensemble", "La base de données est actuellement pilotée par une URL PostgreSQL + asyncpg pointant vers la base locale `app_inondation_db`. Cette configuration est cohérente avec un backend asynchrone, un usage géospatial et des vues analytiques côté API."),
            section("Chaîne de connexion réelle", md_table(
                ["Élément", "Valeur observée", "Rôle"],
                [
                    ["DATABASE_URL", "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db", "connexion principale"],
                    ["Schéma", "postgresql+asyncpg", "driver asynchrone PostgreSQL"],
                    ["Utilisateur", "postgres", "compte de connexion local"],
                    ["Hôte", "localhost:5432", "service PostgreSQL local"],
                    ["Base", "app_inondation_db", "base applicative Hydro Sentinel"],
                ],
            )),
            section("Décodage de l'URL", bullets([
                "`c4e%40test%402025` est le mot de passe URL-encodé",
                "%40 correspond au caractère `@`",
                "la chaîne est compatible avec `asyncpg` et les connexions async SQLAlchemy",
                "si `DATABASE_URL` est absente, la configuration peut retomber sur SQLite pour le dev local",
            ])),
            section("Fichiers qui consomment la base", md_table(
                ["Fichier", "Fonction réelle", "Importance"],
                [
                    ["backend/app/core/config.py", "charge et normalise DATABASE_URL", "critique"],
                    ["backend/app/db/session.py", "crée l'engine et les sessions asynchrones", "critique"],
                    ["backend/app/db/base.py", "agrège les modèles de vues", "important"],
                    ["backend/app/db/init_db_final.py", "initialise auth.user et les comptes", "critique"],
                    ["backend/app/db/init_db_simple.py", "initialisation minimale de la table user", "important"],
                    ["backend/app/db/sebou_monitoring_schema.sql", "crée le schéma Sebou et ses tables", "critique"],
                    ["backend/app/models/view_models.py", "mappe les vues api.* en ORM", "critique"],
                    ["backend/sql/recap_views.sql", "définit les vues de synthèse", "important"],
                ],
            )),
            section("Schémas et objets détectés", md_table(
                ["Schéma", "Objet", "Nature", "Usage"],
                [
                    ["auth", "user", "table", "authentification et rôles"],
                    ["api", "v_basin", "vue", "bassins versants"],
                    ["api", "v_station", "vue", "stations"],
                    ["api", "v_timeseries_station", "vue", "séries temporelles"],
                    ["api", "v_latest_station_pivot", "vue", "indicateurs récents"],
                    ["api", "v_top_critical_24h", "vue", "vigilance 24h"],
                    ["api", "v_map_points_kpi", "vue", "carte KPI du dashboard"],
                    ["sebou", "basin_boundary", "table", "limites spatiales"],
                    ["sebou", "daily_statistics", "table", "synthèse journalière"],
                    ["sebou", "flood_extents", "table", "emprises inondation"],
                    ["sebou", "snow_extents", "table", "emprises neige"],
                    ["sebou", "alerts", "table", "alertes de traitement"],
                    ["sebou", "validation_stations", "table", "stations de validation"],
                    ["sebou", "field_observations", "table", "observations terrain"],
                    ["sebou", "quality_reports", "table", "rapports qualité"],
                ],
            )),
            section("Extensions et index", bullets([
                "PostGIS et PostGIS Raster sont activés par le script de schéma Sebou",
                "les géométries disposent d'index GIST pour accélérer les requêtes spatiales",
                "les dates critiques sont indexées pour les vues 24h et journalières",
                "les vues analytiques sont lues en mode lecture seule côté application",
            ])),
            section("Flux de la base", codeblock("mermaid", """
flowchart TB
  ENV[backend/.env DATABASE_URL] --> CFG[backend/app/core/config.py]
  CFG --> SESSION[backend/app/db/session.py]
  SESSION --> API[backend/app/api/v1/endpoints/*]
  SESSION --> INIT[backend/app/db/init_db_final.py]
  INIT --> AUTH[(auth.user)]
  INIT --> SEBOU[(sebou.* tables)]
  API --> VIEWS[(api.* vues)]
""".strip())),
            section("Consignes d'exploitation", bullets([
                "utiliser PostgreSQL en production",
                "ne jamais exécuter `init_db_final.py` avec SQLite",
                "documenter les migrations qui créent/modifient les vues `api.*`",
                "vérifier les index spatiaux après tout changement de volumétrie",
            ])),
        ])
    elif stem == "APIs" and group == "03_Backend":
        parts.append(section("Endpoints", endpoint_table(facts)))
    elif stem == "API_Examples":
        parts.append(section("Exemple JSON", codeblock("json", json.dumps({"station_id": "ST_001", "value": 12.4, "timestamp": "2026-05-13T00:00:00Z"}, indent=2, ensure_ascii=False))))
    elif stem == "Architecture_Diagrams":
        parts.append(codeblock("mermaid", "flowchart TB\n  Frontend --> API\n  API --> DB[(DB)]\n  API --> GIS[(GIS assets)]"))
    elif stem == "Decision_Support_System":
        parts.append(section("Chaîne décisionnelle", codeblock("mermaid", "flowchart LR\n  Data --> Analyze --> Indicators --> Synthesis --> Decision")))

    return "\n\n".join(parts).strip() + "\n"


def build_project_documentation() -> None:
    facts = collect_facts()
    ensure_dir(DOC_ROOT)
    asset_readmes = {
        "architecture": "Diagrammes et notes d'architecture.\n\nContenu attendu:\n- vue d'ensemble système\n- chaîne frontend/backend\n- articulation SIG, raster et API\n- points d'attention pour les revues techniques",
        "diagrams": "Diagrammes Mermaid réutilisables pour les revues projet.\n\nCes fichiers servent de base aux schémas de communication entre équipes produit, SIG, hydrologie et IT.",
        "database": "Documentation visuelle et notes de conception de la base de données.\n\nCette zone sert à décrire les schémas, les vues, les index et les scripts d'initialisation réels utilisés par Hydro Sentinel.",
        "maps": "Synthèses de couches cartographiques et inventaires visuels.\n\nCette zone regroupe les notes sur les couches visibles, leur rôle et leur ordre de chargement.",
        "screenshots": "Plan de captures d'écran à produire lors des validations UI.\n\nLes captures doivent couvrir les écrans principaux, les états de chargement et les scénarios d'erreur.",
        "workflows": "Diagrammes de séquence et flux métier.\n\nCes artefacts servent à expliquer le cycle d'ingestion, de calcul et de restitution des indicateurs.",
    }
    for folder, description in asset_readmes.items():
        ensure_dir(DOC_ROOT / "assets" / folder)
        write(DOC_ROOT / "assets" / folder / "README.md", f"# {folder.capitalize()}\n\n{description}\n")

    write(
        DOC_ROOT / "assets" / "README.md",
        "# Assets\n\n"
        "Index des artefacts documentaires générés pour Hydro Sentinel.\n\n"
        "- `architecture/` : vue d'ensemble et architecture système\n"
        "- `diagrams/` : diagrammes Mermaid réutilisables\n"
        "- `maps/` : lecture des couches et inventaires visuels\n"
        "- `screenshots/` : plan de captures d'écran à produire\n"
        "- `workflows/` : séquences métier et flux de traitement\n",
    )

    asset_files = {
        "architecture/architecture_overview.mmd": "flowchart TB\n  U[Users] --> F[Frontend]\n  F --> A[API FastAPI]\n  A --> D[(Database)]\n  A --> G[GIS Assets]\n  A --> S[Sebou pipeline]\n",
        "diagrams/frontend_backend_flow.mmd": "sequenceDiagram\n  participant U as User\n  participant F as Frontend\n  participant A as API\n  participant D as Database\n  U->>F: interaction\n  F->>A: HTTP request\n  A->>D: query\n  D-->>A: result\n  A-->>F: JSON\n  F-->>U: UI update\n",
        "diagrams/data_pipeline.mmd": "flowchart LR\n  Sources --> Validation --> Processing --> API --> Dashboard\n",
        "diagrams/spatial_flow.mmd": "flowchart LR\n  SHP --> Import --> Validation --> GIS[(Spatial store)] --> Map\n",
        "database/schema_overview.mmd": "flowchart TB\n  auth[(auth.user)] --> api[(api views)]\n  api --> dashboard[Dashboard APIs]\n  api --> maps[Map KPIs]\n  sebou[(sebou.* tables)] --> analytics[Analytics]\n  sebou --> thematic[Thematic products]\n",
        "database/table_inventory.md": md_table(
            ["Schéma", "Objet", "Type", "Rôle"],
            [
                ["auth", "user", "table", "authentification"],
                ["api", "v_basin", "vue", "bassins versants"],
                ["api", "v_station", "vue", "stations"],
                ["api", "v_timeseries_station", "vue", "séries"],
                ["sebou", "daily_statistics", "table", "statistiques journalières"],
                ["sebou", "flood_extents", "table", "emprises inondation"],
                ["sebou", "snow_extents", "table", "emprises neige"],
            ],
        ),
        "workflows/hydro_meteo_sebou_workflow.mmd": "flowchart LR\n  Filters --> KPI --> Map --> Table --> Charts --> Synthesis\n",
        "workflows/ingestion_workflow.mmd": "flowchart LR\n  Upload --> Analyze --> Validate --> Execute --> Store --> Expose\n",
        "maps/layer_catalog.md": md_table(
            ["Couche", "Utilité", "Type"],
            [
                ["Stations", "affichage des points d'observation", "vectoriel"],
                ["Bassins", "lecture spatiale", "vectoriel"],
                ["Barrages", "suivi des ouvrages", "vectoriel"],
                ["Flood", "vigilance inondation", "thématique"],
                ["Snow", "couverture neige", "thématique"],
            ],
        ),
        "screenshots/capture_plan.md": bullets([
            "capture du dashboard principal",
            "capture de la carte de synthèse",
            "capture des tableaux de données",
            "capture des vues flood et snow",
        ]),
    }
    for rel_path, content in asset_files.items():
        write(DOC_ROOT / "assets" / rel_path, content if content.endswith("\n") else content + "\n")
    write(DOC_ROOT / "README.md", make_readme(facts))
    for group, files in GROUP_FILES.items():
        for file_name in files:
            stem = Path(file_name).stem
            content = generic_doc(group, stem, facts)
            write(DOC_ROOT / group / file_name, content)


def update_root_readme() -> None:
    readme = ROOT / "README.md"
    current = read_text(readme)
    marker = "## Documentation"
    block = """
## Documentation

La documentation technique et fonctionnelle générée se trouve dans `PROJECT_DOCUMENTATION/`.

- Point d'entrée: `PROJECT_DOCUMENTATION/README.md`
- Générateur: `scripts/generate_project_documentation.py`
""".strip()
    if marker in current:
        current = re.sub(r"## Documentation[\s\S]*$", block, current, flags=re.M)
    else:
        current = current.rstrip() + "\n\n" + block + "\n"
    write(readme, current)


def main() -> None:
    build_project_documentation()
    update_root_readme()
    print(f"Documentation generated in {DOC_ROOT}")


if __name__ == "__main__":
    main()
