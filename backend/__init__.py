"""FloatChat's API package.

The .env file is loaded here, before any submodule, and deliberately so. Several modules
read configuration at import time -- database.py resolves DATABASE_URL as it builds the
engine -- so loading .env anywhere further down the import chain means those modules have
already read the environment without it.

That failure was silent rather than loud: DATABASE_URL in .env was ignored and the API
quietly served the small demo database while every other setting worked. Keeping the load
at the package root makes the ordering a property of the package rather than of whichever
module happens to be imported first.
"""

from dotenv import load_dotenv

load_dotenv()
