"""Supabase client singleton + helpers."""

from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from backend.config import get_settings

_supabase: Optional[Client] = None


def get_supabase() -> Client:
    """Get a cached Supabase client for dependency injection."""
    global _supabase
    if _supabase is None:
        settings = get_settings()
        _supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase
