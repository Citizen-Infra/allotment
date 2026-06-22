from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import uuid


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


class AssemblyRow(Base):
    __tablename__ = "assemblies"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    question: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PoolRow(Base):
    __tablename__ = "pools"
    assembly_id: Mapped[str] = mapped_column(ForeignKey("assemblies.id"), primary_key=True)
    features_json: Mapped[str] = mapped_column(Text)
    candidates_blob: Mapped[str] = mapped_column(Text)  # encrypted JSON
    purge_after: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DrawRow(Base):
    __tablename__ = "draws"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    assembly_id: Mapped[str] = mapped_column(ForeignKey("assemblies.id"))
    config_json: Mapped[str] = mapped_column(Text)
    selection_json: Mapped[str] = mapped_column(Text)
    audit_json: Mapped[str] = mapped_column(Text)
    seed: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
