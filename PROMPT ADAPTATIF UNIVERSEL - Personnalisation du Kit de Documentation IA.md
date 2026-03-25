# PROMPT ADAPTATIF UNIVERSEL - Personnalisation du Kit de Documentation IA

## 🎯 OBJECTIF
Ce prompt permet à un agent IA d'analyser une **synthèse de projet** (existante ou envisagée) et de générer/adapter automatiquement un kit complet de documentation optimisé pour les agents IA, en proposant des architectures et solutions pour les éléments manquants.

---

## 📋 PROMPT À COPIER-COLLER

```

# MISSION : Analyser la synthèse de mon projet et créer/adapter un kit de documentation complet

## CONTEXTE
Je te fournis une synthèse de mon projet (document descriptif, PFE, cahier des charges, ou analyse technique).

À partir de cette synthèse, tu dois :
1. **ANALYSER** en profondeur le projet décrit
2. **IDENTIFIER** ce qui existe déjà et ce qui manque
3. **PROPOSER** des architectures/solutions pour les éléments manquants
4. **GÉNÉRER** 12 fichiers de documentation adaptés au projet
5. **DEMANDER** des clarifications si nécessaire

---

## ÉTAPE 1 : ANALYSE INTELLIGENTE DE LA SYNTHÈSE

### 1.1 Extraction des Informations Clés

Analyse la synthèse fournie pour extraire :

#### A. Informations du Projet
- **Nom du projet** : [Identifier le nom officiel ou le donner un nom cohérent]
- **Domaine métier** : [E-commerce, SaaS, IoT, Geo-AI, Healthcare, Finance, etc.]
- **Objectif principal** : [Résumer en 2-3 phrases]
- **Public cible** : [Qui utilisera le système ?]
- **Contexte géographique/métier** : [Maroc, France, domaine spécifique, etc.]

#### B. Architecture Technique Mentionnée
- **Stack Backend** : [Framework détecté : FastAPI, Django, Express, etc.]
- **Stack Frontend** : [React, Vue, Streamlit, etc.]
- **Base(s) de données** : [PostgreSQL, MongoDB, PostGIS, TimescaleDB, DuckDB, etc.]
- **Technologies spéciales** : [LLMs, Ollama, LangChain, Vanna.AI, WebGIS, etc.]
- **Infrastructure** : [Docker, Kubernetes, n8n, etc.]
- **Services externes** : [Google Earth Engine, Sentinel-2, APIs tierces, etc.]

#### C. Fonctionnalités Clés
Liste toutes les fonctionnalités mentionnées :
- [Fonctionnalité 1]
- [Fonctionnalité 2]
- [Fonctionnalité 3]
- etc.

#### D. Contraintes et Particularités
- **Sécurité** : [JWT, Fernet, validation SQL, etc.]
- **Performance** : [Cache Redis, optimisations, etc.]
- **Données** : [Spatiales, temporelles, volumineuses, etc.]
- **Compliance** : [RGPD, normes métier, etc.]

---

### 1.2 Identification des Éléments Manquants

Pour chaque aspect du projet, identifie ce qui est **décrit** vs **manquant** :

| Aspect | Statut | Action Requise |
|--------|--------|----------------|
| Schéma de base de données | [✅ Décrit / ❌ Manquant / ⚠️ Partiel] | [Proposer schéma complet] |
| Endpoints API | [Statut] | [Proposer architecture API] |
| Architecture système | [Statut] | [Proposer architecture complète] |
| Modèles de données | [Statut] | [Proposer modèles SQLAlchemy/Prisma/etc.] |
| Workflows métier | [Statut] | [Proposer diagrammes de séquence] |
| Stack de tests | [Statut] | [Proposer stratégie de tests] |
| CI/CD | [Statut] | [Proposer pipeline] |
| Sécurité | [Statut] | [Proposer mécanismes] |
| Monitoring | [Statut] | [Proposer outils] |
| Documentation API | [Statut] | [Proposer structure Swagger/OpenAPI] |

---

### 1.3 Questions de Clarification (SI NÉCESSAIRE)

**🚨 IMPORTANT : Si des informations cruciales manquent dans la synthèse, POSE DES QUESTIONS à l'utilisateur AVANT de générer la documentation.**

Utilise ce format pour poser des questions ciblées :

```
📋 QUESTIONS DE CLARIFICATION NÉCESSAIRES

Je dois clarifier certains points avant de générer la documentation complète :

### À propos de [Aspect 1] :
**Question** : [Question précise]
**Pourquoi** : [Explication de pourquoi c'est important]
**Options** : 
  A) [Option 1]
  B) [Option 2]
  C) Autre (préciser)

### À propos de [Aspect 2] :
[Même structure]

---

Réponds par le numéro de la question suivi de ta réponse.
Exemple : "1A, 2B, 3: J'utilise PostgreSQL 15"
```

**Exemples de questions pertinentes** :
- "La synthèse mentionne 'base de données'. Tu utilises PostgreSQL, MySQL, MongoDB ou autre ?"
- "Pour le frontend, tu veux React/Vue/Angular ou Streamlit suffit pour le prototype ?"
- "Les LLMs mentionnés (Llama 3.3) seront hébergés localement (Ollama) ou via API (OpenAI/Anthropic) ?"
- "Le projet est en phase : Conception / Développement / Production ?"
- "Tu as déjà un schéma de base de données ou je dois en proposer un complet ?"

---

## ÉTAPE 2 : PROPOSITIONS ARCHITECTURALES INTELLIGENTES

Pour chaque élément **manquant ou partiel**, propose une architecture/solution **concrète et détaillée**.

### 2.1 Si Base de Données Non Définie

**PROPOSE UN SCHÉMA COMPLET** adapté au domaine métier :

#### Exemple pour projet Hydro-Intelligence (SHIP) :

```sql
-- PROPOSITION DE SCHÉMA DE BASE DE DONNÉES

