from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from allotment.config import get_settings
from allotment.db.models import Base

_engine = create_engine(get_settings().database_url, future=True)
_Session = sessionmaker(bind=_engine, class_=Session, expire_on_commit=False)


def create_all() -> None:
    Base.metadata.create_all(_engine)


def make_session() -> Session:
    return _Session()
