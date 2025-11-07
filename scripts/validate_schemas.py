#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "jsonschema",
# ]
# ///
"""
Validate JSON data files against their schemas.
Usage: uv run scripts/validate_schemas.py
"""

import json
from pathlib import Path
from jsonschema import Draft7Validator
import sys

def get_hotline_name(data: dict, path: list) -> str | None:
    """
    Extract the hotlineName from the error path if it's a hotline object.
    Returns None if not applicable.
    """
    # Check if error is within a hotline object (path like ['hotlines', 5, 'field'])
    if len(path) >= 2 and path[0] == 'hotlines' and isinstance(path[1], int):
        try:
            hotline_index = path[1]
            hotline = data['hotlines'][hotline_index]
            return hotline.get('hotlineName', f'hotlines[{hotline_index}]')
        except (KeyError, IndexError, TypeError):
            return None
    return None

def validate(schema_path: Path, data_path: Path) -> bool:
    """Validate json and show all validation errors."""

    # Load schema and data
    with open(schema_path) as f:
        schema = json.load(f)
    with open(data_path) as f:
        data = json.load(f)

    # Create validator
    validator = Draft7Validator(schema)

    # Get all errors
    errors = list(validator.iter_errors(data))

    if not errors:
        print(f"✅ {data_path.name} is valid!")
        return True

    print(f"❌ Found {len(errors)} validation error(s) in {data_path.name}:\n")

    for i, error in enumerate(errors, 1):
        hotline_name = get_hotline_name(data, list(error.path))

        print(f"Error #{i}:")
        if hotline_name:
            print(f"  Hotline: {hotline_name}")
        print(f"  File: {data_path}")
        print(f"  Message: {error.message}")
        # handle edge case if ever we find an unknown field
        print(f"  Location: {' -> '.join(str(p) for p in error.path) or 'root'}")
        if len(str(error.instance)) < 100:
            print(f"  Invalid value: {error.instance}")
        print()

    return False

def main():
    """Validate all JSON data files."""
    project_root = Path(__file__).parent.parent

    print("🔍 Validating JSON schemas...\n")

    # Validate hotlines.json
    print("Validating hotlines.json...")
    hotlines_valid = validate(
        project_root / "schemas" / "hotlines.schema.json",
        project_root / "public" / "data" / "hotlines.json"
    )

    print()

    # Validate metadata.json
    print("Validating metadata.json...")
    metadata_valid = validate(
        project_root / "schemas" / "metadata.schema.json",
        project_root / "public" / "data" / "metadata.json"
    )

    print()

    # Exit with error code if validation failed
    if not (hotlines_valid and metadata_valid):
        print("❌ Validation failed!")
        sys.exit(1)

    print("✅ All files validated successfully!")

if __name__ == "__main__":
    main()