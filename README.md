# Generate requirements.txt based on imports in the project
```powershell
uv pip install pipreqs
pipreqs . --force --ignore .venv,__pycache__
uv pip install -r requirements.txt
```
