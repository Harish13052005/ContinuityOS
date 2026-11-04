import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)
print("Tables created successfully")