export interface SampleRepo {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  visibility: 'public' | 'private';
  stars: number;
  forks: number;
  language: string;
  description: string;
  lastCommitSha: string;
  lastCommitMessage: string;
  files: { path: string; content: string }[];
  pullRequests: {
    prNumber: number;
    title: string;
    author: string;
    branch: string;
    baseBranch: string;
    changedFiles: {
      filename: string;
      status: 'added' | 'modified' | 'deleted';
      additions: number;
      deletions: number;
      patch: string;
    }[];
  }[];
}

export const SAMPLE_REPOSITORIES: SampleRepo[] = [
  {
    id: 'repo-fastapi-service',
    owner: 'acme-fintech',
    name: 'payment-gateway-service',
    fullName: 'acme-fintech/payment-gateway-service',
    defaultBranch: 'main',
    visibility: 'public',
    stars: 1240,
    forks: 184,
    language: 'Python',
    description: 'High-throughput payment gateway and merchant settlement service built with FastAPI, PostgreSQL, and Redis.',
    lastCommitSha: '4f91b82e1c0d24a9',
    lastCommitMessage: 'feat(payments): add multi-currency exchange rate calculation',
    files: [
      {
        path: 'backend/database.py',
        content: `"""Database connection and user query utilities."""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://app_user:db_pass_secret@db.internal:5432/payments_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def search_users(db, name: str):
    # Vulnerable raw query construction
    query = "SELECT * FROM users WHERE name = '" + name + "'"
    result = db.execute(query)
    return result.fetchall()

def get_user_by_id(db, user_id: int):
    query = text("SELECT * FROM users WHERE id = :id")
    return db.execute(query, {"id": user_id}).fetchone()
`,
      },
      {
        path: 'backend/api/transactions.py',
        content: `"""Transaction processing endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import subprocess
import logging

router = APIRouter(prefix="/transactions", tags=["transactions"])
logger = logging.getLogger("payments")

class PaymentPayload(BaseModel):
    account_id: str
    amount: float
    currency: str

@router.post("/process")
async def process_transaction(payload: PaymentPayload):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Process payment logic
    logger.info(f"Processing payment for account {payload.account_id}")
    return {"status": "authorized", "transaction_id": "tx_99281923"}

@router.post("/export-receipt")
async def export_receipt(tx_id: str):
    # Command injection risk: shell=True with user parameter
    cmd = f"generate-pdf --tx {tx_id} --output /tmp/{tx_id}.pdf"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return {"status": "generated", "output": result.stdout}
`,
      },
      {
        path: 'backend/auth/jwt_handler.py',
        content: `"""JWT token encoding and authentication verification."""
import jwt
import os
from datetime import datetime, timedelta

JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_production_key_994827163")
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
`,
      },
      {
        path: 'backend/main.py',
        content: `"""FastAPI application entrypoint and middleware."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.transactions import router as tx_router

DEBUG = True # Insecure debug flag enabled

app = FastAPI(title="Payment Gateway API", debug=DEBUG)

# Wildcard CORS policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tx_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "payment-gateway"}
`,
      },
      {
        path: 'requirements.txt',
        content: `fastapi==0.110.0
uvicorn==0.28.0
sqlalchemy==2.0.28
psycopg2-binary==2.9.9
pydantic==2.6.4
pyjwt==2.8.0
urllib3==1.24.1
pytest==8.1.1
requests==2.31.0
`,
      },
      {
        path: 'tests/test_database.py',
        content: `"""Database and search test suite."""
import pytest
from unittest.mock import MagicMock
from backend.database import get_user_by_id

def test_get_user_by_id():
    mock_db = MagicMock()
    mock_db.execute.return_value.fetchone.return_value = {"id": 1, "name": "Alice"}
    user = get_user_by_id(mock_db, 1)
    assert user["name"] == "Alice"
`,
      },
      {
        path: 'README.md',
        content: `# Payment Gateway Service
Enterprise payment and transaction processing service.
## Architecture
FastAPI application connecting to PostgreSQL.
## Setup
\`\`\`bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
\`\`\`
`,
      },
      {
        path: 'Dockerfile',
        content: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
      },
    ],
    pullRequests: [
      {
        prNumber: 42,
        title: 'fix: optimize transaction search and database index queries',
        author: 'dev-alex',
        branch: 'alex/optimize-search',
        baseBranch: 'main',
        changedFiles: [
          {
            filename: 'backend/database.py',
            status: 'modified',
            additions: 12,
            deletions: 4,
            patch: `@@ -22,4 +22,12 @@
 def search_users(db, name: str):
-    query = "SELECT * FROM users WHERE name = '" + name + "'"
-    result = db.execute(query)
+    # Refactored search with raw string formatting
+    query = "SELECT id, name, email FROM users WHERE name = '%s' ORDER BY created_at DESC" % name
+    result = db.execute(query)
     return result.fetchall()`,
          },
        ],
      },
      {
        prNumber: 58,
        title: 'feat: add session token expiration refresh window',
        author: 'sec-elena',
        branch: 'elena/session-refresh',
        baseBranch: 'main',
        changedFiles: [
          {
            filename: 'backend/auth/jwt_handler.py',
            status: 'modified',
            additions: 15,
            deletions: 2,
            patch: `@@ -12,2 +12,15 @@
     to_encode.update({"exp": expire})
+    to_encode.update({"sliding_window_sec": 7200})
+    # Modified session expiration check
+    if "max_age" in data:
+        to_encode["exp"] = datetime.utcnow() + timedelta(seconds=data["max_age"])
     encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)`,
          },
        ],
      },
    ],
  },
  {
    id: 'repo-react-cloud-hub',
    owner: 'apex-systems',
    name: 'cloud-infrastructure-hub',
    fullName: 'apex-systems/cloud-infrastructure-hub',
    defaultBranch: 'main',
    visibility: 'public',
    stars: 3820,
    forks: 412,
    language: 'TypeScript',
    description: 'Cloud resource governance, Kubernetes cluster metrics, and DevOps observability platform.',
    lastCommitSha: '9a72df10b83c',
    lastCommitMessage: 'refactor(metrics): optimize time-series query caching',
    files: [
      {
        path: 'src/api/client.ts',
        content: `import axios from 'axios';

// Insecure token assignment
const GITHUB_TOKEN = "ghp_Abc98234KlmnOpqrStuvWxYz0123456789a";

export const apiClient = axios.create({
  baseURL: process.env.VITE_API_URL || 'https://api.internal.cloud',
  headers: {
    Authorization: \`Bearer \${GITHUB_TOKEN}\`
  }
});

export async function executeDynamicRule(ruleString: string, context: Record<string, any>) {
  // Dangerous eval sink
  const fn = eval(\`(\${ruleString})\`);
  return fn(context);
}
`,
      },
      {
        path: 'src/components/ClusterMap.tsx',
        content: `import React, { useState } from 'react';

export function ClusterMap() {
  const [nodes, setNodes] = useState([]);
  
  // High complexity function with deeply nested loops and conditions
  const calculateClusterHealth = (clusterData: any[]) => {
    let score = 100;
    if (clusterData && clusterData.length > 0) {
      for (let i = 0; i < clusterData.length; i++) {
        if (clusterData[i].status === 'warning') {
          for (let j = 0; j < clusterData[i].pods.length; j++) {
            if (clusterData[i].pods[j].restarts > 5) {
              if (clusterData[i].pods[j].phase === 'Pending') {
                score -= 15;
              } else if (clusterData[i].pods[j].phase === 'CrashLoopBackOff') {
                score -= 25;
              } else {
                score -= 5;
              }
            }
          }
        } else if (clusterData[i].status === 'critical') {
          score -= 40;
        }
      }
    }
    return score;
  };

  return <div className="cluster-map">Cluster Monitor</div>;
}
`,
      },
      {
        path: 'package.json',
        content: `{
  "name": "cloud-infrastructure-hub",
  "version": "2.4.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "0.19.0",
    "lodash": "4.17.15",
    "jsonwebtoken": "8.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.1.0"
  }
}
`,
      },
      {
        path: 'README.md',
        content: `# Cloud Infrastructure Hub
Enterprise Kubernetes & Cloud Observability Console.
`,
      },
    ],
    pullRequests: [
      {
        prNumber: 104,
        title: 'fix(security): sanitize dynamic cluster rule execution',
        author: 'alex-engineer',
        branch: 'alex/sanitize-eval',
        baseBranch: 'main',
        changedFiles: [
          {
            filename: 'src/api/client.ts',
            status: 'modified',
            additions: 4,
            deletions: 2,
            patch: `@@ -11,2 +11,4 @@
 export async function executeDynamicRule(ruleString: string, context: Record<string, any>) {
-  const fn = eval(\`(\${ruleString})\`);
-  return fn(context);
+  // Sanitize rule evaluation using Function constructor
+  const safeFn = new Function('ctx', \`return \${ruleString}\`);
+  return safeFn(context);
`,
          },
        ],
      },
    ],
  },
];
