"""Check that the interface still understands every parameter word the API answers with.

The chat API labels a result with the word the question used, so an answer about
chlorophyll comes back as "Chlorophyll" while the frontend calls that column chla. The
mapping between the two lives in two files in two languages, and it has drifted before:
backscatter was once missing from every copy of it, so that parameter could not be
plotted at all, and nothing failed while it was wrong. A chart with no unit on it is
worse than no chart on a page whose whole claim is that the numbers are right.

Run it directly:  python check_parameters.py
"""

import ast
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
CONFIG = ROOT / "backend" / "agentic_ai" / "config.py"
REGISTRY = ROOT / "frontend" / "src" / "parameters.js"

# Pressure is the axis a profile is drawn against, not a series drawn on one. It has no
# colour and no place in the parameter registry, and the API never reports it as a
# measured value, so its synonyms are deliberately absent from the frontend.
AXIS_ONLY = {"pressure"}


def backend_synonyms():
    """Every word the API might use for a column, from PARAMETER_SYNONYMS."""
    tree = ast.parse(CONFIG.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and any(
            getattr(target, "id", None) == "PARAMETER_SYNONYMS" for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise AssertionError(f"PARAMETER_SYNONYMS not found in {CONFIG}")


def frontend_labels():
    """The keys, display names and aliases the interface can resolve."""
    source = REGISTRY.read_text(encoding="utf-8")

    keys, names, units = set(), {}, {}
    body = re.search(r"export const PARAMETERS = \{(.*?)\n\};", source, re.S).group(1)
    for key, name, unit in re.findall(
        r'(\w+):\s*\{\s*name:\s*"([^"]*)",\s*unit:\s*"([^"]*)"', body
    ):
        keys.add(key)
        names[key] = name
        units[key] = unit

    aliases = {}
    block = re.search(r"const ALIASES = \{(.*?)\n\};", source, re.S).group(1)
    for key, listed in re.findall(r"(\w+):\s*\[([^\]]*)\]", block):
        aliases[key] = [word.strip().strip('"') for word in listed.split(",") if word.strip()]

    resolvable = set(keys)
    resolvable |= {name.lower() for name in names.values()}
    resolvable |= {word for words in aliases.values() for word in words}
    return keys, names, units, aliases, resolvable


def main():
    synonyms = backend_synonyms()
    keys, names, units, aliases, resolvable = frontend_labels()
    problems = []

    for column, words in synonyms.items():
        if column in AXIS_ONLY:
            continue
        if column not in keys:
            problems.append(f"the API can return column {column!r}, which the interface has no entry for")
            continue
        for word in words:
            if word.lower() not in resolvable:
                problems.append(
                    f"the API may label column {column!r} as {word!r}, "
                    f"which the interface cannot resolve, so that chart loses its unit and colour"
                )

    for key in sorted(keys):
        if key not in synonyms:
            problems.append(f"the interface knows {key!r}, which the API can never ask for")
        if not names.get(key):
            problems.append(f"{key!r} has no display name")

    # A unit is what stops a number being read as a thousandfold error. pH is genuinely
    # dimensionless in the sense the others are not, so it is allowed the empty string.
    for key in sorted(keys - {"ph"}):
        if not units.get(key):
            problems.append(f"{key!r} has no unit")

    for key in aliases:
        if key not in keys:
            problems.append(f"ALIASES has an entry for {key!r}, which is not a parameter")

    if problems:
        print(f"{len(problems)} problem(s):", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    print(
        f"ok: {len(keys)} parameters, "
        f"{sum(len(words) for column, words in synonyms.items() if column not in AXIS_ONLY)} "
        f"API words, all resolvable"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
