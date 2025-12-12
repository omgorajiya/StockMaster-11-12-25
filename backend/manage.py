#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Django 3.2 relies on the deprecated 'cgi' module which was removed in Python 3.13.
# Provide a minimal compatibility shim so Django can import it.
try:
    import cgi  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    import types

    cgi = types.ModuleType("cgi")

    def _parse_header(line):
        """Very small stub for cgi.parse_header used by Django's HttpRequest.

        Returns (line, {}) which is sufficient for the way Django 3.2 uses it
        when running on modern Python versions where full cgi is unavailable.
        """

        return line, {}

    cgi.parse_header = _parse_header  # type: ignore[attr-defined]
    sys.modules["cgi"] = cgi


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stockmaster.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

