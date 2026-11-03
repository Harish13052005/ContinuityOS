import sys
sys.path.insert(0, r'C:/Users/Hp/Documents/GitHub/ContinuityOS/backend')
from app.core.database import engine, Base

Base.metadata.create_all(bind=engine)
print('Database tables created successfully')