// Template: Script Python
// Categoria: automation
// Palavras-chave: python, script, automação, scraping

export const pythonScriptTemplate = {
  id: "python-script",
  name: "Script Python",
  category: "automation",
  description: "Script Python para automação com requests, pandas e mais",
  keywords: [
    "python", "script", "automação", "scraping", "dados", "requests",
    "pandas", "excel", "csv", "api", "web scraping", "crawling"
  ],
  files: {
    "requirements.txt": `requests==2.31.0
beautifulsoup4==4.12.2
pandas==2.1.3
openpyxl==3.1.2
python-dotenv==1.0.0
schedule==1.2.1`,
    "main.py": `#!/usr/bin/env python3
"""
Script de Automação Python
Exemplo com scraping, API e manipulação de dados
"""

import os
import json
import requests
from datetime import datetime
from bs4 import BeautifulSoup
import pandas as pd
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurações
CONFIG = {
    'api_url': os.getenv('API_URL', 'https://api.exemplo.com'),
    'output_dir': 'output',
    'log_file': 'logs/app.log'
}


def log(message: str, level: str = 'INFO'):
    """Log simples com timestamp"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{level}] {message}")


def fetch_api_data(endpoint: str) -> dict:
    """Buscar dados de uma API"""
    url = f"{CONFIG['api_url']}/{endpoint}"
    log(f"Buscando dados de: {url}")
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        log(f"Erro na requisição: {e}", 'ERROR')
        return {}


def scrape_website(url: str) -> list:
    """Fazer scraping de um site"""
    log(f"Fazendo scraping de: {url}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Exemplo: extrair todos os links
        links = []
        for a in soup.find_all('a', href=True):
            links.append({
                'text': a.get_text(strip=True),
                'href': a['href']
            })
        
        log(f"Encontrados {len(links)} links")
        return links
        
    except Exception as e:
        log(f"Erro no scraping: {e}", 'ERROR')
        return []


def process_data(data: list) -> pd.DataFrame:
    """Processar dados com Pandas"""
    log(f"Processando {len(data)} registros")
    
    df = pd.DataFrame(data)
    
    # Exemplo de processamento
    if not df.empty:
        # Remover duplicatas
        df = df.drop_duplicates()
        
        # Filtrar vazios
        df = df[df['text'].str.len() > 0]
        
        log(f"Após processamento: {len(df)} registros")
    
    return df


def save_to_excel(df: pd.DataFrame, filename: str):
    """Salvar DataFrame em Excel"""
    os.makedirs(CONFIG['output_dir'], exist_ok=True)
    filepath = os.path.join(CONFIG['output_dir'], filename)
    
    df.to_excel(filepath, index=False, engine='openpyxl')
    log(f"Dados salvos em: {filepath}")


def save_to_csv(df: pd.DataFrame, filename: str):
    """Salvar DataFrame em CSV"""
    os.makedirs(CONFIG['output_dir'], exist_ok=True)
    filepath = os.path.join(CONFIG['output_dir'], filename)
    
    df.to_csv(filepath, index=False, encoding='utf-8-sig')
    log(f"Dados salvos em: {filepath}")


def save_to_json(data: dict, filename: str):
    """Salvar dados em JSON"""
    os.makedirs(CONFIG['output_dir'], exist_ok=True)
    filepath = os.path.join(CONFIG['output_dir'], filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    log(f"Dados salvos em: {filepath}")


def main():
    """Função principal"""
    log("=== Iniciando Script de Automação ===")
    
    # Exemplo 1: Scraping
    url = "https://httpbin.org/html"
    links = scrape_website(url)
    
    if links:
        df = process_data(links)
        save_to_csv(df, 'links_extraidos.csv')
    
    # Exemplo 2: Consumir API
    # data = fetch_api_data('users')
    # if data:
    #     save_to_json(data, 'api_data.json')
    
    # Exemplo 3: Criar relatório
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_links': len(links),
        'status': 'success'
    }
    save_to_json(report, 'report.json')
    
    log("=== Script finalizado ===")


if __name__ == '__main__':
    main()`,
    ".env.example": `API_URL=https://api.exemplo.com
API_KEY=sua_chave_aqui`,
    "README.md": `# Script Python de Automação

Script para automação de tarefas com Python.

## Funcionalidades

- Web Scraping com BeautifulSoup
- Consumo de APIs REST
- Processamento com Pandas
- Exportação para Excel/CSV/JSON
- Logging integrado

## Instalação

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Uso

\`\`\`bash
python main.py
\`\`\`

## Estrutura

\`\`\`
├── main.py           # Script principal
├── requirements.txt  # Dependências
├── .env              # Variáveis de ambiente
└── output/           # Arquivos gerados
\`\`\`

## Personalização

1. Edite \`main.py\` para sua lógica
2. Adicione suas URLs/APIs
3. Configure o processamento de dados

## Agendar Execução

Para rodar periodicamente, use cron ou schedule:

\`\`\`python
import schedule
import time

schedule.every().day.at("09:00").do(main)

while True:
    schedule.run_pending()
    time.sleep(60)
\`\`\`
`
  }
};

export default pythonScriptTemplate;
