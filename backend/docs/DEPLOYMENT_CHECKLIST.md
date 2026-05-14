# Checklist Deploiement Production - Sebou Monitoring

## Infrastructure
- [ ] Serveur dedie disponible (RAM et CPU dimensionnes)
- [ ] PostgreSQL installe et securise
- [ ] Extension PostGIS activee
- [ ] Pare-feu configure (ports exposes maitrises)
- [ ] Certificats TLS en place
- [ ] Strategie de backup validee

## Application
- [ ] Code deployee dans l'environnement cible
- [ ] Environnement virtuel cree
- [ ] Dependances `requirements.txt` et `requirements-sebou.txt` installees
- [ ] Fichier `config/sebou/config.yaml` configure
- [ ] Secrets stockes hors repo (variables d'environnement)
- [ ] Tests backend passent

## Google Earth Engine
- [ ] Service account configure
- [ ] Cle JSON disponible et protegee
- [ ] Initialisation GEE testee
- [ ] Quotas verifies

## Base de donnees
- [ ] Schema `sebou` cree via `app/db/sebou_monitoring_schema.sql`
- [ ] Index verifies
- [ ] Table `daily_statistics` alimentee
- [ ] Table `flood_extents` alimentee
- [ ] Table `alerts` alimentee

## Pipeline
- [ ] Execution manuelle validee
- [ ] Planification journaliere configuree (cron ou ordonnanceur)
- [ ] Duree de traitement observee et acceptable
- [ ] Exports produits (COG/GeoJSON/DB)

## API
- [ ] Service API demarre
- [ ] Endpoint `/health` renvoie `healthy`
- [ ] Endpoints metier testes
- [ ] CORS conforme au contexte de deploiement
- [ ] Documentation API accessible (`/docs`)

## Monitoring et alertes
- [ ] Rotation des logs activee
- [ ] Alertes qualite verifiees
- [ ] Alertes inondation verifiees
- [ ] Procedure d'escalade definie

## Validation finale
- [ ] 7 executions consecutives sans echec
- [ ] Resultats compares avec observations terrain
- [ ] Validation metier obtenue
- [ ] Go-live approuve

