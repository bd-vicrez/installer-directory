"""Independent read-only staff API; never starts routing or provider workers.

Deploy with the RFQ database and existing service secret mounted read-only.
Only its exact URL is proxied; the existing FastAPI service is not restarted.
"""
import hmac
import os
import sqlite3
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from inquiry_workspace import overview


def create_app(db_path=None, secret_path=None):
    db_path=Path(db_path or os.getenv('WORKSPACE_DB','/data/rfq_submissions.db'))
    secret_path=Path(secret_path or os.getenv('WORKSPACE_SECRET','/run/secrets/directory-rfq-secret'))
    app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)

    @app.middleware('http')
    async def prevent_caching(request, call_next):
        response = await call_next(request)
        response.headers['Cache-Control'] = 'private, no-store'
        return response

    @app.get('/internal/directory-rfq/workspace')
    def workspace(request:Request):
        try:
            expected=secret_path.read_text().strip()
            if len(expected)<32:raise ValueError()
        except (OSError,ValueError):
            raise HTTPException(503,'Workspace authentication unavailable')
        provided=request.headers.get('authorization','')
        if not hmac.compare_digest(provided.encode(),('Bearer '+expected).encode()):
            raise HTTPException(401,'Unauthorized')
        conn=None
        try:
            conn=sqlite3.connect(db_path.resolve().as_uri()+'?mode=ro',uri=True,timeout=5)
            conn.row_factory=sqlite3.Row
            conn.execute('PRAGMA query_only=ON')
            return JSONResponse(overview(conn,request.query_params),headers={'Cache-Control':'private, no-store'})
        except sqlite3.Error:
            raise HTTPException(503,'Inquiry data temporarily unavailable')
        finally:
            if conn is not None:conn.close()
    return app


app=create_app()
