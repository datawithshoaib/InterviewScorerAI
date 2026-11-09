#!/usr/bin/env python3
"""
InterviewScorerAI - Unified Application Launcher
Starts both the FastAPI Backend (LangGraph) and the Next.js Frontend.
Handles port conflicts gracefully and cleanly shuts down on Ctrl+C.
"""

import os
import sys
import time
import socket
import signal
import argparse
import subprocess
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Checks if a network port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def find_available_port(preferred_port: int, fallback_ports: list) -> int:
    """Returns preferred port if free, else the first free fallback port."""
    if not is_port_in_use(preferred_port):
        return preferred_port
    for port in fallback_ports:
        if not is_port_in_use(port):
            return port
    return preferred_port + 10

def get_backend_python() -> str:
    """Finds the venv python executable or falls back to system python."""
    if os.name == "nt":
        venv_python = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    else:
        venv_python = BACKEND_DIR / "venv" / "bin" / "python"

    if venv_python.exists():
        return str(venv_python)
    return sys.executable

def update_frontend_env(backend_port: int):
    """Updates frontend/.env.local so Next.js points to the active backend port."""
    env_local = FRONTEND_DIR / ".env.local"
    env_content = f"NEXT_PUBLIC_BACKEND_URL=http://localhost:{backend_port}\n"
    try:
        env_local.write_text(env_content, encoding="utf-8")
    except Exception as e:
        print(f"[Warning] Could not update frontend/.env.local: {e}")

def main():
    parser = argparse.ArgumentParser(description="InterviewScorerAI Launcher")
    parser.add_argument("--backend-only", action="store_true", help="Launch only the FastAPI backend")
    parser.add_argument("--frontend-only", action="store_true", help="Launch only the Next.js frontend")
    parser.add_argument("--backend-port", type=int, default=None, help="Explicit backend port")
    parser.add_argument("--frontend-port", type=int, default=None, help="Explicit frontend port")
    args = parser.parse_args()

    # Determine backend port (default 8000, fallback to 8001 if 8000 is occupied)
    if args.backend_port:
        backend_port = args.backend_port
    else:
        backend_port = find_available_port(8000, [8001, 8002, 8080])

    # Determine frontend port (default 3000, fallback to 3001 if 3000 is occupied)
    if args.frontend_port:
        frontend_port = args.frontend_port
    else:
        frontend_port = find_available_port(3000, [3001, 3002, 3005])

    update_frontend_env(backend_port)

    print("=" * 65)
    print("   🎙️  InterviewScorerAI - Application Launcher")
    print("=" * 65)
    print(f" • Mode: {'Backend Only' if args.backend_only else 'Frontend Only' if args.frontend_only else 'Full-Stack (Backend + Frontend)'}")
    print(f" • Backend Port:  {backend_port}")
    print(f" • Frontend Port: {frontend_port}")
    print("=" * 65)

    processes = []

    try:
        # 1. Start FastAPI Backend
        if not args.frontend_only:
            py_exec = get_backend_python()
            backend_cmd = [
                py_exec,
                "-m", "uvicorn",
                "app.main:app",
                "--host", "127.0.0.1",
                "--port", str(backend_port),
                "--log-level", "info"
            ]
            print(f"[Backend] Starting FastAPI on http://127.0.0.1:{backend_port} ...")
            backend_proc = subprocess.Popen(
                backend_cmd,
                cwd=str(BACKEND_DIR),
                shell=(os.name == "nt")
            )
            processes.append(("FastAPI Backend", backend_proc))

        # Brief pause to let backend initialize
        time.sleep(1.5)

        # 2. Start Next.js Frontend
        if not args.backend_only:
            npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
            frontend_cmd = [npm_cmd, "run", "dev", "--", "-p", str(frontend_port)]
            print(f"[Frontend] Starting Next.js on http://localhost:{frontend_port} ...")
            frontend_proc = subprocess.Popen(
                frontend_cmd,
                cwd=str(FRONTEND_DIR),
                shell=(os.name == "nt")
            )
            processes.append(("Next.js Frontend", frontend_proc))

        print("\n" + "─" * 65)
        if not args.frontend_only:
            print(f" ⚡ FastAPI Swagger Docs: http://localhost:{backend_port}/docs")
        if not args.backend_only:
            print(f" 🌐 Web Dashboard:       http://localhost:{frontend_port}")
        print("─" * 65)
        print(" [Press Ctrl+C to stop all services]\n")

        # Keep parent process alive while children are running
        while True:
            for name, proc in processes:
                ret = proc.poll()
                if ret is not None:
                    print(f"[{name}] exited with return code {ret}")
                    return
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[Shutdown] Stopping all services...")
    finally:
        for name, proc in processes:
            print(f"Terminating {name}...")
            try:
                proc.terminate()
                if os.name == "nt":
                    # On Windows, kill child process tree cleanly
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
        print("[Shutdown] All processes stopped. Goodbye!")

if __name__ == "__main__":
    main()
