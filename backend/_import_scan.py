import importlib
import pkgutil

PROJECT_APPS = [
    "accounts",
    "products",
    "operations",
    "dashboard",
    "notifications",
    "integrations",
]

def main() -> int:
    errors: list[tuple[str, str, str]] = []

    for pkg_name in PROJECT_APPS:
        try:
            pkg = importlib.import_module(pkg_name)
        except Exception as e:
            errors.append((pkg_name, "__init__", repr(e)))
            continue

        if not hasattr(pkg, "__path__"):
            continue

        for m in pkgutil.walk_packages(pkg.__path__, prefix=pkg.__name__ + "."):
            modname = m.name
            try:
                importlib.import_module(modname)
            except Exception as e:
                errors.append((pkg_name, modname, repr(e)))

    print(f"IMPORT_SCAN_ERRORS_TOTAL={len(errors)}")
    for pkg_name, modname, err in errors:
        print(f"IMPORT_ERROR [{pkg_name}] {modname} -> {err}")

    return 2 if errors else 0

if __name__ == "__main__":
    raise SystemExit(main())
