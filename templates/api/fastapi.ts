// Template: FastAPI Python
// Categoria: api
// Palavras-chave: python, fastapi, api, rest, backend, async

export const fastapiTemplate = {
  id: "fastapi",
  name: "FastAPI Python",
  category: "api",
  description: "API REST com FastAPI, Python moderno e documentacao automatica",
  keywords: [
    "python", "fastapi", "api", "rest", "backend", "async", "pydantic",
    "uvicorn", "api python", "fast api", "python api"
  ],
  files: {
    "main.py": `from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn

app = FastAPI(
    title="Minha API",
    description="API REST criada com FastAPI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos
class ItemBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    concluido: bool = False

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    criado_em: datetime

    class Config:
        from_attributes = True

# Banco de dados em memoria
items_db: List[Item] = []
item_id_counter = 1

# Rotas
@app.get("/")
async def root():
    return {"mensagem": "Bem-vindo a API", "docs": "/docs"}

@app.get("/items", response_model=List[Item])
async def listar_items():
    """Lista todos os items"""
    return items_db

@app.get("/items/{item_id}", response_model=Item)
async def obter_item(item_id: int):
    """Obtem um item pelo ID"""
    for item in items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item nao encontrado")

@app.post("/items", response_model=Item, status_code=201)
async def criar_item(item: ItemCreate):
    """Cria um novo item"""
    global item_id_counter
    novo_item = Item(
        id=item_id_counter,
        titulo=item.titulo,
        descricao=item.descricao,
        concluido=item.concluido,
        criado_em=datetime.now()
    )
    items_db.append(novo_item)
    item_id_counter += 1
    return novo_item

@app.put("/items/{item_id}", response_model=Item)
async def atualizar_item(item_id: int, item_update: ItemCreate):
    """Atualiza um item existente"""
    for i, item in enumerate(items_db):
        if item.id == item_id:
            items_db[i] = Item(
                id=item_id,
                titulo=item_update.titulo,
                descricao=item_update.descricao,
                concluido=item_update.concluido,
                criado_em=item.criado_em
            )
            return items_db[i]
    raise HTTPException(status_code=404, detail="Item nao encontrado")

@app.delete("/items/{item_id}")
async def deletar_item(item_id: int):
    """Deleta um item"""
    for i, item in enumerate(items_db):
        if item.id == item_id:
            items_db.pop(i)
            return {"mensagem": "Item deletado com sucesso"}
    raise HTTPException(status_code=404, detail="Item nao encontrado")

@app.get("/health")
async def health_check():
    """Verifica saude da API"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)`,
    "requirements.txt": `fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
python-dotenv>=1.0.0
python-multipart>=0.0.6`,
    ".env": `# Variaveis de ambiente
DEBUG=true
DATABASE_URL=sqlite:///./database.db`,
    "README.md": `# FastAPI Backend

## Como rodar

\`\`\`bash
pip install -r requirements.txt
python main.py
\`\`\`

## Documentacao

Acesse a documentacao interativa:
- Swagger UI: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

## Endpoints

- GET /items - Lista todos os items
- POST /items - Cria novo item
- GET /items/{id} - Obtem item por ID
- PUT /items/{id} - Atualiza item
- DELETE /items/{id} - Deleta item
- GET /health - Health check`
  }
};
