"""Validate the repository's Supabase database-IaC layout."""

from __future__ import annotations

import json
import re
import sys
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SUPABASE_ROOT = REPO_ROOT / "supabase"
MIGRATIONS_ROOT = SUPABASE_ROOT / "migrations"
SEEDS_ROOT = SUPABASE_ROOT / "seeds"
QUERIES_ROOT = SUPABASE_ROOT / "queries"

MIGRATION_NAME = re.compile(r"^\d{14}_[a-z0-9_]+\.sql$")
SCHEMA_SQL = re.compile(
    r"\b(create|alter|drop|grant|revoke|truncate)\b",
    re.IGNORECASE,
)
READ_QUERY_MUTATION = re.compile(
    r"\b(alter|call|copy|create|delete|do|drop|grant|insert|merge|revoke|"
    r"truncate|update)\b",
    re.IGNORECASE,
)
SECRET_MARKERS = (
    "service_role_key",
    "supabase_access_token",
    "db_password",
    "postgresql://postgres:",
)


def _relative(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def _without_sql_comments_or_strings(sql: str) -> str:
    """Remove SQL comments and string literals before classifying queries."""
    without_blocks = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    without_lines = re.sub(r"--.*?$", " ", without_blocks, flags=re.MULTILINE)
    return re.sub(r"'(?:''|[^'])*'", "''", without_lines)


def main() -> int:
    """Return a nonzero status when the database-IaC contract is violated."""
    errors: list[str] = []

    required_files = (
        REPO_ROOT / "package.json",
        REPO_ROOT / "package-lock.json",
        SUPABASE_ROOT / "config.toml",
        SUPABASE_ROOT / ".gitignore",
        SUPABASE_ROOT / "README.md",
        QUERIES_ROOT / "README.md",
    )
    for path in required_files:
        if not path.is_file():
            errors.append(f"missing required file: {_relative(path)}")

    retired_root = REPO_ROOT / "backend" / "sql"
    if retired_root.exists():
        errors.append("retired database-IaC root still exists: backend/sql")

    backend_config = (REPO_ROOT / "backend" / "config.py").read_text(encoding="utf-8")
    if "SQL_DIR" in backend_config:
        errors.append("retired SQL_DIR setting remains in backend/config.py")

    package_path = REPO_ROOT / "package.json"
    if package_path.is_file():
        package = json.loads(package_path.read_text(encoding="utf-8"))
        if package.get("private") is not True:
            errors.append("root package.json must be private")
        version = package.get("devDependencies", {}).get("supabase")
        if not version or not re.fullmatch(r"\d+\.\d+\.\d+", version):
            errors.append("Supabase CLI must be pinned to an exact version")

    config_path = SUPABASE_ROOT / "config.toml"
    if config_path.is_file():
        with config_path.open("rb") as config_file:
            config = tomllib.load(config_file)
        if config.get("project_id") != "novaflair-dashboard":
            errors.append("config.toml project_id must be novaflair-dashboard")
        if config.get("db", {}).get("major_version") != 17:
            errors.append("local Postgres major version must match Cloud version 17")
        seed_paths = config.get("db", {}).get("seed", {}).get("sql_paths")
        if seed_paths != ["./seeds/*.sql"]:
            errors.append("config.toml must load only ./seeds/*.sql")
        schema_paths = config.get("db", {}).get("migrations", {}).get("schema_paths")
        if schema_paths:
            errors.append("declarative schema paths are outside ADR 0004's scope")

    migrations = sorted(MIGRATIONS_ROOT.glob("*.sql"))
    if not migrations:
        errors.append("supabase/migrations contains no migrations")
    else:
        if not migrations[0].name.endswith("_baseline_remote_schema.sql"):
            errors.append("the first migration must be the remote schema baseline")
        for path in migrations:
            if not MIGRATION_NAME.fullmatch(path.name):
                errors.append(f"invalid migration filename: {_relative(path)}")

    seeds = sorted(SEEDS_ROOT.glob("*.sql"))
    if not seeds:
        errors.append("supabase/seeds contains no local fixtures")
    for path in seeds:
        sql = path.read_text(encoding="utf-8")
        if SCHEMA_SQL.search(sql):
            errors.append(f"seed contains schema or privilege SQL: {_relative(path)}")

    read_queries = sorted((QUERIES_ROOT / "read").glob("*.sql"))
    if not read_queries:
        errors.append("supabase/queries/read contains no read-only queries")
    for path in read_queries:
        sql = _without_sql_comments_or_strings(path.read_text(encoding="utf-8"))
        if READ_QUERY_MUTATION.search(sql):
            errors.append(f"read-only query contains a mutation: {_relative(path)}")

    verification_queries = sorted((QUERIES_ROOT / "verify").glob("*.sql"))
    if not verification_queries:
        errors.append("supabase/queries/verify contains no verification queries")
    for path in verification_queries:
        sql = _without_sql_comments_or_strings(
            path.read_text(encoding="utf-8")
        ).strip()
        if READ_QUERY_MUTATION.search(sql):
            errors.append(f"verification query contains a mutation: {_relative(path)}")
        if not re.match(r"^BEGIN\s*;", sql, flags=re.IGNORECASE):
            errors.append(f"verification query must begin a transaction: {_relative(path)}")
        if not re.search(r"ROLLBACK\s*;\s*$", sql, flags=re.IGNORECASE):
            errors.append(f"verification query must end with rollback: {_relative(path)}")
        if re.search(r"\bCOMMIT\b", sql, flags=re.IGNORECASE):
            errors.append(f"verification query must not commit: {_relative(path)}")

    for path in SUPABASE_ROOT.rglob("*.sql"):
        lowered = path.read_text(encoding="utf-8").lower()
        for marker in SECRET_MARKERS:
            if marker in lowered:
                errors.append(
                    f"possible committed database secret in {_relative(path)}: {marker}"
                )

    supabase_ignore = SUPABASE_ROOT / ".gitignore"
    if supabase_ignore.is_file():
        ignored = supabase_ignore.read_text(encoding="utf-8")
        for entry in (".branches", ".temp", ".env.local"):
            if entry not in ignored:
                errors.append(f"supabase/.gitignore must ignore {entry}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print(
        "Supabase layout is valid: "
        f"{len(migrations)} migrations, {len(seeds)} seed files."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
