"""Compatibility shim for Python 3.13+

Python 3.13 removed the stdlib `cgi` module (PEP 594). Django 3.2 still
imports `cgi.parse_header` from `django.http.request`.

We intentionally keep this shim tiny and focused: implement `parse_header`
well enough for HTTP Content-Type parsing.

Note: This file is placed in the Django project root (same directory as
`manage.py`) so it is importable before site-packages.
"""

from __future__ import annotations

from typing import Dict, Tuple


def parse_header(line: str) -> Tuple[str, Dict[str, str]]:
    """Parse a Content-Type like header.

    Returns:
        (main_value, params)

    Example:
        >>> parse_header('text/html; charset="utf-8"')
        ('text/html', {'charset': 'utf-8'})
    """

    if not line:
        return "", {}

    parts = [p.strip() for p in line.split(';')]
    key = parts[0].lower()
    params: Dict[str, str] = {}

    for item in parts[1:]:
        if not item:
            continue
        if '=' not in item:
            # Parameter without value.
            params[item.lower()] = ""
            continue

        k, v = item.split('=', 1)
        k = k.strip().lower()
        v = v.strip()

        # Unquote common quoted-string forms.
        if len(v) >= 2 and v[0] == v[-1] and v[0] in ('"', "'"):
            v = v[1:-1]

        params[k] = v

    return key, params


__all__ = ["parse_header"]
