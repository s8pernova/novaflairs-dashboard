"""Tests for the Supabase layout validator."""

from __future__ import annotations

import unittest

from scripts.check_supabase_layout import (
    READ_QUERY_MUTATION,
    _without_sql_comments_or_strings,
)


class QueryClassificationTests(unittest.TestCase):
    """Protect read-query classification from false positives and bypasses."""

    def test_ignores_privilege_name_inside_string_literal(self) -> None:
        sql = "SELECT has_table_privilege(current_user, 'public.t', 'INSERT');"

        classified = _without_sql_comments_or_strings(sql)

        self.assertIsNone(READ_QUERY_MUTATION.search(classified))

    def test_detects_real_mutation(self) -> None:
        sql = "INSERT INTO public.t DEFAULT VALUES;"

        classified = _without_sql_comments_or_strings(sql)

        self.assertIsNotNone(READ_QUERY_MUTATION.search(classified))

    def test_ignores_mutation_keyword_inside_comment(self) -> None:
        sql = "-- INSERT is forbidden here\nSELECT 1;"

        classified = _without_sql_comments_or_strings(sql)

        self.assertIsNone(READ_QUERY_MUTATION.search(classified))


if __name__ == "__main__":
    unittest.main()
