import os
import tempfile
os.environ["FLOW_DATABASE_URL"]="sqlite:///"+tempfile.mktemp(suffix=".db")
import pytest
from fastapi.testclient import TestClient
from flowstate.api import app
from flowstate.db import Base, engine, initialize
@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    initialize()
    yield
@pytest.fixture
def client():
    with TestClient(app) as c: yield c
