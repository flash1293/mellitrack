#!/usr/bin/env python3
"""Helper script for interacting with Cloudflare D1 API from GitHub Actions."""
import json
import os
import sys
import urllib.request


def api_url(path):
    account = os.environ["CF_ACCOUNT_ID"]
    return f"https://api.cloudflare.com/client/v4/accounts/{account}/d1/database{path}"


def api_call(url, method="GET", data=None):
    headers = {
        "Authorization": f"Bearer {os.environ['CF_API_TOKEN']}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())


def cmd_list():
    """List D1 databases and filter by name."""
    name = sys.argv[2] if len(sys.argv) > 2 else None
    result = api_call(api_url(""))
    for db in result.get("result", []):
        if name and db["name"] != name:
            continue
        print(db["uuid"])
        return
    if name:
        print("")  # not found


def cmd_create():
    """Create a new D1 database."""
    name = sys.argv[2]
    result = api_call(api_url(""), method="POST", data=json.dumps({"name": name}).encode())
    if result.get("success"):
        print(result["result"]["uuid"])
    else:
        print(f"Error: {result.get('errors')}", file=sys.stderr)
        sys.exit(1)


def cmd_query():
    """Execute a SQL query on a database."""
    db_id = sys.argv[2]
    sql_file = sys.argv[3]
    with open(sql_file) as f:
        sql = f.read()
    payload = json.dumps({"sql": sql}).encode()
    try:
        result = api_call(api_url(f"/{db_id}/query"), method="POST", data=payload)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        err_msg = body.lower()
        # Ignore "duplicate column" errors — migration already applied
        if "duplicate column" in err_msg:
            print(f"  ⚠ Column already exists (migration already applied), continuing")
            return
        print(f"Error: HTTP {e.code} - {body}", file=sys.stderr)
        sys.exit(1)
    if result.get("success"):
        for r in result.get("result", []):
            print(f"  rows: {len(r.get('results', []))}, changes: {r['meta']['changes']}")
    else:
        print(f"Error: {result.get('errors')}", file=sys.stderr)
        sys.exit(1)


def cmd_seed():
    """Seed preview database with default user."""
    db_id = sys.argv[2]

    # Default user (password: demo123)
    sql = """INSERT OR IGNORE INTO users (id, username, password_hash)
    VALUES (1, 'default', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791')"""
    payload = json.dumps({"sql": sql}).encode()
    result = api_call(api_url(f"/{db_id}/query"), method="POST", data=payload)
    if result.get("success"):
        print("  ✓ Default user created")
    else:
        print(f"  ⚠ Could not create user: {result.get('errors')}")

    # Default categories
    sql = """INSERT OR IGNORE INTO exercise_categories (id, name, user_id, sort_order)
    VALUES (1, 'Oberkörper', 1, 1), (2, 'Unterkörper', 1, 2), (3, 'Ganzkörper', 1, 3)"""
    payload = json.dumps({"sql": sql}).encode()
    result = api_call(api_url(f"/{db_id}/query"), method="POST", data=payload)
    if result.get("success"):
        print("  ✓ Default categories created")
    else:
        print(f"  ⚠ Could not create categories: {result.get('errors')}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: d1_api.py <list|create|query|seed> [args...]", file=sys.stderr)
        sys.exit(1)

    cmd = sys.argv[1]
    commands = {"list": cmd_list, "create": cmd_create, "query": cmd_query, "seed": cmd_seed}
    if cmd not in commands:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)

    commands[cmd]()
