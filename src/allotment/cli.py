"""CLI entrypoints for Allotment operator tasks.

Usage:
    python -m allotment.cli          # purge expired pools (default)
    python -m allotment.cli purge    # same, explicit
"""

from __future__ import annotations

import sys
from datetime import datetime, UTC

from allotment.db.repo import AssemblyRepo
from allotment.db.session import create_all, make_session


def purge_pools() -> int:
    """Delete pool rows whose purge_after timestamp has passed.

    Returns the number of rows deleted.  Intended for a cron / scheduled task.
    """
    create_all()
    session = make_session()
    try:
        repo = AssemblyRepo(session)
        count = repo.purge_expired_pools(datetime.now(UTC))
        session.commit()
        print(f"purge_pools: deleted {count} expired pool(s)")
        return count
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else "purge"
    if command == "purge":
        purge_pools()
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        print("Available commands: purge", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