-- Extension PostGIS pour données spatiales
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Table : Bassins Versants
CREATE TABLE bassins_versants (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    geometrie GEOMETRY(MultiPolygon, 4326),
    surface_km2 DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Index spatial
CREATE INDEX idx_bassins_geom ON bassins_versants USING GIST(geometrie);

-- Table : Barrages
CREATE TABLE barrages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    bassin_id INTEGER REFERENCES bassins_versants(id),
    localisation GEOMETRY(Point, 4326),
    capacite_totale_m3 BIGINT,
    annee_construction INTEGER,
    gestionnaire VARCHAR(100),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table : Courbes HSV (Hauteur-Surface-Volume)
CREATE TABLE courbes_hsv (
    id SERIAL PRIMARY KEY,
    barrage_id INTEGER REFERENCES barrages(id),
    hauteur_m DECIMAL(8,2) NOT NULL,
    surface_ha DECIMAL(10,2),
    volume_m3 BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table : Mesures Hydrologiques (Hypertable TimescaleDB)
CREATE TABLE mesures_hydro (
    timestamp TIMESTAMPTZ NOT NULL,
    barrage_id INTEGER REFERENCES barrages(id),
    type_mesure VARCHAR(50) NOT NULL, -- 'niveau', 'debit', 'precipitation', 'evaporation'
    valeur DECIMAL(12,4) NOT NULL,
    unite VARCHAR(20) NOT NULL,
    qualite VARCHAR(20) DEFAULT 'brut', -- 'brut', 'validé', 'douteux', 'estimé'
    source VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Convertir en hypertable pour optimisation séries temporelles
SELECT create_hypertable('mesures_hydro', 'timestamp');

-- Index pour requêtes fréquentes
CREATE INDEX idx_mesures_barrage_time ON mesures_hydro (barrage_id, timestamp DESC);
CREATE INDEX idx_mesures_type ON mesures_hydro (type_mesure);

-- Table : Indices Spectraux (Télédétection)
CREATE TABLE indices_spectraux (
    id SERIAL PRIMARY KEY,
    barrage_id INTEGER REFERENCES barrages(id),
    date_acquisition DATE NOT NULL,
    satellite VARCHAR(50), -- 'Sentinel-2', 'Landsat-8'
    indice_type VARCHAR(20), -- 'NDWI', 'MNDWI', 'NDVI'
    valeur_moyenne DECIMAL(6,4),
    surface_eau_ha DECIMAL(10,2),
    image_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table : Requêtes NL2SQL (Traçabilité)
CREATE TABLE nl2sql_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id INTEGER, -- Si authentification
    question_nl TEXT NOT NULL,
    requete_sql TEXT,
    requete_sql_validee BOOLEAN,
    temps_generation_ms INTEGER,
    temps_execution_ms INTEGER,
    resultats_count INTEGER,
    erreur TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    llm_model VARCHAR(100),
    tokens_utilises INTEGER
);

-- Table : Cache Sémantique
CREATE TABLE semantic_cache (
    id SERIAL PRIMARY KEY,
    question_hash VARCHAR(64) UNIQUE NOT NULL,
    question_originale TEXT NOT NULL,
    requete_sql TEXT NOT NULL,
    resultats JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    hits INTEGER DEFAULT 0,
    last_hit TIMESTAMPTZ
);

-- Table : Utilisateurs (Si authentification)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer', -- 'admin', 'analyst', 'viewer'
    organisation VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);
```

**Justification du Schéma** :
- ✅ PostGIS pour géométries (bassins, barrages)
- ✅ TimescaleDB pour séries temporelles (mesures hydro)
- ✅ JSONB pour flexibilité (metadata)
- ✅ Traçabilité NL2SQL pour amélioration continue
- ✅ Cache sémantique pour performance
- ✅ Structure scalable et normalisée

---

### 2.2 Si Architecture API Non Définie

**PROPOSE UNE ARCHITECTURE REST/GraphQL COMPLÈTE** :

```python
# PROPOSITION D'ARCHITECTURE API (FastAPI)

# Structure recommandée :
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py          # Authentification JWT
│   │       │   ├── bassins.py       # CRUD bassins versants
│   │       │   ├── barrages.py      # CRUD barrages
│   │       │   ├── mesures.py       # Time-series data
│   │       │   ├── nl2sql.py        # Moteur Text-to-SQL
│   │       │   ├── geospatial.py    # Requêtes PostGIS avancées
│   │       │   ├── teledetection.py # Indices spectraux
│   │       │   └── admin.py         # Ingestion données
│   │       └── deps.py              # Dépendances (DB session, auth)
│   ├── core/
│   │   ├── config.py                # Settings Pydantic
│   │   ├── security.py              # JWT, Fernet encryption
│   │   └── cache.py                 # Redis manager
│   ├── db/
│   │   ├── session.py               # Async engine
│   │   └── init_db.py               # Seed data
│   ├── models/                      # SQLAlchemy models
│   │   ├── bassin.py
│   │   ├── barrage.py
│   │   ├── mesure.py
│   │   └── user.py
│   ├── schemas/                     # Pydantic schemas
│   │   ├── bassin.py
│   │   ├── barrage.py
│   │   └── nl2sql.py
│   ├── services/                    # Logique métier
│   │   ├── nl2sql_service.py        # Vanna.AI / LangChain
│   │   ├── geospatial_service.py    # PostGIS queries
│   │   ├── cache_service.py         # Semantic cache
│   │   └── satellite_service.py     # Google Earth Engine API
│   └── main.py

# Endpoints proposés :

# === AUTHENTIFICATION ===
POST   /api/v1/auth/login
POST   /api/v1/auth/register
GET    /api/v1/auth/me

# === BASSINS VERSANTS ===
GET    /api/v1/bassins
GET    /api/v1/bassins/{id}
POST   /api/v1/bassins
PUT    /api/v1/bassins/{id}
GET    /api/v1/bassins/{id}/barrages  # Barrages d'un bassin
GET    /api/v1/bassins/search?bbox=... # Recherche spatiale

# === BARRAGES ===
GET    /api/v1/barrages
GET    /api/v1/barrages/{id}
POST   /api/v1/barrages
PUT    /api/v1/barrages/{id}
GET    /api/v1/barrages/{id}/taux-remplissage  # Calcul en temps réel
GET    /api/v1/barrages/{id}/courbe-hsv        # Courbe HSV
GET    /api/v1/barrages/{id}/historique        # Séries temporelles

# === MESURES HYDROLOGIQUES ===
GET    /api/v1/mesures?barrage_id=...&type=...&date_debut=...&date_fin=...
POST   /api/v1/mesures/bulk               # Ingestion batch
GET    /api/v1/mesures/stats?barrage_id=...  # Agrégations (min, max, avg)

# === NL2SQL (MOTEUR PRINCIPAL) ===
POST   /api/v1/nl2sql/query
       Body: { "question": "Quel est le taux de remplissage moyen du bassin du Bouregreg?" }
       Response: { "sql": "SELECT ...", "results": [...], "cache_hit": false }

POST   /api/v1/nl2sql/validate
       Body: { "sql": "SELECT * FROM barrages WHERE ..." }
       Response: { "valid": true, "issues": [] }

GET    /api/v1/nl2sql/history?user_id=...  # Historique requêtes
POST   /api/v1/nl2sql/feedback
       Body: { "log_id": 123, "rating": 4, "feedback": "Parfait!" }

# === GÉOSPATIAL ===
GET    /api/v1/geo/bassins-intersectant?lat=...&lon=...
GET    /api/v1/geo/barrages-dans-rayon?lat=...&lon=...&rayon_km=...
POST   /api/v1/geo/analyse-zone
       Body: { "geometry": {...}, "type": "superficie_eau" }

# === TÉLÉDÉTECTION ===
GET    /api/v1/satellite/ndwi?barrage_id=...&date=...
POST   /api/v1/satellite/calcul-surface-eau
       Body: { "barrage_id": 1, "date_debut": "2024-01-01", "date_fin": "2024-12-31" }
GET    /api/v1/satellite/series-temporelles?barrage_id=...&indice=NDWI

# === ADMIN ===
POST   /api/v1/admin/ingest/mesures       # Upload CSV/Excel
POST   /api/v1/admin/ingest/shapefiles    # Upload SHP (bassins/barrages)
GET    /api/v1/admin/jobs                 # Statut jobs d'ingestion
```

---

### 2.3 Si Workflows Non Définis

**PROPOSE DES DIAGRAMMES DE SÉQUENCE** pour les flux critiques :

#### Workflow 1 : Requête Text-to-SQL avec Cache Sémantique

```
User → Frontend : "Taux de remplissage moyen du bassin du Bouregreg?"
Frontend → API : POST /api/v1/nl2sql/query {"question": "..."}
API → Cache Service : hash_question(question)
Cache Service → Redis : GET hash
Redis → Cache Service : [MISS]

Cache Service → API : cache_miss
API → NL2SQL Service : generate_sql(question)
NL2SQL Service → Vanna.AI : embed_question()
Vanna.AI → ChromaDB : similarity_search(embedding)
ChromaDB → Vanna.AI : [top_5_similar_queries]
Vanna.AI → LLM (Llama 3.3) : generate_sql(context=similar_queries)
LLM → Vanna.AI : "SELECT AVG(taux_remplissage)..."
Vanna.AI → NL2SQL Service : sql_query

NL2SQL Service → SQL Validator : validate(sql_query)
SQL Validator → NL2SQL Service : valid=True

NL2SQL Service → PostGIS : EXECUTE sql_query
PostGIS → NL2SQL Service : results

NL2SQL Service → Cache Service : store(hash, sql, results)
Cache Service → Redis : SET hash {sql, results, ttl=3600}

NL2SQL Service → API : {sql, results, cache_hit=false}
API → Frontend : {sql, results, execution_time_ms}
Frontend → User : [Affichage tableau + carte]

# Log pour amélioration continue
API → DB : INSERT INTO nl2sql_logs (question, sql, results_count, ...)
```

#### Workflow 2 : Calcul NDWI depuis Sentinel-2

```
User → Frontend : "Surface en eau du barrage Al Massira le 2024-06-15"
Frontend → API : GET /api/v1/satellite/ndwi?barrage_id=5&date=2024-06-15

API → Satellite Service : calculate_ndwi(barrage_id, date)
Satellite Service → DB : SELECT geometrie FROM barrages WHERE id=5
DB → Satellite Service : geometrie (buffer 2km)

Satellite Service → Google Earth Engine API : 
  - get_sentinel2_image(bbox, date, cloud_cover<10%)
  - calculate_index(bands=['B3', 'B8'], formula='(B3-B8)/(B3+B8)')
GEE API → Satellite Service : NDWI raster

Satellite Service → GEE API : classify(NDWI > 0.3 = eau)
GEE API → Satellite Service : mask_eau

Satellite Service → GEE API : calculate_area(mask_eau)
GEE API → Satellite Service : surface_eau_ha = 1250.5

Satellite Service → DB : 
  INSERT INTO indices_spectraux (barrage_id, date, indice_type, surface_eau_ha, ...)

Satellite Service → API : {surface_eau_ha: 1250.5, ndwi_moyen: 0.45, image_url}
API → Frontend : résultats
Frontend → User : [Affichage carte + graphique évolution]
```

---

### 2.4 Si Stack de Tests Non Définie

**PROPOSE UNE STRATÉGIE COMPLÈTE** :

```python
# PROPOSITION STACK DE TESTS

# Backend (Python/FastAPI)
# tests/
# ├── conftest.py              # Fixtures pytest
# ├── test_api/
# │   ├── test_auth.py
# │   ├── test_barrages.py
# │   └── test_nl2sql.py
# ├── test_services/
# │   ├── test_nl2sql_service.py
# │   └── test_cache_service.py
# └── test_db/
#     └── test_models.py

# Framework : pytest + pytest-asyncio + pytest-cov
# Fixtures : DB test (PostgreSQL Testcontainer), Mock LLM, Mock Redis

# Exemple de test :
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_nl2sql_query(client: AsyncClient, db_session, mock_llm):
    """Test moteur NL2SQL avec LLM mocké"""
    response = await client.post(
        "/api/v1/nl2sql/query",
        json={"question": "Liste des barrages actifs"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "sql" in data
    assert "SELECT" in data["sql"].upper()
    assert len(data["results"]) > 0

# Frontend (React)
# src/__tests__/
# ├── components/
# │   ├── MapView.test.tsx
# │   └── NL2SQLInput.test.tsx
# └── integration/
#     └── nl2sql-workflow.test.tsx

# Framework : Vitest + Testing Library + MSW (Mock Service Worker)

# Exemple :
import { render, screen, fireEvent } from '@testing-library/react';
import NL2SQLInput from './NL2SQLInput';

test('submit NL2SQL query', async () => {
  render(<NL2SQLInput />);
  
  const input = screen.getByPlaceholderText('Posez votre question...');
  fireEvent.change(input, { target: { value: 'Taux de remplissage moyen' } });
  
  const button = screen.getByRole('button', { name: /soumettre/i });
  fireEvent.click(button);
  
  await screen.findByText(/résultats/i);
  expect(screen.getByRole('table')).toBeInTheDocument();
});

# Tests E2E (Playwright)
# e2e/
# └── scenarios/
#     ├── nl2sql-complete-flow.spec.ts
#     └── map-interaction.spec.ts

# Coverage cible : 80% backend, 70% frontend
```

---

### 2.5 Si CI/CD Non Défini

**PROPOSE UN PIPELINE GITHUB ACTIONS** :

```yaml
# .github/workflows/ci-cd.yml

name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:15-3.3
        env:
          POSTGRES_DB: test_ship
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run tests
        run: |
          cd frontend
          npm test -- --coverage

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Lint Python
        run: |
          pip install ruff
          ruff check backend/
      
      - name: Lint TypeScript
        run: |
          cd frontend
          npm run lint

  build-docker:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Backend Image
        run: |
          docker build -t ship-backend:latest backend/
      
      - name: Build Frontend Image
        run: |
          docker build -t ship-frontend:latest frontend/

  deploy-staging:
    needs: build-docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Staging
        run: |
          # Script de déploiement staging
          echo "Deploy to staging server"

  deploy-production:
    needs: build-docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: |
          # Script de déploiement production
          echo "Deploy to production server"
```

---

## ÉTAPE 3 : GÉNÉRATION ADAPTATIVE DES 12 FICHIERS

Maintenant, génère les 12 fichiers de documentation en **intégrant** :
- ✅ Les informations extraites de la synthèse
- ✅ Les propositions architecturales pour les éléments manquants
- ✅ Les spécificités du domaine métier
- ✅ Les technologies mentionnées

### FICHIER 1 : **AGENT_RULES.md**

```markdown
# Règles pour Agents IA - [NOM_PROJET extrait de la synthèse]

## Objectif
[Copier l'objectif depuis la synthèse, reformuler si nécessaire]

## Domaine métier
**Secteur** : [Domaine identifié]
**Contexte** : [Contexte géographique/métier]
**Particularités** : [Spécificités détectées]

## Stack technique (détectée depuis la synthèse)

**Backend** : [Stack détectée]
**Frontend** : [Stack détectée]
**Base de données** : [DB détectées + extensions]
**IA/ML** : [LLMs, frameworks détectés]
**Infrastructure** : [Docker, orchestrateurs détectés]
**Services externes** : [APIs tierces détectées]

## Architecture du projet
[Type d'architecture déduit ou proposé]

## Priorités pour l'agent

### Modifications prioritaires
- Modifier en priorité la logique dans `[dossiers clés identifiés]`
- Cibler des patches minimaux et vérifiables
- Toujours citer les fichiers modifiés et les raisons

### Domaine métier - Vocabulaire spécifique
[Extraire le vocabulaire métier de la synthèse]

**Termes clés** :
- [Terme 1] : [Définition]
- [Terme 2] : [Définition]

**Entités principales** :
- [Entité 1]
- [Entité 2]

## Standards de code

[Adapter selon la stack détectée]

**[Langage Backend]** :
- [Standards détectés ou proposés]

**[Langage Frontend]** :
- [Standards détectés ou proposés]

**Requêtes SQL/PostGIS** (si applicable) :
- Toujours valider via `sqlvalidator` avant exécution
- Préférer les requêtes préparées (protection injection SQL)
- Pour PostGIS : utiliser SRID 4326 (WGS84) par défaut
- Optimiser avec index GIST pour géométries

**Prompts LLM** (si applicable) :
- Fournir toujours le contexte métier (schéma DB, exemples de requêtes)
- Utiliser few-shot learning pour requêtes complexes
- Valider les sorties LLM avant exécution

## Ne jamais (par défaut)

- Exécuter de requêtes SQL sans validation (DROP, DELETE, TRUNCATE interdits sauf admin explicite)
- Modifier les données géospatiales brutes sans backup
- Générer des requêtes LLM sans contexte de sécurité
- Bypasser le cache sémantique pour les requêtes fréquentes
- Exposer les clés API externes dans les logs

## Attention spéciale (spécifique au projet)

[Extraire depuis la synthèse les points critiques]

**Exemples détectés** :
- [Point d'attention 1 extrait]
- [Point d'attention 2 extrait]

## Format de demande recommandé

Inclure si possible :
- **Périmètre** : fichiers/dossiers autorisés
- **Environnement** : dev/staging/prod
- **Contexte métier** : [entités concernées]
- **Données sensibles** : Oui/Non
- **Type de requête** : [lecture/écriture/analyse]
- **Contraintes** : [performance, sécurité, etc.]

## Workflow recommandé pour interventions

1. **Audit ciblé** (sans modifier)
2. **Validation métier** (cohérence avec domaine)
3. **Proposition/patch minimal**
4. **Test sur données de dev**
5. **Vérification sécurité**
6. **Résumé + impacts + fichiers modifiés**

## Commandes utiles

[Adapter selon la stack]

**Démarrage** :
- Backend : `[commande détectée ou proposée]`
- Frontend : `[commande]`
- Base de données : `[commande]`
- LLM local : `ollama run llama3.3` (si Ollama détecté)

**Tests** :
- `[commandes tests]`

**Santé système** :
- `[endpoints/commandes]`

## Rappel sécurité

[Adapter selon les technologies]

- Ne jamais exposer de clés API (LLM, satellites, etc.)
- Chiffrer les données sensibles avec Fernet (si mentionné)
- Utiliser JWT avec rotation des tokens
- Valider TOUTES les entrées utilisateur
- Auditer les requêtes SQL générées par LLM
- Limiter le rate limiting sur endpoints publics

## Ressources métier

[Si mentionnées dans la synthèse]

- [Document de référence 1]
- [Document de référence 2]
- [API documentation externe]
```

---

### FICHIER 2 : **ARCHITECTURE.md**

```markdown
# Architecture - [NOM_PROJET]

## Vue d'ensemble

[Résumé de l'architecture déduite de la synthèse]

**Type** : [Architecture détectée/proposée]
**Paradigme** : [3-tiers, microservices, serverless, etc.]
**Domaine** : [Domaine métier]

## Diagramme de haut niveau

```
[Générer un diagramme ASCII basé sur la synthèse]

Exemple pour SHIP :

┌─────────────┐
│   Clients   │ (Décideurs, Analystes)
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│   Frontend (Streamlit + Leaflet)    │
│   - Interface NL2SQL                │
│   - Cartes interactives PostGIS     │
│   - Graphiques Plotly               │
└──────────────┬──────────────────────┘
               │ REST API
               ▼
┌──────────────────────────────────────┐
│   Backend (FastAPI)                  │
│   ┌────────────────────────────┐    │
│   │ NL2SQL Engine              │    │
│   │ - Vanna.AI + ChromaDB      │    │
│   │ - Ollama (Llama 3.3)       │    │
│   │ - SQL Validator            │    │
│   └────────────────────────────┘    │
│   ┌────────────────────────────┐    │
│   │ Geospatial Service         │    │
│   │ - PostGIS queries          │    │
│   │ - Spatial analysis         │    │
│   └────────────────────────────┘    │
│   ┌────────────────────────────┐    │
│   │ Satellite Service          │    │
│   │ - Google Earth Engine API  │    │
│   │ - NDWI calculation         │    │
│   └────────────────────────────┘    │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌─────────────┐  ┌──────────────┐
│  PostgreSQL │  │ Redis Cache  │
│  + PostGIS  │  │ (L1/L2)      │
│  +TimescaleDB│  └──────────────┘
└─────────────┘
        │
        ▼
┌──────────────────┐
│ n8n Orchestrator │ (Workflows automation)
│ - Data ingestion │
│ - Scheduled tasks│
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ External APIs    │
│ - GEE            │
│ - Sentinel-2     │
└──────────────────┘
```

## Structure du projet

[Proposer structure complète si non définie]

```
[projet]/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── nl2sql_service.py
│   │   │   ├── geospatial_service.py
│   │   │   ├── satellite_service.py
│   │   │   └── cache_service.py
│   │   └── main.py
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── n8n/
│   └── workflows/
├── data/
│   ├── raw/
│   ├── processed/
│   └── scripts/
├── docs/
├── docker-compose.yml
└── README.md
```

## Composants principaux

### Backend API (FastAPI)
**Responsabilité** : Orchestration métier, NL2SQL, géospatial, télédétection
**Port** : 8000
**Point d'entrée** : `backend/app/main.py`
**Technologies clés** : [Lister depuis synthèse]

### Frontend (Streamlit/React)
**Responsabilité** : Interface utilisateur, visualisations
**Port** : [Port]
**Technologies clés** : [Lister]

### Base de données (PostgreSQL + Extensions)
**Responsabilité** : Stockage données hydrologiques + géospatiales
**Extensions** : PostGIS, TimescaleDB
**Port** : 5432

### Moteur IA (Ollama + Vanna.AI)
**Responsabilité** : Génération requêtes SQL depuis langage naturel
**Modèles** : [Lister depuis synthèse]

### Orchestrateur (n8n)
**Responsabilité** : [Si mentionné]

## Flux de données

[Décrire les flux principaux identifiés]

### Flux 1 : Requête NL2SQL
[Description complète avec schéma]

### Flux 2 : Ingestion données hydrologiques
[Description]

### Flux 3 : Calcul indices spectraux
[Description]

## Patterns et conventions

[Adapter selon stack]

## Scalabilité

[Propositions si non définies]

**Horizontal** :
- [Stratégie]

**Vertical** :
- [Stratégie]

## Sécurité

[Éléments détectés + propositions]
```

---

### FICHIER 3 : **ENVIRONNEMENTS.md**

```markdown
# Environnements - [NOM_PROJET]

## Vue rapide

Le projet utilise [X] environnements :

1. **Développement local** : [Configuration]
2. **Staging** : [Si mentionné]
3. **Production** : [Si mentionné]

## Configuration par composant

[Adapter complètement selon la synthèse]

### Backend (FastAPI)

#### Stack
- Python : 3.11+
- FastAPI : [version]
- [Autres dépendances clés]

#### Variables d'environnement

[Extraire depuis synthèse + proposer les manquantes]

| Variable | Exemple | Description | Requis |
|----------|---------|-------------|--------|
| DATABASE_URL | postgresql://user:pass@localhost:5432/ship | PostgreSQL + PostGIS | Oui |
| REDIS_URL | redis://localhost:6379/0 | Cache | Oui |
| OLLAMA_BASE_URL | http://localhost:11434 | LLM local | Oui |
| VANNA_API_KEY | vn_xxx | Vanna.AI (si cloud) | Non |
| GEE_SERVICE_ACCOUNT | path/to/key.json | Google Earth Engine | Oui |
| SECRET_KEY | [généré] | JWT signing | Oui |
| ALLOWED_ORIGINS | http://localhost:5173 | CORS | Oui |

#### Installation

```bash
# Avec micromamba (recommandé pour GDAL/PostGIS)
micromamba create -n ship python=3.11 -y
micromamba activate ship
pip install -r requirements.txt

# Ou avec venv
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

#### Lancement

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Frontend (Streamlit/React)

[Adapter]

### Base de données

#### Développement local (Docker)

```bash
docker run -d \
  --name ship-db \
  -e POSTGRES_DB=ship_dev \
  -e POSTGRES_USER=ship \
  -e POSTGRES_PASSWORD=ship_dev_pass \
  -p 5432:5432 \
  postgis/postgis:15-3.3
```

#### Extensions requises

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### LLM Local (Ollama)

```bash
# Installation Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull modèles
ollama pull llama3.3
ollama pull deepseek-coder-v2

# Lancer serveur
ollama serve
```

### Orchestrateur (n8n)

[Si mentionné]

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

## Ports et URLs

### Développement local

| Service | URL | Port |
|---------|-----|------|
| Backend API | http://localhost:8000 | 8000 |
| Frontend | http://localhost:5173 | 5173 |
| PostgreSQL | localhost | 5432 |
| Redis | localhost | 6379 |
| Ollama | http://localhost:11434 | 11434 |
| n8n | http://localhost:5678 | 5678 |
| Swagger Docs | http://localhost:8000/docs | 8000 |

## Checklist de démarrage

- [ ] Installer PostgreSQL + PostGIS + TimescaleDB
- [ ] Installer Redis
- [ ] Installer Ollama + pull modèles
- [ ] Cloner le repo
- [ ] Créer environnement Python
- [ ] Installer dépendances : `pip install -r requirements.txt`
- [ ] Créer `.env` depuis `.env.example`
- [ ] Configurer variables obligatoires
- [ ] Lancer migrations : `alembic upgrade head`
- [ ] Seed data : `python -m app.db.init_db`
- [ ] Démarrer backend : `uvicorn app.main:app --reload`
- [ ] Démarrer frontend : `streamlit run app.py` ou `npm run dev`
- [ ] Tester santé : `curl http://localhost:8000/api/v1/health`

## Points d'attention

[Extraits de la synthèse]
```

---

### FICHIER 4 : **DATABASE_SCHEMA.md**

```markdown
# Schéma de Base de Données - [NOM_PROJET]

## Vue d'ensemble

**SGBD** : PostgreSQL [version depuis synthèse]
**Extensions** : PostGIS, TimescaleDB, [autres]
**ORM** : SQLAlchemy 2.x (async)
**Migrations** : Alembic

## Détection du schéma

[Indiquer si schéma extrait de la synthèse ou proposé]

✅ Schéma **PROPOSÉ** basé sur l'analyse du domaine métier  
⚠️ À valider et ajuster selon les besoins réels

## Tables principales

[Si schéma dans synthèse → extraire]
[Sinon → proposer schéma complet comme dans Section 2.1]

[Copier le schéma SQL complet proposé en Section 2.1]

## Relations clés

```
users (1) ─── (N) nl2sql_logs
bassins_versants (1) ─── (N) barrages
barrages (1) ─── (N) mesures_hydro
barrages (1) ─── (N) courbes_hsv
barrages (1) ─── (N) indices_spectraux
```

## Index critiques

[Lister tous les index proposés avec justifications]

## Migrations Alembic

```bash
# Créer migration
alembic revision --autogenerate -m "initial schema"

# Appliquer
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Seed data

[Proposer script de seed]

```python
# backend/app/db/init_db.py

async def init_db():
    # Créer utilisateur admin
    admin = User(
        email="admin@ship.ma",
        username="admin",
        hashed_password=hash_password("changeme"),
        role="admin"
    )
    
    # Créer bassins principaux Maroc
    bassins = [
        BassinVersant(code="BV01", nom="Bouregreg", surface_km2=9800),
        BassinVersant(code="BV02", nom="Sebou", surface_km2=40000),
        # ...
    ]
    
    # Créer barrages de référence
    barrages = [
        Barrage(
            code="BAR001",
            nom="Sidi Mohamed Ben Abdellah",
            bassin_id=bassins[0].id,
            capacite_totale_m3=1000000000,
            # ...
        ),
        # ...
    ]
```

## Requêtes fréquentes optimisées

[Adapter selon le domaine]

### Taux de remplissage en temps réel

```sql
WITH dernieres_mesures AS (
    SELECT DISTINCT ON (barrage_id)
        barrage_id,
        valeur AS niveau_actuel_m
    FROM mesures_hydro
    WHERE type_mesure = 'niveau'
    ORDER BY barrage_id, timestamp DESC
),
volumes_calcules AS (
    SELECT 
        dm.barrage_id,
        dm.niveau_actuel_m,
        (SELECT volume_m3 
         FROM courbes_hsv 
         WHERE barrage_id = dm.barrage_id 
           AND hauteur_m <= dm.niveau_actuel_m
         ORDER BY hauteur_m DESC 
         LIMIT 1) AS volume_actuel_m3
    FROM dernieres_mesures dm
)
SELECT 
    b.nom,
    b.capacite_totale_m3,
    vc.volume_actuel_m3,
    ROUND((vc.volume_actuel_m3::NUMERIC / b.capacite_totale_m3 * 100), 2) AS taux_remplissage_pct
FROM barrages b
JOIN volumes_calcules vc ON b.id = vc.barrage_id
WHERE b.actif = TRUE
ORDER BY b.nom;
```

### Barrages dans un rayon (PostGIS)

```sql
SELECT 
    b.nom,
    b.capacite_totale_m3,
    ST_Distance(
        b.localisation::geography,
        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
    ) / 1000 AS distance_km
FROM barrages b
WHERE ST_DWithin(
    b.localisation::geography,
    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
    :rayon_km * 1000
)
AND b.actif = TRUE
ORDER BY distance_km;
```

## Performance

### TimescaleDB (mesures_hydro)

```sql
-- Hypertable avec compression
SELECT create_hypertable('mesures_hydro', 'timestamp');

-- Compression automatique après 7 jours
ALTER TABLE mesures_hydro SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'barrage_id, type_mesure'
);

SELECT add_compression_policy('mesures_hydro', INTERVAL '7 days');

-- Continuous aggregates (pré-calculs)
CREATE MATERIALIZED VIEW mesures_journalieres
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS jour,
    barrage_id,
    type_mesure,
    AVG(valeur) AS valeur_moyenne,
    MIN(valeur) AS valeur_min,
    MAX(valeur) AS valeur_max
FROM mesures_hydro
GROUP BY jour, barrage_id, type_mesure;

-- Rafraîchissement auto
SELECT add_continuous_aggregate_policy('mesures_journalieres',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

### Index spatiaux (PostGIS)

```sql
-- Index GIST obligatoires
CREATE INDEX idx_bassins_geom ON bassins_versants USING GIST(geometrie);
CREATE INDEX idx_barrages_localisation ON barrages USING GIST(localisation);

-- Statistiques spatiales
ANALYZE bassins_versants;
ANALYZE barrages;

-- Vérifier utilisation index
EXPLAIN ANALYZE
SELECT * FROM barrages
WHERE ST_DWithin(localisation::geography, ...);
```
```

---

### FICHIER 5 : **API_ENDPOINTS.md**

```markdown
# API Endpoints - [NOM_PROJET]

## Configuration

**Base URL** : [Depuis synthèse ou proposée]
**Préfixe API** : /api/v1
**Format** : JSON
**Authentification** : JWT Bearer Token
**CORS** : [Origins autorisées]
**Documentation** : /docs (Swagger UI)

## Détection des endpoints

[Indiquer si endpoints extraits ou proposés]

✅ Endpoints **PROPOSÉS** basés sur l'architecture  
⚠️ À adapter selon implémentation réelle

[Copier l'architecture API complète de la Section 2.2]

## Groupes d'endpoints

### Authentification

[Détailler chaque endpoint comme dans Section 2.2]

### Bassins Versants

[Détails]

### Barrages

[Détails]

### Mesures Hydrologiques

[Détails]

### NL2SQL (Cœur du système)

#### POST `/api/v1/nl2sql/query`

**Description** : Convertir une question en langage naturel en requête SQL et l'exécuter

**Headers** :
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body** :
```json
{
  "question": "Quel est le taux de remplissage moyen du bassin du Bouregreg?",
  "options": {
    "use_cache": true,
    "explain": false,
    "max_results": 100
  }
}
```

**Réponse 200** :
```json
{
  "question": "Quel est le taux de remplissage moyen du bassin du Bouregreg?",
  "sql": "SELECT AVG(...) FROM barrages b JOIN bassins_versants bv ...",
  "sql_validated": true,
  "results": [
    {
      "taux_remplissage_moyen_pct": 67.5,
      "nb_barrages": 8,
      "volume_total_m3": 1250000000
    }
  ],
  "metadata": {
    "cache_hit": false,
    "generation_time_ms": 1250,
    "execution_time_ms": 45,
    "llm_model": "llama3.3",
    "tokens_used": 450
  }
}
```

**Erreurs** :
- `400` : Question invalide ou vide
- `422` : SQL généré invalide (opérations destructrices détectées)
- `500` : Erreur LLM ou base de données

**Exemple cURL** :
```bash
curl -X POST https://api.ship.ma/api/v1/nl2sql/query \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Taux de remplissage moyen du bassin du Bouregreg"
  }'
```

**Exemple JavaScript** :
```javascript
const response = await fetch('/api/v1/nl2sql/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'Taux de remplissage moyen du bassin du Bouregreg'
  })
});

const data = await response.json();
console.log(data.results);
```

[Continuer pour tous les endpoints proposés]

### Géospatial

[Détails]

### Télédétection

[Détails]

### Admin

[Détails]

## Codes HTTP

| Code | Signification | Usage |
|------|---------------|-------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | Token manquant/invalide |
| 403 | Forbidden | Permissions insuffisantes |
| 404 | Not Found | Ressource introuvable |
| 422 | Unprocessable Entity | Validation échouée |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |

## Rate Limiting

[Proposer si non défini]

- **Anonyme** : 10 requêtes/minute
- **Authentifié** : 100 requêtes/minute
- **Admin** : 1000 requêtes/minute

Headers de réponse :
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
```

## Pagination

Format standard :
```json
{
  "total": 250,
  "items": [...],
  "skip": 0,
  "limit": 50,
  "has_more": true
}
```

Query params :
- `skip` : Offset (défaut 0)
- `limit` : Nombre de résultats (défaut 50, max 1000)

## Webhooks (si applicable)

[Proposer si pertinent]
```

---

### FICHIER 6 : **TROUBLESHOOTING.md**

```markdown
# Troubleshooting - [NOM_PROJET]

## Méthodologie de diagnostic

1. **Vérifier les logs** : `docker-compose logs -f [service]`
2. **Tester la santé** : `curl http://localhost:8000/api/v1/health`
3. **Vérifier la config** : `.env`, `docker-compose.yml`
4. **Consulter ce guide**

---

## Erreurs Backend (FastAPI)

### Erreur : 500 Internal Server Error sur /nl2sql/query

**Message** : `LLM generation failed` ou `Database connection error`

**Causes probables** :
1. Ollama n'est pas démarré
2. Modèle LLM non téléchargé
3. PostgreSQL inaccessible
4. Vanna.AI non configuré

**Solutions** :

1. **Vérifier Ollama** :
```bash
# Tester Ollama
curl http://localhost:11434/api/tags

# Si échec, démarrer Ollama
ollama serve

# Pull le modèle
ollama pull llama3.3
```

2. **Vérifier PostgreSQL** :
```bash
# Test connexion
psql -h localhost -U ship -d ship_dev -c "SELECT version();"

# Si échec, démarrer container
docker start ship-db
```

3. **Vérifier Vanna.AI** :
```python
# Test rapide
from vanna.ollama import Ollama

vn = Ollama(model='llama3.3')
print(vn.generate_sql("SELECT 1"))
```

---

### Erreur : SQL généré invalide ou dangereux

**Message** : `SQL validation failed: DROP/DELETE detected`

**Cause** : Le LLM a généré une requête destructrice

**Solution** :

1. **Améliorer le prompt système** :
```python
# services/nl2sql_service.py

SYSTEM_PROMPT = """
Tu es un expert SQL et PostGIS pour données hydrologiques.

RÈGLES ABSOLUES :
- UNIQUEMENT des requêtes SELECT (lecture seule)
- JAMAIS de DROP, DELETE, UPDATE, TRUNCATE
- Utiliser LIMIT pour éviter surcharge
- Privilégier les CTEs pour lisibilité

SCHÉMA DE BASE :
{schema}

EXEMPLES :
{examples}
"""
```

2. **Renforcer la validation** :
```python
# core/security.py

def validate_sql(sql: str) -> tuple[bool, list[str]]:
    """Valide SQL avec liste noire stricte"""
    blacklist = ['DROP', 'DELETE', 'UPDATE', 'TRUNCATE', 'ALTER', 'CREATE']
    
    issues = []
    sql_upper = sql.upper()
    
    for keyword in blacklist:
        if keyword in sql_upper:
            issues.append(f"Opération interdite détectée : {keyword}")
    
    # Vérifier SELECT obligatoire
    if not sql_upper.strip().startswith('SELECT'):
        issues.append("Seules les requêtes SELECT sont autorisées")
    
    return (len(issues) == 0, issues)
```

---

### Erreur : Requêtes PostGIS lentes ou timeout

**Symptôme** : Requêtes spatiales prennent >5 secondes

**Diagnostic** :
```sql
-- Vérifier index spatial
SELECT 
    schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('bassins_versants', 'barrages');

-- Analyser plan de requête
EXPLAIN ANALYZE
SELECT * FROM barrages 
WHERE ST_DWithin(localisation::geography, ...);
```

**Solutions** :

1. **Créer index manquants** :
```sql
CREATE INDEX IF NOT EXISTS idx_barrages_localisation 
ON barrages USING GIST(localisation);

ANALYZE barrages;
```

2. **Optimiser requête** :
```sql
-- ❌ LENT (calcule distance pour tous)
SELECT * FROM barrages
ORDER BY ST_Distance(localisation, point) LIMIT 10;

-- ✅ RAPIDE (filtre d'abord avec bounding box)
SELECT * FROM barrages
WHERE ST_DWithin(localisation::geography, point::geography, 50000)
ORDER BY ST_Distance(localisation::geography, point::geography)
LIMIT 10;
```

---

## Erreurs Frontend (Streamlit/React)

### Erreur : CORS policy blocked

**Message** : `Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution** :

1. **Vérifier backend CORS** :
```python
# backend/app/main.py

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite
        "http://localhost:3000",  # React
        "http://localhost:8501",  # Streamlit
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **Vérifier variables frontend** :
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1
```

---

### Erreur : Carte Leaflet n'affiche pas les données

**Symptôme** : Carte vide ou marqueurs manquants

**Causes** :
1. Données GeoJSON invalides
2. SRID incorrect
3. Bounds non définis

**Solutions** :

1. **Vérifier format GeoJSON** :
```python
# backend/api/v1/endpoints/geospatial.py

from geojson import Feature, FeatureCollection, Point

def barrage_to_geojson(barrage):
    # PostGIS retourne (lon, lat) pas (lat, lon)!
    coords = db.execute(
        "SELECT ST_X(localisation), ST_Y(localisation) FROM barrages WHERE id = :id",
        {"id": barrage.id}
    ).first()
    
    return Feature(
        geometry=Point((coords[0], coords[1])),  # (longitude, latitude)
        properties={
            "id": barrage.id,
            "nom": barrage.nom,
            # ...
        }
    )
```

2. **Vérifier SRID** :
```sql
-- Tous les géométries doivent être en SRID 4326 (WGS84)
SELECT ST_SRID(geometrie) FROM bassins_versants;

-- Si incorrect, transformer
UPDATE bassins_versants
SET geometrie = ST_Transform(geometrie, 4326)
WHERE ST_SRID(geometrie) != 4326;
```

---

## Erreurs LLM (Ollama / Vanna.AI)

### Erreur : Ollama ne répond pas

**Solutions** :

```bash
# Vérifier processus
ps aux | grep ollama

# Logs Ollama
journalctl -u ollama -f

# Redémarrer
systemctl restart ollama

# Tester GPU (si NVIDIA)
nvidia-smi
```

---

### Erreur : Hallucinations SQL (tables/colonnes inexistantes)

**Cause** : LLM génère SQL basé sur son knowledge général, pas votre schéma

**Solution** : Fine-tuning avec Vanna.AI

```python
# scripts/train_vanna.py

from vanna.ollama import Ollama
from vanna.chromadb import ChromaDB_VectorStore

class MyVanna(ChromaDB_VectorStore, Ollama):
    def __init__(self, config=None):
        ChromaDB_VectorStore.__init__(self, config=config)
        Ollama.__init__(self, config=config)

vn = MyVanna(config={'model': 'llama3.3'})

# 1. Injecter le DDL
vn.train(ddl="""
CREATE TABLE barrages (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255),
    capacite_totale_m3 BIGINT,
    ...
);
""")

# 2. Ajouter paires question-SQL
vn.train(
    question="Quel est le taux de remplissage moyen ?",
    sql="SELECT AVG(...) FROM barrages..."
)

# 3. Ajouter documentation
vn.train(documentation="Le taux de remplissage se calcule via courbe HSV...")
```

---

## Erreurs Base de Données

### Erreur : TimescaleDB hypertable non créée

**Message** : `relation "mesures_hydro" is not a hypertable`

**Solution** :

```sql
-- Vérifier extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Créer hypertable (si table vide)
SELECT create_hypertable('mesures_hydro', 'timestamp');

-- Si table contient déjà des données
SELECT create_hypertable(
    'mesures_hydro', 
    'timestamp',
    migrate_data => true
);
```

---

### Erreur : PostGIS extension manquante

**Message** : `function st_distance does not exist`

**Solution** :

```bash
# Sur container Docker
docker exec -it ship-db psql -U ship -d ship_dev

# Dans psql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Vérifier
SELECT PostGIS_Full_Version();
```

---

## Erreurs Télédétection (Google Earth Engine)

### Erreur : Authentification GEE échouée

**Message** : `The Earth Engine Python API is not authenticated`

**Solution** :

```bash
# Authentifier
earthengine authenticate

# Ou avec service account
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Test
python -c "import ee; ee.Initialize(); print('GEE OK!')"
```

---

## Commandes de Diagnostic

```bash
# === SANTÉ GLOBALE ===
curl http://localhost:8000/api/v1/health

# === LOGS ===
# Backend
docker-compose logs -f backend

# Base de données
docker-compose logs -f postgres

# Ollama
journalctl -u ollama -f

# === TESTS DE CONNEXION ===
# PostgreSQL
psql -h localhost -U ship -d ship_dev -c "SELECT 1;"

# Redis
redis-cli ping

# Ollama
curl http://localhost:11434/api/tags

# === PERFORMANCE ===
# Requêtes lentes PostgreSQL
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Taille base
SELECT 
    pg_size_pretty(pg_database_size('ship_dev')) AS taille_db;

# === CACHE ===
# Stats Redis
redis-cli info stats
```

---

## FAQ

### Q: Le moteur NL2SQL ne comprend pas mes questions en français/arabe
**R:** Entraîner Vanna.AI avec des exemples dans ces langues. LLMs multilingues comme Llama 3.3 supportent bien le français. Pour l'arabe, considérer GPT-4 ou Gemini.

### Q: Comment améliorer la précision des requêtes SQL générées ?
**R:** 
1. Ajouter plus d'exemples few-shot dans Vanna.AI
2. Enrichir le prompt système avec contexte métier
3. Implémenter un système de feedback (rating)
4. Utiliser retrieval-augmented generation (RAG) sur documentation

### Q: Les calculs NDWI via GEE sont lents
**R:** 
1. Réduire la résolution spatiale (10m → 30m)
2. Utiliser cloud masks agressifs
3. Pré-calculer pour dates clés et cacher
4. Considérer Sentinel Hub API (plus rapide)

### Q: Comment gérer les données manquantes dans séries temporelles ?
**R:** 
```python
# Interpolation linéaire
SELECT 
    time_bucket_gapfill('1 day', timestamp) AS jour,
    barrage_id,
    interpolate(AVG(valeur)) AS valeur
FROM mesures_hydro
WHERE timestamp BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY jour, barrage_id;
```
```

---

### FICHIERS 7-12 : Générer de la même manière

Pour les fichiers restants (DEPENDENCIES.md, WORKFLOWS.md, CODE_STANDARDS.md, TESTING_GUIDE.md, DEPLOYMENT.md, PROJECT_STRUCTURE.md), applique le même processus :

1. **Extraire** les informations de la synthèse
2. **Proposer** des solutions complètes pour les éléments manquants
3. **Adapter** au domaine métier
4. **Fournir** des exemples concrets

---

## ÉTAPE 4 : GÉNÉRATION DU RÉSUMÉ

Après avoir généré les 12 fichiers, crée un fichier `_ADAPTATION_SUMMARY.md` :

```markdown
# Résumé de l'Adaptation du Kit de Documentation

## Projet analysé

**Nom** : [Nom extrait]
**Domaine** : [Domaine métier]
**Synthèse source** : [Type de document analysé]

## Informations extraites de la synthèse

### ✅ Éléments bien définis
- [Liste des éléments clairs dans la synthèse]

### ⚠️ Éléments partiels
- [Liste des éléments à clarifier]

### ❌ Éléments manquants (propositions générées)
- **Base de données** : Schéma complet proposé (12 tables)
- **API Endpoints** : 45 endpoints proposés
- **Architecture système** : Diagramme 3-tiers proposé
- **Tests** : Stratégie pytest + Vitest proposée
- **CI/CD** : Pipeline GitHub Actions proposé
- [Autres propositions]

## Fichiers générés

✅ AGENT_RULES.md - Adapté au domaine [domaine]
✅ ARCHITECTURE.md - Architecture 3-tiers avec [technos]
✅ ENVIRONNEMENTS.md - Config PostgreSQL/PostGIS/TimescaleDB/Ollama
✅ DATABASE_SCHEMA.md - 12 tables proposées + index PostGIS
✅ API_ENDPOINTS.md - 45 endpoints RESTful
✅ TROUBLESHOOTING.md - Erreurs LLM/PostGIS/GEE
✅ DEPENDENCIES.md - Stack Python/JS + Ollama/Vanna
✅ WORKFLOWS.md - 5 workflows métier diagrammés
✅ CODE_STANDARDS.md - Standards FastAPI/PostGIS/LLM
✅ TESTING_GUIDE.md - Pytest + mocks LLM
✅ DEPLOYMENT.md - Docker Compose + GitHub Actions
✅ PROJECT_STRUCTURE.md - Arborescence complète

## Technologies identifiées

**Backend** : FastAPI, SQLAlchemy, Pydantic
**Frontend** : Streamlit, Leaflet
**Base de données** : PostgreSQL 15, PostGIS, TimescaleDB
**IA** : Ollama, Vanna.AI, LangChain, Llama 3.3, DeepSeek-V3
**Géospatial** : PostGIS, Google Earth Engine, Sentinel-2
**Cache** : Redis
**Orchestration** : n8n, Docker Compose

## Propositions architecturales principales

1. **Schéma DB complet** : 12 tables avec relations, index spatiaux, hypertables TimescaleDB
2. **Architecture API** : 45 endpoints REST organisés par domaine
3. **Workflows NL2SQL** : Pipeline Vanna.AI + validation + cache sémantique
4. **Stratégie tests** : Pytest (backend) + Vitest (frontend) + mocks LLM
5. **Pipeline CI/CD** : GitHub Actions avec tests automatisés

## Actions recommandées

### Priorité HAUTE
1. ✏️ Valider le schéma de base de données proposé
2. ✏️ Compléter les variables d'environnement manquantes
3. ✏️ Vérifier les endpoints API proposés vs besoins réels

### Priorité MOYENNE
4. ✏️ Adapter les exemples de requêtes NL2SQL au contexte réel
5. ✏️ Enrichir TROUBLESHOOTING avec erreurs rencontrées
6. ✏️ Personnaliser les tests selon couverture souhaitée

### Priorité BASSE
7. ✏️ Ajuster CODE_STANDARDS selon préférences équipe
8. ✏️ Compléter DEPLOYMENT avec infrastructure cible

## Questions de clarification posées

[Si des questions ont été posées à l'utilisateur, lister les réponses reçues]

---

**Génération terminée le** : [Date]
**Basée sur la synthèse** : [Nom fichier synthèse]
**Niveau de confiance global** : [High/Medium/Low]
```

---

## ÉTAPE 5 : INTERACTION AVEC L'UTILISATEUR

### Si besoin de clarifications PENDANT la génération :

```
🛑 PAUSE GÉNÉRATION

J'ai besoin de clarifier certains points avant de continuer :

### Question 1 : Architecture Frontend
La synthèse mentionne "Streamlit + Leaflet" mais aussi "React possible".
Quelle est ton intention finale ?
A) Streamlit (prototypage rapide, démo)
B) React + Leaflet (application web production)
C) Les deux (Streamlit proto, React prod)

### Question 2 : Hébergement LLM
Pour Llama 3.3 / DeepSeek-V3, tu veux :
A) Ollama en local (nécessite GPU Quadro K2200 mentionné)
B) API cloud (OpenAI/Anthropic/Mistral)
C) Hybride (local dev, cloud prod)

### Question 3 : Niveau de détail DATABASE_SCHEMA.md
Tu as déjà un schéma existant ou je dois proposer tout ?
A) Proposer schéma complet (12+ tables)
B) J'ai déjà un schéma (me le fournir)
C) Hybride (proposer + adapter à mon existant)

---

Réponds par : "1A, 2C, 3A" par exemple.
Puis je continue la génération avec ces précisions.
```

---

## PRINCIPES CLÉS DE CE PROMPT

### 1. Intelligence Adaptative
- ✅ Analyse la synthèse en profondeur
- ✅ Détecte les manques et propose des solutions
- ✅ S'adapte au domaine métier

### 2. Interaction Proactive
- ✅ Pose des questions si besoin
- ✅ Propose au lieu d'attendre
- ✅ Clarifie les ambiguïtés

### 3. Exhaustivité
- ✅ Génère 12 fichiers complets
- ✅ Propose architectures concrètes
- ✅ Fournit code/SQL/exemples

### 4. Traçabilité
- ✅ Indique ce qui vient de la synthèse
- ✅ Marque clairement les propositions
- ✅ Documente les choix faits

---

## RÉSULTAT ATTENDU

À la fin de ce prompt, tu dois avoir :

1. ✅ 12 fichiers .md complets et adaptés au projet
2. ✅ Propositions architecturales pour tout ce qui manque
3. ✅ Code/SQL/exemples concrets
4. ✅ Fichier de résumé de l'adaptation
5. ✅ Questions clarifiées avec l'utilisateur si nécessaire

---

**GÉNÈRE MAINTENANT LA DOCUMENTATION COMPLÈTE POUR LE PROJET DÉCRIT DANS LA SYNTHÈSE FOURNIE.**

Sauvegarde TOUS les fichiers dans `/mnt/user-data/outputs/`.
```

---

## 📌 FIN DU PROMPT ADAPTATIF UNIVERSEL

**Ce prompt transforme n'importe quelle synthèse de projet en kit de documentation complet et professionnel.**
