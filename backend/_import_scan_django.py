import importlib
import pkgutil
from pathlib import Path

from django.apps import apps


def iter_project_app_packages():
    """Yield (app_label, package_name, package) for project-local Django apps only."""
    backend_dir = Path(__file__).resolve().parent

    for cfg in apps.get_app_configs():
        pkg = cfg.module
        pkg_file = getattr(pkg, "__file__", None)
        if not pkg_file:
            continue

        try:
            pkg_path = Path(pkg_file).resolve()
        except Exception:
            continue

        # Only scan modules that live inside this repo's backend directory.
        if backend_dir not in pkg_path.parents:
            continue

        yield cfg.label, pkg.__name__, pkg


def main() -> int:
    errors: list[tuple[str, str, str]] = []

    for app_label, pkg_name, pkg in iter_project_app_packages():
        # Import the package itself
        try:
            importlib.import_module(pkg_name)
        except Exception as e:
            errors.append((app_label, pkg_name, repr(e)))
            continue

        # Walk submodules
        if not hasattr(pkg, "__path__"):
            continue

        for m in pkgutil.walk_packages(pkg.__path__, prefix=pkg.__name__ + "."):
            modname = m.name
            try:
                importlib.import_module(modname)
            except Exception as e:
                errors.append((app_label, modname, repr(e)))

    print(f"DJANGO_CONTEXT_IMPORT_SCAN_ERRORS_TOTAL={len(errors)}")
    for app_label, modname, err in errors:
        print(f"DJANGO_CONTEXT_IMPORT_ERROR [{app_label}] {modname} -> {err}")

    return 2 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
