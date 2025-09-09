import uvicorn

if __name__ == "__main__":
    # This command tells uvicorn to run the 'app' object from the 'app.main' module.
    # --reload makes the server restart automatically when you change the code.
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)