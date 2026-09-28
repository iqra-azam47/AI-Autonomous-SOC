import os
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.core.middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware, InMemoryRateLimiter

from app.models.models import Role, User, Asset, MitreTechnique, ModelVersion
from app.ml.inference import ml_engine

# Import routers
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.events import router as events_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.assets import router as assets_router
from app.api.v1.intelligence import router as intel_router
from app.api.v1.mitre import router as mitre_router
from app.api.v1.detection import router as detection_router
from app.api.v1.ml import router as ml_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.simulations import router as simulations_router
from app.api.v1.ai import router as ai_router
from app.api.v1.reports import router as reports_router
from app.api.v1.audit import router as audit_router
from app.api.v1.settings import router as settings_router
from app.api.v1.health import router as health_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("soc.main")

def seed_initial_data(db=None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        # 1. Seed Roles
        roles = {
            "ADMIN": "Full administrative access, user management, and security configuration",
            "ANALYST": "SOC investigation, incident management, log ingestion, and AI analyst operations",
            "VIEWER": "Read-only visibility across dashboards, incidents, alerts, and reports"
        }
        role_objs = {}
        for role_name, role_desc in roles.items():
            r = db.query(Role).filter(Role.name == role_name).first()
            if not r:
                r = Role(name=role_name, description=role_desc)
                db.add(r)
                db.flush()
            role_objs[role_name] = r

        # 2. Seed Default Demo Users
        users = [
            ("admin", "admin@soc.corp", "AdminPass123!", "Lead Security Architect", "ADMIN"),
            ("analyst", "analyst@soc.corp", "AnalystPass123!", "Senior SOC Analyst", "ANALYST"),
            ("viewer", "viewer@soc.corp", "ViewerPass123!", "Compliance Auditor", "VIEWER")
        ]
        for username, email, pwd, fname, rname in users:
            u = db.query(User).filter((User.username == username) | (User.email == email)).first()
            if not u:
                u = User(
                    username=username,
                    email=email,
                    password_hash=get_password_hash(pwd),
                    full_name=fname,
                    role_id=role_objs[rname].id,
                    is_active=True
                )
                db.add(u)
        db.flush()

        # 3. Seed MITRE Techniques
        mitre_seed = [
            ("T1110", "Brute Force", "Credential Access", "Adversaries may use brute force techniques to gain access to valid credentials."),
            ("T1078", "Valid Accounts", "Defense Evasion", "Adversaries may obtain and abuse credentials of existing accounts."),
            ("T1046", "Network Service Scanning", "Discovery", "Adversaries may attempt to get a listing of services running on remote hosts."),
            ("T1190", "Exploit Public-Facing Application", "Initial Access", "Adversaries may attempt to exploit vulnerabilities in Internet-facing applications."),
            ("T1068", "Exploitation for Privilege Escalation", "Privilege Escalation", "Adversaries may exploit vulnerabilities to execute code at higher privilege levels."),
            ("T1048", "Exfiltration Over Alternative Protocol", "Exfiltration", "Adversaries may steal data by transferring it over alternative communication protocols."),
            ("T1059", "Command and Scripting Interpreter", "Execution", "Adversaries may abuse command and script interpreters to execute commands.")
        ]
        for tid, name, tactic, desc in mitre_seed:
            t = db.query(MitreTechnique).filter(MitreTechnique.technique_id == tid).first()
            if not t:
                db.add(MitreTechnique(
                    technique_id=tid,
                    name=name,
                    tactic=tactic,
                    description=desc
                ))
        db.flush()

        # 4. Seed Standard Enterprise Assets
        asset_seed = [
            ("corp-db-cluster-01", "10.0.0.10", "db01.soc.internal", "Linux Ubuntu 22.04 LTS", "DATABASE_SERVER", "CRITICAL", "SecOps Data Team"),
            ("prod-web-ingress-01", "10.0.0.15", "web01.soc.internal", "Linux Alpine / Nginx", "WEB_SERVER", "HIGH", "Web Infrastructure"),
            ("corp-domain-controller", "10.0.0.20", "dc01.soc.internal", "Windows Server 2022", "DOMAIN_CONTROLLER", "CRITICAL", "Enterprise IT"),
            ("cloud-backup-node", "10.0.0.30", "backup01.soc.internal", "Linux RHEL 9", "BACKUP_SYSTEM", "HIGH", "Disaster Recovery")
        ]
        for aname, ip, host, os_name, atype, crit, owner in asset_seed:
            a = db.query(Asset).filter(Asset.ip_address == ip).first()
            if not a:
                db.add(Asset(
                    asset_name=aname,
                    ip_address=ip,
                    hostname=host,
                    os=os_name,
                    asset_type=atype,
                    criticality=crit,
                    owner=owner,
                    status="ACTIVE"
                ))
        db.flush()

        # 5. Register Active Model Version if missing in DB
        existing_model = db.query(ModelVersion).filter(ModelVersion.version == "v1.0.0").first()
        if not existing_model:
            meta = ml_engine.metadata
            features_json = json.dumps(meta.get("features", []))
            metrics = meta.get("selected_metrics", {})
            db.add(ModelVersion(
                name="Cybersecurity Intrusion Ensemble",
                version="v1.0.0",
                algorithm="RandomForest + IsolationForest",
                dataset_name="Cybersecurity Intrusion Telemetry Benchmark v1",
                features=features_json,
                accuracy=metrics.get("accuracy", 1.0),
                precision=metrics.get("precision", 1.0),
                recall=metrics.get("recall", 1.0),
                f1_score=metrics.get("f1_score", 1.0),
                roc_auc=metrics.get("roc_auc", 1.0),
                false_positive_rate=metrics.get("false_positive_rate", 0.0),
                artifact_path="backend/app/ml/artifacts/best_classifier.joblib",
                is_active=True
            ))

        db.commit()
        logger.info("Database initialized and default seed data validated.")
    except Exception as e:
        db.rollback()
        logger.error("Error during database seed: %s", str(e))
    finally:
        if close_db:
            db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    yield

app = FastAPI(
    title="AI Autonomous SOC Platform API",
    description="Next-Generation Cybersecurity Defense and Autonomous Incident Response Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Custom Security & Rate Limiting Middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(InMemoryRateLimiter)

# Consistent JSON Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The submitted payload is invalid",
                "details": exc.errors()
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred. Telemetry has been logged."
            }
        }
    )

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(assets_router, prefix="/api")
app.include_router(intel_router, prefix="/api")
app.include_router(mitre_router, prefix="/api")
app.include_router(detection_router, prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(ingestion_router, prefix="/api")
app.include_router(simulations_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(health_router)
