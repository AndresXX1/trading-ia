# session_store.py
from typing import Dict
from data_provider import MT5DataProvider

# user_id -> MT5DataProvider
session_store: Dict[str, MT5DataProvider] = {}
